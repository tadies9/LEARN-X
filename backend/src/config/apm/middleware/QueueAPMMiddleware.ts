/**
 * Queue APM Middleware
 * Comprehensive monitoring for queue processing operations
 */

import { logger } from '../../../utils/logger';
import { apmService } from '../APMService';
import { businessMetrics } from '../metrics/BusinessMetrics';
import { distributedTracing } from '../tracing/DistributedTracing';
import { apmAlerting } from '../alerting/APMAlertingService';
import type { 
  APMTransaction,
  DistributedTracingContext 
} from '../types';

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority?: number;
  attempts?: number;
  maxAttempts?: number;
  delay?: number;
  timeout?: number;
  _traceContext?: DistributedTracingContext;
}

export interface QueueMetrics {
  jobsEnqueued: number;
  jobsProcessed: number;
  jobsFailed: number;
  jobsRetried: number;
  avgProcessingTime: number;
  currentDepth: number;
  oldestJobAge: number;
}

export interface QueueHealthStatus {
  healthy: boolean;
  queueName: string;
  metrics: QueueMetrics;
  issues: string[];
  lastCheck: Date;
}

export class QueueAPMMiddleware {
  private static instance: QueueAPMMiddleware;
  private queueMetrics: Map<string, QueueMetrics> = new Map();
  private jobStartTimes: Map<string, number> = new Map();
  private queueHealthChecks: Map<string, QueueHealthStatus> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.startHealthChecks();
  }

  static getInstance(): QueueAPMMiddleware {
    if (!QueueAPMMiddleware.instance) {
      QueueAPMMiddleware.instance = new QueueAPMMiddleware();
    }
    return QueueAPMMiddleware.instance;
  }

  /**
   * Middleware for job enqueuing
   */
  onJobEnqueue(queueName: string, job: QueueJob): QueueJob {
    try {
      // Add trace context to job
      const enrichedJob = this.addTraceContext(job);
      
      // Record enqueue metrics
      this.recordEnqueueMetrics(queueName, enrichedJob);
      
      // Update queue depth
      this.updateQueueDepth(queueName, 1);
      
      // Start APM span for job lifecycle
      const span = apmService.startSpan(`queue.enqueue.${queueName}`);
      if (span) {
        apmService.setSpanAttribute(span, 'job.id', enrichedJob.id);
        apmService.setSpanAttribute(span, 'job.type', enrichedJob.type);
        apmService.setSpanAttribute(span, 'queue.name', queueName);
        apmService.endSpan(span);
      }

      return enrichedJob;
    } catch (error) {
      logger.error('Error in queue enqueue middleware:', error);
      apmService.captureError(error as Error, {
        queueName,
        jobId: job.id,
        jobType: job.type
      });
      return job;
    }
  }

  /**
   * Middleware for job processing start
   */
  onJobStart(queueName: string, job: QueueJob): APMTransaction | null {
    try {
      // Record start time
      this.jobStartTimes.set(job.id, Date.now());
      
      // Extract trace context
      const traceContext = distributedTracing.extractFromQueueJob(job);
      
      // Start transaction
      const transaction = apmService.startTransaction(`queue.process.${job.type}`, 'queue');
      
      if (transaction && traceContext) {
        // Set trace context attributes
        apmService.setTransactionAttribute('trace.id', traceContext.traceId);
        apmService.setTransactionAttribute('parent.span.id', traceContext.parentSpanId);
      }

      // Set job attributes
      if (transaction) {
        apmService.setTransactionAttribute('job.id', job.id);
        apmService.setTransactionAttribute('job.type', job.type);
        apmService.setTransactionAttribute('queue.name', queueName);
        apmService.setTransactionAttribute('job.attempt', job.attempts || 1);
        apmService.setTransactionAttribute('job.priority', job.priority || 0);
      }

      // Record processing start
      businessMetrics.recordQueueActivity(queueName, 'processed', job.type);
      
      return transaction;
    } catch (error) {
      logger.error('Error in queue job start middleware:', error);
      apmService.captureError(error as Error, {
        queueName,
        jobId: job.id,
        jobType: job.type
      });
      return null;
    }
  }

  /**
   * Middleware for successful job completion
   */
  onJobComplete(queueName: string, job: QueueJob, transaction: APMTransaction | null): void {
    try {
      const startTime = this.jobStartTimes.get(job.id);
      const processingTime = startTime ? Date.now() - startTime : 0;
      
      // Record completion metrics
      this.recordJobComplete(queueName, job, processingTime);
      
      // Update queue depth
      this.updateQueueDepth(queueName, -1);
      
      // End transaction
      if (transaction) {
        apmService.setTransactionAttribute('job.status', 'completed');
        apmService.setTransactionAttribute('job.processing_time', processingTime);
        apmService.endTransaction(transaction);
      }

      // Clean up
      this.jobStartTimes.delete(job.id);
      
    } catch (error) {
      logger.error('Error in queue job complete middleware:', error);
    }
  }

  /**
   * Middleware for job failure
   */
  onJobFailed(queueName: string, job: QueueJob, error: Error, transaction: APMTransaction | null): void {
    try {
      const startTime = this.jobStartTimes.get(job.id);
      const processingTime = startTime ? Date.now() - startTime : 0;
      
      // Record failure metrics
      this.recordJobFailure(queueName, job, error, processingTime);
      
      // Update queue depth
      this.updateQueueDepth(queueName, -1);
      
      // Capture error
      apmService.captureError(error, {
        queueName,
        jobId: job.id,
        jobType: job.type,
        attempt: job.attempts || 1,
        processingTime
      });

      // End transaction with error
      if (transaction) {
        apmService.setTransactionAttribute('job.status', 'failed');
        apmService.setTransactionAttribute('job.error', error.message);
        apmService.setTransactionAttribute('job.processing_time', processingTime);
        apmService.endTransaction(transaction);
      }

      // Clean up
      this.jobStartTimes.delete(job.id);
      
    } catch (middlewareError) {
      logger.error('Error in queue job failed middleware:', middlewareError);
    }
  }

  /**
   * Middleware for job retry
   */
  onJobRetry(queueName: string, job: QueueJob, error: Error): void {
    try {
      // Record retry metrics
      this.recordJobRetry(queueName, job, error);
      
      // Start span for retry
      const span = apmService.startSpan(`queue.retry.${job.type}`);
      if (span) {
        apmService.setSpanAttribute(span, 'job.id', job.id);
        apmService.setSpanAttribute(span, 'job.type', job.type);
        apmService.setSpanAttribute(span, 'queue.name', queueName);
        apmService.setSpanAttribute(span, 'retry.attempt', job.attempts || 1);
        apmService.setSpanAttribute(span, 'retry.reason', error.message);
        apmService.endSpan(span);
      }

    } catch (middlewareError) {
      logger.error('Error in queue job retry middleware:', middlewareError);
    }
  }

  /**
   * Middleware for queue stall detection
   */
  onQueueStalled(queueName: string, job: QueueJob): void {
    try {
      logger.warn(`Queue job stalled: ${queueName}/${job.id}`);
      
      apmService.recordBusinessMetric('queue.stalled', 1, 'count', {
        queue: queueName,
        job_type: job.type
      });

      // Capture stall as error
      apmService.captureError(new Error('Job stalled'), {
        queueName,
        jobId: job.id,
        jobType: job.type,
        stallTime: Date.now()
      });

    } catch (error) {
      logger.error('Error in queue stall middleware:', error);
    }
  }

  /**
   * Record queue depth changes
   */
  recordQueueDepth(queueName: string, depth: number): void {
    try {
      apmService.recordBusinessMetric('queue.depth', depth, 'gauge', {
        queue: queueName
      });

      // Alert on high queue depth
      apmAlerting.recordMetric(`queue.depth.${queueName}`, depth);
      
      // Update metrics
      const metrics = this.getOrCreateQueueMetrics(queueName);
      metrics.currentDepth = depth;
      
    } catch (error) {
      logger.error('Error recording queue depth:', error);
    }
  }

  /**
   * Get queue health status
   */
  getQueueHealth(queueName: string): QueueHealthStatus | null {
    return this.queueHealthChecks.get(queueName) || null;
  }

  /**
   * Get all queue health statuses
   */
  getAllQueueHealth(): QueueHealthStatus[] {
    return Array.from(this.queueHealthChecks.values());
  }

  /**
   * Get queue metrics
   */
  getQueueMetrics(queueName: string): QueueMetrics | null {
    return this.queueMetrics.get(queueName) || null;
  }

  // Private Methods
  private addTraceContext(job: QueueJob): QueueJob {
    const context = distributedTracing.getCurrentContext();
    if (context) {
      return distributedTracing.propagateToQueueJob(job);
    }
    return job;
  }

  private recordEnqueueMetrics(queueName: string, job: QueueJob): void {
    // Business metrics
    businessMetrics.recordQueueActivity(queueName, 'enqueued', job.type);
    
    // APM metrics
    apmService.recordQueueMetric(queueName, 'enqueue', 1, {
      job_type: job.type,
      priority: job.priority?.toString() || '0'
    });

    // Update queue metrics
    const metrics = this.getOrCreateQueueMetrics(queueName);
    metrics.jobsEnqueued++;
  }

  private recordJobComplete(queueName: string, job: QueueJob, processingTime: number): void {
    // Business metrics
    businessMetrics.recordQueueActivity(queueName, 'processed', job.type, processingTime);
    
    // APM metrics
    apmService.recordQueueMetric(queueName, 'process', processingTime, {
      job_type: job.type,
      success: 'true'
    });

    // Update queue metrics
    const metrics = this.getOrCreateQueueMetrics(queueName);
    metrics.jobsProcessed++;
    metrics.avgProcessingTime = this.updateAverage(
      metrics.avgProcessingTime,
      processingTime,
      metrics.jobsProcessed
    );
  }

  private recordJobFailure(queueName: string, job: QueueJob, error: Error, processingTime: number): void {
    // Business metrics
    businessMetrics.recordQueueActivity(queueName, 'failed', job.type, processingTime);
    
    // APM metrics
    apmService.recordQueueMetric(queueName, 'error', 1, {
      job_type: job.type,
      error_type: error.name,
      error_message: error.message.substring(0, 100)
    });

    // Update queue metrics
    const metrics = this.getOrCreateQueueMetrics(queueName);
    metrics.jobsFailed++;
  }

  private recordJobRetry(queueName: string, job: QueueJob, error: Error): void {
    // APM metrics
    apmService.recordQueueMetric(queueName, 'retry', 1, {
      job_type: job.type,
      attempt: job.attempts?.toString() || '1',
      error_type: error.name
    });

    // Update queue metrics
    const metrics = this.getOrCreateQueueMetrics(queueName);
    metrics.jobsRetried++;
  }

  private updateQueueDepth(queueName: string, delta: number): void {
    const metrics = this.getOrCreateQueueMetrics(queueName);
    metrics.currentDepth = Math.max(0, metrics.currentDepth + delta);
    
    this.recordQueueDepth(queueName, metrics.currentDepth);
  }

  private getOrCreateQueueMetrics(queueName: string): QueueMetrics {
    let metrics = this.queueMetrics.get(queueName);
    if (!metrics) {
      metrics = {
        jobsEnqueued: 0,
        jobsProcessed: 0,
        jobsFailed: 0,
        jobsRetried: 0,
        avgProcessingTime: 0,
        currentDepth: 0,
        oldestJobAge: 0
      };
      this.queueMetrics.set(queueName, metrics);
    }
    return metrics;
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  private performHealthChecks(): void {
    for (const [queueName, metrics] of this.queueMetrics.entries()) {
      const health = this.assessQueueHealth(queueName, metrics);
      this.queueHealthChecks.set(queueName, health);
      
      // Alert on unhealthy queues
      if (!health.healthy) {
        apmService.captureError(new Error(`Queue ${queueName} is unhealthy`), {
          queueName,
          issues: health.issues,
          metrics: health.metrics
        });
      }
    }
  }

  private assessQueueHealth(queueName: string, metrics: QueueMetrics): QueueHealthStatus {
    const issues: string[] = [];
    
    // Check error rate
    const totalJobs = metrics.jobsProcessed + metrics.jobsFailed;
    if (totalJobs > 0) {
      const errorRate = (metrics.jobsFailed / totalJobs) * 100;
      if (errorRate > 10) {
        issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      }
    }

    // Check queue depth
    if (metrics.currentDepth > 1000) {
      issues.push(`High queue depth: ${metrics.currentDepth}`);
    }

    // Check processing time
    if (metrics.avgProcessingTime > 30000) { // 30 seconds
      issues.push(`Slow processing: ${metrics.avgProcessingTime}ms avg`);
    }

    return {
      healthy: issues.length === 0,
      queueName,
      metrics: { ...metrics },
      issues,
      lastCheck: new Date()
    };
  }

  /**
   * Decorator for automatic queue job monitoring
   */
  static trackQueueJob(queueName: string) {
    return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const middleware = QueueAPMMiddleware.getInstance();

      descriptor.value = async function (job: QueueJob, ...args: any[]) {
        const transaction = middleware.onJobStart(queueName, job);
        
        try {
          const result = await originalMethod.call(this, job, ...args);
          middleware.onJobComplete(queueName, job, transaction);
          return result;
        } catch (error) {
          middleware.onJobFailed(queueName, job, error as Error, transaction);
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Export singleton instance
export const queueAPM = QueueAPMMiddleware.getInstance();