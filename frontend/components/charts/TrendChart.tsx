"use client";

import { HotTrendSeries } from "@/types";

interface TrendChartProps {
  series: HotTrendSeries[];
  height?: number;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function TrendChart({ series, height = 200 }: TrendChartProps) {
  if (!series.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No trend data available
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate bounds
  const allPoints = series.flatMap((s) => s.points);
  const allValues = allPoints.map((p) => p.hot_score);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue || 1;

  // Calculate time bounds
  const allTimes = allPoints.map((p) => new Date(p.ts).getTime());
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const timeRange = maxTime - minTime || 1;

  const scaleX = (time: number) => ((time - minTime) / timeRange) * chartWidth;
  const scaleY = (value: number) => chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const buildPath = (points: HotTrendSeries["points"]) => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => {
        const x = scaleX(new Date(p.ts).getTime());
        const y = scaleY(p.hot_score);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  const buildArea = (points: HotTrendSeries["points"]) => {
    if (points.length === 0) return "";
    const linePath = buildPath(points);
    const lastX = scaleX(new Date(points[points.length - 1].ts).getTime());
    const firstX = scaleX(new Date(points[0].ts).getTime());
    return `${linePath}L${lastX},${chartHeight}L${firstX},${chartHeight}Z`;
  };

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4;
    return { value, y: scaleY(value) };
  });

  // X-axis ticks (time labels)
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const time = minTime + (timeRange * i) / 4;
    return {
      time,
      x: scaleX(time),
      label: new Date(time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  });

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={s.event_id} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[idx % COLORS.length]} stopOpacity="0.3" />
              <stop offset="100%" stopColor={COLORS[idx % COLORS.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={tick.y}
                x2={chartWidth}
                y2={tick.y}
                stroke="hsl(var(--border))"
                strokeDasharray="4,4"
              />
              <text
                x={-10}
                y={tick.y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-[10px] fill-muted-foreground"
              >
                {tick.value.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={chartHeight + 20}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground"
            >
              {tick.label}
            </text>
          ))}

          {/* Area fills */}
          {series.map((s, idx) => (
            <path
              key={`area-${s.event_id}`}
              d={buildArea(s.points)}
              fill={`url(#gradient-${idx})`}
            />
          ))}

          {/* Lines */}
          {series.map((s, idx) => (
            <path
              key={s.event_id}
              d={buildPath(s.points)}
              fill="none"
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Current value dots */}
          {series.map((s, idx) => {
            const lastPoint = s.points[s.points.length - 1];
            if (!lastPoint) return null;
            const x = scaleX(new Date(lastPoint.ts).getTime());
            const y = scaleY(lastPoint.hot_score);
            return (
              <circle
                key={`dot-${s.event_id}`}
                cx={x}
                cy={y}
                r={4}
                fill={COLORS[idx % COLORS.length]}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-2">
        {series.map((s, idx) => (
          <div key={s.event_id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={s.title}>
              {s.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
