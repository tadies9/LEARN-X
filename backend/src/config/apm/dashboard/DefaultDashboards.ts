import { Dashboard, DashboardWidget } from './types/dashboard.types';

export class DefaultDashboards {
  static getSystemPerformanceDashboard(): Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'System Performance',
      description: 'Overall system performance metrics',
      category: 'system',
      shared: true,
      widgets: [
        {
          id: 'response_time_chart',
          type: 'chart',
          title: 'Response Time',
          size: 'medium',
          position: { x: 0, y: 0 },
          config: {
            metric: 'response_time',
            timeRange: '6h',
            aggregation: 'avg',
            chartConfig: { type: 'line' },
            threshold: { warning: 300, critical: 500 },
          },
        },
        {
          id: 'error_rate_gauge',
          type: 'gauge',
          title: 'Error Rate',
          size: 'small',
          position: { x: 2, y: 0 },
          config: {
            metric: 'error_rate',
            timeRange: '1h',
            threshold: { warning: 2, critical: 5 },
            format: { unit: '%', decimals: 2 },
          },
        },
        {
          id: 'throughput_metric',
          type: 'metric',
          title: 'Throughput',
          size: 'small',
          position: { x: 3, y: 0 },
          config: {
            metric: 'throughput',
            timeRange: '1h',
            aggregation: 'avg',
            format: { unit: 'req/min', decimals: 0 },
          },
        },
      ],
    };
  }

  static getBusinessMetricsDashboard(): Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'Business Metrics',
      description: 'Key business performance indicators',
      category: 'business',
      shared: true,
      widgets: [
        {
          id: 'ai_cost_chart',
          type: 'chart',
          title: 'AI Cost',
          size: 'medium',
          position: { x: 0, y: 0 },
          config: {
            metric: 'ai_cost',
            timeRange: '24h',
            aggregation: 'sum',
            chartConfig: { type: 'area' },
            threshold: { warning: 50, critical: 100 },
          },
        },
        {
          id: 'user_activity_metric',
          type: 'metric',
          title: 'Active Users',
          size: 'small',
          position: { x: 2, y: 0 },
          config: {
            metric: 'user_activity',
            timeRange: '1h',
            aggregation: 'count',
            format: { unit: 'users', decimals: 0 },
          },
        },
        {
          id: 'queue_depth_table',
          type: 'table',
          title: 'Queue Status',
          size: 'large',
          position: { x: 0, y: 1 },
          config: {
            metric: 'queue_depth',
            timeRange: '1h',
          },
        },
      ],
    };
  }
}