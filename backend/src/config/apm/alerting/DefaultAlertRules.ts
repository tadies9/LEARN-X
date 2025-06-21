import { AlertRule } from './types/alerting.types';

export class DefaultAlertRules {
  static getDefaultRules(): AlertRule[] {
    return [
      {
        id: 'response_time_high',
        name: 'High Response Time',
        description: 'API response time is above acceptable threshold',
        metric: 'http.request.duration',
        condition: 'above',
        threshold: 500, // ms
        duration: 5, // minutes
        severity: 'high',
        enabled: true,
        channels: [],
      },
      {
        id: 'error_rate_high',
        name: 'High Error Rate',
        description: 'Error rate is above acceptable threshold',
        metric: 'errors.rate',
        condition: 'above',
        threshold: 5, // percent
        duration: 10,
        severity: 'critical',
        enabled: true,
        channels: [],
      },
      {
        id: 'ai_cost_spike',
        name: 'AI Cost Spike',
        description: 'AI usage costs are spiking',
        metric: 'ai.cost.hourly',
        condition: 'above',
        threshold: 10, // USD
        duration: 5,
        severity: 'medium',
        enabled: true,
        channels: [],
      },
      {
        id: 'queue_depth_high',
        name: 'High Queue Depth',
        description: 'Queue depth is too high',
        metric: 'queue.depth',
        condition: 'above',
        threshold: 100,
        duration: 15,
        severity: 'high',
        enabled: true,
        channels: [],
      },
    ];
  }
}