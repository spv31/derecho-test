import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

os.makedirs("data", exist_ok=True)

DATABASE_URL = "sqlite:///data/database.sqlite"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def _enable_wal():
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL;"))
        conn.commit()


_enable_wal()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all():
    import src.backend.core.models
    Base.metadata.create_all(bind=engine)