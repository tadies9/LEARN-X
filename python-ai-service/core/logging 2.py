"""
Structured logging configuration.
Follows coding standards: Single file, clear purpose
"""

import structlog
import logging
import sys
from typing import Any, Dict
from app.config import settings


def configure_logging() -> None:
    """
    Configure structured logging for the application.
    Uses structlog for better log formatting and context.
    """
    
    # Configure Python's logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.value)
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.CallsiteParameterAdder(
                parameters=[
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.LINENO,
                ]
            ),
            structlog.processors.dict_tracebacks,
            structlog.dev.ConsoleRenderer()
            if settings.is_development
            else structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured logger instance
    """
    return structlog.get_logger(name)


class LogContext:
    """Context manager for adding temporary log context"""
    
    def __init__(self, logger: structlog.BoundLogger, **kwargs: Any):
        self.logger = logger
        self.context = kwargs
        self.original_context: Dict[str, Any] = {}
        
    def __enter__(self):
        # Save original context
        self.original_context = dict(self.logger._context)
        # Bind new context
        self.logger = self.logger.bind(**self.context)
        return self.logger
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore original context
        self.logger = self.logger.unbind(*self.context.keys())
        for key, value in self.original_context.items():
            self.logger = self.logger.bind(**{key: value})