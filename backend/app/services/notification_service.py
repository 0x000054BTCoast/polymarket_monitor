from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.config import settings
from app.services.insight_agent import InsightAgent, build_insight_agent
from app.services.notifier_service import Notifier, build_notifier
from app.services.ranking_service import RankingService
from app.storage.models import AlertRecord, Checkpoint, SourceHealth


class NotificationService:
    def __init__(
        self,
        ranking: RankingService | None = None,
        notifier: Notifier | None = None,
        agent: InsightAgent | None = None,
    ) -> None:
        self.ranking = ranking or RankingService()
        self.notifier = notifier or build_notifier()
        self.agent = agent or build_insight_agent()

    def push_periodic_summary(self, session: Session) -> bool:
        hot = self.ranking.hot_events(session, limit=5)
        heat = self.ranking.heat_risers(session, limit=5)
        since = datetime.now(timezone.utc) - timedelta(hours=6)
        recent_alerts = session.exec(select(AlertRecord).where(AlertRecord.created_at >= since)).all()
        severity_counts: dict[str, int] = {}
        for a in recent_alerts:
            severity_counts[a.severity] = severity_counts.get(a.severity, 0) + 1
        ws = session.get(SourceHealth, "market_ws")

        context = {"top_hot": hot, "top_heat": heat, "alerts": severity_counts}
        headline = self.agent.summarize_market(context)
        bullets = [
            f"Hot Top1: {(hot[0]['title'] if hot else 'N/A')} (DERIVED)",
            f"Heat Top1: {(heat[0]['market_id'] if heat else 'N/A')} (DERIVED)",
            f"6h alert stats: {severity_counts or {'info': 0}}",
            f"WS status: {ws.status if ws else 'unknown'}",
        ]
        markdown = self.agent.compose_notification({"headline": headline, "bullets": bullets})
        return self.notifier.send_markdown("Polymarket DERIVED Summary", markdown)

    def push_instant_alerts(self, session: Session) -> int:
        if not settings.alert_push_enabled:
            return 0
        priorities = {"heat_rise_consecutive_top5", "notional_spike", "websocket_stale"}
        recent = session.exec(select(AlertRecord).order_by(AlertRecord.created_at.desc()).limit(100)).all()
        sent = 0
        for alert in recent:
            if alert.alert_type not in priorities:
                continue
            key = f"notify:cooldown:{alert.alert_type}:{alert.market_id or alert.event_id or 'global'}"
            ck = session.get(Checkpoint, key)
            now = datetime.now(timezone.utc)
            if ck:
                last = datetime.fromisoformat(ck.value)
                if now - last < timedelta(seconds=settings.alert_push_cooldown_seconds):
                    continue
            markdown = self.agent.compose_notification(
                {
                    "headline": f"{alert.alert_type} ({alert.severity})",
                    "bullets": [alert.message, "DERIVED 风险监控提醒，非投资建议。"],
                }
            )
            if self.notifier.send_markdown("Polymarket Alert", markdown):
                sent += 1
                row = ck or Checkpoint(key=key, value=now.isoformat())
                row.value = now.isoformat()
                row.updated_at = now
                session.add(row)
                session.commit()
        return sent
