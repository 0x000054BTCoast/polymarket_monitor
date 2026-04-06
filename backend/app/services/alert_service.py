from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.services.ranking_service import RankingService
from app.storage.models import AlertConfig, AlertRecord, Checkpoint, MinuteAggregation, SourceHealth


class AlertService:
    def __init__(self, ranking: RankingService | None = None) -> None:
        self.ranking = ranking or RankingService()

    def get_or_create_config(self, session: Session) -> AlertConfig:
        config = session.get(AlertConfig, 1)
        if config:
            return config
        config = AlertConfig()
        session.add(config)
        session.commit()
        session.refresh(config)
        return config

    def update_config(self, session: Session, patch: dict) -> AlertConfig:
        config = self.get_or_create_config(session)
        for k, v in patch.items():
            if hasattr(config, k):
                setattr(config, k, v)
        config.updated_at = datetime.now(timezone.utc)
        session.add(config)
        session.commit()
        session.refresh(config)
        return config

    def emit(
        self,
        session: Session,
        *,
        alert_type: str,
        message: str,
        severity: str = "info",
        event_id: str | None = None,
        market_id: str | None = None,
        metadata: dict | None = None,
    ) -> AlertRecord:
        rec = AlertRecord(
            alert_type=alert_type,
            message=message,
            severity=severity,
            event_id=event_id,
            market_id=market_id,
            details=metadata or {},
        )
        session.add(rec)
        session.commit()
        session.refresh(rec)
        return rec

    def list_alerts(self, session: Session, limit: int = 100) -> list[AlertRecord]:
        return session.exec(select(AlertRecord).order_by(AlertRecord.created_at.desc()).limit(limit)).all()

    def evaluate(self, session: Session) -> int:
        cfg = self.get_or_create_config(session)
        emitted = 0

        hot_rows = self.ranking.hot_events(session, limit=10)
        heat_rows = self.ranking.heat_risers(session, limit=5)
        movers = self.ranking.price_movers(session, limit=20)

        if cfg.hot_top_n_enabled:
            ck = session.get(Checkpoint, "alerts:hot_top10") or Checkpoint(key="alerts:hot_top10", value="[]")
            previous_ids = set(json.loads(ck.value or "[]"))
            current_ids = [r["event_id"] for r in hot_rows]
            for row in hot_rows:
                if row["event_id"] not in previous_ids:
                    self.emit(
                        session,
                        alert_type="event_entered_hot_top10",
                        event_id=row["event_id"],
                        message=f"{row['title']} entered DERIVED hot top 10",
                        metadata={"hot_score": row["hot_score"]},
                    )
                    emitted += 1
            ck.value = json.dumps(current_ids)
            ck.updated_at = datetime.now(timezone.utc)
            session.add(ck)
            session.commit()

        if cfg.heat_top_n_enabled and heat_rows:
            ck = session.get(Checkpoint, "alerts:heat_top5_streak") or Checkpoint(
                key="alerts:heat_top5_streak", value="{}"
            )
            streaks = json.loads(ck.value or "{}")
            current_ids = {r["market_id"] for r in heat_rows}
            for market_id in current_ids:
                streaks[market_id] = int(streaks.get(market_id, 0)) + 1
                if streaks[market_id] == cfg.heat_consecutive_minutes:
                    self.emit(
                        session,
                        alert_type="heat_rise_consecutive_top5",
                        market_id=market_id,
                        message=f"Market {market_id} stayed in DERIVED heat top 5 for {cfg.heat_consecutive_minutes} minutes",
                    )
                    emitted += 1
            for market_id in list(streaks.keys()):
                if market_id not in current_ids:
                    streaks[market_id] = 0
            ck.value = json.dumps(streaks)
            ck.updated_at = datetime.now(timezone.utc)
            session.add(ck)
            session.commit()

        if cfg.price_move_1m_enabled:
            for row in movers:
                if float(row.get("abs_move_1m", 0)) >= cfg.price_move_1m_threshold:
                    self.emit(
                        session,
                        alert_type="price_move_1m_threshold",
                        market_id=row["market_id"],
                        severity="warning",
                        message=f"Market {row['market_id']} 1m move exceeded threshold",
                        metadata={"abs_move_1m": row["abs_move_1m"], "threshold": cfg.price_move_1m_threshold},
                    )
                    emitted += 1

        if cfg.notional_spike_enabled:
            minute_rows = session.exec(
                select(MinuteAggregation)
                .order_by(MinuteAggregation.minute_ts.desc())
                .limit(300)
            ).all()
            by_market: dict[str, list[MinuteAggregation]] = {}
            for row in minute_rows:
                by_market.setdefault(row.market_id, []).append(row)
            for market_id, rows in by_market.items():
                if len(rows) < 3:
                    continue
                current = rows[0].trade_notional_1m
                baseline = sum(r.trade_notional_1m for r in rows[1:6]) / max(len(rows[1:6]), 1)
                if baseline > 0 and current >= baseline * cfg.notional_spike_multiple:
                    self.emit(
                        session,
                        alert_type="notional_spike",
                        market_id=market_id,
                        severity="warning",
                        message=f"Market {market_id} notional spike detected",
                        metadata={"current": current, "baseline": baseline, "multiple": cfg.notional_spike_multiple},
                    )
                    emitted += 1

        if cfg.ws_stale_enabled:
            ws_health = session.get(SourceHealth, "market_ws")
            if ws_health and ws_health.status in {"stale", "disconnected"}:
                self.emit(
                    session,
                    alert_type="websocket_stale",
                    severity="critical",
                    message=f"Websocket health status is {ws_health.status}",
                )
                emitted += 1

        return emitted
