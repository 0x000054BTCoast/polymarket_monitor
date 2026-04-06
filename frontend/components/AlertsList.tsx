"use client";

import { AlertsResponse } from "@/types";
import Badge from "./ui/Badge";

interface AlertsListProps {
  alerts: AlertsResponse | null;
  maxItems?: number;
}

const severityConfig = {
  critical: { variant: "destructive" as const, label: "Critical" },
  warning: { variant: "warning" as const, label: "Warning" },
  info: { variant: "info" as const, label: "Info" },
};

export default function AlertsList({ alerts, maxItems = 20 }: AlertsListProps) {
  const rows = alerts?.rows?.slice(0, maxItems) || [];

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return time;
    }
  };

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Alerts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">System notifications</p>
        </div>
        <div className="p-8 text-center text-sm text-muted-foreground">
          No alerts at this time
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Alerts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">System notifications</p>
        </div>
        <Badge variant="muted">{rows.length}</Badge>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <div className="divide-y divide-border">
          {rows.map((alert) => {
            const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
            return (
              <div key={alert.id} className="p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      alert.severity === "critical"
                        ? "bg-destructive"
                        : alert.severity === "warning"
                        ? "bg-warning"
                        : "bg-info"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{alert.alert_type}</span>
                      <Badge variant={config.variant} size="sm">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatTime(alert.created_at)}</span>
                      {alert.event_id && (
                        <span className="font-mono">Event: {alert.event_id.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
