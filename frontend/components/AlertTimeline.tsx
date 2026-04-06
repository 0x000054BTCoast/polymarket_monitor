"use client";

import Link from "next/link";

import { AlertsResponse } from "@/types";

const severityClass: Record<string, string> = {
  critical: "border-rose-500",
  warning: "border-amber-500",
  info: "border-sky-500",
};

export default function AlertTimeline({ alerts, filter }: { alerts: AlertsResponse | null; filter: string }) {
  const rows = (alerts?.rows || []).filter((r) => !filter || r.severity === filter);
  if (!rows.length) return <div className="chart-empty">暂无告警时间线。</div>;

  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
      {rows.slice(0, 40).map((a) => (
        <div key={a.id} className={`panel-2 p-2 border-l-4 ${severityClass[a.severity] || "border-slate-500"}`}>
          <div className="text-[11px] muted">{new Date(a.created_at).toLocaleString()}</div>
          <div className="text-[12px] font-medium">{a.alert_type}</div>
          <div className="text-[12px] muted">{a.message}</div>
          <div className="text-[11px] mt-1">
            {a.event_id ? <Link className="text-sky-300 hover:underline" href={`/events?event=${a.event_id}`}>事件</Link> : null}
            {a.market_id ? <span className="ml-2 muted">market: {a.market_id}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
