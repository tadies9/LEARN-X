/**
 * Business Metrics Collector
 * Tracks business-specific metrics for LEARN-X
 */

import { apmService } from '../APMService';
import { logger } from '../../../utils/logger';

export class BusinessMetricsCollector {
  private static instance: BusinessMetricsCollector;
  
  private constructor() {}

  static getInstance(): BusinessMetricsCollector {
    if (!BusinessMetricsCollector.instance) {
      BusinessMetricsCollector.instance = new BusinessMetricsCollector();
    }
    return BusinessMetricsCollector.instance;
  }

  // File Processing Metrics
  recordFileProcessed(fileType: string, size: number, duration: number, success: boolean): void {
    try {
      // File processing count
      apmService.recordBusinessMetric('files.processed', 1, 'count', {
        file_type: fileType,
        success: success.toString()
      });

      // File size
      apmService.recordBusinessMetric('files.size', size, 'bytes', {
        file_type: fileType
      });

      // Processing duration
      apmService.recordBusinessMetric('files.processing_duration', duration, 'ms', {
        file_type: fileType,
        success: success.toString()
      });

      // Processing rate (files per minute)
      apmService.recordBusinessMetric('files.processing_rate', 60000 / duration, 'files_per_minute', {
        file_type: fileType
      });

      if (!success) {
        apmService.recordBusinessMetric('files.processing_errors', 1, 'count', {
          file_type: fileType
        });
      }
    } catch (error) {
      logger.error('Error recording file processing metrics:', error);
    }
  }

  // AI Usage Metrics
  recordAIUsage(
    operation: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    duration: number,
    cost: number,
    userId: string
  ): void {
    try {
      const totalTokens = promptTokens + completionTokens;

      // Token usage
      apmService.recordBusinessMetric('ai.tokens.prompt', promptTokens, 'tokens', {
        operation,
        model,
        user_id: userId
      });

      apmService.recordBusinessMetric('ai.tokens.completion', completionTokens, 'tokens', {
        operation,
        model,
        user_id: userId
      });

      apmService.recordBusinessMetric('ai.tokens.total', totalTokens, 'tokens', {
        operation,
        model,
        user_id: userId
      });

      // Cost tracking
      apmService.recordBusinessMetric('ai.cost', cost, 'usd', {
        operation,
        model,
        user_id: userId
      });

      // Performance
      apmService.recordBusinessMetric('ai.request_duration', duration, 'ms', {
        operation,
        model
      });

      // Tokens per second
      const tokensPerSecond = totalTokens / (duration / 1000);
      apmService.recordBusinessMetric('ai.tokens_per_second', tokensPerSecond, 'tokens/s', {
        operation,
        model
      });
    } catch (error) {
      logger.error('Error recording AI usage metrics:', error);
    }
  }

  // User Activity Metrics
  recordUserActivity(userId: string, activity: string, metadata?: Record<string, any>): void {
    try {
      apmService.recordBusinessMetric('user.activity', 1, 'count', {
        activity,
        user_id: userId,
        ...metadata
      });

      // Feature usage
      apmService.recordFeatureUsage(activity, userId, metadata);
    } catch (error) {
      logger.error('Error recording user activity metrics:', error);
    }
  }

  // Course Metrics
  recordCourseActivity(
    courseId: string,
    activity: 'created' | 'updated' | 'viewed' | 'enrolled' | 'completed',
    userId: string,
    metadata?: Record<string, any>
  ): void {
    try {
      apmService.recordBusinessMetric('course.activity', 1, 'count', {
        activity,
        course_id: courseId,
        user_id: userId,
        ...metadata
      });

      // Track enrollment
      if (activity === 'enrolled') {
        apmService.recordBusinessMetric('course.enrollments', 1, 'count', {
          course_id: courseId
        });
      }

      // Track completion
      if (activity === 'completed') {
        apmService.recordBusinessMetric('course.completions', 1, 'count', {
          course_id: courseId
        });
      }
    } catch (error) {
      logger.error('Error recording course activity metrics:', error);
    }
  }

  // Learning Session Metrics
  recordLearningSession(
    userId: string,
    courseId: string,
    moduleId: string,
    duration: number,
    contentType: string,
    completed: boolean
  ): void {
    try {
      // Session duration
      apmService.recordBusinessMetric('learning.session_duration', duration, 'seconds', {
        user_id: userId,
        course_id: courseId,
        module_id: moduleId,
        content_type: contentType,
        completed: completed.toString()
      });

      // Session count
      apmService.recordBusinessMetric('learning.sessions', 1, 'count', {
        content_type: contentType,
        completed: completed.toString()
      });

      // Engagement rate (sessions per user per day)
      apmService.recordBusinessMetric('learning.engagement', 1, 'sessions', {
        user_id: userId
      });

      if (completed) {
        apmService.recordBusinessMetric('learning.completions', 1, 'count', {
          content_type: contentType
        });
      }
    } catch (error) {
      logger.error('Error recording learning session metrics:', error);
    }
  }

  // Queue Metrics
  recordQueueActivity(
    queueName: string,
    action: 'enqueued' | 'processed' | 'failed' | 'retried',
    jobType: string,
    processingTime?: number
  ): void {
    try {
      // Queue depth
      if (action === 'enqueued') {
        apmService.recordQueueMetric(queueName, 'enqueue', 1, {
          job_type: jobType
        });
      }

      // Processing metrics
      if (action === 'processed' && processingTime) {
        apmService.recordQueueMetric(queueName, 'process', processingTime, {
          job_type: jobType
        });
        
        // Processing rate
        apmService.recordBusinessMetric('queue.processing_rate', 60000 / processingTime, 'jobs/minute', {
          queue: queueName,
          job_type: jobType
        });
      }

      // Error metrics
      if (action === 'failed') {
        apmService.recordQueueMetric(queueName, 'error', 1, {
          job_type: jobType
        });
      }

      // Queue health
      apmService.recordBusinessMetric('queue.activity', 1, 'count', {
        queue: queueName,
        action,
        job_type: jobType
      });
    } catch (error) {
      logger.error('Error recording queue metrics:', error);
    }
  }

  // Search Metrics
  recordSearchActivity(
    _query: string,
    resultCount: number,
    duration: number,
    _userId: string,
    searchType: 'semantic' | 'keyword' | 'hybrid'
  ): void {
    try {
      // Search count
      apmService.recordBusinessMetric('search.queries', 1, 'count', {
        search_type: searchType,
        has_results: (resultCount > 0).toString()
      });

      // Result count
      apmService.recordBusinessMetric('search.results', resultCount, 'count', {
        search_type: searchType
      });

      // Search performance
      apmService.recordBusinessMetric('search.duration', duration, 'ms', {
        search_type: searchType,
        result_count_bucket: this.getResultCountBucket(resultCount)
      });

      // Search quality (click-through would be tracked separately)
      if (resultCount === 0) {
        apmService.recordBusinessMetric('search.no_results', 1, 'count', {
          search_type: searchType
        });
      }
    } catch (error) {
      logger.error('Error recording search metrics:', error);
    }
  }

  // Cost Per User Metrics
  recordUserCost(userId: string, costType: string, amount: number): void {
    try {
      apmService.recordBusinessMetric('user.cost', amount, 'usd', {
        user_id: userId,
        cost_type: costType
      });

      // Monthly cost tracking
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      apmService.recordBusinessMetric('user.monthly_cost', amount, 'usd', {
        user_id: userId,
        cost_type: costType,
        month: monthKey
      });
    } catch (error) {
      logger.error('Error recording user cost metrics:', error);
    }
  }

  // System Health Metrics
  recordSystemHealth(metric: string, value: number, unit: string, threshold?: number): void {
    try {
      apmService.recordBusinessMetric(`system.${metric}`, value, unit);

      // Check against threshold
      if (threshold !== undefined) {
        const isHealthy = value <= threshold;
        apmService.recordBusinessMetric('system.health_check', isHealthy ? 1 : 0, 'boolean', {
          metric,
          threshold: threshold.toString()
        });

        if (!isHealthy) {
          apmService.recordBusinessMetric('system.health_violations', 1, 'count', {
            metric,
            value: value.toString(),
            threshold: threshold.toString()
          });
        }
      }
    } catch (error) {
      logger.error('Error recording system health metrics:', error);
    }
  }

  // Helper Methods
  private getResultCountBucket(count: number): string {
    if (count === 0) return '0';
    if (count <= 10) return '1-10';
    if (count <= 50) return '11-50';
    if (count <= 100) return '51-100';
    return '100+';
  }
}

// Export singleton instance
export const businessMetrics = BusinessMetricsCollector.getInstance();