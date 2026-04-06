from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "polymarket-monitor"
    env: str = "dev"

    database_url: str = "sqlite:///./backend/data/polymarket_monitor.db"

    gamma_base_url: str = "https://gamma-api.polymarket.com"
    clob_base_url: str = "https://clob.polymarket.com"
    data_api_base_url: str = "https://data-api.polymarket.com"

    # Official market websocket endpoint per public docs; keep overridable for ops.
    market_ws_url: str = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    enable_rtds: bool = False

    discovery_poll_seconds: int = 60
    snapshot_poll_seconds: int = 60
    flush_aggregation_seconds: int = 15
    cleanup_check_seconds: int = 3600
    websocket_stale_seconds: int = 45
    data_retention_hours: int = 24

    rolling_baseline_minutes: int = 5
    max_ws_buffer_minutes: int = 30

    alert_price_move_1m_threshold: float = 0.08
    alert_notional_spike_multiple: float = 3.0

    request_timeout_seconds: int = 20
    disable_background_jobs: bool = False

    lark_enabled: bool = False
    lark_webhook_url: str = ""
    lark_signing_secret: str = ""
    lark_dry_run: bool = True
    summary_push_cron: str = "0 */6 * * *"
    alert_push_enabled: bool = False
    alert_push_cooldown_seconds: int = 900

    ai_agent_enabled: bool = False
    ai_agent_provider: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
