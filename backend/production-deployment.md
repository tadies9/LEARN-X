# 🚀 Enhanced PGMQ Production Deployment Guide

## Overview

This guide covers deploying the enhanced PGMQ system with separated API and worker processes for maximum reliability and cost efficiency.

## 📋 Pre-deployment Checklist

### 1. **Database Setup**
- [ ] Supabase project with pgmq extension enabled
- [ ] Service role key with necessary permissions
- [ ] Run enhanced PGMQ migration: `node scripts/run-enhanced-pgmq-migration.js`

### 2. **Environment Variables**
```bash
# Required for both API and Worker
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...

# Optional
NODE_ENV=production
PORT=8080
WORKER_ID=worker-${HOSTNAME}
```

### 3. **Build Application**
```bash
npm run build
npm run type-check
```

## 🏗️ Deployment Options

### Option A: Railway (Recommended for simplicity)

#### 1. **Deploy API Service**
```bash
# Connect Railway to your repo
railway login
railway link

# Create API service
railway service create api
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=...
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_KEY=...
railway variables set OPENAI_API_KEY=...

# Deploy with custom start command
echo 'web: npm run start:api' > Procfile
railway up
```

#### 2. **Deploy Worker Service**
```bash
# Create worker service
railway service create worker
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=...
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_KEY=...
railway variables set OPENAI_API_KEY=...
railway variables set WORKER_ID=railway-worker

# Deploy with worker start command
echo 'worker: npm run start:worker' > Procfile.worker
railway up --config Procfile.worker
```

### Option B: Docker Compose (Self-hosted)

#### 1. **Use Enhanced Docker Compose**
```bash
# Copy environment file
cp .env.example .env.production
# Edit .env.production with your values

# Deploy
docker-compose -f docker-compose.enhanced.yml --env-file .env.production up -d

# Scale workers if needed
docker-compose -f docker-compose.enhanced.yml --profile scaling up -d
```

#### 2. **Monitor Deployment**
```bash
# Check logs
docker-compose -f docker-compose.enhanced.yml logs -f

# Check health
curl http://localhost:8080/health/detailed
```

### Option C: Kubernetes (Enterprise)

#### 1. **Create Kubernetes Manifests**
```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learn-x-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: learn-x-api
  template:
    metadata:
      labels:
        app: learn-x-api
    spec:
      containers:
      - name: api
        image: learn-x:latest
        command: ["node", "dist/api-server.js"]
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: learn-x-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
---
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learn-x-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: learn-x-worker
  template:
    metadata:
      labels:
        app: learn-x-worker
    spec:
      containers:
      - name: worker
        image: learn-x:latest
        command: ["node", "dist/workers/enhanced-pgmq-worker.js"]
        env:
        - name: NODE_ENV
          value: "production"
        - name: WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## 📊 Monitoring Setup

### 1. **Health Check URLs**
```bash
# Basic health (load balancer)
GET /health

# Detailed health (monitoring)
GET /health/detailed

# Queue metrics
GET /health/queues

# Performance metrics
GET /health/performance
```

### 2. **Alerting Thresholds**
```yaml
alerts:
  api_health:
    url: "/health"
    interval: 30s
    timeout: 5s
  
  queue_depth:
    url: "/health/queues"
    threshold: queue_length > 100
    
  memory_usage:
    url: "/health/performance"
    threshold: heap_used_mb > 400
```

### 3. **Log Aggregation**
```bash
# Structured logging is already configured
# Logs include correlation IDs for tracing

# Example log query (if using log aggregation)
level:ERROR AND (service:learn-x-api OR service:learn-x-worker)
```

## 🔧 Post-Deployment Operations

### 1. **Verify Deployment**
```bash
# Check API health
curl https://your-api-url/health/detailed

# Expected response:
{
  "status": "healthy",
  "queues": [...],
  "metrics": {...}
}
```

### 2. **Test File Processing**
```bash
# Upload a test file via API
curl -X POST https://your-api-url/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@test.pdf" \
  -F "moduleId=your-module-id"

# Monitor processing
curl https://your-api-url/health/queues/file_processing
```

### 3. **Scale Workers**
```bash
# Railway
railway scale --replicas 2

# Docker Compose
docker-compose -f docker-compose.enhanced.yml up -d --scale pgmq-worker=2

# Kubernetes
kubectl scale deployment learn-x-worker --replicas=2
```

## 🛡️ Security Considerations

### 1. **Environment Variables**
- Never commit `.env` files
- Use proper secret management (Railway Secrets, K8s Secrets)
- Rotate keys regularly

### 2. **Database Security**
- Use connection pooling
- Enable SSL connections
- Monitor for suspicious queries

### 3. **API Security**
- Enable rate limiting
- Use CORS properly
- Monitor for unusual traffic patterns

## 📈 Performance Optimization

### 1. **Database Optimization**
```sql
-- Monitor queue performance
SELECT * FROM enhanced_queue_metrics;

-- Monitor long-running queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%pgmq%'
ORDER BY mean_time DESC;
```

### 2. **Worker Scaling**
- Start with 1 worker
- Monitor queue depth (`/health/queues`)
- Scale up if `queue_length` consistently > 50
- Scale down if `queue_length` consistently < 10

### 3. **Cost Optimization**
- Monitor OpenAI API usage in worker logs
- Use batch processing for embeddings
- Implement circuit breakers for external APIs

## 🔄 Rollback Plan

### 1. **Quick Rollback**
```bash
# Railway
railway rollback

# Docker Compose
docker-compose -f docker-compose.yml up -d  # Old version

# Kubernetes
kubectl rollout undo deployment/learn-x-api
kubectl rollout undo deployment/learn-x-worker
```

### 2. **Fallback to Legacy System**
```bash
# Revert file service changes
git checkout HEAD~1 -- src/services/fileService.ts

# Use legacy worker
npm run start:legacy-worker
```

## ✅ Success Metrics

After deployment, monitor these metrics:

### 1. **Reliability**
- API uptime > 99.5%
- Worker uptime > 99%
- File processing success rate > 98%

### 2. **Performance**
- File processing time < 5 minutes
- API response time < 500ms
- Queue depth < 50 messages

### 3. **Cost Efficiency**
- OpenAI API cost < $0.10 per file
- Infrastructure cost < $50/month
- Zero manual interventions per week

---

## 🆘 Troubleshooting

### Common Issues

#### 1. **Queue Messages Stuck**
```bash
# Check queue health
curl /health/queues

# Check worker logs
docker logs learn-x-worker

# Purge stuck messages (development only)
curl -X POST /health/queues/purge
```

#### 2. **High Memory Usage**
```bash
# Check performance metrics
curl /health/performance

# Restart workers
kubectl rollout restart deployment/learn-x-worker
```

#### 3. **Database Connection Issues**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection pooling
curl /health/detailed | jq '.metrics'
```

---

This deployment guide ensures reliable, scalable, and cost-effective production operation of the enhanced PGMQ system.