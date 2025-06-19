# LEARN-X Monitoring & Observability Setup Guide

This guide covers the complete monitoring infrastructure setup for LEARN-X, including error tracking, performance monitoring, and logging.

## Table of Contents
1. [Overview](#overview)
2. [Sentry Setup](#sentry-setup)
3. [Structured Logging](#structured-logging)
4. [Health Checks](#health-checks)
5. [APM Configuration](#apm-configuration)
6. [Database Performance](#database-performance)
7. [Monitoring Dashboard](#monitoring-dashboard)

## Overview

LEARN-X implements a comprehensive monitoring strategy:
- **Error Tracking**: Sentry for both frontend and backend
- **Structured Logging**: Winston with correlation IDs
- **Health Checks**: Multiple endpoints for different health aspects
- **APM**: Support for New Relic, Datadog, or Elastic APM (free tiers)
- **Database Monitoring**: Query performance and index optimization

## Sentry Setup

### Backend Sentry Configuration

1. **Sign up for Sentry** at https://sentry.io (free tier available)
2. Create a new project for your backend
3. Get your DSN from Project Settings → Client Keys
4. Set environment variables:
   ```bash
   SENTRY_DSN=your-backend-dsn
   SENTRY_ENABLED=true
   SENTRY_TRACES_SAMPLE_RATE=0.1
   SENTRY_PROFILES_SAMPLE_RATE=0.1
   ```

### Frontend Sentry Configuration

1. Create another project for your frontend
2. Get the frontend DSN
3. Set environment variables:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=your-frontend-dsn
   NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
   NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE=0.1
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   SENTRY_AUTH_TOKEN=your-auth-token
   ```

### Sentry Features Configured

- **Error Tracking**: Automatic error capture with stack traces
- **Performance Monitoring**: Transaction tracing
- **Session Replay**: Frontend user session recording (on errors)
- **Release Tracking**: Automatic version tracking
- **User Context**: Automatic user identification
- **Breadcrumbs**: Automatic event trail
- **Custom Context**: Correlation IDs and request metadata

## Structured Logging

### Correlation IDs

Every request gets a unique correlation ID that follows it through the entire request lifecycle:

```typescript
// Automatic correlation ID in logs
logger.info('Processing request', { 
  fileId: '123',
  // correlationId, userId, requestPath automatically included
});
```

### Log Levels

- **error**: System errors, exceptions
- **warn**: Deprecations, non-critical issues
- **info**: General information, request logs
- **debug**: Detailed debugging information

### Viewing Logs

In production, logs are JSON formatted for easy parsing:
```json
{
  "level": "info",
  "message": "File processed successfully",
  "correlationId": "abc-123",
  "userId": "user-456",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Health Checks

### Available Endpoints

1. **Basic Health Check** - `/api/v1/health`
   - Quick response for load balancers
   - Returns: `{ status: 'ok', timestamp: '...' }`

2. **Detailed Health Check** - `/api/v1/health/detailed`
   - Comprehensive system status
   - Queue metrics
   - Worker status
   - Response time

3. **Queue Health** - `/api/v1/health/queues`
   - Individual queue metrics
   - Queue lengths
   - Processing rates

4. **Performance Metrics** - `/api/v1/health/performance`
   - Memory usage
   - System uptime
   - Process metrics

### Monitoring Health Checks

Set up monitoring alerts for:
- Response time > 1 second on `/health`
- Status != 'healthy' on `/health/detailed`
- Queue length > 1000 on any queue

## APM Configuration

### Option 1: New Relic (Recommended for Free Tier)

1. Sign up at https://newrelic.com/signup
2. Create an APM application
3. Set environment variables:
   ```bash
   APM_ENABLED=true
   APM_PROVIDER=newrelic
   NEW_RELIC_LICENSE_KEY=your-license-key
   NEW_RELIC_APP_NAME=LEARN-X API
   ```

4. Start your app with:
   ```bash
   node -r newrelic src/api-server.js
   ```

### Option 2: Datadog

1. Sign up at https://www.datadoghq.com
2. Install the agent on your server
3. Set environment variables:
   ```bash
   APM_ENABLED=true
   APM_PROVIDER=datadog
   DD_API_KEY=your-api-key
   ```

### Option 3: Elastic APM

1. Set up Elastic Cloud or self-host
2. Set environment variables:
   ```bash
   APM_ENABLED=true
   APM_PROVIDER=elastic
   ELASTIC_APM_SECRET_TOKEN=your-token
   ELASTIC_APM_SERVER_URL=https://your-apm-server
   ```

## Database Performance

### Running Performance Analysis

1. Run the analysis script:
   ```bash
   node backend/scripts/analyze-db-performance.js
   ```

2. Apply optimizations:
   ```bash
   psql $DATABASE_URL < backend/src/migrations/007_performance_optimizations.sql
   ```

### Key Optimizations Implemented

1. **Indexes Added**:
   - Foreign key indexes
   - Composite indexes for common queries
   - Full-text search indexes
   - Vector similarity indexes

2. **Query Optimizations**:
   - Optimized `search_file_chunks` function
   - Batch update functions for metadata
   - Materialized view for dashboard stats

3. **Monitoring Queries**:
   - Enable `pg_stat_statements` for query analysis
   - Regular VACUUM and ANALYZE
   - Monitor slow queries

### Database Monitoring Checklist

- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Check index usage with pg_stat_user_indexes
- [ ] Monitor table bloat
- [ ] Set up query performance alerts
- [ ] Regular backup verification

## Monitoring Dashboard

### Setting Up a Monitoring Dashboard

1. **Grafana + Prometheus** (Self-hosted):
   - Export metrics from your app
   - Set up Prometheus to scrape metrics
   - Create Grafana dashboards

2. **New Relic One** (SaaS):
   - Automatic dashboards with APM
   - Custom dashboards for business metrics
   - Alert policies

3. **Datadog** (SaaS):
   - Infrastructure monitoring
   - APM integration
   - Log aggregation

### Key Metrics to Monitor

1. **Application Metrics**:
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Active users

2. **Infrastructure Metrics**:
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

3. **Business Metrics**:
   - File processing rate
   - AI API usage
   - User engagement
   - Feature adoption

### Alert Configuration

Set up alerts for:
- Error rate > 1%
- Response time p95 > 2s
- Queue backup > 1000 items
- Database connection pool exhaustion
- Memory usage > 80%
- Disk usage > 90%

## Security Considerations

1. **Sensitive Data Filtering**:
   - Cookies are automatically removed from Sentry
   - Authorization headers are filtered
   - User passwords never logged

2. **Rate Limiting**:
   - General API: 100 requests per 15 minutes
   - AI endpoints: 100 requests per hour
   - Auth endpoints: 5 attempts per 15 minutes

3. **CORS Configuration**:
   - Strictly defined allowed origins
   - Credentials required for API access

## Maintenance Tasks

### Daily
- Check error rates in Sentry
- Review slow query logs
- Monitor queue lengths

### Weekly
- Review APM performance trends
- Analyze user activity patterns
- Check index usage statistics

### Monthly
- Database VACUUM FULL
- Review and optimize slow queries
- Update monitoring thresholds
- Security audit of logs

## Troubleshooting

### High Error Rate
1. Check Sentry for error patterns
2. Look for correlation IDs in logs
3. Review recent deployments
4. Check external service status

### Slow Performance
1. Check APM for slow transactions
2. Review database query performance
3. Monitor queue processing rates
4. Check for memory leaks

### Queue Backup
1. Check worker health at `/health/detailed`
2. Review queue metrics
3. Scale workers if needed
4. Check for poison messages

## Useful Commands

```bash
# View real-time logs
tail -f logs/app.log | jq '.'

# Search logs by correlation ID
grep "correlation-id-here" logs/app.log

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Force refresh materialized view
psql $DATABASE_URL -c "SELECT refresh_user_activity_summary();"
```

## Next Steps

1. Set up automated performance reports
2. Implement custom business metrics
3. Add synthetic monitoring
4. Create runbooks for common issues
5. Set up log aggregation (ELK stack or similar)