from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_alerts import router as alerts_router
from app.api.routes_events import router as events_router
from app.api.routes_health import router as health_router
from app.api.routes_rankings import router as rankings_router
from app.api.routes_system import router as system_router
from app.api.routes_signals import router as signals_router
from app.config import settings
from app.http.polymarket_clob import ClobClient
from app.http.polymarket_gamma import GammaClient
from app.logging import configure_logging
from app.services.aggregation_service import AggregationService
from app.services.discovery_service import DiscoveryService
from app.services.ranking_service import RankingService
from app.services.scheduler_service import SchedulerService, launch_background
from app.storage.db import init_db
from app.ws.market_ws import MarketWebSocketListener


configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    gamma = GammaClient()
    clob = ClobClient()
    ws = MarketWebSocketListener()
    discovery = DiscoveryService(gamma)
    aggregation = AggregationService(clob, ws)
    ranking = RankingService()
    scheduler = SchedulerService(discovery, aggregation, ranking, ws)

    ws_task = None
    if not settings.disable_background_jobs:
        ws_task = await launch_background(scheduler)
    try:
        yield
    finally:
        if ws_task is not None:
            scheduler.shutdown()
            await asyncio.sleep(0)
            ws_task.cancel()


app = FastAPI(title="polymarket-monitor", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(system_router)
app.include_router(events_router)
app.include_router(rankings_router)
app.include_router(alerts_router)
app.include_router(signals_router)
