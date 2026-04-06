"use client";

import { RankRow } from "@/types";

export default function HeatShockChart({ rows, threshold }: { rows: RankRow[]; threshold: number }) {
  if (!rows.length) return <div className="chart-empty">暂无热度冲击数据（DERIVED）。</div>;
  const max = Math.max(...rows.map((r) => Number((r as any).heat_rise || 0)), 1);

  return (
    <div className="space-y-2">
      {rows.slice(0, 12).map((row) => {
        const value = Number((row as any).heat_rise || 0);
        const width = `${Math.min((value / max) * 100, 100)}%`;
        const high = value >= threshold;
        return (
          <div key={String((row as any).market_id)}>
            <div className="text-[11px] muted mb-1">{String((row as any).market_id)}</div>
            <div className="h-3 rounded bg-[#10203a] overflow-hidden border border-[#1d2c4a]">
              <div className={`h-full ${high ? "bg-rose-500" : "bg-sky-500"}`} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
