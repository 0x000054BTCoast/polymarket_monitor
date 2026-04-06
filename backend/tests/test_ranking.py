from datetime import datetime, timezone

from sqlmodel import Session, SQLModel, create_engine

from app.services.ranking_service import RankingService
from app.storage.models import Event, Snapshot


def build_session() -> Session:
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_hot_events_formula_returns_sorted() -> None:
    session = build_session()
    session.add(Event(id="1", title="A", volume_24hr=100, open_interest=50, liquidity=20, comment_count=10, featured=True))
    session.add(Event(id="2", title="B", volume_24hr=10, open_interest=5, liquidity=2, comment_count=1, featured=False))
    session.commit()

    rows = RankingService().hot_events(session)
    assert rows[0]["event_id"] == "1"
    assert rows[0]["hot_score"] >= rows[1]["hot_score"]


def test_heat_rise_fallback() -> None:
    session = build_session()
    now = datetime.now(timezone.utc)
    session.add(Snapshot(market_id="m1", ts=now, volume_24hr=200, liquidity=100, open_interest=20, comment_count=5))
    session.add(Snapshot(market_id="m1", ts=now.replace(second=0), volume_24hr=100, liquidity=90, open_interest=18, comment_count=4))
    session.commit()

    rows = RankingService().heat_risers(session)
    assert rows
    assert rows[0]["fallback"] is True
