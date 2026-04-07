"use client";

import { useMemo } from "react";

import { RankRow } from "@/types";

import ChartEmptyState from "./ChartEmptyState";

interface HeatHistogramProps {
  rows: RankRow[];
  maxItems?: number;
  bins?: number;
  windowKey: string;
}

export default function HeatHistogram({
  rows,
  maxItems = 40,
  bins = 8,
  windowKey,
}: HeatHistogramProps) {
  const histogram = useMemo(() => {
    const values = rows
      .slice(0, maxItems)
      .map((row) => Number(row.heat_rise || 0))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = range / bins;

    return Array.from({ length: bins }, (_, i) => {
      const from = min + step * i;
      const to = i === bins - 1 ? max : from + step;
      const count = values.filter((v) => (i === bins - 1 ? v >= from && v <= to : v >= from && v < to)).length;
      return { from, to, count };
    });
  }, [rows, maxItems, bins, windowKey]);

  if (!histogram.length) {
    return <ChartEmptyState height={220} />;
  }

  const maxCount = Math.max(...histogram.map((h) => h.count), 1);

  return (
    <div className="h-[220px] flex items-end gap-2 px-2 pb-4">
      {histogram.map((bin, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <div className="text-[10px] text-muted-foreground">{bin.count}</div>
          <div className="w-full bg-primary/80 rounded-t-sm" style={{ height: `${(bin.count / maxCount) * 150}px` }} />
          <div className="text-[10px] text-muted-foreground text-center leading-tight">
            {bin.from.toFixed(1)}
            <br />
            {bin.to.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}
