from datetime import datetime, timezone

from fastapi import APIRouter
from sqlmodel import select

from app.storage.db import get_session
from app.storage.models import Checkpoint, Event, Market, SourceHealth

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/status")
def system_status() -> dict:
    with get_session() as session:
        events = session.exec(select(Event)).all()
        markets = session.exec(select(Market)).all()
        health = session.exec(select(SourceHealth)).all()
        ckpt = session.get(Checkpoint, "last_discovery_sync")

    websocket_status = next((h.status for h in health if h.source == "market_ws"), "unknown")
    category_counts: dict[str, int] = {}
    for e in events:
        c = e.category or "uncategorized"
        category_counts[c] = category_counts.get(c, 0) + 1

    return {
        "tracked_events": len(events),
        "tracked_assets": len([m for m in markets if m.asset_id]),
        "websocket_status": websocket_status,
        "last_sync_time": ckpt.value if ckpt else None,
        "source_mode_badges": {
            "gamma": "official-public",
            "clob": "official-public",
            "market_ws": "official-public",
            "data_api": "official-public-optional",
            "rtds": "disabled-by-default",
        },
        "category_counts": category_counts,
        "source_health": [
            {
                "source": h.source,
                "status": h.status,
                "last_ok_at": h.last_ok_at,
                "last_error_at": h.last_error_at,
                "last_error_message": h.last_error_message,
            }
            for h in health
        ],
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
