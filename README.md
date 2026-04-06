# polymarket-monitor

Local Polymarket monitoring stack (FastAPI + SQLite + Next.js) for discovery, realtime ingestion, derived rankings, alerting, and dashboard visualization.

## What this project does

- Discovers active/non-closed events from Gamma (`/events?active=true&closed=false`).
- Persists event/market metadata and market snapshots to SQLite.
- Ingests market websocket updates and computes minute aggregations.
- Produces **DERIVED** rankings:
  - Hot Events
  - Minute Heat Rise
  - Price Movers (1m/5m)
  - Disagreement
  - New Entrants
- Runs configurable local alerts and stores alert history.
- Serves a dark operations dashboard with degraded/mock mode fallback.

## Official Polymarket public sources used

Only public/readable endpoints are used in default implementation:

1. Gamma API: `https://gamma-api.polymarket.com/events?active=true&closed=false`
2. CLOB API: `https://clob.polymarket.com/prices-history`
3. Market WebSocket: configured via `MARKET_WS_URL` (official public market stream)
4. Data API (optional): `https://data-api.polymarket.com/trades`
5. RTDS is optional and disabled by default

No trading, order placement, wallet auth, or private endpoints are implemented.

## Architecture

### Backend

- `app/http/` – official-source HTTP clients
- `app/services/discovery_service.py` – event/market discovery and persistence
- `app/ws/market_ws.py` – websocket listener + reconnect + rolling minute buffers
- `app/services/aggregation_service.py` – snapshot backfill + minute flush to DB
- `app/services/ranking_service.py` – all **DERIVED** ranking calculations
- `app/services/alert_service.py` – alert config + evaluation + alert records
- `app/services/scheduler_service.py` – periodic jobs
- `app/api/` – REST routes
- `app/storage/` – SQLModel schema + DB helpers

### Frontend

- Dashboard: summary bar, controls, hot/heat/movers tables, alerts panel, source health panel, event detail drawer
- Events page: searchable events list
- Mock fallback mode when backend is unavailable, clearly labeled as `MOCK/DEMO`

## API routes

- `GET /health`
- `GET /api/system/status`
- `GET /api/events`
- `GET /api/events/{event_id}`
- `GET /api/rankings/hot-events`
- `GET /api/rankings/heat-risers`
- `GET /api/rankings/price-movers`
- `GET /api/rankings/disagreement`
- `GET /api/rankings/new-entrants`
- `GET /api/alerts`
- `GET /api/alerts/config`
- `POST /api/alerts/config`

## Derived metric formulas

All formulas below are **DERIVED**:

### Hot Events (DERIVED)

```text
hot_score =
  0.45 * norm(volume24hr)
+ 0.20 * norm(openInterest)
+ 0.20 * norm(liquidity)
+ 0.10 * norm(commentCount)
+ 0.05 * featured_bonus
```

### Minute Heat Rise (DERIVED)

```text
minute_heat_score =
  0.40 * zscore(trade_notional_1m)
+ 0.25 * zscore(trade_count_1m)
+ 0.20 * zscore(abs(price_return_1m))
+ 0.15 * zscore(book_updates_1m)

heat_rise = current_minute_heat_score - rolling_baseline_heat_score
```

Fallback mode (DERIVED fallback) uses weighted deltas from snapshots when realtime data is incomplete.

### Price Movers (DERIVED)

Largest absolute 1m and 5m movement based on recent snapshot series.

### Disagreement (DERIVED)

Prioritizes liquid markets with outcome price near 0.5.

### New Entrants (DERIVED)

Events entering hot top-N with positive score acceleration.

## Local setup and run instructions

### 1) Clone and configure env

```bash
git clone <repo-url> polymarket-monitor
cd polymarket-monitor
cp .env.example .env
```

### 2) Backend (Python 3.11+)

```bash
make backend-install
make backend-run
```

Backend runs at: `http://localhost:8000`

### 3) Frontend

```bash
make frontend-install
make frontend-run
```

Frontend runs at: `http://localhost:3000`

## Testing

```bash
make backend-test
```

Current tests cover:
- payload parsing
- ranking formulas
- fallback logic
- route response structure
- websocket minute-buffer behavior

## Limitations

- Websocket message key shape can vary by deployment; parser includes TODO notes for payload verification.
- SQLite is local-friendly; production deployments should use a server-grade database.
- Rate-limiting policy is conservative and should be tuned in production.

## Future extensions

- Add notification sinks (Slack/Discord/Webhook)
- Add richer filtering/analytics dimensions
- Add containerized deployment manifests
- Add optional RTDS mode behind explicit flag
