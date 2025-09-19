#!/usr/bin/env python3
"""Initialize database for worker service"""

import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.database import DatabaseManager
from shared.models import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize database tables"""
    logger.info(f"Initializing database: {settings.DATABASE_URL}")

    try:
        # Create database manager
        db_manager = DatabaseManager(settings.DATABASE_URL)

        # Create all tables
        db_manager.create_tables()
        logger.info("Database tables created successfully")

        # Test connection
        with db_manager.get_session() as session:
            result = session.execute("SELECT 1")
            logger.info("Database connection test successful")

        # Clean up
        db_manager.close()

    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    init_database()