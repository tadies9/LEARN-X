import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenRequests: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  failureRate: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private halfOpenRequests: number = 0;
  private resetTimer?: NodeJS.Timeout;
  private readonly options: CircuitBreakerOptions;
  private requestTimestamps: number[] = [];

  constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
    super();
    this.options = {
      failureThreshold: options?.failureThreshold || 5,
      resetTimeout: options?.resetTimeout || 60000, // 1 minute
      monitoringPeriod: options?.monitoringPeriod || 60000, // 1 minute
      halfOpenRequests: options?.halfOpenRequests || 3,
    };

    logger.info(`Circuit breaker '${name}' initialized with options:`, this.options);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      const error = new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      (error as any).code = 'CIRCUIT_OPEN';
      throw error;
    }

    // Track request
    this.trackRequest();

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequests++;
      
      if (this.halfOpenRequests >= this.options.halfOpenRequests) {
        // Enough successful requests, close the circuit
        this.close();
      }
    }

    // Reset failure count on success in CLOSED state
    if (this.state === CircuitState.CLOSED) {
      this.failures = 0;
    }
  }

  private onFailure(error: any): void {
    this.failures++;
    this.lastFailureTime = new Date();

    logger.warn(`Circuit breaker failure #${this.failures}:`, {
      error: error.message,
      state: this.state,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state, reopen the circuit
      this.open();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.getFailureRate() >= this.options.failureThreshold / 100
    ) {
      // Threshold reached, open the circuit
      this.open();
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.emit('stateChange', CircuitState.OPEN);

    logger.error('Circuit breaker OPENED due to failures', {
      failures: this.failures,
      failureRate: this.getFailureRate(),
    });

    // Set timer to try half-open state
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.options.resetTimeout);
  }

  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenRequests = 0;
    this.emit('stateChange', CircuitState.HALF_OPEN);

    logger.info('Circuit breaker entering HALF_OPEN state');
  }

  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.halfOpenRequests = 0;
    this.emit('stateChange', CircuitState.CLOSED);

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    logger.info('Circuit breaker CLOSED');
  }

  private trackRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);

    // Remove old timestamps outside monitoring period
    const cutoff = now - this.options.monitoringPeriod;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > cutoff);
  }

  private getFailureRate(): number {
    const totalRequests = this.requestTimestamps.length;
    if (totalRequests === 0) return 0;

    // Count failures in the monitoring period
    const recentFailures = Math.min(this.failures, totalRequests);
    return recentFailures / totalRequests;
  }

  getStats(): CircuitBreakerStats {
    const totalRequests = this.successes + this.failures;
    
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime:
        this.state === CircuitState.OPEN && this.resetTimer
          ? new Date(Date.now() + this.options.resetTimeout)
          : undefined,
      totalRequests,
      failureRate: totalRequests > 0 ? this.failures / totalRequests : 0,
    };
  }

  reset(): void {
    this.close();
    this.failures = 0;
    this.successes = 0;
    this.requestTimestamps = [];
    this.lastFailureTime = undefined;
  }
}

// Circuit breaker instances for different services
export const openAICircuitBreaker = new CircuitBreaker('OpenAI', {
  failureThreshold: 5, // 5% failure rate
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 300000, // 5 minutes
  halfOpenRequests: 3,
});

export const embeddingCircuitBreaker = new CircuitBreaker('Embeddings', {
  failureThreshold: 10, // 10% failure rate (more tolerant)
  resetTimeout: 30000, // 30 seconds
  monitoringPeriod: 180000, // 3 minutes
  halfOpenRequests: 5,
});

// Monitor circuit breaker events
openAICircuitBreaker.on('stateChange', (newState) => {
  logger.info('OpenAI circuit breaker state changed:', newState);
  // Could trigger notifications or fallback mechanisms here
});

embeddingCircuitBreaker.on('stateChange', (newState) => {
  logger.info('Embedding circuit breaker state changed:', newState);
});