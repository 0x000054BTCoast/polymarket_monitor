from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from app.config import settings


def _ensure_sqlite_dir() -> None:
    if settings.database_url.startswith("sqlite:///"):
        db_path = settings.database_url.replace("sqlite:///", "")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_dir()
engine = create_engine(settings.database_url, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


@contextmanager
def get_session() -> Session:
    with Session(engine) as session:
        yield session
