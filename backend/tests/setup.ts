import { config } from 'dotenv';
import { supabase } from '../src/config/supabase';
import { redisClient } from '../src/config/redis';

// Load environment variables
config({ path: '.env.test' });

// Test setup function to be called from test files
export async function setupTests() {
  console.log('🚀 Setting up integration test environment...');
  
  // Ensure Redis connection
  try {
    await redisClient.ping();
    console.log('✅ Redis connection established');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
  
  // Test Supabase connection
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no data" which is fine
      throw error;
    }
    console.log('✅ Supabase connection established');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

// Test cleanup function to be called from test files
export async function cleanupTests() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up Redis test data
    const testKeys = await redisClient.keys('test:*');
    if (testKeys.length > 0) {
      await redisClient.del(...testKeys);
    }
    
    // Close Redis connection
    await redisClient.quit();
    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Test helper utilities
export const testHelpers = {
  // Generate test user data
  generateTestUser: () => ({
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    created_at: new Date().toISOString(),
  }),
  
  // Generate test course data
  generateTestCourse: (userId: string) => ({
    id: `test-course-${Date.now()}`,
    user_id: userId,
    name: 'Test Course',
    description: 'Test course description',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  
  // Generate test module data
  generateTestModule: (courseId: string) => ({
    id: `test-module-${Date.now()}`,
    course_id: courseId,
    name: 'Test Module',
    description: 'Test module description',
    order_index: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  
  // Generate test file data
  generateTestFile: (moduleId: string) => ({
    id: `test-file-${Date.now()}`,
    module_id: moduleId,
    name: 'test-document.pdf',
    filename: 'test-document.pdf',
    size: 12345,
    mimetype: 'application/pdf',
    storage_path: 'test/path/test-document.pdf',
    upload_status: 'completed',
    processing_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  
  // Clean up test data
  cleanupTestData: async () => {
    try {
      // Clean up test files
      await supabase
        .from('course_files')
        .delete()
        .like('id', 'test-file-%');
      
      // Clean up test modules
      await supabase
        .from('modules')
        .delete()
        .like('id', 'test-module-%');
      
      // Clean up test courses
      await supabase
        .from('courses')
        .delete()
        .like('id', 'test-course-%');
      
      // Clean up test users
      await supabase
        .from('users')
        .delete()
        .like('id', 'test-user-%');
        
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
    }
  },
  
  // Wait for processing to complete
  waitForProcessing: async (fileId: string, timeout: number = 30000): Promise<boolean> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const { data: file } = await supabase
        .from('course_files')
        .select('processing_status')
        .eq('id', fileId)
        .single();
        
      if (file?.processing_status === 'completed') {
        return true;
      }
      
      if (file?.processing_status === 'failed') {
        throw new Error('File processing failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  },
  
  // Create test file buffer
  createTestPdfBuffer: (): Buffer => {
    // Minimal PDF content for testing
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Count 1
/Kids [3 0 R]
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
50 750 Td
(Test PDF Content) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
287
%%EOF`;
    return Buffer.from(pdfContent, 'utf-8');
  }
};

// Mock external services for testing
export const mockServices = {
  mockOpenAI: {
    createChatCompletion: () => Promise.resolve({ choices: [{ message: { content: 'Mock response' } }] }),
    createEmbedding: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
  },
  
  mockSupabaseStorage: {
    upload: () => Promise.resolve({ data: { path: 'test/path' }, error: null }),
    download: () => Promise.resolve({ data: Buffer.from('test'), error: null }),
    remove: () => Promise.resolve({ error: null }),
  }
}; 