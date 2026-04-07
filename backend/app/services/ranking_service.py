from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from statistics import mean, pstdev

from sqlmodel import Session, select

from app.config import settings
from app.storage.models import Event, Market, MinuteAggregation, RankingSnapshot, Snapshot


def _safe_norm(values: list[float | None], value: float | None) -> float:
    clean = [v for v in values if v is not None]
    if not clean or value is None:
        return 0.0
    lo, hi = min(clean), max(clean)
    if hi == lo:
        return 0.0
    return (value - lo) / (hi - lo)


def _safe_zscore(values: list[float], value: float) -> float:
    if not values:
        return 0.0
    mu = mean(values)
    sigma = pstdev(values)
    if sigma == 0:
        return 0.0
    return (value - mu) / sigma


class RankingService:
    def _market_context(self, session: Session, market_ids: set[str]) -> dict[str, dict[str, str | None]]:
        if not market_ids:
            return {}
        rows = session.exec(
            select(Market, Event)
            .join(Event, Event.id == Market.event_id, isouter=True)
            .where(Market.id.in_(market_ids))
        ).all()
        mapping: dict[str, dict[str, str | None]] = {}
        for market, event in rows:
            mapping[market.id] = {
                "market_question": market.question,
                "event_title": event.title if event else None,
                "event_id": market.event_id,
            }
        return mapping

    def _attach_market_context(self, session: Session, rows: list[dict]) -> list[dict]:
        market_ids = {str(r.get("market_id")) for r in rows if r.get("market_id")}
        context = self._market_context(session, market_ids)
        for row in rows:
            market_id = row.get("market_id")
            info = context.get(str(market_id)) if market_id else None
            row["market_question"] = info.get("market_question") if info else None
            row["event_title"] = info.get("event_title") if info else None
            if info and not row.get("event_id"):
                row["event_id"] = info.get("event_id")
        return rows

    def derived_hot_events(self, session: Session, limit: int = 20) -> list[dict]:
        events = session.exec(select(Event).where(Event.active == True, Event.closed == False)).all()  # noqa: E712
        vols = [e.volume_24hr for e in events]
        oi = [e.open_interest for e in events]
        liq = [e.liquidity for e in events]
        cmt = [float(e.comment_count) if e.comment_count is not None else None for e in events]

        ranked = []
        for e in events:
            score = (
                0.45 * _safe_norm(vols, e.volume_24hr)
                + 0.20 * _safe_norm(oi, e.open_interest)
                + 0.20 * _safe_norm(liq, e.liquidity)
                + 0.10 * _safe_norm(cmt, float(e.comment_count) if e.comment_count else None)
                + 0.05 * (1.0 if e.featured else 0.0)
            )
            ranked.append(
                {
                    "event_id": e.id,
                    "title": e.title,
                    "category": e.category,
                    "hot_score": round(score, 6),
                    "derived": True,
                }
            )
        ranked.sort(key=lambda x: x["hot_score"], reverse=True)
        payload = ranked[:limit]
        session.add(RankingSnapshot(ranking_type="hot-events", generated_at=datetime.now(timezone.utc), payload={"rows": payload}))
        session.commit()
        return payload

    # Backward-compatible alias for API/service callers.
    def hot_events(self, session: Session, limit: int = 20) -> list[dict]:
        return self.derived_hot_events(session, limit=limit)

    def heat_risers(self, session: Session, limit: int = 20) -> list[dict]:
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        baseline_from = now - timedelta(minutes=settings.rolling_baseline_minutes)

        mins = session.exec(select(MinuteAggregation).where(MinuteAggregation.minute_ts >= baseline_from)).all()
        by_market: dict[str, list[MinuteAggregation]] = defaultdict(list)
        for row in mins:
            by_market[row.market_id].append(row)

        current_metrics = []
        for market_id, rows in by_market.items():
            rows.sort(key=lambda r: r.minute_ts)
            cur = rows[-1]
            current_metrics.append(
                {
                    "market_id": market_id,
                    "trade_notional_1m": cur.trade_notional_1m,
                    "trade_count_1m": float(cur.trade_count_1m),
                    "abs_return_1m": abs(cur.price_return_1m),
                    "book_updates_1m": float(cur.book_updates_1m),
                    "baseline_rows": rows[:-1],
                }
            )

        if not current_metrics:
            return self._fallback_heat(session, limit)

        vals_notional = [x["trade_notional_1m"] for x in current_metrics]
        vals_count = [x["trade_count_1m"] for x in current_metrics]
        vals_ret = [x["abs_return_1m"] for x in current_metrics]
        vals_book = [x["book_updates_1m"] for x in current_metrics]

        out = []
        for x in current_metrics:
            current = (
                0.40 * _safe_zscore(vals_notional, x["trade_notional_1m"])
                + 0.25 * _safe_zscore(vals_count, x["trade_count_1m"])
                + 0.20 * _safe_zscore(vals_ret, x["abs_return_1m"])
                + 0.15 * _safe_zscore(vals_book, x["book_updates_1m"])
            )
            baselines = []
            for r in x["baseline_rows"]:
                baselines.append(
                    0.40 * r.trade_notional_1m
                    + 0.25 * r.trade_count_1m
                    + 0.20 * abs(r.price_return_1m)
                    + 0.15 * r.book_updates_1m
                )
            baseline = mean(baselines) if baselines else 0.0
            out.append(
                {
                    "market_id": x["market_id"],
                    "heat_rise": round(current - baseline, 6),
                    "fallback": False,
                    "derived": True,
                }
            )

        out.sort(key=lambda x: x["heat_rise"], reverse=True)
        return self._attach_market_context(session, out[:limit])

    def _fallback_heat(self, session: Session, limit: int) -> list[dict]:
        snaps = session.exec(select(Snapshot).order_by(Snapshot.ts.desc()).limit(400)).all()
        by_market: dict[str, list[Snapshot]] = defaultdict(list)
        for s in snaps:
            by_market[s.market_id].append(s)
        out = []
        for market_id, rows in by_market.items():
            if len(rows) < 2:
                continue
            latest, prev = rows[0], rows[1]
            score = (
                0.4 * ((latest.volume_24hr or 0) - (prev.volume_24hr or 0))
                + 0.2 * ((latest.liquidity or 0) - (prev.liquidity or 0))
                + 0.2 * ((latest.open_interest or 0) - (prev.open_interest or 0))
                + 0.2 * ((latest.comment_count or 0) - (prev.comment_count or 0))
            )
            out.append({"market_id": market_id, "heat_rise": round(score, 6), "fallback": True, "derived": True})
        out.sort(key=lambda x: x["heat_rise"], reverse=True)
        return self._attach_market_context(session, out[:limit])


    def hot_trend(self, session: Session, hours: float = 24, top_k: int = 5) -> dict:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        snaps = session.exec(
            select(RankingSnapshot)
            .where(RankingSnapshot.ranking_type == "hot-events", RankingSnapshot.generated_at >= since)
            .order_by(RankingSnapshot.generated_at.asc())
        ).all()
        series_map: dict[str, dict] = {}
        for snap in snaps:
            for row in snap.payload.get("rows", [])[:top_k]:
                eid = row.get("event_id")
                if not eid:
                    continue
                if eid not in series_map:
                    series_map[eid] = {"event_id": eid, "title": row.get("title", eid), "points": []}
                series_map[eid]["points"].append({"ts": snap.generated_at.isoformat(), "hot_score": row.get("hot_score", 0)})
        return {"rows": list(series_map.values()), "derived": True, "as_of": datetime.now(timezone.utc).isoformat()}

    def price_movers(self, session: Session, limit: int = 20) -> list[dict]:
        now = datetime.now(timezone.utc)
        rows = session.exec(select(Snapshot).where(Snapshot.ts >= now - timedelta(minutes=6))).all()
        by_market: dict[str, list[Snapshot]] = defaultdict(list)
        for s in rows:
            by_market[s.market_id].append(s)
        movers = []
        for market_id, snaps in by_market.items():
            snaps.sort(key=lambda s: s.ts)
            prices = [s.price for s in snaps if s.price is not None]
            if len(prices) < 2:
                continue
            ret_1m = abs((prices[-1] - prices[-2]) / prices[-2]) if prices[-2] else 0
            ret_5m = abs((prices[-1] - prices[0]) / prices[0]) if prices[0] else 0
            movers.append({"market_id": market_id, "abs_move_1m": ret_1m, "abs_move_5m": ret_5m, "derived": True})
        movers.sort(key=lambda x: (x["abs_move_1m"], x["abs_move_5m"]), reverse=True)
        return self._attach_market_context(session, movers[:limit])

    def disagreement(self, session: Session, limit: int = 20) -> list[dict]:
        markets = session.exec(select(Market).where(Market.active == True, Market.closed == False)).all()  # noqa: E712
        out = []
        for m in markets:
            if m.last_price is None or m.liquidity is None:
                continue
            price = m.last_price
            disagreement_score = (1 - abs(price - 0.5) * 2) * min(m.liquidity / 10000, 1)
            out.append(
                {
                    "market_id": m.id,
                    "event_id": m.event_id,
                    "disagreement_score": round(disagreement_score, 6),
                    "derived": True,
                }
            )
        out.sort(key=lambda x: x["disagreement_score"], reverse=True)
        return self._attach_market_context(session, out[:limit])

    def new_entrants(self, session: Session, top_n: int = 10) -> list[dict]:
        current = self.derived_hot_events(session, limit=top_n)
        snaps = session.exec(
            select(RankingSnapshot)
            .where(RankingSnapshot.ranking_type == "hot-events")
            .order_by(RankingSnapshot.generated_at.desc())
            .limit(2)
        ).all()
        if len(snaps) < 2:
            return []
        prev_rows = snaps[1].payload.get("rows", [])
        prev_ids = {r.get("event_id") for r in prev_rows}
        prev_scores = {r.get("event_id"): r.get("hot_score", 0) for r in prev_rows}

        entrants = []
        for row in current:
            eid = row["event_id"]
            if eid in prev_ids:
                continue
            accel = row["hot_score"] - float(prev_scores.get(eid, 0) or 0)
            if accel > 0:
                entrants.append({**row, "score_acceleration": round(accel, 6), "derived": True})
        return entrants
