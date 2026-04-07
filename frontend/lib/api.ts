import { AlertsResponse, ArbitrageSignalRow, EventDetailResponse, EventRow, HotTrendSeries, RankRow, SystemStatus } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  health: () => getJson<{ status: string }>("/health"),
  system: () => getJson<SystemStatus>("/api/system/status"),
  hotEvents: (limit = 100) => getJson<{ rows: RankRow[]; derived: boolean }>(`/api/rankings/hot-events?limit=${limit}`),
  trendingOfficial: (limit = 100) =>
    getJson<{ rows: RankRow[]; source: string; as_of: string; field_mapping_note?: Record<string, string> }>(
      `/api/rankings/trending-official?limit=${limit}`
    ),
  hotTrend: (hours = 24, topK = 5) => getJson<{ rows: HotTrendSeries[]; derived: boolean; as_of: string }>(`/api/rankings/hot-trend?hours=${hours}&top_k=${topK}`),
  heatRisers: (limit = 100) => getJson<{ rows: RankRow[]; derived: boolean; fallback: boolean }>(`/api/rankings/heat-risers?limit=${limit}`),
  priceMovers: (limit = 100) => getJson<{ rows: RankRow[]; derived: boolean }>(`/api/rankings/price-movers?limit=${limit}`),
  arbitrageSignals: (limit = 50) => getJson<{ rows: ArbitrageSignalRow[]; derived: boolean; as_of: string; method_version: string; disclaimer: string }>(`/api/signals/arbitrage?limit=${limit}`),
  alerts: () => getJson<AlertsResponse>("/api/alerts"),
  events: () => getJson<{ rows: EventRow[] }>("/api/events"),
  eventDetail: (eventId: string) => getJson<EventDetailResponse>(`/api/events/${eventId}`)
};
