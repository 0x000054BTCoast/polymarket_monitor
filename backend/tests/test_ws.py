from datetime import datetime, timedelta, timezone

from sqlmodel import Session, SQLModel, create_engine

from app.services.scheduler_service import SchedulerService
from app.storage.models import SourceHealth
from app.ws.market_ws import MarketWebSocketListener


def test_ws_reconnect_primitives() -> None:
    ws = MarketWebSocketListener()
    ws.set_assets(["a1", "a2"])
    assert ws.is_stale() is True
    ws._handle_message({"asset_id": "a1", "price": 0.6, "size": 10, "type": "trade"})
    flushed = ws.flush_minute_metrics()
    assert "a1" in flushed


def test_ws_subscribe_payload_uses_asset_ids() -> None:
    ws = MarketWebSocketListener()
    ws.set_assets(["a2", "a1"])
    payload = ws._build_subscribe_payload()
    assert payload["asset_ids"] == ["a1", "a2"]
    assert "assets_ids" not in payload


class Dummy:
    def run(self):
        return {"events": 0, "markets": 0}

    def tracked_asset_ids(self):
        return []


class DummyAgg:
    def backfill_snapshots(self):
        return 0

    def flush_ws_minute_aggregations(self):
        return 0

    def prune_old_data(self):
        return {"snapshots": 0, "minute_aggregations": 0, "ranking_snapshots": 0, "alerts": 0}


def test_ws_health_tick_transitions_starting_ok_stale(monkeypatch) -> None:
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    session = Session(engine)

    class _SessionCtx:
        def __enter__(self):
            return session

        def __exit__(self, exc_type, exc, tb):
            return False

    ws = MarketWebSocketListener()
    scheduler = SchedulerService(Dummy(), DummyAgg(), Dummy(), ws)
    monkeypatch.setattr("app.services.scheduler_service.get_session", lambda: _SessionCtx())

    ws.state.connected = True
    ws.state.last_message_at = None
    scheduler._started_at = datetime.now(timezone.utc)
    scheduler._ws_health_tick()
    assert session.get(SourceHealth, "market_ws").status == "starting"

    ws.state.last_message_at = datetime.now(timezone.utc)
    scheduler._ws_health_tick()
    row = session.get(SourceHealth, "market_ws")
    assert row.status == "ok"
    assert row.last_ok_at is not None

    ws.state.last_message_at = datetime.now(timezone.utc) - timedelta(seconds=120)
    scheduler._started_at = datetime.now(timezone.utc) - timedelta(seconds=240)
    scheduler._ws_health_tick()
    row = session.get(SourceHealth, "market_ws")
    assert row.status == "stale"
    assert row.last_error_at is not None
