"""
Health check endpoints for service monitoring.
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any
import asyncpg
from datetime import datetime

from app.config import settings
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    Returns service status and version.
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment.value,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """
    Detailed health check with component status.
    Checks database, queue, and AI provider connections.
    """
    health_status = {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment.value,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {}
    }
    
    # Check database
    try:
        from app.main import db_pool
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            health_status["components"]["database"] = {
                "status": "healthy",
                "pool_size": db_pool.get_size(),
                "pool_free": db_pool.get_idle_size()
            }
        else:
            health_status["components"]["database"] = {
                "status": "unhealthy",
                "error": "Pool not initialized"
            }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check queue system
    try:
        from app.main import pgmq_client
        if pgmq_client:
            metrics = await pgmq_client.get_metrics("file_processing")
            health_status["components"]["queue"] = {
                "status": "healthy",
                "metrics": metrics
            }
        else:
            health_status["components"]["queue"] = {
                "status": "unhealthy",
                "error": "PGMQ client not initialized"
            }
    except Exception as e:
        health_status["components"]["queue"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check AI provider
    try:
        from services.ai.providers.openai import OpenAIProvider
        from services.ai.interfaces.base import AIConfig, AIProvider
        
        ai_config = AIConfig(
            provider=AIProvider.OPENAI,
            api_key=settings.openai_api_key
        )
        provider = OpenAIProvider(ai_config)
        await provider.initialize()
        
        if await provider.validate_connection():
            health_status["components"]["ai_provider"] = {
                "status": "healthy",
                "provider": "openai",
                "models": provider.get_model_info()
            }
        else:
            health_status["components"]["ai_provider"] = {
                "status": "unhealthy",
                "error": "Connection validation failed"
            }
    except Exception as e:
        health_status["components"]["ai_provider"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Overall status
    if any(
        comp.get("status") == "unhealthy" 
        for comp in health_status["components"].values()
    ):
        health_status["status"] = "degraded"
    
    return health_status


@router.get("/ready")
async def readiness_check() -> Dict[str, bool]:
    """
    Kubernetes readiness probe endpoint.
    Returns whether service is ready to accept traffic.
    """
    try:
        from app.main import db_pool, job_processor
        
        ready = (
            db_pool is not None and 
            db_pool.get_size() > 0 and
            job_processor is not None
        )
        
        return {"ready": ready}
        
    except Exception:
        return {"ready": False}