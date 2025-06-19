# Datadog APM Setup Guide for LEARN-X

This guide provides comprehensive instructions for setting up Datadog APM with LEARN-X, including free tier options and advanced monitoring.

## Prerequisites

- Node.js application running
- Datadog account (free trial available)
- Docker (optional, for local agent)
- Access to environment variables configuration

## Step 1: Create Datadog Account

1. Go to [Datadog](https://www.datadoghq.com/)
2. Sign up for a free trial (14-day full featured trial)
3. Choose the appropriate region (US/EU)
4. Complete account setup

## Step 2: Get API Keys

1. Navigate to: **Organization Settings > API Keys**
2. Create a new API key for your application
3. Copy the API key - you'll need it for environment variables
4. Navigate to: **Organization Settings > Application Keys**
5. Create an application key (for advanced features)

## Step 3: Install Datadog Agent

### Option A: Docker (Recommended for Development)

```bash
# Create docker-compose.yml for Datadog agent
version: '3.8'
services:
  datadog-agent:
    image: datadog/agent:latest
    container_name: datadog-agent
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_SITE=datadoghq.com  # Use datadoghq.eu for EU region
      - DD_LOGS_ENABLED=true
      - DD_APM_ENABLED=true
      - DD_APM_NON_LOCAL_TRAFFIC=true
      - DD_PROCESS_AGENT_ENABLED=true
      - DD_DOCKER_LABELS_AS_TAGS=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
      - /opt/datadog-agent/run:/opt/datadog-agent/run:rw
    ports:
      - "8126:8126"  # APM port
      - "8125:8125/udp"  # DogStatsD port

# Start the agent
docker-compose up -d datadog-agent
```

### Option B: Native Installation (Production)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install datadog-agent

# Configure agent with your API key
sudo sh -c "sed 's/api_key:.*/api_key: ${DD_API_KEY}/' /etc/datadog-agent/datadog.yaml.example > /etc/datadog-agent/datadog.yaml"

# Enable APM
echo "apm_config:" >> /etc/datadog-agent/datadog.yaml
echo "  enabled: true" >> /etc/datadog-agent/datadog.yaml

# Start the agent
sudo systemctl start datadog-agent
sudo systemctl enable datadog-agent
```

## Step 4: Install Node.js Tracer

```bash
# Navigate to backend directory
cd backend

# Install Datadog Node.js tracer
npm install dd-trace

# Install DogStatsD client for custom metrics
npm install node-dogstatsd
```

## Step 5: Configure Environment Variables

Add the following to your `.env` file:

```env
# APM Configuration
APM_ENABLED=true
APM_PROVIDER=datadog
APM_SERVICE_NAME=learn-x-api

# Datadog Configuration
DD_API_KEY=your_api_key_here
DD_APP_KEY=your_app_key_here
DD_SITE=datadoghq.com  # or datadoghq.eu for EU
DD_SERVICE=learn-x-api
DD_ENV=development  # or staging/production
DD_VERSION=1.0.0

# Agent Configuration
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
DD_DOGSTATSD_PORT=8125

# Performance Settings
DD_TRACE_ENABLED=true
DD_RUNTIME_METRICS_ENABLED=true
DD_TRACE_ANALYTICS_ENABLED=true
DD_LOGS_INJECTION=true

# Profiling (optional)
DD_PROFILING_ENABLED=true
DD_PROFILING_EXPORT_TIMEOUT=30000
```

## Step 6: Initialize Datadog in Application

**Important**: Datadog tracer must be imported FIRST.

Create `src/tracing.ts`:

```typescript
// This file must be imported before any other modules
import tracer from 'dd-trace';

// Initialize tracer
tracer.init({
  service: process.env.DD_SERVICE || 'learn-x-api',
  env: process.env.DD_ENV || 'development',
  version: process.env.DD_VERSION || '1.0.0',
  analytics: true,
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,
  tags: {
    team: 'backend',
    component: 'api',
    region: process.env.AWS_REGION || 'us-east-1'
  },
  // Custom sampling rules
  samplingRules: [
    {
      sample_rate: 1.0,
      service: 'learn-x-api',
      name: 'web.request'
    },
    {
      sample_rate: 0.5,
      service: 'learn-x-api',
      name: 'db.query'
    }
  ]
});

export default tracer;
```

Update your `src/index.ts`:

```typescript
// MUST be first import
import './tracing';

// Now import other modules
import express from 'express';
import { apmService } from './config/apm/APMService';

// ... rest of your application
```

## Step 7: Environment-Specific Configuration

### Development
```env
DD_SERVICE=learn-x-api-dev
DD_ENV=development
DD_TRACE_DEBUG=true
DD_LOGS_INJECTION=true
```

### Staging
```env
DD_SERVICE=learn-x-api-staging
DD_ENV=staging
DD_TRACE_SAMPLE_RATE=0.5
DD_PROFILING_ENABLED=true
```

### Production
```env
DD_SERVICE=learn-x-api-prod
DD_ENV=production
DD_TRACE_SAMPLE_RATE=0.1
DD_PROFILING_ENABLED=true
DD_TRACE_OBFUSCATION_QUERY_STRING_REGEXP=.*
```

## Step 8: Deploy Dashboard

1. Go to Datadog Dashboard
2. Import the dashboard JSON from `src/config/apm/dashboards/datadog-dashboard.json`
3. Customize widgets as needed

## Step 9: Set Up Monitors

### Performance Monitors

```json
{
  "name": "High Response Time - LEARN-X API",
  "type": "metric alert",
  "query": "avg(last_5m):avg:trace.web.request.duration{service:learn-x-api} > 0.5",
  "message": "API response time is high @slack-alerts",
  "options": {
    "thresholds": {
      "critical": 0.5,
      "warning": 0.3
    },
    "notify_audit": false,
    "require_full_window": true,
    "notify_no_data": true,
    "no_data_timeframe": 10,
    "evaluation_delay": 60
  }
}
```

### Error Rate Monitor

```json
{
  "name": "High Error Rate - LEARN-X API",
  "type": "metric alert",
  "query": "avg(last_10m):sum:trace.web.request.errors{service:learn-x-api}.as_rate() > 0.05",
  "message": "Error rate is above 5% @pagerduty-critical",
  "options": {
    "thresholds": {
      "critical": 0.05,
      "warning": 0.02
    }
  }
}
```

### Business Metrics Monitor

```json
{
  "name": "AI Cost Spike - LEARN-X",
  "type": "metric alert",
  "query": "avg(last_1h):sum:business.ai.cost{service:learn-x-api} > 10",
  "message": "AI costs are spiking - check usage @team-backend",
  "options": {
    "thresholds": {
      "critical": 10,
      "warning": 7
    }
  }
}
```

## Step 10: Configure Log Forwarding

### Docker Logging

```yaml
# Add to docker-compose.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,version"
    labels:
      com.datadoghq.ad.logs: '[{"source": "nodejs", "service": "learn-x-api"}]'
```

### Direct Log Forwarding

```typescript
// Add to your logger configuration
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.DD_SERVICE,
    env: process.env.DD_ENV,
    version: process.env.DD_VERSION
  },
  transports: [
    // Add Datadog transport
    new winston.transports.Http({
      host: 'http-intake.logs.datadoghq.com',
      path: '/v1/input/' + process.env.DD_API_KEY,
      ssl: true
    })
  ]
});
```

## Step 11: Custom Metrics Integration

```typescript
// Example custom metrics
import { businessMetrics } from '../config/apm/metrics/BusinessMetrics';

// Track file processing
businessMetrics.recordFileProcessed('pdf', 1024000, 2500, true);

// Track AI usage
businessMetrics.recordAIUsage('completion', 'gpt-4', 1000, 500, 3000, 0.06, 'user123');

// Track search performance
businessMetrics.recordSearchActivity('machine learning', 15, 245, 'user123', 'hybrid');
```

## Verification

1. Start your application with tracing enabled
2. Check Datadog APM dashboard for incoming traces
3. Verify custom metrics are appearing
4. Test error reporting by triggering an error

## Free Tier and Pricing

### Free Trial
- **Duration**: 14 days full featured
- **Hosts**: Up to 5 hosts
- **Metrics**: Unlimited custom metrics
- **Logs**: 1GB/day ingestion
- **Traces**: 1M spans/month

### Production Pricing
- **APM**: $15/host/month
- **Infrastructure**: $15/host/month
- **Logs**: $1.27/GB ingested
- **Custom Metrics**: $0.05/100 metrics

## Troubleshooting

### Common Issues

1. **No Traces Appearing**
   ```bash
   # Check agent status
   docker exec datadog-agent agent status
   
   # Check trace agent
   docker exec datadog-agent agent configcheck
   ```

2. **High Data Usage**
   ```env
   # Reduce sampling rate
   DD_TRACE_SAMPLE_RATE=0.1
   
   # Disable debug logging
   DD_TRACE_DEBUG=false
   ```

3. **Performance Impact**
   ```env
   # Optimize for production
   DD_TRACE_ANALYTICS_ENABLED=false
   DD_PROFILING_ENABLED=false
   DD_RUNTIME_METRICS_ENABLED=false
   ```

### Debug Commands

```bash
# Test connectivity
curl -X GET "https://api.datadoghq.com/api/v1/validate" \
  -H "DD-API-KEY: ${DD_API_KEY}"

# Check agent logs
docker logs datadog-agent

# Send test metric
echo "custom.metric:1|c" | nc -u -w1 localhost 8125
```

## Advanced Features

### Profiling
- Continuous profiling for performance optimization
- CPU and memory flame graphs
- Automatic bottleneck detection

### Synthetic Monitoring
- API endpoint monitoring
- Real user monitoring (RUM)
- Browser performance tracking

### Security Monitoring
- Application security monitoring
- Runtime protection
- Vulnerability detection

## Integration with Frontend

Connect Datadog RUM with backend APM:

```javascript
// Frontend RUM initialization
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'your-rum-app-id',
  clientToken: 'your-client-token',
  site: 'datadoghq.com',
  service: 'learn-x-frontend',
  env: 'production',
  version: '1.0.0',
  trackInteractions: true,
  defaultPrivacyLevel: 'mask-user-input'
});
```

## Next Steps

1. **Custom Dashboards**: Create business-specific visualizations
2. **Alert Optimization**: Fine-tune thresholds based on baseline data
3. **Cost Optimization**: Implement intelligent sampling strategies
4. **Team Integration**: Set up proper notification channels and escalation policies