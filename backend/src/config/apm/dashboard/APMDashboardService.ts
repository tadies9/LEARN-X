/**
 * APM Dashboard Service
 * Provides custom metrics visualization and dashboard management
 */

import { logger } from '../../../utils/logger';

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'text';
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: WidgetConfig;
  refreshInterval?: number; // seconds
}

export interface WidgetConfig {
  metric?: string;
  query?: string;
  aggregation?: 'avg' | 'sum' | 'count' | 'min' | 'max' | 'p95' | 'p99';
  timeRange?: string;
  filters?: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
  format?: {
    unit: string;
    decimals: number;
  };
  chartConfig?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    colors?: string[];
    stacked?: boolean;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: 'system' | 'business' | 'custom';
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
  owner?: string;
  shared: boolean;
}

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  unit?: string;
}

export interface DashboardData {
  dashboardId: string;
  widgets: WidgetData[];
  generatedAt: Date;
}

export interface WidgetData {
  widgetId: string;
  type: string;
  data: MetricSeries[] | any;
  status: 'ok' | 'warning' | 'critical' | 'error';
  lastUpdated: Date;
}

export class APMDashboardService {
  private static instance: APMDashboardService;
  private dashboards: Map<string, Dashboard> = new Map();
  private metricCache: Map<string, { data: MetricSeries[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  private constructor() {
    this.loadDefaultDashboards();
  }

  static getInstance(): APMDashboardService {
    if (!APMDashboardService.instance) {
      APMDashboardService.instance = new APMDashboardService();
    }
    return APMDashboardService.instance;
  }

  // Dashboard Management
  createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    const newDashboard: Dashboard = {
      id: this.generateDashboardId(),
      ...dashboard,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(newDashboard.id, newDashboard);
    logger.info(`Dashboard created: ${newDashboard.name}`);

    return newDashboard;
  }

  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboardId, updatedDashboard);
    logger.info(`Dashboard updated: ${updatedDashboard.name}`);

    return updatedDashboard;
  }

  deleteDashboard(dashboardId: string): boolean {
    if (this.dashboards.delete(dashboardId)) {
      logger.info(`Dashboard deleted: ${dashboardId}`);
      return true;
    }
    return false;
  }

  getDashboard(dashboardId: string): Dashboard | null {
    return this.dashboards.get(dashboardId) || null;
  }

  getDashboards(category?: string, owner?: string): Dashboard[] {
    let dashboards = Array.from(this.dashboards.values());

    if (category) {
      dashboards = dashboards.filter((d) => d.category === category);
    }

    if (owner) {
      dashboards = dashboards.filter((d) => d.owner === owner);
    }

    return dashboards;
  }

  // Widget Management
  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const newWidget: DashboardWidget = {
      id: this.generateWidgetId(),
      ...widget,
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();

    this.dashboards.set(dashboardId, dashboard);

    return newWidget;
  }

  updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): DashboardWidget | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgetIndex = dashboard.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex === -1) return null;

    dashboard.widgets[widgetIndex] = {
      ...dashboard.widgets[widgetIndex],
      ...updates,
    };

    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard.widgets[widgetIndex];
  }

  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const widgetIndex = dashboard.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex === -1) return false;

    dashboard.widgets.splice(widgetIndex, 1);
    dashboard.updatedAt = new Date();

    this.dashboards.set(dashboardId, dashboard);

    return true;
  }

  // Data Retrieval
  async getDashboardData(dashboardId: string): Promise<DashboardData | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgetDataPromises = dashboard.widgets.map((widget) => this.getWidgetData(widget));

    const widgetData = await Promise.all(widgetDataPromises);

    return {
      dashboardId,
      widgets: widgetData,
      generatedAt: new Date(),
    };
  }

  async getWidgetData(widget: DashboardWidget): Promise<WidgetData> {
    try {
      let data: MetricSeries[] | any;
      let status: 'ok' | 'warning' | 'critical' | 'error' = 'ok';

      switch (widget.type) {
        case 'metric':
          data = await this.getMetricData(widget);
          status = this.evaluateThresholds(data, widget.config.threshold);
          break;

        case 'chart':
          data = await this.getChartData(widget);
          break;

        case 'table':
          data = await this.getTableData(widget);
          break;

        case 'gauge':
          data = await this.getGaugeData(widget);
          status = this.evaluateThresholds(data, widget.config.threshold);
          break;

        case 'text':
          data = await this.getTextData(widget);
          break;

        default:
          data = [];
          status = 'error';
      }

      return {
        widgetId: widget.id,
        type: widget.type,
        data,
        status,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error(`Error getting widget data for ${widget.id}:`, error);

      return {
        widgetId: widget.id,
        type: widget.type,
        data: [],
        status: 'error',
        lastUpdated: new Date(),
      };
    }
  }

  // Metric Data Sources
  private async getMetricData(widget: DashboardWidget): Promise<MetricSeries[]> {
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
    // Mock implementation - in real scenario, this would query the APM provider
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
    // Placeholder for custom metric implementation
    return [
      {
        name: metric,
        data: [],
        unit: 'count',
      },
    ];
  }

  private async getChartData(widget: DashboardWidget): Promise<MetricSeries[]> {
    return this.getMetricData(widget);
  }

  private async getTableData(_widget: DashboardWidget): Promise<any[]> {
    // Return tabular data for table widgets
    return [
      { endpoint: '/api/users', avgResponseTime: 245, requests: 1250, errors: 3 },
      { endpoint: '/api/courses', avgResponseTime: 189, requests: 890, errors: 1 },
      { endpoint: '/api/files', avgResponseTime: 567, requests: 345, errors: 12 },
    ];
  }

  private async getGaugeData(widget: DashboardWidget): Promise<MetricSeries[]> {
    // Return single value for gauge widgets
    const metricData = await this.getMetricData(widget);
    if (metricData.length > 0 && metricData[0].data.length > 0) {
      const latestValue = metricData[0].data[metricData[0].data.length - 1].value;
      return [
        {
          name: metricData[0].name,
          data: [{ timestamp: Date.now(), value: latestValue }],
          unit: metricData[0].unit,
        },
      ];
    }
    return [];
  }

  private async getTextData(widget: DashboardWidget): Promise<string> {
    // Return text content for text widgets
    return widget.config.query || 'No content configured';
  }

  // Utility Methods
  private evaluateThresholds(
    data: MetricSeries[] | any,
    threshold?: { warning: number; critical: number }
  ): 'ok' | 'warning' | 'critical' | 'error' {
    if (!threshold || !Array.isArray(data) || data.length === 0) return 'ok';

    const latestSeries = data[0];
    if (!latestSeries.data || latestSeries.data.length === 0) return 'ok';

    const latestValue = latestSeries.data[latestSeries.data.length - 1].value;

    if (latestValue >= threshold.critical) return 'critical';
    if (latestValue >= threshold.warning) return 'warning';

    return 'ok';
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

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadDefaultDashboards(): void {
    // System Performance Dashboard
    this.createDashboard({
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
    });

    // Business Metrics Dashboard
    this.createDashboard({
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
    });

    logger.info('Default dashboards loaded');
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(dashboardId: string): Dashboard | null {
    return this.getDashboard(dashboardId);
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(dashboardConfig: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    return this.createDashboard(dashboardConfig);
  }

  /**
   * Clear metric cache
   */
  clearCache(): void {
    this.metricCache.clear();
    logger.info('APM dashboard cache cleared');
  }
}

// Export singleton instance
export const apmDashboard = APMDashboardService.getInstance();
