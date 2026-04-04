from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from database import DATABASE_URL, engine


BACKEND_DIR = Path(__file__).resolve().parent
ALEMBIC_INI_PATH = BACKEND_DIR / "alembic.ini"


def _build_alembic_config() -> Config:
    config = Config(str(ALEMBIC_INI_PATH))
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
    return config

def main() -> None:
    config = _build_alembic_config()
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    if not table_names:
        command.upgrade(config, "head")
        print(f"Initialized database schema at {DATABASE_URL} via Alembic upgrade head")
        return

    if "alembic_version" not in table_names:
        command.stamp(config, "head")
        print(f"Stamped existing database schema at {DATABASE_URL} to Alembic head")
        return

    command.upgrade(config, "head")
    print(f"Database schema already versioned; upgraded to head at {DATABASE_URL}")


if __name__ == "__main__":
    main()
