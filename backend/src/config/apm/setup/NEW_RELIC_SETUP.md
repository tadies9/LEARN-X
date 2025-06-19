# New Relic APM Setup Guide for LEARN-X

This guide provides step-by-step instructions for setting up New Relic APM with LEARN-X, focusing on the free tier options.

## Prerequisites

- Node.js application running
- New Relic account (free tier available)
- Access to environment variables configuration

## Step 1: Create New Relic Account

1. Go to [New Relic](https://newrelic.com/)
2. Sign up for a free account
3. Choose the "Free" plan (100GB/month free data ingest)
4. Complete account setup

## Step 2: Get License Key

1. Navigate to: **Account Settings > API Keys**
2. Find your **License Key** (or create one)
3. Copy the license key - you'll need it for environment variables

## Step 3: Install New Relic Agent

```bash
# Navigate to backend directory
cd backend

# Install New Relic Node.js agent
npm install newrelic
```

## Step 4: Configure Environment Variables

Add the following to your `.env` file:

```env
# APM Configuration
APM_ENABLED=true
APM_PROVIDER=newrelic
APM_SERVICE_NAME=learn-x-api

# New Relic Configuration
NEW_RELIC_LICENSE_KEY=your_license_key_here
NEW_RELIC_APP_NAME=learn-x-api
NEW_RELIC_LOG_LEVEL=info
NEW_RELIC_ENABLED=true

# Optional: Custom attributes
NEW_RELIC_ATTRIBUTES_INCLUDE=request.parameters.*
NEW_RELIC_ATTRIBUTES_EXCLUDE=request.headers.cookie,request.headers.authorization
```

## Step 5: Create New Relic Configuration File

Create `newrelic.js` in your backend root directory:

```javascript
'use strict'

/**
 * New Relic agent configuration for LEARN-X
 * Make sure this is the first module imported
 */
module.exports = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'learn-x-api'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout'
  },
  allow_all_headers: true,
  attributes: {
    enabled: true,
    include: [
      'request.headers.userAgent',
      'request.headers.referer',
      'request.parameters.*',
      'response.headers.contentType'
    ],
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  distributed_tracing: {
    enabled: true
  },
  slow_sql: {
    enabled: true,
    max_samples: 10
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500,
    top_n: 20
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404]
  },
  browser_monitoring: {
    enable: true
  },
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000
    },
    metrics: {
      enabled: true
    },
    local_decorating: {
      enabled: true
    }
  }
}
```

## Step 6: Update Application Entry Point

**Important**: New Relic must be imported FIRST in your application.

Update your `src/index.ts`:

```typescript
// MUST be first import - before any other modules
if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}

// Now import other modules
import express from 'express';
import { apmService } from './config/apm/APMService';

// ... rest of your application
```

## Step 7: Initialize APM in Application

Update your main server file to initialize APM:

```typescript
import { apmService } from './config/apm/APMService';

async function startServer() {
  // Initialize APM
  await apmService.initialize();
  
  // ... rest of server setup
}
```

## Step 8: Environment-Specific Configuration

### Development
```env
NEW_RELIC_APP_NAME=learn-x-api-dev
NEW_RELIC_LOG_LEVEL=debug
```

### Staging
```env
NEW_RELIC_APP_NAME=learn-x-api-staging
NEW_RELIC_LOG_LEVEL=info
```

### Production
```env
NEW_RELIC_APP_NAME=learn-x-api-prod
NEW_RELIC_LOG_LEVEL=warn
NEW_RELIC_HIGH_SECURITY=true
```

## Step 9: Deploy Dashboard

1. Go to New Relic Dashboard
2. Import the dashboard JSON from `src/config/apm/dashboards/newrelic-dashboard.json`
3. Customize dashboard as needed

## Step 10: Set Up Alerts

### Performance Alerts
1. Go to **Alerts & AI > Alert Policies**
2. Create policy: "LEARN-X Performance"
3. Add conditions:
   - **Apdex** < 0.8 for 5 minutes
   - **Response Time** > 500ms for 5 minutes
   - **Error Rate** > 2% for 5 minutes
   - **Throughput** drops by 25% for 10 minutes

### Business Alerts
1. Create policy: "LEARN-X Business Metrics"
2. Add conditions:
   - **AI Cost** > $10/hour
   - **Queue Depth** > 100 jobs
   - **File Processing** errors > 5% for 15 minutes

### Infrastructure Alerts
1. Create policy: "LEARN-X Infrastructure"
2. Add conditions:
   - **CPU** > 80% for 10 minutes
   - **Memory** > 85% for 10 minutes
   - **Disk** > 90% for 5 minutes

## Step 11: Configure Notification Channels

1. Go to **Alerts & AI > Notification Channels**
2. Add channels:
   - **Slack** for critical alerts
   - **Email** for warning alerts
   - **PagerDuty** for production incidents

## Verification

1. Start your application
2. Check New Relic logs for successful connection
3. Visit New Relic dashboard to confirm data is flowing
4. Generate test traffic to verify metrics

## Free Tier Limits

- **Data Ingest**: 100GB/month
- **Users**: 1 full user
- **Retention**: 8 days
- **Alert Policies**: Unlimited
- **Dashboards**: Unlimited

## Troubleshooting

### Common Issues

1. **No Data Appearing**
   - Verify license key is correct
   - Check that `newrelic` is imported first
   - Review application logs for errors

2. **High Data Usage**
   - Reduce log level to 'warn' or 'error'
   - Exclude verbose attributes
   - Use sampling for high-traffic endpoints

3. **Performance Impact**
   - New Relic overhead is typically < 3%
   - Monitor CPU usage after deployment
   - Adjust sampling rates if needed

### Support Resources

- [New Relic Documentation](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/)
- [LEARN-X APM Configuration](../APMService.ts)
- [Community Support](https://discuss.newrelic.com/)

## Next Steps

1. **Custom Instrumentation**: Add business-specific metrics
2. **Advanced Alerting**: Set up ML-based anomaly detection
3. **Integration**: Connect with Slack/PagerDuty for notifications
4. **Optimization**: Fine-tune performance and cost