import { AlertsResponse, ArbitrageSignalRow, EventRow, RankRow, SystemStatus } from "@/types";

export const mockStatus: SystemStatus = {
  tracked_events: 12,
  tracked_assets: 31,
  websocket_status: "degraded-mock",
  last_sync_time: new Date().toISOString(),
  source_mode_badges: {
    gamma: "official-public",
    clob: "official-public",
    market_ws: "official-public",
    data_api: "official-public-optional",
    rtds: "disabled-by-default"
  },
  source_health: [{ source: "mock", status: "demo" }]
};

export const mockHot: RankRow[] = [
  { event_id: "demo-1", title: "MOCK/DEMO Event A", hot_score: 0.91, derived: true },
  { event_id: "demo-2", title: "MOCK/DEMO Event B", hot_score: 0.83, derived: true }
];

export const mockHeat: RankRow[] = [
  { market_id: "demo-mkt-1", heat_rise: 1.44, fallback: true, derived: true },
  { market_id: "demo-mkt-2", heat_rise: 1.09, fallback: true, derived: true }
];

export const mockMovers: RankRow[] = [
  { market_id: "demo-mkt-1", abs_move_1m: 0.12, abs_move_5m: 0.21, derived: true },
  { market_id: "demo-mkt-2", abs_move_1m: 0.09, abs_move_5m: 0.17, derived: true }
];

export const mockAlerts: AlertsResponse = {
  rows: [
    {
      id: 1,
      alert_type: "MOCK_DEMO_ALERT",
      severity: "info",
      message: "MOCK/DEMO: backend unavailable",
      created_at: new Date().toISOString()
    }
  ]
};

export const mockEvents: EventRow[] = [
  { id: "demo-1", title: "MOCK/DEMO Event A", category: "Politics", featured: true },
  { id: "demo-2", title: "MOCK/DEMO Event B", category: "Sports", featured: false }
];

export const mockArbitragePayload: {
  rows: ArbitrageSignalRow[];
  derived: boolean;
  as_of: string;
  method_version: string;
  disclaimer: string;
} = {
  rows: [],
  derived: true,
  as_of: "",
  method_version: "mock-fallback",
  disclaimer: "DERIVED 信号，非投资建议，仅供研究。",
};
