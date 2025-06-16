#!/usr/bin/env node

/**
 * Script to run PGMQ wrapper functions migration
 * This fixes the "function pgmq_send does not exist" errors
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('🚀 Running PGMQ wrapper functions migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../src/migrations/007_pgmq_wrapper_functions.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📝 Creating wrapper functions...\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (const statement of statements) {
      try {
        // For CREATE FUNCTION statements, we need to add the semicolon back
        const fullStatement = statement + ';';
        
        console.log(`Executing: ${fullStatement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('query', { 
          query_text: fullStatement 
        }).single();

        if (error) {
          // Try direct execution as fallback
          console.log('Direct RPC failed, trying alternative approach...');
          throw error;
        }

        successCount++;
        console.log('✅ Success\n');
      } catch (error) {
        console.error('❌ Error:', error.message);
        errorCount++;
        
        // Log the problematic statement for debugging
        console.error('Failed statement:', statement.substring(0, 100) + '...\n');
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. You may need to run them manually in the Supabase SQL editor.');
      console.log('Copy the migration file content from: backend/src/migrations/007_pgmq_wrapper_functions.sql');
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }

    // Test the wrapper functions
    console.log('\n🧪 Testing wrapper functions...');
    await testWrapperFunctions();

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

async function testWrapperFunctions() {
  try {
    // Test pgmq_send
    console.log('Testing pgmq_send...');
    const { data: sendResult, error: sendError } = await supabase.rpc('pgmq_send', {
      p_queue_name: 'file_processing',
      p_message: { test: true, timestamp: new Date().toISOString() },
      p_delay_seconds: 0
    });

    if (sendError) {
      console.error('❌ pgmq_send test failed:', sendError);
    } else {
      console.log('✅ pgmq_send works! Message ID:', sendResult);
    }

    // Test pgmq_read
    console.log('\nTesting pgmq_read...');
    const { data: readResult, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'file_processing',
      vt: 30,
      qty: 1
    });

    if (readError) {
      console.error('❌ pgmq_read test failed:', readError);
    } else {
      console.log('✅ pgmq_read works! Messages:', readResult?.length || 0);
      
      // Clean up test message if found
      if (readResult && readResult.length > 0) {
        const msgId = readResult[0].msg_id;
        console.log('\nCleaning up test message...');
        
        const { error: deleteError } = await supabase.rpc('pgmq_delete', {
          queue_name: 'file_processing',
          msg_id: msgId
        });

        if (deleteError) {
          console.error('❌ pgmq_delete test failed:', deleteError);
        } else {
          console.log('✅ pgmq_delete works! Test message cleaned up');
        }
      }
    }

    // Test metrics_all
    console.log('\nTesting metrics_all...');
    const { data: metricsResult, error: metricsError } = await supabase.rpc('metrics_all');

    if (metricsError) {
      console.error('❌ metrics_all test failed:', metricsError);
    } else {
      console.log('✅ metrics_all works! Found', metricsResult?.length || 0, 'queues');
    }

  } catch (error) {
    console.error('\n❌ Function tests failed:', error);
  }
}

// Run the migration
runMigration().catch(console.error);