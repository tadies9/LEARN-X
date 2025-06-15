/**
 * Worker Health Monitor
 * Provides health checking and metrics for worker processes
 * Follows coding standards: Under 150 lines, single responsibility
 */

import { logger } from '../../utils/logger';

export interface WorkerHealthMetrics {
  workerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  lastHealthCheck: string;
  errorCount: number;
  processedJobs: number;
}

export class WorkerHealth {
  private workerId: string;
  private startTime: number;
  private errorCount = 0;
  private processedJobs = 0;
  private isMonitoring = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(workerId: string) {
    this.workerId = workerId;
    this.startTime = Date.now();
  }

  /**
   * Starts health monitoring
   */
  async start(): Promise<void> {
    this.isMonitoring = true;
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Log startup
    logger.info(`[WorkerHealth] Started monitoring for worker: ${this.workerId}`);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stops health monitoring
   */
  async stop(): Promise<void> {
    this.isMonitoring = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    logger.info(`[WorkerHealth] Stopped monitoring for worker: ${this.workerId}`);
  }

  /**
   * Records a successful job processing
   */
  recordJobSuccess(): void {
    this.processedJobs++;
  }

  /**
   * Records a job processing error
   */
  recordJobError(error: Error): void {
    this.errorCount++;
    logger.error(`[WorkerHealth] Job error in ${this.workerId}:`, error);
  }

  /**
   * Gets current health metrics
   */
  getMetrics(): WorkerHealthMetrics {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    return {
      workerId: this.workerId,
      status: this.calculateHealthStatus(memoryUsage, uptime),
      uptime,
      memoryUsage,
      lastHealthCheck: new Date().toISOString(),
      errorCount: this.errorCount,
      processedJobs: this.processedJobs
    };
  }

  /**
   * Performs a health check and logs status
   */
  private performHealthCheck(): void {
    if (!this.isMonitoring) return;

    const metrics = this.getMetrics();
    
    // Log health status
    logger.info(`[WorkerHealth] Health check: ${this.workerId}`, {
      status: metrics.status,
      uptime: Math.round(metrics.uptime / 1000) + 's',
      memoryMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
      processedJobs: metrics.processedJobs,
      errorCount: metrics.errorCount
    });

    // Alert on unhealthy status
    if (metrics.status === 'unhealthy') {
      logger.error(`[WorkerHealth] ALERT: Worker ${this.workerId} is unhealthy!`, metrics);
    }
  }

  /**
   * Calculates health status based on metrics
   */
  private calculateHealthStatus(
    memoryUsage: NodeJS.MemoryUsage,
    uptime: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryLimitMB = 1024; // 1GB limit
    const memoryUsageRatio = memoryUsedMB / memoryLimitMB;

    const errorRate = this.processedJobs > 0 ? this.errorCount / this.processedJobs : 0;

    // Unhealthy conditions
    if (memoryUsageRatio > 0.9 || errorRate > 0.2) {
      return 'unhealthy';
    }

    // Degraded conditions
    if (memoryUsageRatio > 0.7 || errorRate > 0.05) {
      return 'degraded';
    }

    return 'healthy';
  }
}