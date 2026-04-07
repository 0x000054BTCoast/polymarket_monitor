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
- `GET /api/signals/arbitrage?limit=50`
- `GET /api/rankings/hot-trend?hours=24&top_k=5`
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

> `make frontend-install` 会清理常见代理环境变量，并使用独立 npm 配置
> （`--userconfig=/dev/null` + 临时 `--globalconfig`）且固定 registry 为
> `https://registry.npmjs.org/`，可避免 `ECONNREFUSED 127.0.0.1:<port>` 这类由错误代理配置导致的安装失败。

## 部署文档（中文）

- 生产环境必须 Python>=3.11（建议固定 3.11.x，避免版本误配）。
- 零基础部署指南：`docs/零基础部署指南.md`

## Testing

```bash
make backend-test
```

## WS 本地排障清单

当你发现前端 `Source Health` 中 `market_ws` 长时间不是 `ok` 时，按以下顺序排查：

1. **确认后台任务未被禁用**：检查 `.env` 的 `DISABLE_BACKGROUND_JOBS`，本地联调应为 `false`。
2. **确认 WS 地址可用**：检查 `.env` 的 `MARKET_WS_URL` 是否为可连通的官方 public market stream 地址。
3. **确认数据库已发现资产**：查看 `market` 表里是否存在 `asset_id`（为空会导致 WS 进入 `idle_no_assets`）。
4. **检查系统状态接口**：访问 `http://localhost:8000/api/system/status`，重点看：
   - `source_health[].status`
   - `source_health[].tracked_asset_count`
   - `source_health[].last_subscribe_at`

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


## DERIVED arbitrage signals (research only)

新增 `SignalService` 输出以下 **DERIVED** 信号（非投资建议）：

- `binary_parity_gap`: 估算 `|YES + NO - 1|` 偏离。
- `cross_market_logic_gap`: 同 event 内基于 subset/superset v1 规则的违约幅度。
- `liquidity_adjusted_edge`: 按流动性衰减后的边际强度。
- `execution_feasibility_score`: 综合数据新鲜度、book update 与滑点近似评分。

API 返回结构：

```json
{
  "rows": [],
  "derived": true,
  "as_of": "2026-04-06T00:00:00+00:00",
  "method_version": "v1"
}
```

每条信号均附 `risk_flags` 与免责声明文案：
`DERIVED 信号，非投资建议，仅供研究。`

## Lark/飞书通知

支持 Webhook 通知通道（可 dry-run），包含：

- 定时摘要推送（默认每 6 小时）
- 高频告警即时推送（heat/notional/ws stale），含冷却去重
- 可插拔 `InsightAgent` 文案生成

新增配置：

- `LARK_ENABLED`
- `LARK_WEBHOOK_URL`
- `LARK_SIGNING_SECRET`
- `LARK_DRY_RUN`
- `SUMMARY_PUSH_CRON`
- `ALERT_PUSH_ENABLED`
- `ALERT_PUSH_COOLDOWN_SECONDS`

## AI Agent 扩展位

新增抽象接口 `InsightAgent`：

- `summarize_market(context)`
- `explain_signal(signal_row)`
- `compose_notification(payload)`

默认 `RuleBasedInsightAgent` 离线可用；可选 `LLMInsightAgent` 预留配置位，若失败自动回退规则实现。
