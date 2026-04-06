from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import select

from app.http.polymarket_gamma import GammaClient
from app.storage.db import get_session
from app.storage.models import Checkpoint, Event, Market, SourceHealth


class DiscoveryService:
    def __init__(self, gamma: GammaClient) -> None:
        self.gamma = gamma

    def run(self) -> dict[str, int]:
        events_payload = self.gamma.fetch_active_events()
        event_count = 0
        market_count = 0

        with get_session() as session:
            for raw_event in events_payload:
                event_obj, market_rows = self.gamma.parse_event_markets(raw_event)
                if not event_obj["id"]:
                    continue

                existing = session.get(Event, event_obj["id"])
                if existing:
                    for k, v in event_obj.items():
                        setattr(existing, k, v)
                    existing.updated_at = datetime.now(timezone.utc)
                    session.add(existing)
                else:
                    session.add(Event(**event_obj))
                event_count += 1

                for m in market_rows:
                    ex_market = session.get(Market, m["id"])
                    if ex_market:
                        for k, v in m.items():
                            setattr(ex_market, k, v)
                        ex_market.updated_at = datetime.now(timezone.utc)
                        session.add(ex_market)
                    else:
                        session.add(Market(**m))
                    market_count += 1

            health = session.get(SourceHealth, "gamma") or SourceHealth(source="gamma")
            health.status = "ok"
            health.last_ok_at = datetime.now(timezone.utc)
            health.updated_at = datetime.now(timezone.utc)
            session.add(health)

            ckpt = session.get(Checkpoint, "last_discovery_sync") or Checkpoint(
                key="last_discovery_sync", value=""
            )
            ckpt.value = datetime.now(timezone.utc).isoformat()
            ckpt.updated_at = datetime.now(timezone.utc)
            session.add(ckpt)

            session.commit()

        return {"events": event_count, "markets": market_count}

    def tracked_asset_ids(self) -> list[str]:
        with get_session() as session:
            rows = session.exec(select(Market.asset_id).where(Market.asset_id.is_not(None))).all()
        return sorted({str(row) for row in rows if row})
