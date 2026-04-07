from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


class OfficialTrendingClient:
    """Fetches an 'official' trending list from public Gamma fields.

    Notes:
    - Gamma public payload shapes can vary by deployment.
    - We prefer direct rank-like fields when present, then fallback to API order.
    """

    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.gamma_base_url,
            timeout=settings.request_timeout_seconds,
        )

    @retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3), reraise=True)
    def fetch(self, limit: int = 20) -> dict[str, Any]:
        # Try common public params that may expose trending ordering.
        params = {
            "active": "true",
            "closed": "false",
            "limit": max(1, min(limit, 200)),
            "sortBy": "trending",
            "order": "desc",
        }
        response = self._client.get("/events", params=params)
        response.raise_for_status()
        payload = response.json()

        rows_raw = self._extract_rows(payload)
        rows = [self._map_row(item, idx) for idx, item in enumerate(rows_raw[:limit], start=1)]

        return {
            "rows": rows,
            "source": "official",
            "as_of": datetime.now(timezone.utc).isoformat(),
            "field_mapping_note": {
                "title": "title || question",
                "category": "category",
                "official_rank": "trendingRank || rank || index_in_response",
                "official_score": "trendingScore || score || volume24hr",
                "volume_24hr": "volume24hr",
                "open_interest": "openInterest",
                "liquidity": "liquidity",
                "comment_count": "commentCount",
            },
        }

    def _extract_rows(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if not isinstance(payload, dict):
            return []
        items = payload.get("events") or payload.get("data") or payload.get("results") or []
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
        return []

    def _map_row(self, item: dict[str, Any], idx: int) -> dict[str, Any]:
        official_rank = self._to_int(item.get("trendingRank")) or self._to_int(item.get("rank")) or idx
        official_score = self._to_float(item.get("trendingScore"))
        if official_score is None:
            official_score = self._to_float(item.get("score"))
        if official_score is None:
            official_score = self._to_float(item.get("volume24hr"))

        return {
            "event_id": str(item.get("id") or item.get("eventId") or ""),
            "title": item.get("title") or item.get("question") or "Untitled",
            "category": item.get("category"),
            "official_rank": official_rank,
            "official_score": official_score,
            "volume_24hr": self._to_float(item.get("volume24hr")),
            "open_interest": self._to_float(item.get("openInterest")),
            "liquidity": self._to_float(item.get("liquidity")),
            "comment_count": self._to_int(item.get("commentCount")),
            "source": "official",
            "raw_source": "gamma.events",
        }

    def _to_float(self, value: Any) -> float | None:
        try:
            return None if value is None else float(value)
        except (TypeError, ValueError):
            return None

    def _to_int(self, value: Any) -> int | None:
        try:
            return None if value is None else int(value)
        except (TypeError, ValueError):
            return None
