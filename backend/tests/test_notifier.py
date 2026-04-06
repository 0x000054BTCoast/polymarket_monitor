from app.services.notifier_service import LarkWebhookNotifier


def test_lark_payload_shape() -> None:
    notifier = LarkWebhookNotifier("https://example.com", dry_run=True)
    payload = notifier._build_payload("t", "body")
    assert payload["msg_type"] == "post"
    content = payload["content"]["post"]["zh_cn"]["content"]
    assert content[0][0]["text"] == "body"
