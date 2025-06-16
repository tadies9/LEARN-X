# LEARN-X Deployment Guide

This guide walks you through deploying LEARN-X with Railway (backend) and Vercel (frontend).

## Prerequisites

- GitHub account with your LEARN-X repository
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- Supabase account and project (https://supabase.com)
- OpenAI API key
- Domain name (optional)

## Backend Deployment (Railway)

### 1. Create Railway Project

1. Log in to Railway
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your LEARN-X repository
5. Select the `/backend` directory as the root directory

### 2. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically set the `DATABASE_URL` environment variable

### 3. Add Redis

1. Click "New" again
2. Select "Database" → "Add Redis"
3. Railway will automatically set Redis environment variables

### 4. Configure Environment Variables

1. Click on your backend service
2. Go to "Variables" tab
3. Add all required environment variables from `.env.railway`
4. Key variables to add:
   - All Supabase configurations
   - AI API keys (OpenAI, Voyage, etc.)
   - Security secrets (generate using the commands in ENVIRONMENT_VARIABLES.md)
   - CORS_ORIGINS (set to your Vercel frontend URL)

### 5. Run Database Migrations

1. After deployment, open Railway's shell or run locally:
```bash
# Connect to your Railway PostgreSQL
psql $DATABASE_URL

# Run migrations
\i backend/src/migrations/001_enhanced_pgmq_setup.sql
\i backend/src/migrations/006_fix_schema_consistency.sql
```

### 6. Deploy

1. Railway will automatically deploy when you push to your GitHub repository
2. Check the deployment logs for any errors
3. Your backend will be available at `https://your-app.railway.app`

## Frontend Deployment (Vercel)

### 1. Import Project

1. Log in to Vercel
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select the `/frontend` directory as the root directory

### 2. Configure Build Settings

1. Framework Preset: Next.js
2. Build Command: `npm run build`
3. Output Directory: `.next`
4. Install Command: `npm install`

### 3. Add Environment Variables

1. Go to "Settings" → "Environment Variables"
2. Add all variables from `.env.production`:
   - `NEXT_PUBLIC_API_URL` - Your Railway backend URL
   - `NEXT_PUBLIC_WS_URL` - Your Railway WebSocket URL (use wss://)
   - All Supabase public keys
   - Any analytics or monitoring keys

### 4. Deploy

1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. Your frontend will be available at `https://your-app.vercel.app`

## Post-Deployment Setup

### 1. Update CORS Origins

1. Go to your Railway backend
2. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
   ```

### 2. Configure Supabase

1. In Supabase dashboard, go to Authentication → URL Configuration
2. Add your frontend URLs to:
   - Site URL
   - Redirect URLs

### 3. Set up Custom Domains (Optional)

#### Railway (Backend API)
1. Go to Settings → Domains
2. Add your custom domain (e.g., `api.yourdomain.com`)
3. Update DNS records as instructed

#### Vercel (Frontend)
1. Go to Settings → Domains
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed

### 4. Update Environment Variables

After setting up custom domains:
1. Update `NEXT_PUBLIC_API_URL` in Vercel to use your custom API domain
2. Update `CORS_ORIGINS` in Railway to include your custom frontend domain

## Monitoring and Maintenance

### Railway
- Monitor logs: Project → Service → Logs
- Set up health checks: Already configured in `railway.json`
- Scale replicas: Update `numReplicas` in `railway.json`

### Vercel
- Monitor functions: Dashboard → Functions
- View analytics: Dashboard → Analytics
- Set up alerts: Settings → Integrations

### Database Maintenance
- Regular backups: Railway provides automatic backups
- Monitor connections: Check PostgreSQL metrics in Railway
- Queue monitoring: Use the health endpoint to monitor PGMQ

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CORS_ORIGINS` includes your frontend URL
   - Check that API URL in frontend doesn't have trailing slash

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is set correctly
   - Check if migrations have been run
   - Ensure connection pool settings are appropriate

3. **File Upload Issues**
   - Verify Supabase storage buckets are created
   - Check file size limits in both frontend and backend
   - Ensure proper permissions in Supabase

4. **WebSocket Connection Issues**
   - Verify `NEXT_PUBLIC_WS_URL` uses `wss://` protocol
   - Check Railway supports WebSocket connections
   - Ensure no proxy is blocking WebSocket upgrade

### Debug Mode

To enable debug logging:
1. Set `NODE_ENV=development` temporarily
2. Add `DEBUG=*` to see all debug output
3. Check browser console for frontend errors
4. Check Railway logs for backend errors

## Security Checklist

- [ ] All secrets are stored as environment variables
- [ ] CORS is properly configured
- [ ] Database has proper access controls
- [ ] API rate limiting is enabled
- [ ] SSL/TLS is enabled (automatic with Railway/Vercel)
- [ ] Supabase RLS policies are configured
- [ ] No sensitive data in logs
- [ ] Regular security updates for dependencies

## Support

If you encounter issues:
1. Check the logs in Railway and Vercel
2. Review environment variables
3. Ensure all services are running
4. Check the health endpoint: `https://your-api.railway.app/api/health`