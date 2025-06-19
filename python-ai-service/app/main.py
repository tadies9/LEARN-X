"""
Main FastAPI application entry point.
Configures the Python AI service with health checks and queue processing.
"""

import asyncio
from contextlib import asynccontextmanager
import asyncpg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

from app.config import settings
from core.logging import configure_logging, get_logger
from api.routes import health, ai
from services.queue.pgmq_client import PGMQClient
from services.queue.job_processor import JobProcessor

# Configure logging
configure_logging()
logger = get_logger(__name__)

# Global resources
db_pool: asyncpg.Pool = None
pgmq_client: PGMQClient = None
job_processor: JobProcessor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown operations.
    """
    # Startup
    logger.info("Starting Python AI Service", version=settings.app_version)
    
    # Initialize database pool
    global db_pool, pgmq_client, job_processor
    
    try:
        db_pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=settings.database_pool_size,
            max_size=settings.database_pool_size + settings.database_max_overflow,
            command_timeout=60
        )
        logger.info("Database pool created")
        
        # Initialize PGMQ client
        pgmq_client = PGMQClient(db_pool)
        logger.info("PGMQ client initialized")
        
        # Initialize job processor
        job_processor = JobProcessor(pgmq_client, db_pool)
        
        # Start processing queues
        asyncio.create_task(job_processor.start())
        logger.info("Job processor started")
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Python AI Service")
    
    # Stop job processor
    if job_processor:
        await job_processor.stop()
    
    # Close database pool
    if db_pool:
        await db_pool.close()
        
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Sentry if DSN provided
if settings.sentry_dsn and settings.is_production:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment.value,
        traces_sample_rate=0.1,
    )
    app.add_middleware(SentryAsgiMiddleware)

# Add Prometheus metrics endpoint
if settings.enable_metrics:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

# Include routers
app.include_router(health.router, prefix=settings.api_prefix, tags=["health"])
app.include_router(ai.router, prefix=f"{settings.api_prefix}/ai", tags=["ai"])

# Debug routes disabled for now - need to create debug.py
# if settings.debug:
#     app.include_router(debug.router, prefix=settings.api_prefix, tags=["debug"])


# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(
        "Request received",
        method=request.method,
        path=request.url.path,
        client=request.client.host if request.client else None
    )
    
    response = await call_next(request)
    
    logger.info(
        "Request completed",
        method=request.method,
        path=request.url.path,
        status=response.status_code
    )
    
    return response


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.is_development,
        log_level=settings.log_level.value.lower()
    )