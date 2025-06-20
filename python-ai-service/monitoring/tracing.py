"""
Tracing and observability initialization.
Provides OpenTelemetry tracing support with graceful fallbacks.
"""

from typing import Optional
from fastapi import FastAPI

# Correlation ID header for distributed tracing
CORRELATION_ID_HEADER = "x-correlation-id"

try:
    from opentelemetry import trace
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    TRACING_AVAILABLE = True
except ImportError:
    TRACING_AVAILABLE = False
    trace = None

import logging

logger = logging.getLogger(__name__)


def initialize_tracing(app: FastAPI) -> None:
    """
    Initialize OpenTelemetry tracing for the FastAPI application.
    Gracefully handles missing OpenTelemetry dependencies.
    """
    if not TRACING_AVAILABLE:
        logger.warning("OpenTelemetry not available, skipping tracing initialization")
        return
    
    try:
        # Set up tracer provider
        trace.set_tracer_provider(TracerProvider())
        
        # Configure Jaeger exporter if endpoint is available
        jaeger_endpoint = "http://localhost:14268/api/traces"
        
        try:
            jaeger_exporter = JaegerExporter(
                endpoint=jaeger_endpoint,
                timeout=5  # 5 second timeout
            )
            
            span_processor = BatchSpanProcessor(jaeger_exporter)
            trace.get_tracer_provider().add_span_processor(span_processor)
            
            logger.info(f"Jaeger tracing initialized, endpoint={jaeger_endpoint}")
        except Exception as e:
            logger.warning(f"Jaeger tracing not available, using console tracer: {e}")
            
            # Fallback to console exporter for development
            try:
                from opentelemetry.sdk.trace.export import ConsoleSpanExporter
                console_exporter = ConsoleSpanExporter()
                span_processor = BatchSpanProcessor(console_exporter)
                trace.get_tracer_provider().add_span_processor(span_processor)
            except ImportError:
                logger.warning("Console span exporter not available, skipping tracing setup")
                return
        
        # Instrument FastAPI
        try:
            FastAPIInstrumentor.instrument_app(app)
        except Exception as e:
            logger.warning(f"Failed to instrument FastAPI: {e}")
        
        # Instrument requests library
        try:
            RequestsInstrumentor().instrument()
        except Exception as e:
            logger.warning(f"Failed to instrument requests: {e}")
        
        logger.info("Tracing instrumentation completed")
        
    except Exception as e:
        logger.error(f"Failed to initialize tracing: {e}")


def get_tracer(name: str):
    """Get a tracer instance with fallback"""
    if not TRACING_AVAILABLE or not trace:
        return None
    
    try:
        return trace.get_tracer(name)
    except Exception:
        return None


def get_current_span():
    """Get the current active span with fallback"""
    if not TRACING_AVAILABLE or not trace:
        return None
    
    try:
        return trace.get_current_span()
    except Exception:
        return None


def trace_document_processing(file_id: str, file_type: str):
    """Trace document processing operation"""
    # Dummy context manager
    class DummyTracer:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
    return DummyTracer()


def trace_queue_operation(operation: str, queue_name: str):
    """Trace queue operation"""
    # Dummy context manager  
    class DummyTracer:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
    return DummyTracer()