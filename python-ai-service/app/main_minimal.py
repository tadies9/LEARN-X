"""
Minimal FastAPI application entry point for testing.
Starts without database connections to verify basic functionality.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.config import settings
from core.logging import configure_logging, get_logger
from api.routes import health

# Configure logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Minimal application lifespan manager.
    """
    # Startup
    logger.info("Starting Python AI Service (Minimal)", version=settings.app_version)
    
    yield
    
    # Shutdown
    logger.info("Shutting down Python AI Service (Minimal)")


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

# Add Prometheus metrics endpoint
if settings.enable_metrics:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

# Include routers
app.include_router(health.router, prefix=settings.api_prefix, tags=["health"])

# Include AI routes even in minimal mode
try:
    from api.routes import ai
    app.include_router(ai.router, prefix=f"{settings.api_prefix}/ai", tags=["ai"])
    logger.info("AI routes loaded in minimal mode")
except Exception as e:
    logger.warning(f"Could not load AI routes: {e}")

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
        "status": "running",
        "mode": "minimal"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main_minimal:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.is_development,
        log_level=settings.log_level.value.lower()
    )