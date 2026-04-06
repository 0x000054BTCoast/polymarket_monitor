from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import select

from app.http.polymarket_clob import ClobClient
from app.storage.db import get_session
from app.storage.models import Market, MinuteAggregation, Snapshot
from app.ws.market_ws import MarketWebSocketListener


class AggregationService:
    def __init__(self, clob: ClobClient, ws_listener: MarketWebSocketListener) -> None:
        self.clob = clob
        self.ws_listener = ws_listener

    def backfill_snapshots(self, limit_markets: int = 100) -> int:
        saved = 0
        with get_session() as session:
            markets = session.exec(select(Market).limit(limit_markets)).all()
            for m in markets:
                market_ref = m.clob_token_id or m.asset_id
                if not market_ref:
                    continue
                history = self.clob.get_prices_history(market=market_ref, interval="1m", fidelity=60)
                points = history.get("history") or history.get("data") or []
                for p in points[-20:]:
                    ts = p.get("t") or p.get("timestamp")
                    price = p.get("p") or p.get("price")
                    if ts is None:
                        continue
                    session.add(
                        Snapshot(
                            market_id=m.id,
                            ts=datetime.fromtimestamp(int(ts), tz=timezone.utc),
                            price=float(price) if price is not None else None,
                            volume_24hr=m.volume_24hr,
                            liquidity=m.liquidity,
                        )
                    )
                    saved += 1
            session.commit()
        return saved

    def flush_ws_minute_aggregations(self) -> int:
        metrics = self.ws_listener.flush_minute_metrics()
        written = 0
        with get_session() as session:
            now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
            id_by_asset = {
                m.asset_id: m.id
                for m in session.exec(select(Market).where(Market.asset_id.is_not(None))).all()
                if m.asset_id
            }
            for asset, row in metrics.items():
                market_id = id_by_asset.get(asset)
                if not market_id:
                    continue
                session.add(MinuteAggregation(market_id=market_id, minute_ts=now, **row))
                written += 1
            session.commit()
        return written
