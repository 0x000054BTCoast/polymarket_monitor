from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class InsightAgent(ABC):
    @abstractmethod
    def summarize_market(self, context: dict) -> str:
        raise NotImplementedError

    @abstractmethod
    def explain_signal(self, signal_row: dict) -> str:
        raise NotImplementedError

    @abstractmethod
    def compose_notification(self, payload: dict) -> str:
        raise NotImplementedError


class RuleBasedInsightAgent(InsightAgent):
    def summarize_market(self, context: dict) -> str:
        top_hot = context.get("top_hot", [])
        top_heat = context.get("top_heat", [])
        alerts = context.get("alerts", {})
        first_hot = top_hot[0]["title"] if top_hot else "N/A"
        first_heat = top_heat[0]["market_id"] if top_heat else "N/A"
        return (
            f"DERIVED 研究摘要：热点事件领跑 {first_hot}；热度冲击最明显标的 {first_heat}；"
            f"告警统计 critical={alerts.get('critical', 0)}, warning={alerts.get('warning', 0)}。"
        )

    def explain_signal(self, signal_row: dict) -> str:
        signal_type = signal_row.get("signal_type", "unknown")
        score = signal_row.get("score", 0)
        risk_payload = signal_row.get("risk_flags", {})
        if isinstance(risk_payload, dict):
            risk_flags = (
                f"freshness={risk_payload.get('data_freshness_risk', 'n/a')}, "
                f"liquidity={risk_payload.get('liquidity_risk', 'n/a')}, "
                f"slippage={risk_payload.get('slippage_risk', 'n/a')}, "
                f"confidence={risk_payload.get('confidence', 'n/a')}"
            )
        else:
            risk_flags = ", ".join(risk_payload or []) or "none"
        return f"DERIVED 信号 {signal_type} 得分 {score:.3f}，风险标记: {risk_flags}。"

    def compose_notification(self, payload: dict) -> str:
        lines = ["## Polymarket Monitor Summary (DERIVED)"]
        lines.append(payload.get("headline", "-"))
        for item in payload.get("bullets", []):
            lines.append(f"- {item}")
        lines.append("\n> 非投资建议，仅供研究。")
        return "\n".join(lines)


class LLMInsightAgent(InsightAgent):
    """Placeholder implementation; configurable extension point for future vendor binding."""

    def __init__(self) -> None:
        self.provider = settings.ai_agent_provider

    def summarize_market(self, context: dict) -> str:
        raise RuntimeError("LLM provider is not configured")

    def explain_signal(self, signal_row: dict) -> str:
        raise RuntimeError("LLM provider is not configured")

    def compose_notification(self, payload: dict) -> str:
        raise RuntimeError("LLM provider is not configured")



def build_insight_agent() -> InsightAgent:
    if not settings.ai_agent_enabled:
        return RuleBasedInsightAgent()
    try:
        return LLMInsightAgent()
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("AI agent init failed, fallback to RuleBasedInsightAgent: %s", exc)
        return RuleBasedInsightAgent()
