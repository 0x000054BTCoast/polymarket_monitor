from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.storage.db import get_session
from app.storage.models import Event, Market

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def list_events(limit: int = 100, q: str | None = None, category: str | None = None) -> dict:
    with get_session() as session:
        stmt = select(Event).where(Event.active == True, Event.closed == False)  # noqa: E712
        rows = session.exec(stmt).all()
        if q:
            rows = [r for r in rows if q.lower() in r.title.lower()]
        if category:
            rows = [r for r in rows if (r.category or "").lower() == category.lower()]

        return {
            "rows": [
                {
                    "id": r.id,
                    "title": r.title,
                    "slug": r.slug,
                    "category": r.category,
                    "volume24hr": r.volume_24hr,
                    "openInterest": r.open_interest,
                    "liquidity": r.liquidity,
                    "commentCount": r.comment_count,
                    "featured": r.featured,
                }
                for r in rows[:limit]
            ]
        }


@router.get("/{event_id}")
def get_event(event_id: str) -> dict:
    with get_session() as session:
        event = session.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="event not found")
        markets = session.exec(select(Market).where(Market.event_id == event_id)).all()

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "category": event.category,
            "active": event.active,
            "closed": event.closed,
        },
        "markets": [
            {
                "id": m.id,
                "question": m.question,
                "outcome": m.outcome,
                "asset_id": m.asset_id,
                "clob_token_id": m.clob_token_id,
                "last_price": m.last_price,
            }
            for m in markets
        ],
    }
