import { SystemStatus } from "@/types";
import Badge from "./ui/Badge";

interface SourceHealthProps {
  status: SystemStatus | null;
}

export default function SourceHealth({ status }: SourceHealthProps) {
  const sources = status?.source_health || [];

  const normalizeStatus = (s: string) => s.toLowerCase();

  const getStatusVariant = (s: string): "success" | "warning" | "destructive" | "muted" => {
    const lower = normalizeStatus(s);
    if (lower === "ok" || lower === "connected" || lower === "healthy") return "success";
    if (lower === "starting" || lower === "idle_no_assets") return "warning";
    if (lower === "degraded" || lower === "slow") return "warning";
    if (lower === "error" || lower === "down" || lower === "disconnected" || lower === "stale") return "destructive";
    return "muted";
  };

  const statusLabel = (s: string) => {
    const lower = normalizeStatus(s);
    if (lower === "starting") return "Starting";
    if (lower === "stale") return "Stale";
    if (lower === "disconnected") return "Disconnected";
    if (lower === "idle_no_assets") return "Idle (No Assets)";
    return s;
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    try {
      return new Date(time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Source Health</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Data source status</p>
      </div>

      {sources.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No source health data available
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sources.map((source) => (
            <div key={source.source} className="p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{source.source}</span>
                <Badge variant={getStatusVariant(source.status)} size="sm">
                  {statusLabel(source.status)}
                </Badge>
              </div>
              {source.last_error_message && (
                <p className="text-xs text-destructive mt-1 line-clamp-2">
                  {source.last_error_message}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {typeof source.tracked_asset_count === "number" && (
                  <span>Tracked Assets: {source.tracked_asset_count}</span>
                )}
                {source.last_subscribe_at && (
                  <span>Last Subscribe: {formatTime(source.last_subscribe_at)}</span>
                )}
                {source.last_ok_at && (
                  <span>Last OK: {formatTime(source.last_ok_at)}</span>
                )}
                {source.last_error_at && (
                  <span className="text-destructive">
                    Last Error: {formatTime(source.last_error_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
