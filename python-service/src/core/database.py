"""Database connection and pool management"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import asyncpg
from asyncpg import Connection, Pool

from src.config import get_settings
from src.core.logger import LoggerMixin


class DatabaseManager(LoggerMixin):
    """Manages PostgreSQL connection pool"""
    
    def __init__(self):
        self.pool: Optional[Pool] = None
        self.settings = get_settings()
    
    async def initialize(self) -> None:
        """Initialize the database connection pool"""
        if self.pool is not None:
            return
        
        try:
            self.pool = await asyncpg.create_pool(
                str(self.settings.database_url),
                min_size=1,
                max_size=self.settings.database_pool_size,
                max_queries=50000,
                max_inactive_connection_lifetime=300,
                command_timeout=60,
            )
            self.log_info("Database pool initialized", pool_size=self.settings.database_pool_size)
        except Exception as e:
            self.log_error("Failed to initialize database pool", error=e)
            raise
    
    async def close(self) -> None:
        """Close the database connection pool"""
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
            self.log_info("Database pool closed")
    
    @asynccontextmanager
    async def acquire(self) -> AsyncGenerator[Connection, None]:
        """Acquire a database connection from the pool"""
        if self.pool is None:
            await self.initialize()
        
        async with self.pool.acquire() as connection:
            yield connection
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query without returning results"""
        async with self.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args) -> list:
        """Execute a query and fetch all results"""
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """Execute a query and fetch a single row"""
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)
    
    async def fetchval(self, query: str, *args) -> any:
        """Execute a query and fetch a single value"""
        async with self.acquire() as conn:
            return await conn.fetchval(query, *args)


# Global database manager instance
db_manager = DatabaseManager()


async def get_db() -> DatabaseManager:
    """Dependency for FastAPI to get database manager"""
    return db_manager