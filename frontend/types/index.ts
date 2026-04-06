export type SystemStatus = {
  tracked_events: number;
  tracked_assets: number;
  websocket_status: string;
  last_sync_time: string | null;
  source_mode_badges?: Record<string, string>;
  category_counts?: Record<string, number>;
  source_health: Array<{
    source: string;
    status: string;
    last_error_message?: string | null;
    last_ok_at?: string | null;
    last_error_at?: string | null;
  }>;
};

export type EventRow = {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  volume24hr?: number;
  openInterest?: number;
  liquidity?: number;
  commentCount?: number;
  featured?: boolean;
};

export type RankRow = Record<string, unknown>;

export type AlertsResponse = {
  rows: Array<{
    id: number;
    alert_type: string;
    severity: string;
    message: string;
    created_at: string;
    market_id?: string;
    event_id?: string;
  }>;
};

export type EventDetailResponse = {
  event: {
    id: string;
    title: string;
    category?: string;
    active: boolean;
    closed: boolean;
  };
  markets: Array<{
    id: string;
    question: string;
    outcome?: string;
    asset_id?: string;
    clob_token_id?: string;
    last_price?: number;
  }>;
};
