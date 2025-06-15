#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { supabase } from '../src/config/supabase';
import { redisClient } from '../src/config/redis';

// Load test environment
config({ path: '.env.test' });

async function verifyTestSetup() {
  console.log('🔍 Verifying Integration Test Setup');
  console.log('═'.repeat(50));

  let hasErrors = false;

  // 1. Environment Variables
  console.log('\n📋 Checking Environment Variables...');
  const requiredEnvVars = [
    'NODE_ENV',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'REDIS_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: ${process.env[envVar]?.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      hasErrors = true;
    }
  });

  // 2. Database Connection
  console.log('\n🗄️ Testing Database Connection...');
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('✅ Supabase connection successful');
  } catch (error) {
    console.log('❌ Supabase connection failed:', error);
    hasErrors = true;
  }

  // 3. Redis Connection
  console.log('\n⚡ Testing Redis Connection...');
  try {
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis connection successful');
    } else {
      throw new Error('Redis ping failed');
    }
  } catch (error) {
    console.log('❌ Redis connection failed:', error);
    hasErrors = true;
  }

  // 4. Required Tables
  console.log('\n📊 Checking Required Tables...');
  const requiredTables = [
    'users',
    'courses',
    'modules',
    'course_files',
    'file_chunks'
  ];

  const optionalTables = [
    'embeddings'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && !error.message.includes('permission denied') && error.code !== 'PGRST116') {
        throw error;
      }
      
      console.log(`✅ Table '${table}' accessible`);
    } catch (error) {
      console.log(`❌ Table '${table}' not accessible:`, error);
      hasErrors = true;
    }
  }

  for (const table of optionalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && !error.message.includes('permission denied') && error.code !== 'PGRST116') {
        throw error;
      }
      
      console.log(`✅ Table '${table}' accessible`);
    } catch (error) {
      console.log(`⚠️  Table '${table}' not accessible (optional):`, (error as any).message || error);
    }
  }

  // 5. Test Dependencies
  console.log('\n📦 Checking Test Dependencies...');
  try {
    // Check Jest
    require('jest');
    console.log('✅ Jest available');

    // Check SuperTest
    require('supertest');
    console.log('✅ SuperTest available');

    // Check ts-node
    require('ts-node');
    console.log('✅ ts-node available');

  } catch (error) {
    console.log('❌ Missing test dependencies:', error);
    hasErrors = true;
  }

  // 6. File System Permissions
  console.log('\n📁 Checking File System Permissions...');
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if we can read test files
    const setupFile = path.join(__dirname, 'setup.ts');
    fs.accessSync(setupFile, fs.constants.R_OK);
    console.log('✅ Test setup file readable');

    // Check if we can write temporary files
    const tempFile = path.join(__dirname, '.temp-test');
    fs.writeFileSync(tempFile, 'test');
    fs.unlinkSync(tempFile);
    console.log('✅ Temporary file creation successful');

  } catch (error) {
    console.log('❌ File system permission error:', error);
    hasErrors = true;
  }

  // 7. Service Imports
  console.log('\n🔧 Testing Service Imports...');
  try {
    await import('../src/services/EnhancedFileProcessingService');
    console.log('✅ EnhancedFileProcessingService importable');

    await import('../src/services/embeddings/VectorEmbeddingService');
    console.log('✅ VectorEmbeddingService importable');

    await import('../src/services/content/ContentGenerationService');
    console.log('✅ ContentGenerationService importable');

    await import('../src/services/queue/PGMQService');
    console.log('✅ PGMQService importable');

  } catch (error) {
    console.log('❌ Service import error:', error);
    hasErrors = true;
  }

  // Cleanup
  try {
    await redisClient.quit();
  } catch (error) {
    // Ignore cleanup errors
  }

  // Summary
  console.log('\n═'.repeat(50));
  if (hasErrors) {
    console.log('❌ SETUP VERIFICATION FAILED');
    console.log('Please fix the issues above before running integration tests.');
    console.log('\nQuick fixes:');
    console.log('1. Copy .env.example to .env.test and configure it');
    console.log('2. Ensure database and Redis are running');
    console.log('3. Run: npm install');
    console.log('4. Check database migrations are applied');
    process.exit(1);
  } else {
    console.log('✅ SETUP VERIFICATION PASSED');
    console.log('Integration test environment is ready!');
    console.log('\nNext steps:');
    console.log('• Run: npm run test:integration');
    console.log('• Or: npm run test:integration:main');
    process.exit(0);
  }
}

// Run verification
verifyTestSetup().catch((error) => {
  console.error('💥 Setup verification crashed:', error);
  process.exit(1);
}); 