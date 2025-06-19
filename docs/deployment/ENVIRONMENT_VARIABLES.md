# Environment Variables Configuration

This document lists all environment variables required for deploying LEARN-X.

## Backend Environment Variables (Railway)

### Required Variables

#### Server Configuration
- `PORT` - Server port (Railway provides this automatically)
- `NODE_ENV` - Set to `production`

#### Database
- `DATABASE_URL` - PostgreSQL connection string (Railway provides this when you add PostgreSQL)

#### Supabase
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep this secret!)
- `NEXT_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

#### Redis
- `REDIS_HOST` - Redis host (Railway provides this when you add Redis)
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password
- `REDIS_URL` - Full Redis connection URL

#### AI Services
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)
- `GROQ_API_KEY` - Groq API key (optional)
- `VOYAGE_API_KEY` - Voyage AI API key for embeddings

#### Security
- `JWT_SECRET` - Secret for JWT tokens (generate a strong random string)
- `SESSION_SECRET` - Secret for sessions (generate a strong random string)
- `WEBHOOK_SECRET` - Secret for webhooks (generate a strong random string)

#### CORS
- `CORS_ORIGINS` - Comma-separated list of allowed origins (e.g., `https://your-app.vercel.app`)

### Optional Variables

#### File Processing
- `MAX_FILE_SIZE_MB` - Maximum file size in MB (default: 50)
- `ALLOWED_FILE_TYPES` - Comma-separated list of allowed file extensions (default: `pdf,txt,md,docx,pptx`)

#### Queue Configuration
- `PGMQ_ENABLED` - Enable PGMQ queue system (default: true)
- `QUEUE_PROCESSING_INTERVAL` - Queue processing interval in ms (default: 5000)
- `WORKER_CONCURRENCY` - Number of concurrent workers (default: 5)

#### Monitoring & Observability
- `SENTRY_DSN` - Sentry DSN for backend error tracking
- `SENTRY_ENABLED` - Enable Sentry (default: true in production)
- `SENTRY_TRACES_SAMPLE_RATE` - Backend traces sample rate (default: 0.1)
- `SENTRY_PROFILES_SAMPLE_RATE` - Backend profiles sample rate (default: 0.1)
- `LOG_LEVEL` - Logging level (default: info)

#### APM (Application Performance Monitoring)
- `APM_ENABLED` - Enable APM (default: false)
- `APM_PROVIDER` - APM provider: newrelic, datadog, elastic, or none (default: none)
- `APM_SERVICE_NAME` - Service name for APM (default: learn-x-api)
- `NEW_RELIC_LICENSE_KEY` - New Relic license key (if using New Relic)
- `NEW_RELIC_APP_NAME` - New Relic app name
- `DD_API_KEY` - Datadog API key (if using Datadog)
- `ELASTIC_APM_SECRET_TOKEN` - Elastic APM secret token (if using Elastic)
- `ELASTIC_APM_SERVER_URL` - Elastic APM server URL

#### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: 900000 - 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `AI_RATE_LIMIT_PER_HOUR` - AI endpoint rate limit per hour (default: 100)

## Frontend Environment Variables (Vercel)

### Required Variables

#### API Configuration
- `NEXT_PUBLIC_API_URL` - Backend API URL (your Railway app URL)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (use `wss://` with your Railway app URL)

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional Variables

#### Feature Flags
- `NEXT_PUBLIC_ENABLE_AI_TUTOR` - Enable AI tutor feature (default: true)
- `NEXT_PUBLIC_ENABLE_FILE_UPLOAD` - Enable file upload feature (default: true)
- `NEXT_PUBLIC_MAX_FILE_SIZE_MB` - Maximum file size in MB (default: 50)

#### Analytics
- `NEXT_PUBLIC_GA_TRACKING_ID` - Google Analytics tracking ID
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog project key

#### Error Tracking
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` - Sentry traces sample rate (default: 0.1)
- `NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE` - Sentry session replay sample rate (default: 0.1)
- `SENTRY_ORG` - Sentry organization slug (for source map uploads)
- `SENTRY_PROJECT` - Sentry project slug
- `SENTRY_AUTH_TOKEN` - Sentry auth token for source map uploads

## Generating Secrets

To generate secure random strings for secrets, you can use:

```bash
# Generate a 32-character random string
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Setting Environment Variables

### Railway
1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Add each variable from the `.env.railway` file

### Vercel
1. Go to your Vercel project dashboard
2. Go to "Settings" → "Environment Variables"
3. Add each variable from the `.env.production` file
4. Make sure to select the appropriate environments (Production, Preview, Development)