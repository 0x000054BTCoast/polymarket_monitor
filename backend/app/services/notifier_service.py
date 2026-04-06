from __future__ import annotations

import hashlib
import hmac
import logging
import time
from abc import ABC, abstractmethod

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class Notifier(ABC):
    @abstractmethod
    def send_markdown(self, title: str, markdown: str) -> bool:
        raise NotImplementedError


class NoopNotifier(Notifier):
    def send_markdown(self, title: str, markdown: str) -> bool:
        logger.info("Notifier disabled, skip send title=%s body_len=%s", title, len(markdown))
        return False


class LarkWebhookNotifier(Notifier):
    def __init__(self, webhook_url: str, signing_secret: str | None = None, dry_run: bool = False) -> None:
        self.webhook_url = webhook_url
        self.signing_secret = signing_secret
        self.dry_run = dry_run

    def _build_payload(self, title: str, markdown: str) -> dict:
        payload = {
            "msg_type": "post",
            "content": {
                "post": {
                    "zh_cn": {
                        "title": title,
                        "content": [[{"tag": "text", "text": markdown}]],
                    }
                }
            },
        }
        if self.signing_secret:
            timestamp = str(int(time.time()))
            sign = hmac.new(
                self.signing_secret.encode("utf-8"),
                f"{timestamp}\n{self.signing_secret}".encode("utf-8"),
                digestmod=hashlib.sha256,
            ).hexdigest()
            payload["timestamp"] = timestamp
            payload["sign"] = sign
        return payload

    def send_markdown(self, title: str, markdown: str) -> bool:
        payload = self._build_payload(title, markdown)
        if self.dry_run:
            logger.info("Lark dry-run title=%s payload=%s", title, payload)
            return True

        with httpx.Client(timeout=settings.request_timeout_seconds) as client:
            r = client.post(self.webhook_url, json=payload)
            r.raise_for_status()
            data = r.json()
            ok = data.get("code", -1) == 0
            if not ok:
                logger.warning("Lark send failed response=%s", data)
            return ok


def build_notifier() -> Notifier:
    if not settings.lark_enabled or not settings.lark_webhook_url:
        return NoopNotifier()
    return LarkWebhookNotifier(
        webhook_url=settings.lark_webhook_url,
        signing_secret=settings.lark_signing_secret,
        dry_run=settings.lark_dry_run,
    )
