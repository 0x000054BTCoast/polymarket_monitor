from __future__ import annotations

from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


class DataApiClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.data_api_base_url,
            timeout=settings.request_timeout_seconds,
        )

    @retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3), reraise=True)
    def get_trades(self, limit: int = 200) -> list[dict[str, Any]]:
        # Public trades endpoint usage only.
        r = self._client.get("/trades", params={"limit": limit})
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []
