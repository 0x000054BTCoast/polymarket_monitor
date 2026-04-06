from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel


class Event(SQLModel, table=True):
    id: str = Field(primary_key=True)
    slug: Optional[str] = None
    title: str
    category: Optional[str] = None
    active: bool = True
    closed: bool = False
    featured: bool = False

    volume_24hr: Optional[float] = None
    open_interest: Optional[float] = None
    liquidity: Optional[float] = None
    comment_count: Optional[int] = None

    raw_payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Market(SQLModel, table=True):
    id: str = Field(primary_key=True)
    event_id: str = Field(index=True, foreign_key="event.id")
    question: str
    active: bool = True
    closed: bool = False

    outcome: Optional[str] = None
    asset_id: Optional[str] = Field(default=None, index=True)
    clob_token_id: Optional[str] = Field(default=None, index=True)

    last_price: Optional[float] = None
    volume_24hr: Optional[float] = None
    liquidity: Optional[float] = None

    raw_payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Snapshot(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("market_id", "ts", name="uq_snapshot_market_ts"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    market_id: str = Field(index=True, foreign_key="market.id")
    ts: datetime = Field(index=True)
    price: Optional[float] = None
    volume_24hr: Optional[float] = None
    open_interest: Optional[float] = None
    liquidity: Optional[float] = None
    comment_count: Optional[int] = None


class MinuteAggregation(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("market_id", "minute_ts", name="uq_minagg_market_minute"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    market_id: str = Field(index=True, foreign_key="market.id")
    minute_ts: datetime = Field(index=True)
    trade_notional_1m: float = 0.0
    trade_count_1m: int = 0
    price_return_1m: float = 0.0
    book_updates_1m: int = 0


class RankingSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ranking_type: str = Field(index=True)
    generated_at: datetime = Field(index=True)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))




class SignalSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    signal_type: str = Field(index=True)
    generated_at: datetime = Field(index=True)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))


class AlertRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    alert_type: str = Field(index=True)
    severity: str = "info"
    event_id: Optional[str] = Field(default=None, index=True)
    market_id: Optional[str] = Field(default=None, index=True)
    message: str
    details: dict = Field(default_factory=dict, sa_column=Column("metadata", JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class SourceHealth(SQLModel, table=True):
    source: str = Field(primary_key=True)
    status: str = "unknown"
    last_ok_at: Optional[datetime] = None
    last_error_at: Optional[datetime] = None
    last_error_message: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Checkpoint(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AlertConfig(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    hot_top_n_enabled: bool = True
    heat_top_n_enabled: bool = True
    heat_consecutive_minutes: int = 3
    price_move_1m_enabled: bool = True
    price_move_1m_threshold: float = 0.08
    notional_spike_enabled: bool = True
    notional_spike_multiple: float = 3.0
    ws_stale_enabled: bool = True
    updated_at: datetime = Field(default_factory=datetime.utcnow)
