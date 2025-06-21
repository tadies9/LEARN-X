import { MetricSeries, MetricDataPoint, DashboardWidget } from './types/dashboard.types';

export class MetricDataSource {
  private readonly CACHE_TTL = 30000; // 30 seconds
  private metricCache: Map<string, { data: MetricSeries[]; timestamp: number }> = new Map();

  async getMetricData(widget: DashboardWidget): Promise<MetricSeries[]> {
    const { metric, timeRange, aggregation, filters } = widget.config;
    if (!metric) return [];

    const cacheKey = `${metric}_${timeRange}_${aggregation}_${JSON.stringify(filters)}`;
    const cached = this.metricCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    let data: MetricSeries[];

    switch (metric) {
      case 'response_time':
        data = await this.getResponseTimeData(timeRange, aggregation);
        break;

      case 'error_rate':
        data = await this.getErrorRateData(timeRange);
        break;

      case 'throughput':
        data = await this.getThroughputData(timeRange);
        break;

      case 'queue_depth':
        data = await this.getQueueDepthData(timeRange, filters);
        break;

      case 'ai_cost':
        data = await this.getAICostData(timeRange);
        break;

      case 'user_activity':
        data = await this.getUserActivityData(timeRange);
        break;

      default:
        data = await this.getCustomMetricData(metric, timeRange, aggregation, filters);
    }

    this.metricCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
  }

  private async getResponseTimeData(
    timeRange?: string,
    _aggregation?: string
  ): Promise<MetricSeries[]> {
    const dataPoints: MetricDataPoint[] = [];
    const now = Date.now();
    const duration = this.parseTimeRange(timeRange || '1h');

    for (let i = 0; i < 60; i++) {
      dataPoints.push({
        timestamp: now - (duration / 60) * i,
        value: Math.random() * 500 + 100, // Random response time between 100-600ms
      });
    }

    return [
      {
        name: 'Response Time',
        data: dataPoints.reverse(),
        unit: 'ms',
      },
    ];
  }

  private async getErrorRateData(timeRange?: string): Promise<MetricSeries[]> {
    const dataPoints: MetricDataPoint[] = [];
    const now = Date.now();
    const duration = this.parseTimeRange(timeRange || '1h');

    for (let i = 0; i < 60; i++) {
      dataPoints.push({
        timestamp: now - (duration / 60) * i,
        value: Math.random() * 5, // Random error rate between 0-5%
      });
    }

    return [
      {
        name: 'Error Rate',
        data: dataPoints.reverse(),
        unit: '%',
      },
    ];
  }

  private async getThroughputData(timeRange?: string): Promise<MetricSeries[]> {
    const dataPoints: MetricDataPoint[] = [];
    const now = Date.now();
    const duration = this.parseTimeRange(timeRange || '1h');

    for (let i = 0; i < 60; i++) {
      dataPoints.push({
        timestamp: now - (duration / 60) * i,
        value: Math.random() * 1000 + 500, // Random throughput between 500-1500 req/min
      });
    }

    return [
      {
        name: 'Throughput',
        data: dataPoints.reverse(),
        unit: 'req/min',
      },
    ];
  }

  private async getQueueDepthData(
    timeRange?: string,
    filters?: Record<string, string>
  ): Promise<MetricSeries[]> {
    const queueName = filters?.queue || 'all';
    const dataPoints: MetricDataPoint[] = [];
    const now = Date.now();
    const duration = this.parseTimeRange(timeRange || '1h');

    for (let i = 0; i < 60; i++) {
      dataPoints.push({
        timestamp: now - (duration / 60) * i,
        value: Math.random() * 100, // Random queue depth
        tags: { queue: queueName },
      });
    }

    return [
      {
        name: `Queue Depth - ${queueName}`,
        data: dataPoints.reverse(),
        unit: 'jobs',
      },
    ];
  }

  private async getAICostData(timeRange?: string): Promise<MetricSeries[]> {
    const dataPoints: MetricDataPoint[] = [];
    const now = Date.now();
    const duration = this.parseTimeRange(timeRange || '1h');

    for (let i = 0; i < 60; i++) {
      dataPoints.push({
        timestamp: now - (duration / 60) * i,
        value: Math.random() * 2, // Random cost between $0-2
      });
    }

    return [
      {
        name: 'AI Cost',
        data: dataPoints.reverse(),
        unit: 'USD',
      },
    ];
  }

  private async getUserActivityData(timeRange?: string): Promise<MetricSeries[]> {
    const dataPoints: MetricDataPoint[] = [];
    const now = Date.now();
    const duration = this.parseTimeRange(timeRange || '1h');

    for (let i = 0; i < 60; i++) {
      dataPoints.push({
        timestamp: now - (duration / 60) * i,
        value: Math.random() * 50 + 10, // Random user activity between 10-60
      });
    }

    return [
      {
        name: 'Active Users',
        data: dataPoints.reverse(),
        unit: 'users',
      },
    ];
  }

  private async getCustomMetricData(
    metric: string,
    _timeRange?: string,
    _aggregation?: string,
    _filters?: Record<string, string>
  ): Promise<MetricSeries[]> {
    return [
      {
        name: metric,
        data: [],
        unit: 'count',
      },
    ];
  }

  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default to 1 hour
    }
  }

  clearCache(): void {
    this.metricCache.clear();
  }
}