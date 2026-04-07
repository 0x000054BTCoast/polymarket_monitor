from datetime import datetime, timedelta, timezone

from sqlmodel import Session, SQLModel, create_engine

from app.services.alert_service import AlertService
from app.storage.models import AlertConfig, Checkpoint, Event, Market, Snapshot, SourceHealth


def build_session() -> Session:
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_alert_eval_emits_websocket_stale_and_hot_entry() -> None:
    session = build_session()
    session.add(AlertConfig())
    session.add(
        Event(
            id="e1",
            title="Event A",
            active=True,
            closed=False,
            volume_24hr=100,
            open_interest=50,
            liquidity=30,
            comment_count=10,
        )
    )
    session.add(Market(id="m1", event_id="e1", question="Q1", active=True, closed=False, last_price=0.5, liquidity=1000))
    now = datetime.now(timezone.utc)
    session.add(Snapshot(market_id="m1", ts=now - timedelta(minutes=1), price=0.4))
    session.add(Snapshot(market_id="m1", ts=now, price=0.5))
    session.add(SourceHealth(source="market_ws", status="stale"))
    session.commit()

    emitted = AlertService().evaluate(session)
    assert emitted >= 1


def test_alert_eval_websocket_stale_is_deduped_within_cooldown() -> None:
    session = build_session()
    session.add(AlertConfig())
    session.add(SourceHealth(source="market_ws", status="stale"))
    session.commit()

    service = AlertService()
    first = service.evaluate(session)
    second = service.evaluate(session)
    assert first == 1
    assert second == 0


def test_alert_eval_websocket_stale_reemits_after_cooldown() -> None:
    session = build_session()
    session.add(AlertConfig())
    session.add(SourceHealth(source="market_ws", status="stale"))
    old_ts = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    session.add(
        Checkpoint(
            key="alerts:websocket_stale:last_emit",
            value=f'{{"status":"stale","ts":"{old_ts}"}}',
        )
    )
    session.commit()

    emitted = AlertService().evaluate(session)
    assert emitted == 1
