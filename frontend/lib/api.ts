import { AlertsResponse, EventDetailResponse, EventRow, RankRow, SystemStatus } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  health: () => getJson<{ status: string }>("/health"),
  system: () => getJson<SystemStatus>("/api/system/status"),
  hotEvents: () => getJson<{ rows: RankRow[]; derived: boolean }>("/api/rankings/hot-events"),
  heatRisers: () => getJson<{ rows: RankRow[]; derived: boolean; fallback: boolean }>("/api/rankings/heat-risers"),
  priceMovers: () => getJson<{ rows: RankRow[]; derived: boolean }>("/api/rankings/price-movers"),
  alerts: () => getJson<AlertsResponse>("/api/alerts"),
  events: () => getJson<{ rows: EventRow[] }>("/api/events"),
  eventDetail: (eventId: string) => getJson<EventDetailResponse>(`/api/events/${eventId}`)
};
