"use client";

import { HotTrendSeries } from "@/types";

export default function HotTrendChart({ series }: { series: HotTrendSeries[] }) {
  if (!series.length) {
    return <div className="chart-empty">暂无趋势数据（DERIVED）。</div>;
  }

  const width = 640;
  const height = 220;
  const allValues = series.flatMap((s) => s.points.map((p) => p.hot_score));
  const maxV = Math.max(...allValues, 1);
  const minV = Math.min(...allValues, 0);
  const colors = ["#60a5fa", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#fb7185"];

  const buildPath = (values: number[]) =>
    values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * (width - 20) + 10;
        const y = height - 20 - ((v - minV) / Math.max(maxV - minV, 0.0001)) * (height - 40);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px] bg-[#0a1426] rounded-lg border border-[#1d2c4a]">
        {series.map((s, idx) => (
          <path
            key={s.event_id}
            d={buildPath(s.points.map((p) => p.hot_score))}
            fill="none"
            stroke={colors[idx % colors.length]}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="flex flex-wrap gap-2 text-[11px]">
        {series.map((s, idx) => (
          <span key={s.event_id} className="badge" style={{ borderColor: colors[idx % colors.length] }} title={s.title}>
            {s.title}
          </span>
        ))}
      </div>
    </div>
  );
}
