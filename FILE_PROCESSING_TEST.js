// System Test for File Upload and Processing
// Tests: File Upload -> Queue Processing -> Chunk Creation -> Embedding Generation

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const SUPABASE_URL = 'https://fiuypfvcfodtjzuzhjie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdXlwZnZjZm9kdGp6dXpoamllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MTYwODQsImV4cCI6MjA2NTA5MjA4NH0.7iMSR2YS8diFb5EP8E83BI_yC8gXoysL20XMHQI0FCE';
const API_URL = 'http://localhost:8080/api/v1';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    if (error) console.log(`   Error: ${error}`);
    testResults.failed++;
    if (error) testResults.errors.push({ test: testName, error });
  }
}

// Create test file
function createTestFile() {
  const testContent = `
# Test Document for LEARN-X

This is a test document to verify file processing capabilities.

## Section 1: Introduction
This section contains introductory content that should be chunked properly.
The chunking algorithm should respect paragraph boundaries and maintain context.

## Section 2: Technical Content
Here's some technical content with code:

\`\`\`javascript
function testFunction() {
  console.log('This code should be preserved in chunks');
  return true;
}
\`\`\`

## Section 3: Long Content
${Array(10).fill('This is a longer paragraph to test chunk size limits. ').join('')}

## Section 4: Conclusion
This concludes our test document. Each section should be properly processed.
`;

  const testFilePath = path.join(__dirname, 'test-document.md');
  fs.writeFileSync(testFilePath, testContent);
  return testFilePath;
}

async function testFileProcessing() {
  console.log('=== File Processing System Test ===\n');
  
  // First, we need to authenticate
  console.log('Authenticating test user...');
  let accessToken;
  
  try {
    // Use an existing test account or create one
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Replace with your test account
      password: 'testpassword123' // Replace with your test password
    });
    
    if (authError) {
      console.log('Creating new test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `test${Date.now()}@test.com`,
        password: 'TestPassword123!',
        options: {
          data: { full_name: 'Test User' },
          emailRedirectTo: 'http://localhost:3000/auth/callback'
        }
      });
      
      if (signUpError) throw signUpError;
      accessToken = signUpData.session?.access_token;
    } else {
      accessToken = authData.session?.access_token;
    }
    
    if (!accessToken) {
      throw new Error('No access token obtained');
    }
    
    console.log('Authentication successful\n');
    
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return;
  }
  
  // Test 1: Create Test Course
  console.log('1. Creating test course...');
  let courseId;
  try {
    const response = await axios.post(
      `${API_URL}/courses`,
      {
        title: 'Test Course for File Processing',
        description: 'Testing file upload and processing',
        color: '#6366F1'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    courseId = response.data.data.id;
    logTest('Create Course', true);
    console.log(`   Course ID: ${courseId}`);
  } catch (error) {
    logTest('Create Course', false, error.response?.data?.message || error.message);
    return;
  }
  
  // Test 2: Create Test File
  console.log('\n2. Creating test file...');
  const testFilePath = createTestFile();
  logTest('Create Test File', true);
  console.log(`   File created: ${testFilePath}`);
  
  // Test 3: Upload File
  console.log('\n3. Uploading file...');
  let fileId;
  try {
    // First, upload to Supabase Storage
    const fileBuffer = fs.readFileSync(testFilePath);
    const fileName = `${Date.now()}-test-document.md`;
    const filePath = `${courseId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(filePath, fileBuffer, {
        contentType: 'text/markdown'
      });
    
    if (uploadError) throw uploadError;
    
    // Then create file record in database
    const response = await axios.post(
      `${API_URL}/files/upload`,
      {
        courseId,
        fileName: 'test-document.md',
        filePath: uploadData.path,
        mimeType: 'text/markdown',
        fileSize: fileBuffer.length
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    fileId = response.data.data.id;
    logTest('Upload File', true);
    console.log(`   File ID: ${fileId}`);
    console.log(`   Storage Path: ${uploadData.path}`);
    
  } catch (error) {
    logTest('Upload File', false, error.response?.data?.message || error.message);
    return;
  }
  
  // Test 4: Check File Processing Status
  console.log('\n4. Checking file processing status...');
  let processingComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout
  
  while (!processingComplete && attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${API_URL}/files/${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const file = response.data.data;
      console.log(`   Status: ${file.status} (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (file.status === 'completed') {
        processingComplete = true;
        logTest('File Processing', true);
      } else if (file.status === 'failed') {
        throw new Error(`Processing failed: ${file.processing_error}`);
      }
      
      if (!processingComplete) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
      
    } catch (error) {
      if (attempts === maxAttempts - 1) {
        logTest('File Processing', false, 'Timeout - processing took too long');
      }
    }
    
    attempts++;
  }
  
  // Test 5: Verify Chunks Created
  console.log('\n5. Verifying chunks created...');
  try {
    const { data: chunks, error: chunksError } = await supabase
      .from('file_chunks')
      .select('*')
      .eq('file_id', fileId)
      .order('chunk_index');
    
    if (chunksError) throw chunksError;
    
    logTest('Chunks Created', chunks.length > 0);
    console.log(`   Chunks created: ${chunks.length}`);
    
    if (chunks.length > 0) {
      console.log(`   First chunk preview: ${chunks[0].content.substring(0, 100)}...`);
    }
    
  } catch (error) {
    logTest('Chunks Created', false, error.message);
  }
  
  // Test 6: Verify Embeddings Generated
  console.log('\n6. Verifying embeddings generated...');
  try {
    const { data: embeddings, error: embeddingsError } = await supabase
      .from('chunk_embeddings')
      .select('id, chunk_id, model')
      .eq('file_id', fileId)
      .limit(1);
    
    if (embeddingsError) throw embeddingsError;
    
    logTest('Embeddings Generated', embeddings.length > 0);
    if (embeddings.length > 0) {
      console.log(`   Embedding model: ${embeddings[0].model}`);
    }
    
  } catch (error) {
    // Embeddings might not be implemented yet
    logTest('Embeddings Generated', false, error.message);
  }
  
  // Test 7: Search in Chunks
  console.log('\n7. Testing chunk search...');
  try {
    const response = await axios.post(
      `${API_URL}/files/search`,
      {
        courseId,
        query: 'technical content',
        limit: 5
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    logTest('Chunk Search', response.data.success);
    console.log(`   Results found: ${response.data.data?.length || 0}`);
    
  } catch (error) {
    // Search might not be implemented yet
    logTest('Chunk Search', false, error.response?.data?.message || error.message);
  }
  
  // Cleanup
  console.log('\n8. Cleaning up...');
  try {
    // Delete test file
    fs.unlinkSync(testFilePath);
    
    // Delete course (should cascade delete files)
    await axios.delete(
      `${API_URL}/courses/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log('   Cleanup completed');
  } catch (error) {
    console.log('   Cleanup error:', error.message);
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Tests Passed: ${testResults.passed}`);
  console.log(`Tests Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\nErrors:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`- ${test}: ${error}`);
    });
  }
}

// Run the test
testFileProcessing().catch(console.error);