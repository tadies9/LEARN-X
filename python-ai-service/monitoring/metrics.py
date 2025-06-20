"""
Prometheus metrics for monitoring with graceful fallbacks.
"""

try:
    from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

import logging

logger = logging.getLogger(__name__)


class DummyMetric:
    """Dummy metric class when Prometheus is not available"""
    
    def inc(self, amount=1):
        pass
    
    def dec(self, amount=1):
        pass
    
    def set(self, value):
        pass
    
    def observe(self, amount):
        pass


def create_counter(name: str, description: str, labelnames=None):
    """Create a Counter metric with fallback"""
    if not PROMETHEUS_AVAILABLE:
        return DummyMetric()
    
    try:
        return Counter(name, description, labelnames=labelnames or [], registry=registry)
    except Exception:
        return DummyMetric()


def create_histogram(name: str, description: str, labelnames=None, buckets=None):
    """Create a Histogram metric with fallback"""
    if not PROMETHEUS_AVAILABLE:
        return DummyMetric()
    
    try:
        kwargs = {
            'name': name,
            'documentation': description,
            'labelnames': labelnames or [],
            'registry': registry
        }
        if buckets:
            kwargs['buckets'] = buckets
        
        return Histogram(**kwargs)
    except Exception:
        return DummyMetric()


def create_gauge(name: str, description: str, labelnames=None):
    """Create a Gauge metric with fallback"""
    if not PROMETHEUS_AVAILABLE:
        return DummyMetric()
    
    try:
        return Gauge(name, description, labelnames=labelnames or [], registry=registry)
    except Exception:
        return DummyMetric()


# Create registry
if PROMETHEUS_AVAILABLE:
    try:
        registry = CollectorRegistry()
    except Exception:
        registry = None
        PROMETHEUS_AVAILABLE = False
else:
    registry = None

# Application metrics
http_active_requests = create_gauge(
    'http_active_requests',
    'Number of active HTTP requests'
)

worker_active_tasks = create_gauge(
    'worker_active_tasks',
    'Number of active worker tasks'
)

document_chunks_created = create_counter(
    'document_chunks_created_total',
    'Total document chunks created'
)


# Utility functions
def track_document_processing(file_type: str, processing_time: float, chunk_count: int):
    """Track document processing metrics"""
    pass  # Dummy implementation


def track_queue_message(queue_name: str, message_type: str, status: str):
    """Track queue message metrics"""
    pass  # Dummy implementation


logger.info(f"Metrics initialized, prometheus_available={PROMETHEUS_AVAILABLE}")