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
    def fetch_active_events(
        self, limit: int = 100, max_pages: int = 50, max_total: int = 5000
    ) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        seen_event_ids: set[str] = set()
        cursor: str | None = None
        page = 1
        offset = 0
        use_mode: str | None = None

        for _ in range(max_pages):
            if len(events) >= max_total:
                break

            params: dict[str, Any] = {"active": "true", "closed": "false", "limit": limit}
            if use_mode == "cursor" and cursor:
                params["cursor"] = cursor
            elif use_mode == "offset":
                params["offset"] = offset
            elif use_mode == "page":
                params["page"] = page

            r = self._client.get("/events", params=params)
            r.raise_for_status()

            page_items, cursor, page, offset, use_mode, is_end = self._resolve_next_page_state(
                r.json(), limit=limit, page=page, offset=offset, cursor=cursor, current_mode=use_mode
            )

            for raw_event in page_items:
                event_id = str(raw_event.get("id") or raw_event.get("eventId") or "")
                if event_id:
                    if event_id in seen_event_ids:
                        continue
                    seen_event_ids.add(event_id)
                events.append(raw_event)
                if len(events) >= max_total:
                    break

            if is_end:
                break

        return events

    def _resolve_next_page_state(
        self,
        payload: Any,
        *,
        limit: int,
        page: int,
        offset: int,
        cursor: str | None,
        current_mode: str | None,
    ) -> tuple[list[dict[str, Any]], str | None, int, int, str | None, bool]:
        if isinstance(payload, list):
            return payload, None, page, offset, current_mode, True

        if not isinstance(payload, dict):
            return [], None, page, offset, current_mode, True

        items = payload.get("events") or payload.get("data") or payload.get("results") or []
        page_items = items if isinstance(items, list) else []

        next_cursor = payload.get("nextCursor") or payload.get("cursor") or payload.get("next_cursor")
        has_next = payload.get("hasNext")
        if has_next is None:
            has_next = payload.get("has_next")
        next_offset = payload.get("nextOffset")
        if next_offset is None:
            next_offset = payload.get("next_offset")
        next_page = payload.get("nextPage")
        if next_page is None:
            next_page = payload.get("next_page")

        if next_cursor:
            return (
                page_items,
                str(next_cursor),
                page,
                offset,
                "cursor",
                not bool(has_next) if has_next is not None else False,
            )

        if isinstance(next_offset, int):
            return page_items, None, page, next_offset, "offset", False

        if isinstance(next_page, int):
            return page_items, None, next_page, offset, "page", False

        mode = current_mode
        if mode == "offset":
            return page_items, None, page, offset + limit, "offset", len(page_items) < limit
        if mode == "page":
            return page_items, None, page + 1, offset, "page", len(page_items) < limit

        if has_next is False:
            return page_items, None, page, offset, None, True
        if len(page_items) >= limit:
            return page_items, None, page, offset + limit, "offset", False
        return page_items, None, page, offset, None, True

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
