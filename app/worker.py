from __future__ import annotations

import logging
import time

from app.core.config import settings
from app.db import SessionLocal, init_db
from app.services.practice_directory import seed_practices
from app.services.workflow import process_callback_recovery_automation, process_pending_integration_events

logger = logging.getLogger("dental_ops.worker")


def bootstrap() -> None:
    init_db()
    if settings.seed_demo_data:
        db = SessionLocal()
        try:
            seed_practices(db)
        finally:
            db.close()


def run_automation_cycle() -> dict[str, int]:
    queued_event_count = process_pending_integration_events(limit=100)
    recovery_event_ids = process_callback_recovery_automation(limit=100)
    return {
        "integration_events_processed": queued_event_count,
        "recovery_events_queued": len(recovery_event_ids),
    }


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    bootstrap()

    if settings.automation_run_on_startup:
        result = run_automation_cycle()
        logger.info("Initial automation run complete: %s", result)

    poll_interval = max(15, settings.automation_poll_interval_seconds)
    logger.info("Automation worker running with poll interval %ss", poll_interval)

    while True:
        try:
            result = run_automation_cycle()
            logger.info("Automation cycle complete: %s", result)
        except Exception:  # noqa: BLE001
            logger.exception("Automation worker cycle failed")
        time.sleep(poll_interval)


if __name__ == "__main__":
    main()
