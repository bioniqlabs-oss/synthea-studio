"""Base database configuration and models"""

from datetime import datetime
from typing import Any
import uuid

from sqlalchemy import Column, DateTime, String, create_engine
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

Base = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DatabaseManager:
    """Manages database connections for services"""
    
    def __init__(self, database_url: str, pool_size: int = 5):
        self.database_url = database_url
        self.engine = create_engine(
            database_url,
            poolclass=NullPool if "sqlite" in database_url else None,
            pool_size=pool_size,
            max_overflow=10,
            pool_pre_ping=True,
            echo=False,
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_tables(self):
        """Drop all tables (use with caution)"""
        Base.metadata.drop_all(bind=self.engine)