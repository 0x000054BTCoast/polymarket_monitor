from __future__ import annotations

from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


class ClobClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.clob_base_url,
            timeout=settings.request_timeout_seconds,
        )

    @retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3), reraise=True)
    def get_prices_history(self, market: str, interval: str = "1m", fidelity: int = 60) -> dict[str, Any]:
        # Uses documented public history endpoint.
        r = self._client.get(
            "/prices-history",
            params={"market": market, "interval": interval, "fidelity": fidelity},
        )
        r.raise_for_status()
        return r.json()
