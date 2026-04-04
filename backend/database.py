from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "f1_insight_hub.db"


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")


def is_sqlite_url(database_url: str) -> bool:
    return database_url.startswith("sqlite")


DATABASE_URL = get_database_url()
ENGINE_OPTIONS: dict[str, object] = {
    "echo": os.getenv("DB_ECHO", "false").lower() == "true",
    "future": True,
}

if is_sqlite_url(DATABASE_URL):
    ENGINE_OPTIONS["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **ENGINE_OPTIONS)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
