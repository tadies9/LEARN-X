import { logger } from '../../../utils/logger';
import { 
  DashboardWidget, 
  WidgetData, 
  MetricSeries 
} from './types/dashboard.types';
import { MetricDataSource } from './MetricDataSource';

export class WidgetDataProvider {
  private metricDataSource: MetricDataSource;

  constructor(metricDataSource: MetricDataSource) {
    this.metricDataSource = metricDataSource;
  }

  async getWidgetData(widget: DashboardWidget): Promise<WidgetData> {
    try {
      let data: MetricSeries[] | any;
      let status: 'ok' | 'warning' | 'critical' | 'error' = 'ok';

      switch (widget.type) {
        case 'metric':
          data = await this.metricDataSource.getMetricData(widget);
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

  private async getChartData(widget: DashboardWidget): Promise<MetricSeries[]> {
    return this.metricDataSource.getMetricData(widget);
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
    const metricData = await this.metricDataSource.getMetricData(widget);
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
}