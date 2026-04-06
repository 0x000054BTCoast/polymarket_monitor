"use client";

import { EventDetailResponse } from "@/types";
import Badge from "./ui/Badge";

interface EventDrawerProps {
  open: boolean;
  detail: EventDetailResponse | null;
  onClose: () => void;
}

export default function EventDrawer({ open, detail, onClose }: EventDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Event Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!detail ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading event details...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Event Info */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{detail.event.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{detail.event.category || "Uncategorized"}</Badge>
                  <Badge variant={detail.event.active ? "success" : "muted"}>
                    {detail.event.active ? "Active" : "Inactive"}
                  </Badge>
                  {detail.event.closed && <Badge variant="warning">Closed</Badge>}
                </div>
              </div>

              {/* Markets */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Markets ({detail.markets.length})
                </h4>
                <div className="space-y-3">
                  {detail.markets.map((market) => (
                    <div
                      key={market.id}
                      className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-sm mb-2">{market.question}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Outcome: </span>
                          <span className="font-medium">{market.outcome || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Price: </span>
                          <span className="font-medium font-mono">
                            {market.last_price != null
                              ? `${(market.last_price * 100).toFixed(1)}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Asset ID: </span>
                          <span className="font-mono text-xs">
                            {market.asset_id || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
