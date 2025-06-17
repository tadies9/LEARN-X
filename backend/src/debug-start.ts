import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 DEBUG: Environment Check');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('REDIS_URL exists:', !!process.env.REDIS_URL);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

// Check if running in Railway
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('RAILWAY_PROJECT_ID:', process.env.RAILWAY_PROJECT_ID);

// Only start the server if all required vars are present
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing required Supabase environment variables!');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in Railway Variables');
  process.exit(1);
}

console.log('✅ Environment variables check passed, starting server...');
import('./index');