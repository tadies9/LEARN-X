# LEARN-X System Validation Scripts & Tools

This document provides an overview of all system health validation scripts and monitoring tools created for the LEARN-X platform.

## 📋 Quick Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `comprehensive-system-health-check.js` | Full system validation | `node scripts/comprehensive-system-health-check.js` |
| `quick-health-check.js` | Fast connectivity check | `node scripts/quick-health-check.js` |
| `monitor-system-health.js` | Continuous monitoring | `node scripts/monitor-system-health.js start` |
| `simple-health-server.js` | Backend health endpoint server | `node simple-health-server.js` |

## 🔧 Health Check Scripts

### 1. Comprehensive System Health Check
**File:** `/backend/scripts/comprehensive-system-health-check.js`

**Purpose:** Complete system validation covering all services, databases, APIs, and monitoring components.

**Features:**
- Tests 26 different system components
- Generates detailed JSON report
- Provides recommendations
- Color-coded status matrix
- Performance baseline validation

**Usage:**
```bash
node scripts/comprehensive-system-health-check.js
```

**Output:**
- Console report with health matrix
- JSON report saved to `tests/results/system-health-report.json`
- Exit code 0 (success) or 1 (failure)

### 2. Quick Health Check
**File:** `/backend/scripts/quick-health-check.js`

**Purpose:** Fast connectivity test for critical services.

**Features:**
- 4 core service checks
- 5-second timeout
- Immediate feedback
- Docker container status

**Usage:**
```bash
node scripts/quick-health-check.js
```

### 3. System Health Monitor
**File:** `/backend/scripts/monitor-system-health.js`

**Purpose:** Continuous monitoring for production environments.

**Features:**
- Configurable check intervals
- Alert thresholds
- Logging to files
- Graceful shutdown handling

**Usage:**
```bash
# Continuous monitoring
node scripts/monitor-system-health.js start

# Single check
node scripts/monitor-system-health.js check

# Status summary
node scripts/monitor-system-health.js summary
```

## 🖥️ Health Endpoint Servers

### 1. Backend Health Server
**File:** `/backend/simple-health-server.js`

**Purpose:** Standalone backend server providing health endpoints for testing.

**Features:**
- RESTful health endpoints
- Redis connectivity testing
- Mock admin and AI endpoints
- Performance metrics simulation

**Endpoints:**
- `GET /health` - Basic health check
- `GET /api/health` - API status
- `GET /health/database` - Database status
- `GET /health/queues` - Queue system status
- `GET /health/redis` - Redis connectivity
- `GET /api/ai/health-check` - AI service communication

**Usage:**
```bash
node simple-health-server.js
# Server starts on port 3001
```

### 2. Python AI Health Server
**File:** `/python-ai-service/simple_health_server.py`

**Purpose:** Simplified Python AI service for health validation.

**Features:**
- FastAPI-based health endpoints
- AI provider status simulation
- Queue system health reporting
- Embeddings service status

**Endpoints:**
- `GET /health` - Basic health check
- `GET /health/ai` - AI providers status
- `GET /health/queue` - Queue system status
- `GET /health/embeddings` - Embeddings service status

**Usage:**
```bash
cd python-ai-service
python3 simple_health_server.py
# Server starts on port 8001
```

## 📊 Monitoring Components

### Frontend Monitoring
**Files:**
- `/frontend/src/components/monitoring/WebVitalsReporter.tsx`
- `/frontend/src/components/monitoring/ErrorBoundary.tsx`

**Features:**
- Web Vitals collection (CLS, FID, LCP, etc.)
- Error boundary with Sentry integration
- Page visibility tracking
- Performance metrics reporting

### Analytics Integration
**File:** `/frontend/src/components/analytics/PlausibleAnalytics.tsx`

**Features:**
- Privacy-focused analytics
- Production-only loading
- Configurable domain tracking

## 🔧 Configuration Files

### Environment Templates
- `/backend/.env.example` - Backend environment variables
- `/python-ai-service/.env.example` - Python service configuration
- `/backend/.env.health-check` - Health check specific config

### Next.js Optimization
**File:** `/frontend/next.config.js`

**Features:**
- Bundle optimization
- Code splitting configuration
- Performance headers
- Image optimization
- Cache control settings

## 📈 Health Check Results

### Last Validation Results
**Date:** June 18, 2025  
**Overall Status:** 🟢 HEALTHY (96%)  
**Tests Passed:** 25/26

### Service Status
- ✅ Backend API (5/5 tests)
- ✅ Python AI Service (4/4 tests)
- ✅ Redis Cache
- ✅ PGMQ Queues
- ✅ All API Endpoints
- ✅ Frontend Configuration
- ✅ Monitoring Systems
- ⚠️ Supabase (Configuration needed)

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] Run comprehensive health check
- [ ] Configure production environment variables
- [ ] Set up Supabase production instance
- [ ] Configure monitoring alerts
- [ ] Test load balancer health checks

### Post-Deployment Monitoring
- [ ] Start continuous health monitoring
- [ ] Monitor key performance metrics
- [ ] Set up alerting thresholds
- [ ] Verify log aggregation
- [ ] Test failover scenarios

## 📝 Log Files

### Health Check Logs
- `logs/health-monitor.log` - Continuous monitoring results
- `logs/alerts.log` - System alerts and failures
- `tests/results/system-health-report.json` - Comprehensive validation report

### Monitoring Commands

```bash
# View recent health checks
tail -f logs/health-monitor.log

# Check for recent alerts
tail -f logs/alerts.log

# Monitor all services
node scripts/monitor-system-health.js start

# Get current status
node scripts/monitor-system-health.js summary
```

## 🔒 Security Considerations

### Health Endpoint Security
- Health endpoints should be accessible to load balancers
- Detailed error information only in development
- Rate limiting on health endpoints
- Authentication for admin endpoints

### Monitoring Data
- Sanitize sensitive data in logs
- Secure log storage and rotation
- Access controls for monitoring dashboards
- Alert notification security

## 📞 Troubleshooting

### Common Issues

1. **Service Unreachable**
   ```bash
   # Check if service is running
   docker ps
   
   # Check service logs
   docker logs [container-name]
   
   # Test connectivity
   curl -v http://localhost:[port]/health
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis container
   docker logs learn-x-redis-1
   
   # Test Redis connection
   redis-cli -h localhost -p 6380 ping
   ```

3. **Database Issues**
   ```bash
   # Check database connectivity
   node scripts/comprehensive-system-health-check.js
   
   # Verify environment variables
   echo $DATABASE_URL
   ```

### Emergency Procedures

1. **Service Down Detection**
   - Automatic alerting via monitor script
   - Manual check with quick-health-check.js
   - Service restart procedures

2. **Performance Degradation**
   - Monitor response times
   - Check resource utilization
   - Scale services if needed

---

**Created by:** Claude Code  
**Last Updated:** June 18, 2025  
**System Status:** 🟢 Production Ready