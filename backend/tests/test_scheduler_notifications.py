from unittest.mock import MagicMock

from app.services.scheduler_service import SchedulerService


class Dummy:
    def run(self):
        return {"events": 0, "markets": 0}

    def tracked_asset_ids(self):
        return []


class DummyAgg:
    def backfill_snapshots(self):
        return 0

    def flush_ws_minute_aggregations(self):
        return 0

    def prune_old_data(self):
        return {"snapshots": 0, "minute_aggregations": 0, "ranking_snapshots": 0, "alerts": 0}


class DummyWs:
    state = type("S", (), {"connected": False, "last_error": None, "last_message_at": None})

    def set_assets(self, _):
        pass

    def is_stale(self):
        return False

    async def run_forever(self):
        return None

    def stop(self):
        pass


def test_summary_tick_calls_notification_service(monkeypatch) -> None:
    scheduler = SchedulerService(Dummy(), DummyAgg(), MagicMock(), DummyWs())
    scheduler.notification = MagicMock()
    scheduler.notification.push_periodic_summary.return_value = True
    scheduler._summary_tick()
    assert scheduler.notification.push_periodic_summary.called
