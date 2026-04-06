import { AlertsResponse } from "@/types";

export default function AlertsPanel({ alerts }: { alerts: AlertsResponse | null }) {
  return (
    <aside className="panel p-3">
      <h3 className="text-sm font-semibold tracking-wide mb-2">Alerts</h3>
      {!alerts || alerts.rows.length === 0 ? (
        <div className="text-[12px] muted">No alerts.</div>
      ) : (
        <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
          {alerts.rows.slice(0, 30).map((a) => (
            <div key={a.id} className="panel-2 px-2 py-1.5 text-[12px]">
              <div className="font-medium leading-tight">{a.alert_type} · {a.severity}</div>
              <div className="muted leading-tight mt-0.5">{a.message}</div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
