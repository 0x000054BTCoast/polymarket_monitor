"use client";

import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { mockEvents } from "@/lib/mock";
import { EventRow } from "@/types";

export default function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    api
      .events()
      .then((d) => {
        setRows(d.rows || []);
        setDegraded(false);
      })
      .catch(() => {
        setRows(mockEvents);
        setDegraded(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const title = String(r.title || "").toLowerCase();
      const category = String(r.category || "");
      return (
        title.includes(searchQuery.toLowerCase()) &&
        (!categoryFilter || category === categoryFilter)
      );
    });
  }, [rows, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(rows.map((r) => r.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [rows]);

  const formatNumber = (num: number | undefined) => {
    if (num == null) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse all tracked prediction market events
            </p>
          </div>
          <div className="flex items-center gap-2">
            {degraded && <Badge variant="warning">Mock Mode</Badge>}
            <Badge variant="muted">{filtered.length} events</Badge>
          </div>
        </div>

        {/* Degraded Mode Banner */}
        {degraded && (
          <div className="card p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-warning flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-warning">Demo Mode Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Backend is unavailable. Displaying mock data for demonstration purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="select"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <span>Loading events...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-6 h-6 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h3 className="font-medium mb-1">No events found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Events Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="card p-4 hover:border-primary/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  {event.featured && (
                    <svg
                      className="w-4 h-4 text-warning flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="muted" size="sm">
                    {event.category || "Uncategorized"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-muted-foreground mb-0.5">Volume 24h</p>
                    <p className="font-medium font-mono">
                      ${formatNumber(event.volume24hr)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-muted-foreground mb-0.5">Open Interest</p>
                    <p className="font-medium font-mono">
                      ${formatNumber(event.openInterest)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-muted-foreground mb-0.5">Liquidity</p>
                    <p className="font-medium font-mono">
                      ${formatNumber(event.liquidity)}
                    </p>
                  </div>
                </div>

                {event.commentCount != null && event.commentCount > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                      />
                    </svg>
                    <span>{event.commentCount} comments</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
