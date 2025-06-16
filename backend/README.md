# LEARN-X Backend

AI-powered personalized learning platform backend service.

## Overview

This is the backend API service for LEARN-X, providing:
- RESTful API endpoints
- Real-time WebSocket connections
- File processing pipeline
- AI-powered content generation
- User authentication and authorization

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (via Supabase)
- Redis for caching
- OpenAI API integration
- PGMQ for job queuing

## Deployment

This service is deployed on Railway with automatic deployments from the main branch.

### Environment Variables

See `/docs/deployment/ENVIRONMENT_VARIABLES.md` for the complete list of required environment variables.

### Health Check

The service exposes a health check endpoint at `/api/health` for monitoring.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Documentation

API endpoints are organized by feature:
- `/api/auth` - Authentication
- `/api/courses` - Course management
- `/api/files` - File upload and processing
- `/api/ai` - AI-powered features
- `/api/search` - Search functionality

Last updated: 2025-06-16