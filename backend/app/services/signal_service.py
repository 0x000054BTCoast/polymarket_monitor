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
        risk_flags = self._risk_flags([yes, no], latest_snaps, feasibility)
        return [
            self.format_signal_playbook_row(
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
            )
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
                self.format_signal_playbook_row(
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
                    "risk_flags": self._risk_flags([a, b], latest_snaps, feasibility),
                    "derived": True,
                    "disclaimer": "DERIVED 信号，非投资建议，仅供研究。",
                    }
                )
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

    def _risk_flags(self, markets: list[Market], latest_snaps: dict[str, Snapshot], feasibility: float = 0.5) -> dict:
        if not markets:
            return {
                "data_freshness_risk": "high",
                "liquidity_risk": "high",
                "slippage_risk": "high",
                "confidence": 0.1,
            }

        min_liquidity = min((m.liquidity or 0) for m in markets)
        avg_liquidity = sum((m.liquidity or 0) for m in markets) / len(markets)
        total_volume = sum((m.volume_24hr or 0) for m in markets)

        if min_liquidity < 500 or avg_liquidity < 800:
            liquidity_risk = "high"
        elif min_liquidity < 1500 or avg_liquidity < 2000:
            liquidity_risk = "medium"
        else:
            liquidity_risk = "low"

        if total_volume < 200:
            slippage_risk = "high"
        elif total_volume < 1000:
            slippage_risk = "medium"
        else:
            slippage_risk = "low"

        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(minutes=5)
        stale_ratio = 0.0
        for m in markets:
            snap = latest_snaps.get(m.id)
            if not snap:
                stale_ratio += 1 / len(markets)
                continue
            ts = snap.ts.replace(tzinfo=timezone.utc) if snap.ts.tzinfo is None else snap.ts
            if ts < stale_cutoff:
                stale_ratio += 1 / len(markets)

        if stale_ratio >= 0.75:
            data_freshness_risk = "high"
        elif stale_ratio > 0:
            data_freshness_risk = "medium"
        else:
            data_freshness_risk = "low"

        base_confidence = feasibility
        if data_freshness_risk == "high":
            base_confidence -= 0.35
        elif data_freshness_risk == "medium":
            base_confidence -= 0.15
        if liquidity_risk == "high":
            base_confidence -= 0.2
        elif liquidity_risk == "medium":
            base_confidence -= 0.1
        if slippage_risk == "high":
            base_confidence -= 0.2
        elif slippage_risk == "medium":
            base_confidence -= 0.1

        return {
            "data_freshness_risk": data_freshness_risk,
            "liquidity_risk": liquidity_risk,
            "slippage_risk": slippage_risk,
            "confidence": round(max(0.0, min(1.0, base_confidence)), 3),
        }

    def format_signal_playbook_row(self, row: dict) -> dict:
        signal_type = row.get("signal_type")
        raw_gap = float(row.get("raw_gap") or 0)
        confidence = float((row.get("risk_flags") or {}).get("confidence", 0))
        if signal_type == "binary_parity_gap":
            row["setup_type"] = "parity"
            row["thesis"] = "同一二元事件中 YES+NO 应接近 1，偏离越大，潜在回归空间越高。"
            row["entry_rule"] = f"当 |YES+NO-1| ≥ {max(0.02, raw_gap * 0.7):.3f} 且可执行性良好时触发。"
            row["exit_rule"] = "当偏离回归至 0.010 以下，或持仓超过 60 分钟则分批退出。"
            row["invalid_rule"] = "事件规则变更、盘口长期失活、或单边流动性骤降时失效。"
        else:
            row["setup_type"] = "cross-market"
            row["thesis"] = "同事件逻辑相关市场应满足单调约束，违反关系可提供相对价值机会。"
            row["entry_rule"] = f"当逻辑违背价差 ≥ {max(0.015, raw_gap * 0.8):.3f} 且成交更新正常时触发。"
            row["exit_rule"] = "当违背价差回落至 0.008 以下，或 45 分钟未收敛则止损离场。"
            row["invalid_rule"] = "问题语义不再可比、结算口径变化、或相关市场关联性下降时失效。"

        if confidence >= 0.75:
            row["position_sizing_hint"] = "可考虑常规仓位（如基准仓位 1.0x），优先深度更好的腿。"
        elif confidence >= 0.5:
            row["position_sizing_hint"] = "建议半仓试探（如 0.5x），分批挂单并监控成交偏离。"
        else:
            row["position_sizing_hint"] = "仅小仓位观察（如 ≤0.25x），以可执行性优先，避免追价。"
        return row
