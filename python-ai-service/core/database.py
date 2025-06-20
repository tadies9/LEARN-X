"""
Database connection and management utilities.
Handles PostgreSQL connections with connection pooling and health checks.
"""

import asyncio
import asyncpg
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import time

from core.logging import get_logger

logger = get_logger(__name__)


class DatabaseManager:
    """Manages database connections with pooling and health monitoring"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.database_url: Optional[str] = None
        self.is_connected = False
        self._connection_attempts = 0
        self._max_retries = 10
        self._retry_delay = 2.0
    
    async def initialize(
        self,
        database_url: str = None,
        retry: bool = True,
        min_connections: int = 5,
        max_connections: int = 20
    ) -> bool:
        """
        Initialize database connection pool.
        
        Args:
            database_url: PostgreSQL connection string
            retry: Whether to retry on connection failure
            min_connections: Minimum pool connections
            max_connections: Maximum pool connections
            
        Returns:
            True if connected successfully, False otherwise
        """
        if database_url:
            self.database_url = database_url
        
        if not self.database_url:
            logger.warning("No database URL provided, database features disabled")
            return False
        
        if retry:
            return await self._connect_with_retry(min_connections, max_connections)
        else:
            return await self._connect_once(min_connections, max_connections)
    
    async def _connect_with_retry(self, min_connections: int, max_connections: int) -> bool:
        """Connect with retry logic"""
        for attempt in range(1, self._max_retries + 1):
            try:
                success = await self._connect_once(min_connections, max_connections)
                if success:
                    logger.info(
                        "Database connected successfully",
                        attempt=attempt,
                        total_attempts=self._max_retries
                    )
                    return True
                    
            except Exception as e:
                logger.warning(
                    "Database connection attempt failed",
                    attempt=attempt,
                    error=str(e),
                    retry_in_seconds=self._retry_delay
                )
                
                if attempt < self._max_retries:
                    await asyncio.sleep(self._retry_delay)
                else:
                    logger.error(
                        "Failed to connect to database after all attempts",
                        total_attempts=self._max_retries
                    )
        
        return False
    
    async def _connect_once(self, min_connections: int, max_connections: int) -> bool:
        """Single connection attempt"""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=min_connections,
                max_size=max_connections,
                timeout=30,  # Connection timeout
                command_timeout=60,  # Command timeout
                statement_cache_size=0  # Disable prepared statements to fix pooling issues
            )
            
            # Test the connection
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            
            self.is_connected = True
            self._connection_attempts += 1
            
            logger.info(
                "Database pool created",
                min_connections=min_connections,
                max_connections=max_connections
            )
            
            return True
            
        except Exception as e:
            self.is_connected = False
            logger.error("Failed to create database pool", error=str(e))
            raise
    
    async def close(self) -> None:
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            self.is_connected = False
            logger.info("Database pool closed")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool"""
        if not self.pool:
            raise RuntimeError("Database not initialized")
        
        async with self.pool.acquire() as connection:
            yield connection
    
    async def execute_query(
        self,
        query: str,
        *args,
        fetch: str = "none"
    ) -> Any:
        """
        Execute a database query.
        
        Args:
            query: SQL query string
            *args: Query parameters
            fetch: "none", "one", "all", or "val"
            
        Returns:
            Query result based on fetch type
        """
        async with self.get_connection() as conn:
            if fetch == "none":
                return await conn.execute(query, *args)
            elif fetch == "one":
                return await conn.fetchrow(query, *args)
            elif fetch == "all":
                return await conn.fetch(query, *args)
            elif fetch == "val":
                return await conn.fetchval(query, *args)
            else:
                raise ValueError(f"Invalid fetch type: {fetch}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform database health check.
        
        Returns:
            Health status dictionary
        """
        start_time = time.time()
        
        try:
            if not self.pool:
                return {
                    "status": "unhealthy",
                    "error": "No database pool",
                    "response_time_ms": 0
                }
            
            async with self.get_connection() as conn:
                result = await conn.fetchval("SELECT 1")
                
            response_time = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time, 2),
                "pool_size": self.pool.get_size(),
                "pool_max_size": self.pool.get_max_size(),
                "pool_min_size": self.pool.get_min_size(),
                "connection_attempts": self._connection_attempts
            }
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": round(response_time, 2)
            }
    
    async def get_tables(self, schema: str = "public") -> List[str]:
        """Get list of tables in schema"""
        query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        ORDER BY table_name
        """
        
        rows = await self.execute_query(query, schema, fetch="all")
        return [row["table_name"] for row in rows]
    
    async def table_exists(self, table_name: str, schema: str = "public") -> bool:
        """Check if table exists"""
        query = """
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
        )
        """
        
        return await self.execute_query(query, schema, table_name, fetch="val")


# Global database manager instance
db_manager = DatabaseManager()