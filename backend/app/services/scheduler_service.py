from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.services.aggregation_service import AggregationService
from app.services.alert_service import AlertService
from app.services.discovery_service import DiscoveryService
from app.services.notification_service import NotificationService
from app.services.ranking_service import RankingService
from app.storage.db import get_session
from app.storage.models import SourceHealth
from app.ws.market_ws import MarketWebSocketListener

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(
        self,
        discovery: DiscoveryService,
        aggregation: AggregationService,
        ranking: RankingService,
        ws_listener: MarketWebSocketListener,
    ) -> None:
        self.discovery = discovery
        self.aggregation = aggregation
        self.ranking = ranking
        self.alerts = AlertService(ranking=ranking)
        self.notification = NotificationService(ranking=ranking)
        self.ws_listener = ws_listener
        self.scheduler = AsyncIOScheduler()

    def start(self) -> None:
        self.scheduler.add_job(self._discovery_tick, "interval", seconds=settings.discovery_poll_seconds)
        self.scheduler.add_job(self._snapshot_tick, "interval", seconds=settings.snapshot_poll_seconds)
        self.scheduler.add_job(
            self._flush_ws_tick,
            "interval",
            seconds=settings.flush_aggregation_seconds,
        )
        self.scheduler.add_job(
            self._cleanup_tick,
            "interval",
            seconds=settings.cleanup_check_seconds,
        )
        self.scheduler.add_job(self._ws_health_tick, "interval", seconds=10)
        self.scheduler.add_job(self._alert_tick, "interval", seconds=60)
        self.scheduler.add_job(self._summary_tick, "cron", minute=settings.summary_push_cron.split()[0], hour=settings.summary_push_cron.split()[1])
        self.scheduler.start()

    async def start_ws(self) -> None:
        await self.ws_listener.run_forever()

    def shutdown(self) -> None:
        self.ws_listener.stop()
        self.scheduler.shutdown(wait=False)

    def _discovery_tick(self) -> None:
        result = self.discovery.run()
        assets = self.discovery.tracked_asset_ids()
        self.ws_listener.set_assets(assets)
        logger.info("Discovery synced events=%s markets=%s assets=%s", result["events"], result["markets"], len(assets))

    def _snapshot_tick(self) -> None:
        saved = self.aggregation.backfill_snapshots()
        logger.info("Snapshot backfill saved=%s", saved)

    def _flush_ws_tick(self) -> None:
        written = self.aggregation.flush_ws_minute_aggregations()
        logger.info("WS minute flush written=%s", written)

    def _cleanup_tick(self) -> None:
        deleted = self.aggregation.prune_old_data()
        logger.info("Pruned old data snapshots=%s minute_aggregations=%s ranking_snapshots=%s alerts=%s",
                    deleted["snapshots"],
                    deleted["minute_aggregations"],
                    deleted["ranking_snapshots"],
                    deleted["alerts"])

    def _ws_health_tick(self) -> None:
        stale = self.ws_listener.is_stale()
        with get_session() as session:
            row = session.get(SourceHealth, "market_ws") or SourceHealth(source="market_ws")
            row.status = "stale" if stale else ("ok" if self.ws_listener.state.connected else "disconnected")
            row.last_error_message = self.ws_listener.state.last_error
            row.updated_at = self.ws_listener.state.last_message_at or row.updated_at
            session.add(row)
            session.commit()

    def _alert_tick(self) -> None:
        with get_session() as session:
            emitted = self.alerts.evaluate(session)
            pushed = self.notification.push_instant_alerts(session)
        logger.info("Alert evaluation emitted=%s pushed=%s", emitted, pushed)

    def _summary_tick(self) -> None:
        with get_session() as session:
            pushed = self.notification.push_periodic_summary(session)
        logger.info("Summary push sent=%s", pushed)


async def launch_background(scheduler: SchedulerService) -> asyncio.Task:
    scheduler.start()
    return asyncio.create_task(scheduler.start_ws())
