"use client";

import { RankRow } from "@/types";

interface CorrelationViewProps {
  movers: RankRow[];
  heat: RankRow[];
  maxItems?: number;
}

export default function CorrelationView({ movers, heat, maxItems = 6 }: CorrelationViewProps) {
  const shortMarketId = (marketId?: string) => (marketId ? `${marketId.slice(0, 8)}...` : "-");
  const marketDisplay = (row: RankRow) =>
    row.market_question ?? row.event_title ?? shortMarketId(row.market_id);
  const combined = movers.slice(0, maxItems).map((m) => {
    const marketId = String(m.market_id || "");
    const heatRow = heat.find((h) => String(h.market_id) === marketId);
    return {
      marketId,
      market_question: m.market_question || heatRow?.market_question,
      event_title: m.event_title || heatRow?.event_title,
      move: Math.abs(Number(m.abs_move_1m || 0)),
      heat: Number(heatRow?.heat_rise || 0),
    };
  });

  if (combined.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
        No correlation data available
      </div>
    );
  }

  const maxMove = Math.max(...combined.map((c) => c.move), 0.01);
  const maxHeat = Math.max(...combined.map((c) => c.heat), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {combined.map((item) => {
          const moveHeight = (item.move / maxMove) * 100;
          const heatHeight = (item.heat / maxHeat) * 100;

          return (
            <div key={item.marketId} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-mono truncate mb-3">
                {marketDisplay({
                  market_id: item.marketId,
                  market_question: item.market_question,
                  event_title: item.event_title,
                })}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mb-2">
                {item.event_title ?? "-"} · {shortMarketId(item.marketId)}
              </p>
              <div className="flex items-end gap-2 h-16">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-muted rounded-t-sm overflow-hidden h-14 flex items-end">
                    <div
                      className="w-full bg-primary rounded-t-sm transition-all"
                      style={{ height: `${moveHeight}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">Move</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-muted rounded-t-sm overflow-hidden h-14 flex items-end">
                    <div
                      className="w-full bg-success rounded-t-sm transition-all"
                      style={{ height: `${heatHeight}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">Heat</span>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-primary font-mono">{(item.move * 100).toFixed(1)}%</span>
                <span className="text-success font-mono">{item.heat.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>Price Movement (1m)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-success" />
          <span>Heat Rise</span>
        </div>
      </div>
    </div>
  );
}
