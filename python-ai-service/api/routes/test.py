"""
Test routes for Sentry verification
Following LEARN-X coding standards
"""

from fastapi import APIRouter, HTTPException
import sentry_sdk
from datetime import datetime

from core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/sentry-error")
async def test_sentry_error():
    """Test Sentry error reporting"""
    logger.info("Testing Sentry error reporting")
    
    # Create a test error with context
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("test", True)
        scope.set_level("error")
        scope.set_context("test_details", {
            "endpoint": "/api/v1/test/sentry-error",
            "service": "python-ai-service",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Capture the exception
        try:
            raise Exception("Test error from LEARN-X Python AI Service")
        except Exception as e:
            sentry_sdk.capture_exception(e)
    
    return {
        "message": "Test error sent to Sentry",
        "service": "python-ai-service",
        "timestamp": datetime.utcnow().isoformat(),
        "note": "Check your Sentry dashboard for the error"
    }


@router.get("/unhandled-error")
async def test_unhandled_error():
    """Test unhandled error (will be caught by middleware)"""
    raise HTTPException(
        status_code=500,
        detail="Unhandled test error from LEARN-X Python AI Service"
    )


@router.get("/async-error")
async def test_async_error():
    """Test async error"""
    import asyncio
    
    async def failing_task():
        await asyncio.sleep(0.1)
        raise Exception("Async test error from LEARN-X Python AI Service")
    
    await failing_task()