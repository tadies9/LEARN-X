"""
Startup script that tries to run the full app, falling back to minimal if database is unavailable.
"""

import os
import sys
import asyncio
import asyncpg
from app.config import settings
from core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)


async def check_database_connection():
    """Check if database is available"""
    try:
        # Try to connect to database
        conn = await asyncpg.connect(
            settings.database_url,
            timeout=5
        )
        await conn.close()
        return True
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        return False


async def main():
    """Main startup logic"""
    db_available = await check_database_connection()
    
    if db_available:
        logger.info("Database is available, starting full application")
        # Import and run the full app
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8001,
            reload=settings.is_development,
            log_level=settings.log_level.value.lower()
        )
    else:
        logger.warning("Database is not available, starting minimal application")
        # Import and run the minimal app
        import uvicorn
        uvicorn.run(
            "app.main_minimal:app",
            host="0.0.0.0",
            port=8001,
            reload=settings.is_development,
            log_level=settings.log_level.value.lower()
        )


if __name__ == "__main__":
    asyncio.run(main())