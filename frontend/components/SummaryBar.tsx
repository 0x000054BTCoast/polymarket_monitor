import { SystemStatus } from "@/types";

export default function SummaryBar({ status }: { status: SystemStatus | null }) {
  const badges = Object.entries(status?.source_mode_badges || {});
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          ["Tracked Events", status?.tracked_events ?? "-"],
          ["Tracked Assets", status?.tracked_assets ?? "-"],
          ["WebSocket", status?.websocket_status ?? "unknown"],
          ["Last Sync", status?.last_sync_time ?? "-"],
        ].map(([k, v]) => (
          <div key={String(k)} className="panel px-3 py-2">
            <div className="text-[11px] muted uppercase tracking-wide">{k}</div>
            <div className="text-sm font-semibold truncate">{String(v)}</div>
          </div>
        ))}
      </div>
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {badges.map(([k, v]) => (
            <span key={k} className="panel-2 text-[11px] px-2 py-1">
              {k}: <span className="muted">{v}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
