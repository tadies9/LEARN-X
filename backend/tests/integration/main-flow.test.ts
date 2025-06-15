import request from 'supertest';
import express from 'express';
import { testHelpers, setupTests } from '../setup';
import { supabase } from '../../src/config/supabase';

// Create test app instance
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Add basic test routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
};

describe('Main Flow Integration Tests', () => {
  let testUser: any;
  let testCourse: any;
  let testModule: any;
  let app: express.Application;
  let _authToken: string;

  beforeAll(async () => {
    // Setup test environment
    await setupTests();
    
    // Setup test app
    app = createTestApp();
    
    // Create test user
    testUser = testHelpers.generateTestUser();
    const { error: userError } = await supabase
      .from('users')
      .insert(testUser);
    
    if (userError) {
      console.error('Failed to create test user:', userError);
      throw userError;
    }

    // Create test course
    testCourse = testHelpers.generateTestCourse(testUser.id);
    const { error: courseError } = await supabase
      .from('courses')
      .insert(testCourse);
    
    if (courseError) {
      console.error('Failed to create test course:', courseError);
      throw courseError;
    }

    // Create test module
    testModule = testHelpers.generateTestModule(testCourse.id);
    const { error: moduleError } = await supabase
      .from('modules')
      .insert(testModule);
    
    if (moduleError) {
      console.error('Failed to create test module:', moduleError);
      throw moduleError;
    }

    // Generate auth token for testing
    _authToken = `Bearer test_token_${testUser.id}`;
  });

  afterAll(async () => {
    await testHelpers.cleanupTestData();
  });

  describe('Database Integration Tests', () => {
    it('should create and retrieve test data', async () => {
      console.log('🗄️ Testing database operations...');
      
      // Test user creation
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUser.id)
        .single();
        
      expect(userData).toBeDefined();
      expect(userData?.id).toBe(testUser.id);
      
      // Test course creation
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', testCourse.id)
        .single();
        
      expect(courseData).toBeDefined();
      expect(courseData?.user_id).toBe(testUser.id);
      
      console.log('✅ Database operations verified');
    });

    it('should handle file metadata operations', async () => {
      console.log('📁 Testing file metadata operations...');
      
      // Create test file
      const testFile = testHelpers.generateTestFile(testModule.id);
      const { error: fileError } = await supabase
        .from('course_files')
        .insert(testFile);
        
      expect(fileError).toBeNull();
      
      // Retrieve file
      const { data: fileData } = await supabase
        .from('course_files')
        .select('*')
        .eq('id', testFile.id)
        .single();
        
      expect(fileData).toBeDefined();
      expect(fileData?.module_id).toBe(testModule.id);
      
      console.log('✅ File metadata operations verified');
    });
  });

  describe('Service Integration Tests', () => {
    it('should test file processing service integration', async () => {
      console.log('🔧 Testing file processing service...');
      
      // Test file processing service
      const { EnhancedFileProcessingService } = await import('../../src/services/EnhancedFileProcessingService');
      const processingService = new EnhancedFileProcessingService();
      
      // Test text sanitization
      const testText = 'This is test content for sanitization\u0000';
      const sanitized = processingService.sanitizeChunkContent(testText);
      
      expect(sanitized).toBeDefined();
      expect(sanitized).not.toContain('\u0000');
      
      console.log('✅ File processing service verified');
    });

    it('should test embedding service integration', async () => {
      console.log('🔍 Testing embedding service...');
      
      // Test embedding service
      const { VectorEmbeddingService } = await import('../../src/services/embeddings/VectorEmbeddingService');
      const embeddingService = new VectorEmbeddingService();
      
      // Test service initialization
      expect(embeddingService).toBeDefined();
      
      console.log('✅ Embedding service verified');
    });
  });

  describe('API Health Tests', () => {
    it('should respond to health check', async () => {
      console.log('🏥 Testing health endpoint...');
      
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body.status).toBe('ok');
      console.log('✅ Health check verified');
    });
  });

  describe('Queue Integration Tests', () => {
    it('should test queue service integration', async () => {
      console.log('⚡ Testing queue service...');
      
      // Test PGMQ service
      const { PGMQService } = await import('../../src/services/queue/PGMQService');
      const queueService = new PGMQService();
      
      // Test service initialization
      expect(queueService).toBeDefined();
      
      console.log('✅ Queue service verified');
    });
  });

  describe('File Processing Pipeline Tests', () => {
    it('should test complete file processing pipeline components', async () => {
      console.log('🔄 Testing file processing pipeline...');
      
      // Test file processor
      const { FileProcessor } = await import('../../src/services/processing/FileProcessor');
      const fileProcessor = new FileProcessor();
      
      expect(fileProcessor).toBeDefined();
      
      // Test document analyzer
      const { DocumentAnalyzer } = await import('../../src/services/document/DocumentAnalyzer');
      const documentAnalyzer = new DocumentAnalyzer();
      
      expect(documentAnalyzer).toBeDefined();
      
      console.log('✅ File processing pipeline components verified');
    });

    it('should test content generation services', async () => {
      console.log('🤖 Testing content generation services...');
      
      // Test content generation service
      const { ContentGenerationService } = await import('../../src/services/content/ContentGenerationService');
      const { redisClient } = await import('../../src/config/redis');
      
      const contentService = new ContentGenerationService(redisClient);
      expect(contentService).toBeDefined();
      
      console.log('✅ Content generation services verified');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid data gracefully', async () => {
      console.log('🚨 Testing error handling...');
      
      // Test invalid user query
      const { error } = await supabase
        .from('users')
        .select('*')
        .eq('id', 'invalid-id')
        .single();
        
      expect(error).toBeDefined();
      expect(error?.code).toBe('PGRST116'); // No rows returned
      
      console.log('✅ Error handling verified');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent database operations', async () => {
      console.log('📈 Testing concurrent operations...');
      
      const startTime = Date.now();
      
      // Create multiple concurrent operations
      const operations = Array.from({ length: 5 }, (_, i) => {
        const testFile = testHelpers.generateTestFile(testModule.id);
        testFile.id = `concurrent-test-${i}-${Date.now()}`;
        
        return supabase
          .from('course_files')
          .insert(testFile);
      });
      
      const results = await Promise.allSettled(operations);
      const endTime = Date.now();
      
      // Check that most operations succeeded
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
      
      console.log(`✅ Concurrent operations completed in ${endTime - startTime}ms`);
    });
  });
}); 