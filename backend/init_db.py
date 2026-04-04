from __future__ import annotations

from database import DATABASE_URL, Base, engine
import models  # noqa: F401


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print(f"Initialized database schema at {DATABASE_URL}")


if __name__ == "__main__":
    main()
