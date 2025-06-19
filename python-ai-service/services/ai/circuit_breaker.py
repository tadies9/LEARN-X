"""Circuit Breaker implementation for fault tolerance"""
import asyncio
from datetime import datetime, timedelta
from typing import TypeVar, Callable, Optional, Any, AsyncIterator
from enum import Enum
import functools

from structlog import get_logger


logger = get_logger()


T = TypeVar('T')


class CircuitBreakerState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """Circuit breaker for handling failures gracefully"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: Optional[str] = None
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name or "CircuitBreaker"
        
        self._failure_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._state = CircuitBreakerState.CLOSED
        self._lock = asyncio.Lock()
    
    @property
    def state(self) -> str:
        """Get current state"""
        return self._state.value
    
    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function with circuit breaker protection"""
        async with self._lock:
            if self._state == CircuitBreakerState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitBreakerState.HALF_OPEN
                else:
                    raise Exception(f"Circuit breaker is OPEN for {self.name}")
        
        try:
            # Handle both sync and async functions
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, functools.partial(func, *args, **kwargs)
                )
            
            # Success - reset on success
            await self._on_success()
            return result
            
        except self.expected_exception as e:
            # Expected failure - increment counter
            await self._on_failure()
            raise e
        except Exception as e:
            # Unexpected exception - don't count as circuit breaker failure
            logger.warning(f"Unexpected exception in {self.name}: {e}")
            raise e
    
    async def call_async_generator(
        self,
        async_gen: AsyncIterator[T]
    ) -> AsyncIterator[T]:
        """Handle async generators with circuit breaker protection"""
        async with self._lock:
            if self._state == CircuitBreakerState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitBreakerState.HALF_OPEN
                else:
                    raise Exception(f"Circuit breaker is OPEN for {self.name}")
        
        try:
            async for item in async_gen:
                yield item
            
            # Success - reset on success
            await self._on_success()
            
        except self.expected_exception as e:
            # Expected failure - increment counter
            await self._on_failure()
            raise e
        except Exception as e:
            # Unexpected exception
            logger.warning(f"Unexpected exception in {self.name}: {e}")
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset the circuit"""
        if self._last_failure_time is None:
            return False
        
        return (
            datetime.now() - self._last_failure_time
        ).total_seconds() >= self.recovery_timeout
    
    async def _on_success(self) -> None:
        """Handle successful call"""
        async with self._lock:
            self._failure_count = 0
            self._last_failure_time = None
            
            if self._state == CircuitBreakerState.HALF_OPEN:
                logger.info(f"Circuit breaker {self.name} recovered, moving to CLOSED")
                self._state = CircuitBreakerState.CLOSED
    
    async def _on_failure(self) -> None:
        """Handle failed call"""
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = datetime.now()
            
            if self._failure_count >= self.failure_threshold:
                logger.warning(
                    f"Circuit breaker {self.name} threshold reached, moving to OPEN",
                    failures=self._failure_count
                )
                self._state = CircuitBreakerState.OPEN
            elif self._state == CircuitBreakerState.HALF_OPEN:
                logger.warning(
                    f"Circuit breaker {self.name} failed in HALF_OPEN, moving back to OPEN"
                )
                self._state = CircuitBreakerState.OPEN
    
    async def reset(self) -> None:
        """Manually reset the circuit breaker"""
        async with self._lock:
            self._failure_count = 0
            self._last_failure_time = None
            self._state = CircuitBreakerState.CLOSED
            logger.info(f"Circuit breaker {self.name} manually reset")
    
    def get_status(self) -> dict:
        """Get current status"""
        return {
            "name": self.name,
            "state": self._state.value,
            "failure_count": self._failure_count,
            "last_failure": self._last_failure_time.isoformat() if self._last_failure_time else None,
            "threshold": self.failure_threshold,
            "recovery_timeout": self.recovery_timeout,
        }