"use client";

import { AlertsResponse } from "@/types";
import Badge from "../ui/Badge";

interface AlertTimelineProps {
  alerts: AlertsResponse | null;
  filter: string;
  maxItems?: number;
}

export default function AlertTimeline({ alerts, filter, maxItems = 30 }: AlertTimelineProps) {
  const shortMarketId = (marketId?: string) => (marketId ? `${marketId.slice(0, 8)}...` : "-");
  const marketDisplay = (alert: NonNullable<AlertsResponse["rows"]>[number]) =>
    alert.market_question ?? alert.event_title ?? shortMarketId(alert.market_id);
  const rows = (alerts?.rows || [])
    .filter((r) => !filter || r.severity === filter)
    .slice(0, maxItems);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No alerts to display
      </div>
    );
  }

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return time;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive";
      case "warning":
        return "bg-warning";
      default:
        return "bg-info";
    }
  };

  const getSeverityVariant = (severity: string): "destructive" | "warning" | "info" => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <div className="relative max-h-[300px] overflow-y-auto">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-0">
        {rows.map((alert, index) => (
          <div key={alert.id} className="relative pl-6 pb-4 last:pb-0">
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1 w-[14px] h-[14px] rounded-full border-2 border-background ${getSeverityColor(
                alert.severity
              )}`}
            />

            <div className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium">{alert.alert_type}</span>
                <Badge variant={getSeverityVariant(alert.severity)} size="sm">
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {alert.message}
              </p>
              {alert.market_id && (
                <div className="mb-2">
                  <p className="text-sm font-medium truncate">{marketDisplay(alert)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.event_title ?? "-"} · {shortMarketId(alert.market_id)}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{formatTime(alert.created_at)}</span>
                {alert.event_id && (
                  <span className="font-mono text-primary">
                    Event: {alert.event_id.slice(0, 8)}
                  </span>
                )}
                {alert.market_id && (
                  <span className="font-mono">Market: {shortMarketId(alert.market_id)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
