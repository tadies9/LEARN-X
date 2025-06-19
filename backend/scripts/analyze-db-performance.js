#!/usr/bin/env node

/**
 * Database Performance Analysis Script
 * Identifies missing indexes and optimization opportunities
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeIndexes() {
  console.log('🔍 Analyzing Database Indexes...\n');

  // Check for missing indexes on foreign keys
  const { data: missingFKIndexes, error: fkError } = await supabase.rpc('get_missing_fk_indexes');
  
  if (fkError) {
    console.error('Error checking FK indexes:', fkError);
  } else if (missingFKIndexes?.length > 0) {
    console.log('⚠️  Missing Foreign Key Indexes:');
    missingFKIndexes.forEach(idx => {
      console.log(`  - ${idx.table_name}.${idx.column_name}`);
    });
    console.log('');
  }

  // Check index usage statistics
  const indexUsageQuery = `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC
    LIMIT 20;
  `;

  const { data: indexUsage, error: usageError } = await supabase.rpc('execute_sql', { 
    query: indexUsageQuery 
  });

  if (usageError) {
    console.error('Error checking index usage:', usageError);
  } else {
    console.log('📊 Least Used Indexes:');
    console.table(indexUsage);
  }

  // Check for duplicate indexes
  const duplicateIndexQuery = `
    SELECT 
      idx1.tablename,
      idx1.indexname as index1,
      idx2.indexname as index2,
      pg_get_indexdef(idx1.indexrelid) as index1_def,
      pg_get_indexdef(idx2.indexrelid) as index2_def
    FROM pg_indexes idx1
    JOIN pg_indexes idx2 ON idx1.tablename = idx2.tablename
      AND idx1.indexname < idx2.indexname
      AND idx1.indexdef = idx2.indexdef
    WHERE idx1.schemaname = 'public';
  `;

  const { data: duplicates, error: dupError } = await supabase.rpc('execute_sql', { 
    query: duplicateIndexQuery 
  });

  if (dupError) {
    console.error('Error checking duplicate indexes:', dupError);
  } else if (duplicates?.length > 0) {
    console.log('\n⚠️  Duplicate Indexes Found:');
    console.table(duplicates);
  }
}

async function analyzeQueryPerformance() {
  console.log('\n🚀 Analyzing Query Performance...\n');

  // Check if pg_stat_statements is enabled
  const { data: extensions, error: extError } = await supabase.rpc('get_installed_extensions');
  
  if (extError) {
    console.error('Error checking extensions:', extError);
  } else {
    const hasPgStatStatements = extensions?.some(ext => ext.name === 'pg_stat_statements');
    
    if (!hasPgStatStatements) {
      console.log('⚠️  pg_stat_statements is not enabled!');
      console.log('   This extension is crucial for query performance monitoring.');
      console.log('   To enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    } else {
      console.log('✅ pg_stat_statements is enabled');
      
      // Get top slow queries
      const slowQueryQuery = `
        SELECT 
          query,
          calls,
          mean_exec_time,
          total_exec_time,
          rows,
          100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 10;
      `;

      const { data: slowQueries, error: slowError } = await supabase.rpc('execute_sql', { 
        query: slowQueryQuery 
      });

      if (slowError) {
        console.error('Error getting slow queries:', slowError);
      } else {
        console.log('\n🐌 Top 10 Slowest Queries:');
        console.table(slowQueries);
      }
    }
  }
}

async function analyzeSearchFunction() {
  console.log('\n🔎 Analyzing search_file_chunks Function...\n');

  // Check search function performance
  const searchPerfQuery = `
    SELECT 
      proname as function_name,
      pronargs as num_arguments,
      pg_get_functiondef(oid) as function_definition
    FROM pg_proc
    WHERE proname = 'search_file_chunks'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  `;

  const { data: searchFunc, error: searchError } = await supabase.rpc('execute_sql', { 
    query: searchPerfQuery 
  });

  if (searchError) {
    console.error('Error analyzing search function:', searchError);
  } else if (searchFunc?.length > 0) {
    console.log('✅ search_file_chunks function found');
    
    // Analyze indexes used by the function
    console.log('\n📋 Indexes that should exist for optimal search performance:');
    const requiredIndexes = [
      'file_embeddings(chunk_id)',
      'file_embeddings(embedding) USING ivfflat',
      'file_chunks(id, file_id)',
      'file_chunks(search_vector) USING GIN',
      'course_files(id, status)',
      'course_files(module_id, course_id)',
      'modules(id, course_id)',
      'courses(id, user_id)'
    ];
    
    requiredIndexes.forEach(idx => console.log(`  - ${idx}`));
  }
}

async function suggestOptimizations() {
  console.log('\n💡 Optimization Suggestions:\n');

  // Check table sizes
  const tableSizeQuery = `
    SELECT 
      relname as table_name,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size,
      pg_size_pretty(pg_relation_size(relid)) as table_size,
      pg_size_pretty(pg_indexes_size(relid)) as indexes_size,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 10;
  `;

  const { data: tableSizes, error: sizeError } = await supabase.rpc('execute_sql', { 
    query: tableSizeQuery 
  });

  if (sizeError) {
    console.error('Error checking table sizes:', sizeError);
  } else {
    console.log('📊 Largest Tables:');
    console.table(tableSizes);
  }

  // Suggest batch update opportunities
  console.log('\n🔄 Batch Update Opportunities:');
  console.log('1. file_chunks metadata updates:');
  console.log('   - Use COPY or INSERT ... ON CONFLICT for bulk updates');
  console.log('   - Consider using temporary tables for large batch operations');
  console.log('   - Update embeddings in batches of 100-1000 rows');
  console.log('');
  console.log('2. Implement batch processing for:');
  console.log('   - Embedding generation (process multiple chunks at once)');
  console.log('   - Metadata enrichment (update multiple fields in single query)');
  console.log('   - Search vector updates (use triggers for automatic updates)');
}

async function main() {
  console.log('🏥 LEARN-X Database Performance Analysis');
  console.log('========================================\n');

  try {
    await analyzeIndexes();
    await analyzeQueryPerformance();
    await analyzeSearchFunction();
    await suggestOptimizations();
    
    console.log('\n✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Note: Some of these queries require special RPC functions to be created in Supabase
// For now, this script provides a template for what should be analyzed
console.log('⚠️  Note: This script requires database admin access to run all queries.');
console.log('Some queries may need to be run directly in the Supabase SQL editor.\n');

main();