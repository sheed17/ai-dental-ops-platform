from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


TEST_DB_PATH = Path("test_dental_ops.db")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ["DATABASE_URL"] = f"sqlite:///./{TEST_DB_PATH.name}"
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["VAPI_BASE_ASSISTANT_ID"] = "41e7309e-a78e-48e7-8905-ed0d3e220c6d"

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
        from app.services.practice_directory import seed_practices

        seed_practices(db)
    finally:
        db.close()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
