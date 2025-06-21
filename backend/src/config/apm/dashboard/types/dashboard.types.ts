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