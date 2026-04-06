import os

os.environ["DISABLE_BACKGROUND_JOBS"] = "true"

from fastapi.testclient import TestClient

from app.main import app


def test_health_route() -> None:
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


def test_rankings_shape() -> None:
    with TestClient(app) as client:
        r = client.get("/api/rankings/hot-events")
        assert r.status_code == 200
        assert "rows" in r.json()
