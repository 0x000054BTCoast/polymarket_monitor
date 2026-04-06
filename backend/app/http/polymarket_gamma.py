from __future__ import annotations

import json
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


def _ensure_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


class GammaClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.gamma_base_url,
            timeout=settings.request_timeout_seconds,
        )

    @retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3), reraise=True)
    def fetch_active_events(self) -> list[dict[str, Any]]:
        r = self._client.get("/events", params={"active": "true", "closed": "false"})
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []

    def parse_event_markets(
        self, event_payload: dict[str, Any]
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        event_id = str(event_payload.get("id") or event_payload.get("eventId") or "")
        event = {
            "id": event_id,
            "slug": event_payload.get("slug"),
            "title": event_payload.get("title") or event_payload.get("question") or "Untitled",
            "category": event_payload.get("category"),
            "active": bool(event_payload.get("active", True)),
            "closed": bool(event_payload.get("closed", False)),
            "featured": bool(event_payload.get("featured", False)),
            "volume_24hr": _to_float(event_payload.get("volume24hr")),
            "open_interest": _to_float(event_payload.get("openInterest")),
            "liquidity": _to_float(event_payload.get("liquidity")),
            "comment_count": _to_int(event_payload.get("commentCount")),
            "raw_payload": event_payload,
        }

        markets_payload = _ensure_list(event_payload.get("markets"))
        markets: list[dict[str, Any]] = []
        for m in markets_payload:
            outcomes = _ensure_list(m.get("outcomes"))
            outcome_prices = _ensure_list(m.get("outcomePrices"))
            clob_token_ids = _ensure_list(m.get("clobTokenIds"))
            token_ids = _ensure_list(m.get("tokenIds"))

            for idx, outcome in enumerate(outcomes or [None]):
                market_id = str(m.get("id") or f"{event_id}:{idx}")
                markets.append(
                    {
                        "id": f"{market_id}:{idx}" if outcomes else market_id,
                        "event_id": event_id,
                        "question": m.get("question") or event["title"],
                        "active": bool(m.get("active", True)),
                        "closed": bool(m.get("closed", False)),
                        "outcome": outcome,
                        "asset_id": _get_idx(token_ids, idx),
                        "clob_token_id": _get_idx(clob_token_ids, idx),
                        "last_price": _to_float(_get_idx(outcome_prices, idx)),
                        "volume_24hr": _to_float(m.get("volume24hr")),
                        "liquidity": _to_float(m.get("liquidity")),
                        "raw_payload": m,
                    }
                )
        return event, markets


def _get_idx(values: list[Any], idx: int) -> str | None:
    if idx < len(values):
        item = values[idx]
        return str(item) if item is not None else None
    return None


def _to_float(v: Any) -> float | None:
    try:
        return None if v is None else float(v)
    except (TypeError, ValueError):
        return None


def _to_int(v: Any) -> int | None:
    try:
        return None if v is None else int(v)
    except (TypeError, ValueError):
        return None
