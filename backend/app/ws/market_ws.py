from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone

import websockets

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class WsState:
    connected: bool = False
    last_message_at: datetime | None = None
    last_error: str | None = None


class MarketWebSocketListener:
    def __init__(self) -> None:
        self._tracked_assets: set[str] = set()
        self._running = False
        self._unparsed_message_count = 0
        self.state = WsState()
        self._minute_buffers: dict[str, deque[dict]] = defaultdict(
            lambda: deque(maxlen=settings.max_ws_buffer_minutes * 60)
        )

    def set_assets(self, assets: list[str]) -> None:
        self._tracked_assets = {a for a in assets if a}

    async def run_forever(self) -> None:
        self._running = True
        delay = 1
        while self._running:
            try:
                await self._connect_and_consume()
                delay = 1
            except Exception as exc:  # noqa: BLE001
                self.state.connected = False
                self.state.last_error = str(exc)
                logger.warning("WS disconnected: %s", exc)
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)

    def stop(self) -> None:
        self._running = False

    async def _connect_and_consume(self) -> None:
        if not self._tracked_assets:
            await asyncio.sleep(1)
            return
        async with websockets.connect(settings.market_ws_url, ping_interval=20, ping_timeout=20) as ws:
            self.state.connected = True
            sub_msg = self._build_subscribe_payload()
            preview_asset_ids = sub_msg["asset_ids"][:5]
            logger.info(
                "WS subscribe request assets=%s preview_asset_ids=%s",
                len(sub_msg["asset_ids"]),
                preview_asset_ids,
            )
            await ws.send(json.dumps(sub_msg))

            async for raw in ws:
                self.state.last_message_at = datetime.now(timezone.utc)
                payload = json.loads(raw)
                self._handle_message(payload)

    def _build_subscribe_payload(self) -> dict:
        return {
            "type": "subscribe",
            "channel": "market",
            "asset_ids": sorted(self._tracked_assets),
        }

    def _handle_message(self, payload: dict) -> None:
        market = str(payload.get("market") or payload.get("asset_id") or "")
        if not market:
            self._unparsed_message_count += 1
            if self._unparsed_message_count <= 5 or self._unparsed_message_count % 100 == 0:
                logger.warning(
                    "WS message missing market/asset_id count=%s keys=%s payload_type=%s",
                    self._unparsed_message_count,
                    sorted(payload.keys()),
                    payload.get("event_type") or payload.get("type"),
                )
            return
        event_type = payload.get("event_type") or payload.get("type")
        ts = datetime.now(timezone.utc)
        self._minute_buffers[market].append(
            {
                "ts": ts,
                "price": float(payload.get("price", 0) or 0),
                "size": float(payload.get("size", 0) or 0),
                "event_type": event_type,
            }
        )

    def flush_minute_metrics(self) -> dict[str, dict]:
        now = datetime.now(timezone.utc)
        out: dict[str, dict] = {}
        for market, rows in self._minute_buffers.items():
            one_min = [r for r in rows if (now - r["ts"]).total_seconds() <= 60]
            if not one_min:
                continue
            prices = [r["price"] for r in one_min if r["price"] > 0]
            start_price = prices[0] if prices else 0
            end_price = prices[-1] if prices else 0
            out[market] = {
                "trade_notional_1m": sum(r["price"] * r["size"] for r in one_min),
                "trade_count_1m": len(one_min),
                "price_return_1m": ((end_price - start_price) / start_price) if start_price else 0,
                "book_updates_1m": sum(1 for r in one_min if r["event_type"] == "book"),
            }
        return out

    def is_stale(self) -> bool:
        if not self.state.last_message_at:
            return True
        age = (datetime.now(timezone.utc) - self.state.last_message_at).total_seconds()
        return age > settings.websocket_stale_seconds
