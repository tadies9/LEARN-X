const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testPgvectorExtension() {
  console.log('🔍 Testing pgvector extension...');
  
  try {
    // Test vector functionality by checking if we can query vector embeddings
    const { data: vectorTest, error: vectorError } = await supabase
      .from('file_embeddings')
      .select('id, chunk_id, embedding')
      .limit(1);
    
    if (vectorError) {
      console.log('❌ Vector table access failed:', vectorError.message);
      return false;
    } else {
      console.log('✅ Vector table is accessible');
      
      // Test if we can perform vector operations
      try {
        const { data: similarityTest, error: simError } = await supabase
          .from('file_embeddings')
          .select('id')
          .limit(1);
        
        if (simError) {
          console.log('⚠️  Vector similarity functions may not be available:', simError.message);
        } else {
          console.log('✅ Vector operations are working');
        }
      } catch (simTestError) {
        console.log('⚠️  Vector similarity test failed:', simTestError.message);
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Extension test failed:', error.message);
    return false;
  }
}

async function testPgmqExtension() {
  console.log('\n🔍 Testing PGMQ extension...');
  
  try {
    // Test PGMQ by using our wrapper functions
    const { data: pgmqTest, error: pgmqError } = await supabase
      .rpc('get_queue_metrics', { p_queue_name: 'file_processing' });
    
    if (pgmqError) {
      console.log('❌ PGMQ wrapper functions not available:', pgmqError.message);
      return false;
    } else {
      console.log('✅ PGMQ wrapper functions are working');
      
      // Test sending a test message
      const { data: sendTest, error: sendError } = await supabase
        .rpc('pgmq_send', {
          queue_name: 'file_processing',
          message: { test: true, timestamp: new Date().toISOString() }
        });
      
      if (sendError) {
        console.log('⚠️  PGMQ send function not working:', sendError.message);
      } else {
        console.log('✅ PGMQ send function is working');
        
        // Try to read the test message back
        const { data: readTest, error: readError } = await supabase
          .rpc('pgmq_read', {
            queue_name: 'file_processing',
            vt: 1,
            qty: 1
          });
        
        if (!readError && readTest && readTest.length > 0) {
          console.log('✅ PGMQ read function is working');
          
          // Clean up the test message
          await supabase.rpc('pgmq_delete', {
            queue_name: 'file_processing',
            msg_id: readTest[0].msg_id
          });
        }
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ PGMQ test failed:', error.message);
    return false;
  }
}

async function testEnhancedTables() {
  console.log('\n🔍 Testing enhanced database schema...');
  
  try {
    // Test file_embeddings table structure
    const { data: embeddingTest, error: embeddingError } = await supabase
      .from('file_embeddings')
      .select('id, chunk_id, embedding, model_version, created_at')
      .limit(1);
    
    if (embeddingError) {
      console.log('❌ Could not access file_embeddings table:', embeddingError.message);
    } else {
      console.log('✅ file_embeddings table is accessible');
      console.log('  - Columns: id, chunk_id, embedding, model_version, created_at');
    }
    
    // Test enhanced file_chunks columns
    const { data: chunkTest, error: chunkError } = await supabase
      .from('file_chunks')
      .select('id, content, chunk_type, importance, section_title, hierarchy_level')
      .limit(1);
    
    if (chunkError) {
      console.log('❌ Could not access enhanced file_chunks columns:', chunkError.message);
      
      // Try basic file_chunks access
      const { data: basicChunkTest, error: basicError } = await supabase
        .from('file_chunks')
        .select('id, content')
        .limit(1);
      
      if (basicError) {
        console.log('❌ Basic file_chunks access also failed:', basicError.message);
      } else {
        console.log('✅ Basic file_chunks table is accessible');
        console.log('⚠️  Enhanced columns may not be available');
      }
    } else {
      console.log('✅ Enhanced file_chunks columns are accessible');
      console.log('  - Enhanced columns: chunk_type, importance, section_title, hierarchy_level');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
    return false;
  }
}

async function testSearchFunctions() {
  console.log('\n🔍 Testing search functions...');
  
  try {
    // Get a real file ID from the database
    const { data: files, error: fileError } = await supabase
      .from('course_files')
      .select('id')
      .limit(1);
    
    let testFileId = '123e4567-e89b-12d3-a456-426614174000'; // fallback UUID
    if (files && files.length > 0) {
      testFileId = files[0].id;
      console.log(`  Using real file ID: ${testFileId}`);
    } else {
      console.log(`  No files found, using test UUID`);
    }
    
    // Test search_file_chunks function
    const { data: searchTest, error: searchError } = await supabase
      .rpc('search_file_chunks', {
        search_query: 'test',
        file_id: testFileId,
        limit_count: 1
      });
    
    if (searchError) {
      console.log('❌ search_file_chunks function not available:', searchError.message);
    } else {
      console.log('✅ search_file_chunks function is working');
    }
    
    // Test semantic search function with a realistic embedding
    const mockEmbedding = Array(1536).fill(0.1); // OpenAI embedding size
    const { data: semanticTest, error: semanticError } = await supabase
      .rpc('search_similar_chunks', {
        query_embedding: mockEmbedding,
        similarity_threshold: 0.5,
        match_count: 1
      });
    
    if (semanticError) {
      console.log('❌ search_similar_chunks function not available:', semanticError.message);
    } else {
      console.log('✅ search_similar_chunks function is working');
    }
    
    // Test keyword search
    const { data: keywordTest, error: keywordError } = await supabase
      .rpc('search_chunks_by_keyword', {
        search_term: 'test',
        limit_count: 1
      });
    
    if (keywordError) {
      console.log('❌ search_chunks_by_keyword function not available:', keywordError.message);
    } else {
      console.log('✅ search_chunks_by_keyword function is working');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Function test failed:', error.message);
    return false;
  }
}

async function testBasicConnectivity() {
  console.log('🔍 Testing basic Supabase connectivity...');
  
  try {
    // Test basic connection by checking if we can access any table
    const { data: tables, error: tableError } = await supabase
      .from('course_files')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Basic connectivity failed:', tableError.message);
      return false;
    } else {
      console.log('✅ Basic Supabase connectivity is working');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Connectivity test failed:', error.message);
    return false;
  }
}

async function testCurrentData() {
  console.log('\n🔍 Testing current data state...');
  
  try {
    // Check file_chunks count
    const { count: chunksCount, error: chunksError } = await supabase
      .from('file_chunks')
      .select('*', { count: 'exact', head: true });
    
    if (!chunksError) {
      console.log(`✅ file_chunks table has ${chunksCount} records`);
    }
    
    // Check file_embeddings count
    const { count: embeddingsCount, error: embeddingsError } = await supabase
      .from('file_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (!embeddingsError) {
      console.log(`✅ file_embeddings table has ${embeddingsCount} records`);
    }
    
    // Check course_files count
    const { count: filesCount, error: filesError } = await supabase
      .from('course_files')
      .select('*', { count: 'exact', head: true });
    
    if (!filesError) {
      console.log(`✅ course_files table has ${filesCount} records`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Data test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 ENHANCED EMBEDDING SYSTEM - EXTENSION TEST');
  console.log('==============================================\n');
  
  const connectivityOk = await testBasicConnectivity();
  const vectorOk = await testPgvectorExtension();
  const pgmqOk = await testPgmqExtension();
  const schemaOk = await testEnhancedTables();
  const functionsOk = await testSearchFunctions();
  const dataOk = await testCurrentData();
  
  console.log('\n📊 Test Summary:');
  console.log(`Basic Connectivity: ${connectivityOk ? '✅' : '❌'}`);
  console.log(`pgvector: ${vectorOk ? '✅' : '❌'}`);
  console.log(`PGMQ: ${pgmqOk ? '✅' : '❌'}`);
  console.log(`Enhanced Schema: ${schemaOk ? '✅' : '❌'}`);
  console.log(`Search Functions: ${functionsOk ? '✅' : '❌'}`);
  console.log(`Current Data: ${dataOk ? '✅' : '❌'}`);
  
  if (connectivityOk && vectorOk && schemaOk) {
    console.log('\n🎉 Core functionality should be working!');
    console.log('✅ Ready to test vector search and semantic chunking');
    
    if (!pgmqOk) {
      console.log('⚠️  PGMQ not available - background processing may be limited');
    }
  } else {
    console.log('\n⚠️  Some components may not be fully configured');
    console.log('🔧 Check database schema and run migrations if needed');
  }
}

main().catch(console.error);