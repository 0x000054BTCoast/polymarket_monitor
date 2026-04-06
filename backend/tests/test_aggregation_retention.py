from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, SQLModel, create_engine, select

from app.services.aggregation_service import AggregationService
from app.storage.models import AlertRecord, Market, MinuteAggregation, RankingSnapshot, Snapshot


class StubClobClient:
    def __init__(self, price: float) -> None:
        self.price = price

    def get_prices_history(self, market: str, interval: str, fidelity: int) -> dict:
        assert market
        assert interval == "1m"
        assert fidelity == 60
        return {"history": [{"t": 1_700_000_000, "p": self.price}]}


class StubWsListener:
    def flush_minute_metrics(self) -> dict[str, dict]:
        return {}


def _patch_session(monkeypatch, engine) -> None:
    @contextmanager
    def fake_get_session():
        with Session(engine) as session:
            yield session

    monkeypatch.setattr("app.services.aggregation_service.get_session", fake_get_session)


def test_backfill_snapshots_upsert(monkeypatch) -> None:
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    _patch_session(monkeypatch, engine)

    with Session(engine) as session:
        session.add(Market(id="m1", event_id="e1", question="q", clob_token_id="token-1"))
        session.commit()

    service = AggregationService(clob=StubClobClient(price=0.42), ws_listener=StubWsListener())
    service.backfill_snapshots(limit_markets=10)

    service = AggregationService(clob=StubClobClient(price=0.55), ws_listener=StubWsListener())
    service.backfill_snapshots(limit_markets=10)

    with Session(engine) as session:
        rows = session.exec(select(Snapshot)).all()
        assert len(rows) == 1
        assert rows[0].price == 0.55


def test_prune_old_data(monkeypatch) -> None:
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    _patch_session(monkeypatch, engine)

    old_ts = datetime.now(timezone.utc) - timedelta(hours=25)
    fresh_ts = datetime.now(timezone.utc) - timedelta(hours=1)

    with Session(engine) as session:
        session.add(Market(id="m1", event_id="e1", question="q"))
        session.add(Snapshot(market_id="m1", ts=old_ts, price=0.2))
        session.add(Snapshot(market_id="m1", ts=fresh_ts, price=0.3))
        session.add(MinuteAggregation(market_id="m1", minute_ts=old_ts))
        session.add(MinuteAggregation(market_id="m1", minute_ts=fresh_ts))
        session.add(RankingSnapshot(ranking_type="hot-events", generated_at=old_ts, payload={"rows": []}))
        session.add(RankingSnapshot(ranking_type="hot-events", generated_at=fresh_ts, payload={"rows": []}))
        session.add(AlertRecord(alert_type="x", message="old", created_at=old_ts))
        session.add(AlertRecord(alert_type="x", message="new", created_at=fresh_ts))
        session.commit()

    deleted = AggregationService(clob=StubClobClient(price=0.1), ws_listener=StubWsListener()).prune_old_data(
        retention_hours=24
    )

    assert deleted == {
        "snapshots": 1,
        "minute_aggregations": 1,
        "ranking_snapshots": 1,
        "alerts": 1,
    }

    with Session(engine) as session:
        assert len(session.exec(select(Snapshot)).all()) == 1
        assert len(session.exec(select(MinuteAggregation)).all()) == 1
        assert len(session.exec(select(RankingSnapshot)).all()) == 1
        assert len(session.exec(select(AlertRecord)).all()) == 1
