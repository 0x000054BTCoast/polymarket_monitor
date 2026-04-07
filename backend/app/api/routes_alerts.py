from fastapi import APIRouter
from pydantic import BaseModel

from app.services.alert_service import AlertService
from app.storage.db import get_session

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
service = AlertService()


class AlertConfigPatch(BaseModel):
    hot_top_n_enabled: bool | None = None
    heat_top_n_enabled: bool | None = None
    heat_consecutive_minutes: int | None = None
    price_move_1m_enabled: bool | None = None
    price_move_1m_threshold: float | None = None
    notional_spike_enabled: bool | None = None
    notional_spike_multiple: float | None = None
    ws_stale_enabled: bool | None = None


@router.get("")
def list_alerts(limit: int = 100) -> dict:
    with get_session() as session:
        alerts = service.list_alerts(session, limit=limit)
        return {
            "rows": [
                {
                    "id": a.id,
                    "alert_type": a.alert_type,
                    "severity": a.severity,
                    "message": a.message,
                    "event_id": a.event_id,
                    "market_id": a.market_id,
                    "market_question": (a.details or {}).get("market_question"),
                    "event_title": (a.details or {}).get("event_title"),
                    "metadata": a.details,
                    "created_at": a.created_at,
                }
                for a in alerts
            ]
        }


@router.get("/config")
def get_alert_config() -> dict:
    with get_session() as session:
        cfg = service.get_or_create_config(session)
        return cfg.model_dump()


@router.post("/config")
def update_alert_config(payload: AlertConfigPatch) -> dict:
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    with get_session() as session:
        cfg = service.update_config(session, patch)
        return cfg.model_dump()
