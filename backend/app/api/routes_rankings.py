from fastapi import APIRouter

from app.services.ranking_service import RankingService
from app.storage.db import get_session

router = APIRouter(prefix="/api/rankings", tags=["rankings"])
service = RankingService()


@router.get("/hot-events")
def hot_events(limit: int = 20) -> dict:
    with get_session() as session:
        return {"rows": service.hot_events(session, limit=limit), "derived": True}


@router.get("/heat-risers")
def heat_risers(limit: int = 20) -> dict:
    with get_session() as session:
        rows = service.heat_risers(session, limit=limit)
        fallback = any(r.get("fallback") for r in rows)
        return {"rows": rows, "derived": True, "fallback": fallback}


@router.get("/price-movers")
def price_movers(limit: int = 20) -> dict:
    with get_session() as session:
        return {"rows": service.price_movers(session, limit=limit), "derived": True}


@router.get("/disagreement")
def disagreement(limit: int = 20) -> dict:
    with get_session() as session:
        return {"rows": service.disagreement(session, limit=limit), "derived": True}


@router.get("/new-entrants")
def new_entrants(top_n: int = 10) -> dict:
    with get_session() as session:
        return {"rows": service.new_entrants(session, top_n=top_n), "derived": True}


@router.get("/hot-trend")
def hot_trend(hours: int = 24, top_k: int = 5) -> dict:
    with get_session() as session:
        return service.hot_trend(session, hours=hours, top_k=top_k)
