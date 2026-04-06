from app.http.polymarket_gamma import GammaClient


def test_parse_event_markets_handles_json_strings() -> None:
    client = GammaClient()
    payload = {
        "id": "e1",
        "title": "Event",
        "markets": [
            {
                "id": "m1",
                "question": "Q",
                "outcomes": '["YES","NO"]',
                "outcomePrices": "[0.6,0.4]",
                "tokenIds": '["a1","a2"]',
            }
        ],
    }
    event, markets = client.parse_event_markets(payload)
    assert event["id"] == "e1"
    assert len(markets) == 2
    assert markets[0]["asset_id"] == "a1"
