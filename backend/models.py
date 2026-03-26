"""SQLAlchemy models and database setup for the coffee brew dashboard."""

import os
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DB_DIR = os.environ.get("DB_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))
os.makedirs(DB_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'brews.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Brew(Base):
    __tablename__ = "brews"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    bean_name = Column(String, nullable=False)
    roast_level = Column(String, nullable=False)
    grinder_brand = Column(String, nullable=False)
    grinder_setting = Column(Float, nullable=False)
    dose_weight = Column(Float, nullable=False)
    target_yield = Column(Float, nullable=False)
    actual_yield = Column(Float, nullable=False)
    total_time_s = Column(Float, nullable=False)
    taste_tags = Column(Text, nullable=False, default="[]")
    taste_notes = Column(Text, nullable=True, default="")
    score = Column(Integer, nullable=False, default=0)
    raw_points_json = Column(Text, nullable=False, default="[]")
    phases_json = Column(Text, nullable=False, default="[]")
    events_json = Column(Text, nullable=False, default="[]")
    analysis_json = Column(Text, nullable=False, default="{}")


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
