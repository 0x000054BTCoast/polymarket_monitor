from app.ws.market_ws import MarketWebSocketListener


def test_ws_reconnect_primitives() -> None:
    ws = MarketWebSocketListener()
    ws.set_assets(["a1", "a2"])
    assert ws.is_stale() is True
    ws._handle_message({"asset_id": "a1", "price": 0.6, "size": 10, "type": "trade"})
    flushed = ws.flush_minute_metrics()
    assert "a1" in flushed
