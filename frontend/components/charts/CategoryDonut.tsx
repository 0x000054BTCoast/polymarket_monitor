"use client";

import { useMemo } from "react";

import ChartEmptyState from "./ChartEmptyState";

interface CategoryDonutProps {
  categoryCounts?: Record<string, number>;
  maxItems?: number;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function CategoryDonut({ categoryCounts, maxItems = 8 }: CategoryDonutProps) {
  const data = useMemo(() => {
    if (!categoryCounts) return [];
    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value: Number(value || 0) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, maxItems);
  }, [categoryCounts, maxItems]);

  if (!data.length) {
    return <ChartEmptyState height={220} message="No category distribution available" />;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let acc = 0;
  const r = 70;
  const stroke = 28;
  const c = 2 * Math.PI * r;

  return (
    <div className="h-[220px] flex items-center justify-between gap-4">
      <svg viewBox="0 0 220 220" className="w-[170px] h-[170px]">
        <g transform="translate(110,110) rotate(-90)">
          {data.map((segment, idx) => {
            const fraction = segment.value / total;
            const dash = fraction * c;
            const offset = -acc * c;
            acc += fraction;
            return (
              <circle
                key={segment.name}
                r={r}
                cx={0}
                cy={0}
                fill="transparent"
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x="110" y="104" textAnchor="middle" className="fill-foreground text-lg font-semibold">
          {total}
        </text>
        <text x="110" y="124" textAnchor="middle" className="fill-muted-foreground text-[10px]">
          total
        </text>
      </svg>

      <div className="flex-1 space-y-1 min-w-0">
        {data.map((segment, idx) => (
          <div key={segment.name} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="truncate" title={segment.name}>{segment.name}</span>
            </div>
            <span className="font-mono text-muted-foreground">{((segment.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
