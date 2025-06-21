import { logger } from '../../../utils/logger';
import { Dashboard, DashboardWidget } from './types/dashboard.types';

export class DashboardManager {
  private dashboards: Map<string, Dashboard> = new Map();

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

  exportDashboard(dashboardId: string): Dashboard | null {
    return this.getDashboard(dashboardId);
  }

  importDashboard(dashboardConfig: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    return this.createDashboard(dashboardConfig);
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}