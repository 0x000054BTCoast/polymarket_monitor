"use client";

import { RankRow } from "@/types";

export default function MarketLinkView({ movers, heat }: { movers: RankRow[]; heat: RankRow[] }) {
  const combined = movers.slice(0, 6).map((m) => {
    const marketId = String((m as any).market_id);
    const heatRow = heat.find((h) => String((h as any).market_id) === marketId);
    return {
      marketId,
      move: Number((m as any).abs_move_1m || 0),
      heat: Number((heatRow as any)?.heat_rise || 0),
    };
  });

  if (!combined.length) return <div className="chart-empty">暂无联动视图数据（DERIVED）。</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {combined.map((r) => (
        <div key={r.marketId} className="panel-2 p-2">
          <div className="text-[11px] font-medium truncate">{r.marketId}</div>
          <div className="mt-2 h-16 flex items-end gap-2">
            <div className="w-1/2 rounded-t bg-indigo-500" style={{ height: `${Math.min(r.move * 260, 100)}%` }} title="price move" />
            <div className="w-1/2 rounded-t bg-emerald-500" style={{ height: `${Math.min(Math.max(r.heat, 0) * 24, 100)}%` }} title="heat" />
          </div>
          <div className="mt-1 text-[10px] muted">联动对比: move/heat</div>
        </div>
      ))}
    </div>
  );
}
