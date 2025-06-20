"""
Structured logging for monitoring and observability.
Provides enhanced logging with structured data for better monitoring.
"""

import json
import time
from typing import Any, Dict, Optional
import logging

# Use standard logging to avoid circular import
logger = logging.getLogger(__name__)


class StructuredLogger:
    """Enhanced logger with structured data support"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.name = name
    
    def log_api_response(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        correlation_id: Optional[str] = None,
        **kwargs
    ):
        """Log API response with structured data"""
        data = {
            "event": "api_response",
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "correlation_id": correlation_id,
            **kwargs
        }
        
        level = "info"
        if status_code >= 500:
            level = "error"
        elif status_code >= 400:
            level = "warning"
        
        formatted_message = f"API request completed " + " ".join(f"{k}={v}" for k, v in data.items())
        getattr(self.logger, level)(formatted_message)
    
    def log_ai_request(
        self,
        provider: str,
        model: str,
        request_type: str,
        duration_ms: float,
        tokens_used: Optional[int] = None,
        cost: Optional[float] = None,
        **kwargs
    ):
        """Log AI provider request with metrics"""
        data = {
            "event": "ai_request",
            "provider": provider,
            "model": model,
            "request_type": request_type,
            "duration_ms": duration_ms,
            "tokens_used": tokens_used,
            "cost": cost,
            **kwargs
        }
        
        formatted_message = f"AI request completed " + " ".join(f"{k}={v}" for k, v in data.items())
        self.logger.info(formatted_message)
    
    def log_queue_job(
        self,
        queue_name: str,
        job_type: str,
        job_id: str,
        status: str,
        duration_ms: Optional[float] = None,
        **kwargs
    ):
        """Log queue job processing"""
        data = {
            "event": "queue_job",
            "queue_name": queue_name,
            "job_type": job_type,
            "job_id": job_id,
            "status": status,
            "duration_ms": duration_ms,
            **kwargs
        }
        
        level = "info" if status == "completed" else "warning"
        formatted_message = f"Queue job processed " + " ".join(f"{k}={v}" for k, v in data.items())
        getattr(self.logger, level)(formatted_message)
    
    def log_cache_operation(
        self,
        operation: str,
        result: str,
        key: Optional[str] = None,
        duration_ms: Optional[float] = None,
        **kwargs
    ):
        """Log cache operation"""
        data = {
            "event": "cache_operation",
            "operation": operation,
            "result": result,
            "key": key,
            "duration_ms": duration_ms,
            **kwargs
        }
        
        formatted_message = f"Cache operation " + " ".join(f"{k}={v}" for k, v in data.items())
        self.logger.debug(formatted_message)
    
    def info(self, message: str, **kwargs):
        """Log info message with structured data"""
        if kwargs:
            formatted_message = f"{message} " + " ".join(f"{k}={v}" for k, v in kwargs.items())
            self.logger.info(formatted_message)
        else:
            self.logger.info(message)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with structured data"""
        if kwargs:
            formatted_message = f"{message} " + " ".join(f"{k}={v}" for k, v in kwargs.items())
            self.logger.warning(formatted_message)
        else:
            self.logger.warning(message)
    
    def error(self, message: str, **kwargs):
        """Log error message with structured data"""
        if kwargs:
            formatted_message = f"{message} " + " ".join(f"{k}={v}" for k, v in kwargs.items())
            self.logger.error(formatted_message)
        else:
            self.logger.error(message)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with structured data"""
        if kwargs:
            formatted_message = f"{message} " + " ".join(f"{k}={v}" for k, v in kwargs.items())
            self.logger.debug(formatted_message)
        else:
            self.logger.debug(message)


def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance"""
    return StructuredLogger(name)