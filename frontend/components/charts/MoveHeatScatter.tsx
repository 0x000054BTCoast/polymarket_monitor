"use client";

import { useMemo } from "react";

import { RankRow } from "@/types";

import ChartEmptyState from "./ChartEmptyState";

interface MoveHeatScatterProps {
  movers: RankRow[];
  heat: RankRow[];
  maxItems?: number;
  windowKey: string;
}

export default function MoveHeatScatter({
  movers,
  heat,
  maxItems = 30,
  windowKey,
}: MoveHeatScatterProps) {
  const points = useMemo(() => {
    return movers.slice(0, maxItems).map((m) => {
      const marketId = String(m.market_id || "");
      const heatRow = heat.find((h) => String(h.market_id || "") === marketId);
      return {
        id: marketId,
        x: Math.abs(Number(m.abs_move_1m || 0)),
        y: Number(heatRow?.heat_rise || 0),
        notional: Number(heatRow?.trade_notional_1m || 0),
      };
    }).filter((p) => p.id);
  }, [movers, heat, maxItems, windowKey]);

  if (!points.length) {
    return <ChartEmptyState height={220} message="No move/heat pairs available" />;
  }

  const maxX = Math.max(...points.map((p) => p.x), 0.001);
  const maxY = Math.max(...points.map((p) => p.y), 0.001);
  const minY = Math.min(...points.map((p) => p.y), 0);
  const yRange = maxY - minY || 1;
  const maxNotional = Math.max(...points.map((p) => p.notional), 1);

  return (
    <svg viewBox="0 0 360 220" className="w-full h-[220px]">
      <rect x="0" y="0" width="360" height="220" fill="transparent" />
      <line x1="40" y1="180" x2="330" y2="180" stroke="hsl(var(--border))" />
      <line x1="40" y1="20" x2="40" y2="180" stroke="hsl(var(--border))" />

      {points.map((point) => {
        const cx = 40 + (point.x / maxX) * 290;
        const cy = 180 - ((point.y - minY) / yRange) * 160;
        const radius = 3 + (point.notional / maxNotional) * 7;

        return (
          <circle
            key={point.id}
            cx={cx}
            cy={cy}
            r={radius}
            fill="hsl(var(--chart-3))"
            fillOpacity="0.55"
            stroke="hsl(var(--chart-3))"
            strokeOpacity="0.9"
          />
        );
      })}

      <text x="330" y="205" textAnchor="end" className="fill-muted-foreground text-[10px]">
        abs_move_1m
      </text>
      <text x="16" y="18" textAnchor="start" className="fill-muted-foreground text-[10px]">
        heat_rise
      </text>
    </svg>
  );
}
