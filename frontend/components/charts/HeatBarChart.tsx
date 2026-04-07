"use client";

import { RankRow } from "@/types";

interface HeatBarChartProps {
  rows: RankRow[];
  threshold?: number;
  maxItems?: number;
}

export default function HeatBarChart({ rows, threshold = 2, maxItems = 8 }: HeatBarChartProps) {
  const shortMarketId = (marketId?: string) => (marketId ? `${marketId.slice(0, 8)}...` : "-");
  const marketDisplay = (row: RankRow) =>
    row.market_question ?? row.event_title ?? shortMarketId(row.market_id);
  const data = rows.slice(0, maxItems);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No heat data available
      </div>
    );
  }

  const maxHeat = Math.max(...data.map((r) => Number(r.heat_rise || 0)), 1);

  return (
    <div className="space-y-3">
      {data.map((row, index) => {
        const heat = Number(row.heat_rise || 0);
        const width = (heat / maxHeat) * 100;
        const isHigh = heat >= threshold;
        const marketId = String(row.market_id || `market-${index}`);
        const label = marketDisplay(row);

        return (
          <div key={marketId} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="min-w-0">
                <div className="text-xs font-medium truncate max-w-[180px]">{label}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                  {row.event_title ?? "-"}
                  {row.market_id ? ` · ${shortMarketId(row.market_id)}` : ""}
                </div>
              </div>
              <span
                className={`text-xs font-mono font-medium ${
                  isHigh ? "text-destructive" : "text-foreground"
                }`}
              >
                {heat.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                  isHigh
                    ? "bg-gradient-to-r from-warning to-destructive"
                    : "bg-gradient-to-r from-info to-primary"
                }`}
                style={{ width: `${width}%` }}
              />
              {/* Threshold marker */}
              <div
                className="absolute top-0 h-full w-px bg-warning/50"
                style={{ left: `${(threshold / maxHeat) * 100}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-info to-primary" />
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-warning to-destructive" />
            <span>z &gt; {threshold}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
