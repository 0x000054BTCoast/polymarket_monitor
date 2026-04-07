from __future__ import annotations

from typing import Any

from app.http.polymarket_gamma import GammaClient


class _StubResponse:
    def __init__(self, payload: Any) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> Any:
        return self._payload


class _StubHttpClient:
    def __init__(self, responses: list[Any]) -> None:
        self._responses = responses
        self.calls: list[dict[str, Any]] = []

    def get(self, path: str, params: dict[str, Any]) -> _StubResponse:
        self.calls.append({"path": path, "params": params.copy()})
        payload = self._responses[len(self.calls) - 1]
        return _StubResponse(payload)


def test_fetch_active_events_cursor_pagination_with_dedup() -> None:
    gamma = GammaClient()
    gamma._client = _StubHttpClient(  # type: ignore[assignment]
        [
            {
                "events": [{"id": "e1"}, {"id": "e2"}],
                "nextCursor": "cur-2",
                "hasNext": True,
            },
            {
                "events": [{"id": "e2"}, {"id": "e3"}],
                "nextCursor": None,
                "hasNext": False,
            },
        ]
    )

    events = gamma.fetch_active_events(limit=2, max_pages=10, max_total=100)

    assert [e["id"] for e in events] == ["e1", "e2", "e3"]


def test_fetch_active_events_offset_pagination_stops_by_max_total() -> None:
    gamma = GammaClient()
    stub = _StubHttpClient(
        [
            {"data": [{"id": "e1"}, {"id": "e2"}]},
            {"data": [{"id": "e3"}, {"id": "e4"}]},
            {"data": [{"id": "e5"}]},
        ]
    )
    gamma._client = stub  # type: ignore[assignment]

    events = gamma.fetch_active_events(limit=2, max_pages=10, max_total=3)

    assert [e["id"] for e in events] == ["e1", "e2", "e3"]
    assert stub.calls[0]["params"]["limit"] == 2
    assert stub.calls[1]["params"]["offset"] == 2
