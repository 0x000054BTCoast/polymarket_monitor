from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.storage.models import Market, MinuteAggregation, SignalSnapshot, Snapshot


class SignalService:
    method_version = "v1"

    def arbitrage_rows(self, session: Session, limit: int = 50) -> list[dict]:
        markets = session.exec(select(Market).where(Market.active == True, Market.closed == False)).all()  # noqa: E712
        by_event: dict[str, list[Market]] = defaultdict(list)
        for m in markets:
            by_event[m.event_id].append(m)

        latest_snaps = self._latest_snapshots(session)
        latest_minute = self._latest_minute_aggs(session)
        rows: list[dict] = []

        for event_id, mks in by_event.items():
            rows.extend(self._binary_parity_gap(event_id, mks, latest_snaps, latest_minute))
            rows.extend(self._cross_market_logic_gap(event_id, mks, latest_snaps, latest_minute))

        rows.sort(key=lambda x: x.get("score", 0), reverse=True)
        return rows[:limit]

    def snapshot(self, session: Session, limit: int = 50) -> dict:
        rows = self.arbitrage_rows(session, limit=limit)
        as_of = datetime.now(timezone.utc)
        session.add(
            SignalSnapshot(
                signal_type="arbitrage-v1",
                generated_at=as_of,
                payload={"rows": rows, "derived": True, "method_version": self.method_version},
            )
        )
        session.commit()
        return {
            "rows": rows,
            "derived": True,
            "as_of": as_of.isoformat(),
            "method_version": self.method_version,
            "disclaimer": "DERIVED 信号，非投资建议，仅供研究。",
        }

    def _latest_snapshots(self, session: Session) -> dict[str, Snapshot]:
        snaps = session.exec(select(Snapshot).order_by(Snapshot.ts.desc()).limit(800)).all()
        latest: dict[str, Snapshot] = {}
        for s in snaps:
            latest.setdefault(s.market_id, s)
        return latest

    def _latest_minute_aggs(self, session: Session) -> dict[str, MinuteAggregation]:
        mins = session.exec(select(MinuteAggregation).order_by(MinuteAggregation.minute_ts.desc()).limit(800)).all()
        latest: dict[str, MinuteAggregation] = {}
        for m in mins:
            latest.setdefault(m.market_id, m)
        return latest

    def _binary_parity_gap(
        self,
        event_id: str,
        markets: list[Market],
        latest_snaps: dict[str, Snapshot],
        latest_minute: dict[str, MinuteAggregation],
    ) -> list[dict]:
        yes = next((m for m in markets if (m.outcome or "").upper() == "YES"), None)
        no = next((m for m in markets if (m.outcome or "").upper() == "NO"), None)
        if not yes or not no:
            return []

        yes_price = yes.last_price if yes.last_price is not None else (latest_snaps.get(yes.id).price if latest_snaps.get(yes.id) else None)
        no_price = no.last_price if no.last_price is not None else (latest_snaps.get(no.id).price if latest_snaps.get(no.id) else None)
        if yes_price is None or no_price is None:
            return []

        raw_gap = abs((yes_price + no_price) - 1)
        liq = (yes.liquidity or 0) + (no.liquidity or 0)
        liquidity_adjusted_edge = raw_gap * min(liq / 10000, 1)
        feasibility = self._execution_feasibility(yes, no, latest_snaps, latest_minute)
        score = liquidity_adjusted_edge * feasibility
        risk_flags = self._risk_flags([yes, no], latest_snaps)
        return [
            {
                "signal_type": "binary_parity_gap",
                "event_id": event_id,
                "market_id": yes.id,
                "related_market_id": no.id,
                "raw_gap": round(raw_gap, 6),
                "liquidity_adjusted_edge": round(liquidity_adjusted_edge, 6),
                "execution_feasibility_score": round(feasibility, 6),
                "score": round(score, 6),
                "risk_flags": risk_flags,
                "derived": True,
                "disclaimer": "DERIVED 信号，非投资建议，仅供研究。",
            }
        ]

    def _cross_market_logic_gap(
        self,
        event_id: str,
        markets: list[Market],
        latest_snaps: dict[str, Snapshot],
        latest_minute: dict[str, MinuteAggregation],
    ) -> list[dict]:
        # V1 heuristic: within same event, a subset-like market should not price above superset-like market.
        sorted_markets = sorted(markets, key=lambda m: len((m.question or "").split()))
        rows: list[dict] = []
        for i in range(len(sorted_markets) - 1):
            a = sorted_markets[i]
            b = sorted_markets[i + 1]
            pa = a.last_price if a.last_price is not None else (latest_snaps.get(a.id).price if latest_snaps.get(a.id) else None)
            pb = b.last_price if b.last_price is not None else (latest_snaps.get(b.id).price if latest_snaps.get(b.id) else None)
            if pa is None or pb is None:
                continue
            violation = max(pa - pb, 0)
            if violation <= 0:
                continue
            liq = ((a.liquidity or 0) + (b.liquidity or 0)) / 2
            edge = violation * min(liq / 10000, 1)
            feasibility = self._execution_feasibility(a, b, latest_snaps, latest_minute)
            rows.append(
                {
                    "signal_type": "cross_market_logic_gap",
                    "event_id": event_id,
                    "market_id": a.id,
                    "related_market_id": b.id,
                    "rule": "subset_superset_v1",
                    "raw_gap": round(violation, 6),
                    "liquidity_adjusted_edge": round(edge, 6),
                    "execution_feasibility_score": round(feasibility, 6),
                    "score": round(edge * feasibility, 6),
                    "risk_flags": self._risk_flags([a, b], latest_snaps),
                    "derived": True,
                    "disclaimer": "DERIVED 信号，非投资建议，仅供研究。",
                }
            )
        return rows

    def _execution_feasibility(
        self,
        m1: Market,
        m2: Market,
        latest_snaps: dict[str, Snapshot],
        latest_minute: dict[str, MinuteAggregation],
    ) -> float:
        now = datetime.now(timezone.utc)
        freshness_scores = []
        update_scores = []
        for m in [m1, m2]:
            snap = latest_snaps.get(m.id)
            minute = latest_minute.get(m.id)
            if snap:
                age_s = (now - snap.ts.replace(tzinfo=timezone.utc) if snap.ts.tzinfo is None else now - snap.ts).total_seconds()
                freshness_scores.append(max(0.0, 1 - age_s / 300))
            else:
                freshness_scores.append(0.2)
            updates = minute.book_updates_1m if minute else 0
            update_scores.append(min(updates / 20, 1.0))

        slip_penalty = min(abs((m1.last_price or 0.5) - (m2.last_price or 0.5)), 1.0)
        base = (sum(freshness_scores) / len(freshness_scores)) * 0.6 + (sum(update_scores) / len(update_scores)) * 0.4
        return max(0.05, base * (1 - 0.5 * slip_penalty))

    def _risk_flags(self, markets: list[Market], latest_snaps: dict[str, Snapshot]) -> list[str]:
        flags: list[str] = []
        if any((m.liquidity or 0) < 500 for m in markets):
            flags.append("low_liquidity")
        if any((m.volume_24hr or 0) < 100 for m in markets):
            flags.append("thin_volume")
        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(minutes=5)
        stale = False
        for m in markets:
            snap = latest_snaps.get(m.id)
            if not snap:
                stale = True
                continue
            ts = snap.ts.replace(tzinfo=timezone.utc) if snap.ts.tzinfo is None else snap.ts
            if ts < stale_cutoff:
                stale = True
        if stale:
            flags.append("stale_data")
        return flags or ["normal"]
