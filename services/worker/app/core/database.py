"""Database management for worker service"""

from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from shared.models import Base


class DatabaseManager:
    """Manages database connections for the worker"""

    def __init__(self, database_url: str):
        self.engine = create_engine(
            database_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
        )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

    @contextmanager
    def get_session(self) -> Session:
        """Get database session with proper cleanup"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(bind=self.engine)

    def close(self):
        """Close all connections"""
        self.engine.dispose()