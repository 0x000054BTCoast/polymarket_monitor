import { SystemStatus } from "@/types";

export default function SourceHealthPanel({ status }: { status: SystemStatus | null }) {
  return (
    <section className="panel p-3">
      <h3 className="text-sm font-semibold tracking-wide mb-2">Source Health</h3>
      <div className="space-y-1.5">
        {(status?.source_health || []).length === 0 ? (
          <div className="text-[12px] muted">No source health data yet.</div>
        ) : (
          status?.source_health.map((row) => (
            <div key={row.source} className="panel-2 px-2 py-1.5 text-[12px]">
              <div className="font-medium">{row.source} · {row.status}</div>
              {row.last_error_message ? <div className="text-amber-300 mt-0.5">{row.last_error_message}</div> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
