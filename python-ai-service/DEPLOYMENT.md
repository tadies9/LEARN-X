# Python AI Service Deployment Guide

## Overview
The Python AI Service handles file processing for LEARN-X, integrating with the existing PGMQ infrastructure.

## Local Development

### Prerequisites
- Docker and Docker Compose installed
- Python 3.11+ (if running without Docker)
- `.env` file configured (copy from `.env.example`)

### Running with Docker Compose
```bash
# From project root
docker-compose up python-ai

# Or run all services
docker-compose up
```

### Running Standalone
```bash
cd python-ai-service
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m uvicorn app.main:app --reload
```

## Railway Deployment

### Initial Setup
1. Create a new service in Railway dashboard
2. Connect to the LEARN-X repository
3. Set the root directory to `/python-ai-service`
4. Configure environment variables (see below)

### Required Environment Variables
```bash
# Database (same as backend)
DATABASE_URL=<your-supabase-connection-string>

# OpenAI
OPENAI_API_KEY=<your-openai-api-key>

# Application
ENVIRONMENT=production
PYTHON_FILE_PROCESSING=true

# Optional monitoring
SENTRY_DSN=<your-sentry-dsn>
```

### Deployment Steps
1. Push changes to your branch
2. Railway will automatically detect the `railway.json` configuration
3. The service will build and deploy automatically
4. Monitor logs for startup confirmation

### Health Checks
- Health endpoint: `https://your-service.railway.app/api/v1/health`
- Metrics endpoint: `https://your-service.railway.app/metrics` (if enabled)

## Integration with Backend

### Enable Python File Processing
Set the following environment variable in both backend services:
```bash
PYTHON_FILE_PROCESSING=true
```

This will:
- Prevent Node.js workers from processing file jobs
- Allow Python service to consume file processing jobs from PGMQ

### Queue Configuration
The Python service connects to the same PGMQ queues as the Node.js backend:
- `file_processing` - Main queue for file processing jobs
- `embeddings` - Queue for embedding generation
- `notifications` - Queue for user notifications

### Monitoring
1. Check queue health: `GET /api/files/queue/health`
2. Check file processing status: `GET /api/files/:id/processing-status`
3. View Python service logs in Railway dashboard

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify DATABASE_URL is correct
   - Ensure Python service can reach Supabase

2. **File Processing Not Starting**
   - Check PYTHON_FILE_PROCESSING=true is set
   - Verify PGMQ tables exist in database
   - Check Python service logs for errors

3. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is valid
   - Check API rate limits

### Debug Mode
Enable debug logging:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

## Rollback Strategy
If issues occur:
1. Set `PYTHON_FILE_PROCESSING=false` in backend services
2. Node.js workers will resume file processing
3. Debug Python service separately