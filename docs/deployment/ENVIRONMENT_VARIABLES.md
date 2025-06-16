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