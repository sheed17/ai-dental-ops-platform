from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _bootstrap_schema_updates()


def _bootstrap_schema_updates() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    table_updates: dict[str, dict[str, str]] = {
        "practices": {
            "scheduling_mode": "VARCHAR(50) DEFAULT 'message_only'",
            "insurance_mode": "VARCHAR(50) DEFAULT 'generic'",
            "missed_call_recovery_enabled": "BOOLEAN DEFAULT TRUE",
            "missed_call_recovery_message": "TEXT DEFAULT 'Thanks for calling {{practiceName}}. We missed your call and will follow up when the office opens.'",
            "callback_sla_minutes": "INTEGER DEFAULT 60",
        },
        "callback_tasks": {
            "assigned_to": "VARCHAR(255)",
            "internal_notes": "TEXT",
            "outcome": "VARCHAR(100)",
        },
    }

    if not set(table_updates).intersection(existing_tables):
        return

    with engine.begin() as connection:
        for table_name, alterations in table_updates.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_sql in alterations.items():
                if column_name in existing_columns:
                    continue
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"))
