from fastapi import APIRouter

from app.services.signal_service import SignalService
from app.storage.db import get_session

router = APIRouter(prefix="/api/signals", tags=["signals"])
service = SignalService()


@router.get("/arbitrage")
def arbitrage_signals(limit: int = 50) -> dict:
    with get_session() as session:
        return service.snapshot(session, limit=limit)
