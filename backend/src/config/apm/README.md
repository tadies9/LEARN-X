# LEARN-X Application Performance Monitoring (APM)

Comprehensive Application Performance Monitoring system for LEARN-X, providing full-stack observability, alerting, and performance insights.

## Features

### 🔍 Core APM Capabilities
- **Multi-Provider Support**: New Relic, Datadog, and Elastic APM
- **Distributed Tracing**: End-to-end request tracking across services
- **Custom Metrics**: Business-specific metrics and KPIs
- **Error Tracking**: Comprehensive error capture and correlation
- **Performance Budgets**: Automated performance threshold monitoring

### 📊 Business Intelligence
- **AI Usage Tracking**: Token consumption, cost monitoring, model performance
- **File Processing Metrics**: Processing times, success rates, file types
- **Queue Monitoring**: Depth, processing times, error rates
- **User Activity**: Session tracking, feature usage, engagement metrics
- **Search Performance**: Query times, result quality, user satisfaction

### 🚨 Alerting & Monitoring
- **Real-time Alerts**: Slack, email, webhook, PagerDuty integration
- **Performance Degradation Detection**: Automatic anomaly detection
- **Custom Alert Rules**: Business-specific thresholds and conditions
- **Alert Correlation**: Link related alerts and incidents

### 🎯 Unified Observability
- **Frontend RUM**: Real User Monitoring with Web Vitals
- **Backend APM**: Server-side performance tracking
- **Trace Correlation**: Connect frontend actions to backend traces
- **Session Analysis**: Complete user journey tracking

### 📈 Dashboards & Visualization
- **Pre-built Dashboards**: System and business metric dashboards
- **Custom Widgets**: Flexible visualization components
- **Real-time Data**: Live metric updates and streaming
- **Export/Import**: Dashboard configuration management

## Quick Start

### 1. Basic Setup

```typescript
import { initializeAPM } from './config/apm';

// Initialize APM system
await initializeAPM();
```

### 2. Environment Configuration

```env
# Core APM
APM_ENABLED=true
APM_PROVIDER=datadog
APM_SERVICE_NAME=learn-x-api

# Datadog Configuration
DD_API_KEY=your_datadog_api_key
DD_SERVICE=learn-x-api
DD_ENV=production
DD_VERSION=1.0.0

# Alerting
APM_ALERTING_ENABLED=true
SLACK_WEBHOOK_URL=your_slack_webhook
ALERT_EMAIL=alerts@yourcompany.com

# RUM (Real User Monitoring)
RUM_ENABLED=true
RUM_SAMPLE_RATE=0.1
```

### 3. Add APM Middleware

```typescript
import { apmMiddleware, distributedTracingMiddleware } from './config/apm';

app.use(distributedTracingMiddleware);
app.use(apmMiddleware);
```

## Provider Setup

### New Relic Setup
See: [New Relic Setup Guide](./setup/NEW_RELIC_SETUP.md)

### Datadog Setup  
See: [Datadog Setup Guide](./setup/DATADOG_SETUP.md)

## Usage Examples

### Recording Business Metrics

```typescript
import { businessMetrics } from './config/apm';

// Track file processing
businessMetrics.recordFileProcessed('pdf', 1024000, 2500, true);

// Track AI usage
businessMetrics.recordAIUsage(
  'text-generation', 
  'gpt-4', 
  1000, 500, 3000, 0.06, 
  'user123'
);

// Track user activity
businessMetrics.recordUserActivity('user123', 'course_completed', {
  courseId: 'course-456',
  duration: 3600
});
```

### Custom Alerting

```typescript
import { apmAlerting } from './config/apm';

// Add custom alert rule
apmAlerting.addRule({
  id: 'high_ai_cost',
  name: 'High AI Cost Alert',
  description: 'AI costs exceeding budget',
  metric: 'ai.cost.hourly',
  condition: 'above',
  threshold: 50,
  duration: 5,
  severity: 'critical',
  enabled: true,
  channels: [{
    type: 'slack',
    endpoint: process.env.SLACK_WEBHOOK_URL!
  }]
});
```

### Python Service Integration

```typescript
import { pythonServices } from './config/apm';

// Use pre-configured AI service
const result = await pythonServices.ai.processWithAI('text-generation', {
  prompt: 'Generate course content',
  model: 'gpt-4'
});

// Custom Python service
const customService = createPythonServiceIntegration('ml-pipeline', {
  baseUrl: 'http://ml-service:8000',
  timeout: 30000,
  retryAttempts: 3,
  healthCheckEndpoint: '/health',
  traceHeaderFormat: 'w3c'
});
```

### Frontend RUM Integration

```typescript
import { unifiedObservability } from './config/apm';

// Track user session
const session = unifiedObservability.startSession({
  userId: 'user123',
  userAgent: req.headers['user-agent'],
  deviceType: 'desktop'
});

// Track page views
unifiedObservability.trackPageView(session.sessionId, {
  pageId: 'dashboard',
  url: '/dashboard',
  title: 'Dashboard',
  loadTime: 1200,
  vitals: {
    fcp: 800,
    lcp: 1200,
    fid: 50,
    cls: 0.1,
    ttfb: 200
  }
});
```

### Queue Monitoring

```typescript
import { queueAPM } from './config/apm';

// Automatic queue job monitoring
class FileProcessor {
  @QueueAPMMiddleware.trackQueueJob('file-processing')
  async processFile(job: QueueJob) {
    // Job processing logic
    return result;
  }
}

// Manual queue metrics
queueAPM.recordQueueDepth('file-processing', 45);
queueAPM.onJobComplete('file-processing', job, transaction);
```

### Custom Dashboards

```typescript
import { apmDashboard } from './config/apm';

// Create custom dashboard
const dashboard = apmDashboard.createDashboard({
  name: 'AI Performance',
  description: 'AI service performance metrics',
  category: 'business',
  shared: true,
  widgets: [
    {
      id: 'ai_response_time',
      type: 'chart',
      title: 'AI Response Time',
      size: 'medium',
      position: { x: 0, y: 0 },
      config: {
        metric: 'ai.duration',
        timeRange: '6h',
        aggregation: 'avg',
        chartConfig: { type: 'line' }
      }
    }
  ]
});
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Python Services│
│   (RUM)         │    │   (APM)         │    │   (Traced)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │  HTTP/Trace Headers  │  HTTP/Trace Headers  │
          └──────────┬───────────┼──────────────────────┘
                     │           │
                ┌────▼───────────▼────┐
                │ Distributed Tracing │
                └─────────┬───────────┘
                          │
            ┌─────────────▼─────────────┐
            │   APM Provider            │
            │ (New Relic/Datadog)       │
            └─────────────┬─────────────┘
                          │
            ┌─────────────▼─────────────┐
            │   Dashboards & Alerts    │
            └───────────────────────────┘
```

## Monitoring Coverage

### Backend Services
- ✅ HTTP Requests (response times, status codes, errors)
- ✅ Database Queries (duration, slow queries, connections)
- ✅ Queue Processing (depth, processing times, failures)
- ✅ External API Calls (latency, success rates, retries)
- ✅ AI Service Calls (token usage, costs, model performance)
- ✅ File Processing (throughput, success rates, file types)
- ✅ Cache Performance (hit rates, operation times)

### Frontend Experience
- ✅ Page Load Times (FCP, LCP, TTFB)
- ✅ User Interactions (FID, CLS)
- ✅ API Call Correlation (trace linking)
- ✅ Error Tracking (JavaScript errors, API failures)
- ✅ User Sessions (engagement, bounce rates)

### Business Metrics
- ✅ User Activity (feature usage, session duration)
- ✅ Content Processing (files uploaded, processed, stored)
- ✅ AI Usage (tokens consumed, costs, model distribution)
- ✅ Search Performance (query times, result quality)
- ✅ Course Engagement (completions, time spent)

## Alert Templates

### Performance Alerts
- Response time > 500ms for 5 minutes
- Error rate > 5% for 10 minutes
- Queue depth > 100 jobs for 15 minutes
- Database queries > 1s for 5 minutes

### Business Alerts
- AI cost > $50/hour
- File processing errors > 10% for 15 minutes
- User activity drops > 25% for 30 minutes
- Search success rate < 90% for 20 minutes

### Infrastructure Alerts
- CPU usage > 80% for 10 minutes
- Memory usage > 85% for 10 minutes
- Disk usage > 90% for 5 minutes

## Health Monitoring

```typescript
import { apmHealthCheck } from './config/apm';

// Get comprehensive health status
const health = await apmHealthCheck.performHealthCheck();

// Generate health report
const report = apmHealthCheck.generateHealthReport();

// Export health data
const healthData = apmHealthCheck.exportHealthData();
```

## Best Practices

### 1. Sampling Strategy
- Production: 10% sampling rate for traces
- Development: 100% sampling for debugging
- Load testing: 1% sampling to reduce overhead

### 2. Alert Fatigue Prevention
- Use appropriate thresholds based on baseline metrics
- Implement alert escalation policies
- Group related alerts to reduce noise

### 3. Performance Budget Management
- Set realistic performance budgets
- Review and adjust thresholds regularly
- Focus on user-impacting metrics

### 4. Cost Optimization
- Monitor APM data ingestion costs
- Use tags and filters effectively
- Archive old data according to retention policies

## Troubleshooting

### Common Issues

1. **No Data Appearing**
   - Check APM provider configuration
   - Verify environment variables
   - Ensure agent is imported first

2. **High Data Usage**
   - Reduce sampling rates
   - Filter noisy endpoints
   - Optimize tag usage

3. **Missing Traces**
   - Verify distributed tracing headers
   - Check cross-service communication
   - Validate trace context propagation

### Debug Tools

```bash
# Check APM health
curl http://localhost:3000/api/apm/health

# View current configuration
curl http://localhost:3000/api/apm/config

# Export dashboard data
curl http://localhost:3000/api/apm/dashboard/system/export
```

## Contributing

When adding new APM features:

1. Follow the modular architecture
2. Keep files under 300 lines (per coding standards)
3. Add comprehensive error handling
4. Include TypeScript types
5. Add appropriate tests
6. Update documentation

## License

Internal use only - LEARN-X Project