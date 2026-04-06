from datetime import datetime, timezone

from sqlmodel import Session, SQLModel, create_engine

from app.services.signal_service import SignalService
from app.storage.models import Event, Market, MinuteAggregation, Snapshot


def build_session() -> Session:
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_binary_parity_gap_signal_generated() -> None:
    session = build_session()
    now = datetime.now(timezone.utc)
    session.add(Event(id="e1", title="E1", active=True, closed=False))
    session.add(Market(id="yes1", event_id="e1", question="Will X happen?", outcome="YES", last_price=0.62, liquidity=2000))
    session.add(Market(id="no1", event_id="e1", question="Will X happen?", outcome="NO", last_price=0.45, liquidity=1800))
    session.add(Snapshot(market_id="yes1", ts=now, price=0.62, liquidity=2000))
    session.add(Snapshot(market_id="no1", ts=now, price=0.45, liquidity=1800))
    session.add(MinuteAggregation(market_id="yes1", minute_ts=now, book_updates_1m=10))
    session.add(MinuteAggregation(market_id="no1", minute_ts=now, book_updates_1m=12))
    session.commit()

    rows = SignalService().arbitrage_rows(session)
    assert rows
    assert any(r["signal_type"] == "binary_parity_gap" for r in rows)
    assert all(r["derived"] is True for r in rows)
