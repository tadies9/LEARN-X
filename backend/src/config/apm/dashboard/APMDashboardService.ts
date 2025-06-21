/**
 * APM Dashboard Service
 * Provides custom metrics visualization and dashboard management
 */

import { logger } from '../../../utils/logger';
import { Dashboard, DashboardData, WidgetData } from './types/dashboard.types';
import { DashboardManager } from './DashboardManager';
import { MetricDataSource } from './MetricDataSource';
import { WidgetDataProvider } from './WidgetDataProvider';
import { DefaultDashboards } from './DefaultDashboards';

export class APMDashboardService {
  private static instance: APMDashboardService;
  private dashboardManager: DashboardManager;
  private metricDataSource: MetricDataSource;
  private widgetDataProvider: WidgetDataProvider;

  private constructor() {
    this.dashboardManager = new DashboardManager();
    this.metricDataSource = new MetricDataSource();
    this.widgetDataProvider = new WidgetDataProvider(this.metricDataSource);
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
    return this.dashboardManager.createDashboard(dashboard);
  }

  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard | null {
    return this.dashboardManager.updateDashboard(dashboardId, updates);
  }

  deleteDashboard(dashboardId: string): boolean {
    return this.dashboardManager.deleteDashboard(dashboardId);
  }

  getDashboard(dashboardId: string): Dashboard | null {
    return this.dashboardManager.getDashboard(dashboardId);
  }

  getDashboards(category?: string, owner?: string): Dashboard[] {
    return this.dashboardManager.getDashboards(category, owner);
  }

  // Widget Management
  addWidget(dashboardId: string, widget: any) {
    return this.dashboardManager.addWidget(dashboardId, widget);
  }

  updateWidget(dashboardId: string, widgetId: string, updates: any) {
    return this.dashboardManager.updateWidget(dashboardId, widgetId, updates);
  }

  removeWidget(dashboardId: string, widgetId: string): boolean {
    return this.dashboardManager.removeWidget(dashboardId, widgetId);
  }

  // Data Retrieval
  async getDashboardData(dashboardId: string): Promise<DashboardData | null> {
    const dashboard = this.dashboardManager.getDashboard(dashboardId);
    if (!dashboard) return null;

    const widgetDataPromises = dashboard.widgets.map((widget) =>
      this.widgetDataProvider.getWidgetData(widget)
    );

    const widgetData = await Promise.all(widgetDataPromises);

    return {
      dashboardId,
      widgets: widgetData,
      generatedAt: new Date(),
    };
  }

  async getWidgetData(widget: any): Promise<WidgetData> {
    return this.widgetDataProvider.getWidgetData(widget);
  }

  // Import/Export
  exportDashboard(dashboardId: string): Dashboard | null {
    return this.dashboardManager.exportDashboard(dashboardId);
  }

  importDashboard(dashboardConfig: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    return this.dashboardManager.importDashboard(dashboardConfig);
  }

  // Clear cache
  clearCache(): void {
    this.metricDataSource.clearCache();
    logger.info('APM dashboard cache cleared');
  }

  private loadDefaultDashboards(): void {
    this.createDashboard(DefaultDashboards.getSystemPerformanceDashboard());
    this.createDashboard(DefaultDashboards.getBusinessMetricsDashboard());
    logger.info('Default dashboards loaded');
  }
}

// Export singleton instance
export const apmDashboard = APMDashboardService.getInstance();