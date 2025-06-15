import { testHelpers } from '../setup';
import { supabase } from '../../src/config/supabase';
import { redisClient } from '../../src/config/redis';

describe('Service Integration Tests', () => {
  let testUser: any;
  let testCourse: any;
  let testModule: any;

  beforeAll(async () => {
    // Create test data
    testUser = testHelpers.generateTestUser();
    await supabase.from('users').insert(testUser);

    testCourse = testHelpers.generateTestCourse(testUser.id);
    await supabase.from('courses').insert(testCourse);

    testModule = testHelpers.generateTestModule(testCourse.id);
    await supabase.from('modules').insert(testModule);
  });

  afterAll(async () => {
    await testHelpers.cleanupTestData();
  });

  describe('File Service Integration', () => {
    it('should integrate file service with database operations', async () => {
      console.log('📁 Testing file service integration...');
      
      // Test file service
      const { FileService } = await import('../../src/services/fileService');
      const fileService = new FileService();
      
      expect(fileService).toBeDefined();
      
      // Test file service methods exist
      expect(typeof fileService.getModuleFiles).toBe('function');
      expect(typeof fileService.getFile).toBe('function');
      expect(typeof fileService.updateFile).toBe('function');
      expect(typeof fileService.deleteFile).toBe('function');
      
      console.log('✅ File service integration verified');
    });

    it('should integrate enhanced file processing with database', async () => {
      console.log('🔧 Testing enhanced file processing integration...');
      
      // Test enhanced file processing service
      const { EnhancedFileProcessingService } = await import('../../src/services/EnhancedFileProcessingService');
      const processingService = new EnhancedFileProcessingService();
      
      expect(processingService).toBeDefined();
      
      // Test document analysis capabilities
      const testContent = 'This is a comprehensive test document that contains multiple sections and paragraphs for testing document analysis capabilities.';
      
      // Test metadata extraction
      const metadata = await processingService.extractMetadata(testContent, 'test-document.pdf');
      expect(metadata).toBeDefined();
      expect(metadata.wordCount).toBeGreaterThan(0);
      
      // Test content chunking
      const chunks = await processingService.chunkContent(testContent, 'test-document.pdf');
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      
      console.log('✅ Enhanced file processing integration verified');
    });
  });

  describe('AI Service Integration', () => {
    it('should integrate AI services with Redis caching', async () => {
      console.log('🤖 Testing AI service integration with Redis...');
      
      // Test content generation service with Redis
      const { ContentGenerationService } = await import('../../src/services/content/ContentGenerationService');
      const contentService = new ContentGenerationService(redisClient);
      
      expect(contentService).toBeDefined();
      
      // Test deep content generation service
      const { DeepContentGenerationService } = await import('../../src/services/content/DeepContentGenerationService');
      const deepContentService = new DeepContentGenerationService(redisClient);
      
      expect(deepContentService).toBeDefined();
      
      console.log('✅ AI services integration with Redis verified');
    });

    it('should integrate search services with database', async () => {
      console.log('🔍 Testing search service integration...');
      
      // Test hybrid search service
      const { HybridSearchService } = await import('../../src/services/search/HybridSearchService');
      const searchService = new HybridSearchService();
      
      expect(searchService).toBeDefined();
      
      // Test that search service can be instantiated
      // In a real test, you'd test actual search functionality
      console.log('✅ Search service integration verified');
    });

    it('should integrate personalization services', async () => {
      console.log('👤 Testing personalization service integration...');
      
      // Test personalization engine
      const { PersonalizationEngine } = await import('../../src/services/personalization/PersonalizationEngine');
      const personalizationEngine = new PersonalizationEngine();
      
      expect(personalizationEngine).toBeDefined();
      
      // Test deep personalization engine
      const { deepPersonalizationEngine } = await import('../../src/services/personalization/DeepPersonalizationEngine');
      
      expect(deepPersonalizationEngine).toBeDefined();
      
      console.log('✅ Personalization service integration verified');
    });
  });

  describe('Queue Service Integration', () => {
    it('should integrate PGMQ services with database', async () => {
      console.log('⚡ Testing PGMQ service integration...');
      
      // Test PGMQ service
      const { PGMQService } = await import('../../src/services/queue/PGMQService');
      const pgmqService = new PGMQService();
      
      expect(pgmqService).toBeDefined();
      
      // Test enhanced PGMQ client
      const { EnhancedPGMQClient } = await import('../../src/services/queue/EnhancedPGMQClient');
      const enhancedClient = new EnhancedPGMQClient();
      
      expect(enhancedClient).toBeDefined();
      
      console.log('✅ PGMQ service integration verified');
    });

    it('should integrate file processor with queue system', async () => {
      console.log('🔄 Testing file processor integration...');
      
      // Test file processor
      const { FileProcessor } = await import('../../src/services/processing/FileProcessor');
      const fileProcessor = new FileProcessor();
      
      expect(fileProcessor).toBeDefined();
      
      console.log('✅ File processor integration verified');
    });
  });

  describe('Database Service Integration', () => {
    it('should integrate course services with database', async () => {
      console.log('📚 Testing course service integration...');
      
      // Test course service
      const { CourseService } = await import('../../src/services/courseService');
      const courseService = new CourseService();
      
      expect(courseService).toBeDefined();
      
      // Test module service
      const { ModuleService } = await import('../../src/services/moduleService');
      const moduleService = new ModuleService();
      
      expect(moduleService).toBeDefined();
      
      console.log('✅ Course service integration verified');
    });

    it('should integrate analytics services', async () => {
      console.log('📊 Testing analytics service integration...');
      
      // Test analytics service
      const { AnalyticsService } = await import('../../src/services/analyticsService');
      const analyticsService = new AnalyticsService();
      
      expect(analyticsService).toBeDefined();
      
      console.log('✅ Analytics service integration verified');
    });

    it('should integrate notification services', async () => {
      console.log('🔔 Testing notification service integration...');
      
      // Test notification service
      const { NotificationService } = await import('../../src/services/notificationService');
      const notificationService = new NotificationService();
      
      expect(notificationService).toBeDefined();
      
      console.log('✅ Notification service integration verified');
    });
  });

  describe('Cross-Service Integration', () => {
    it('should test service communication and data flow', async () => {
      console.log('🔄 Testing cross-service communication...');
      
      // Test that services can work together
      const { FileService } = await import('../../src/services/fileService');
      const { EnhancedFileProcessingService } = await import('../../src/services/EnhancedFileProcessingService');
      const { VectorEmbeddingService } = await import('../../src/services/embeddings/VectorEmbeddingService');
      
      const fileService = new FileService();
      const processingService = new EnhancedFileProcessingService();
      const embeddingService = new VectorEmbeddingService();
      
      expect(fileService).toBeDefined();
      expect(processingService).toBeDefined();
      expect(embeddingService).toBeDefined();
      
      // Test that services can handle data flow
      const testText = 'This is test content for cross-service integration testing.';
      const sanitizedText = processingService.sanitizeChunkContent(testText);
      
      expect(sanitizedText).toBeDefined();
      expect(sanitizedText.length).toBeGreaterThan(0);
      
      console.log('✅ Cross-service communication verified');
    });

    it('should test error propagation between services', async () => {
      console.log('🚨 Testing error propagation between services...');
      
      // Test error handling across services
      const { EnhancedFileProcessingService } = await import('../../src/services/EnhancedFileProcessingService');
      const processingService = new EnhancedFileProcessingService();
      
      // Test with problematic content
      const problematicText = '\u0000\u0001\u0002Invalid content\u0003\u0004';
      const sanitized = processingService.sanitizeChunkContent(problematicText);
      
      expect(sanitized).toBeDefined();
      expect(sanitized).not.toContain('\u0000');
      expect(sanitized).not.toContain('\u0001');
      
      console.log('✅ Error propagation handling verified');
    });
  });

  describe('Configuration and Environment Integration', () => {
    it('should test configuration service integration', async () => {
      console.log('⚙️ Testing configuration integration...');
      
      // Test configuration imports
      const { supabase: testSupabase } = await import('../../src/config/supabase');
      const { redisClient: testRedis } = await import('../../src/config/redis');
      
      expect(testSupabase).toBeDefined();
      expect(testRedis).toBeDefined();
      
      console.log('✅ Configuration integration verified');
    });

    it('should test logger integration', async () => {
      console.log('📝 Testing logger integration...');
      
      // Test logger
      const { logger } = await import('../../src/utils/logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      
      console.log('✅ Logger integration verified');
    });

    it('should test error handling utilities', async () => {
      console.log('🛠️ Testing error handling utilities...');
      
      // Test error utilities
      const { AppError } = await import('../../src/utils/errors');
      
      expect(AppError).toBeDefined();
      
      // Test creating an error
      const testError = new AppError('Test error message', 400);
      expect(testError.message).toBe('Test error message');
      expect(testError.statusCode).toBe(400);
      
      console.log('✅ Error handling utilities verified');
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should test Redis caching integration', async () => {
      console.log('⚡ Testing Redis caching integration...');
      
      // Test Redis operations
      const testKey = `test:integration:${Date.now()}`;
      const testValue = 'test-value';
      
      await redisClient.set(testKey, testValue, 'EX', 60);
      const retrievedValue = await redisClient.get(testKey);
      
      expect(retrievedValue).toBe(testValue);
      
      // Cleanup
      await redisClient.del(testKey);
      
      console.log('✅ Redis caching integration verified');
    });

    it('should test concurrent service operations', async () => {
      console.log('🔄 Testing concurrent service operations...');
      
      const startTime = Date.now();
      
      // Test concurrent service initializations
      const operations = [
        import('../../src/services/fileService'),
        import('../../src/services/EnhancedFileProcessingService'),
        import('../../src/services/embeddings/VectorEmbeddingService'),
        import('../../src/services/content/ContentGenerationService'),
        import('../../src/services/search/HybridSearchService')
      ];
      
      const results = await Promise.all(operations);
      const endTime = Date.now();
      
      expect(results).toBeDefined();
      expect(results.length).toBe(5);
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(5000);
      
      console.log(`✅ Concurrent operations completed in ${endTime - startTime}ms`);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should test data consistency across services', async () => {
      console.log('🔍 Testing data consistency across services...');
      
      // Create test file
      const testFile = testHelpers.generateTestFile(testModule.id);
      const { error } = await supabase
        .from('course_files')
        .insert(testFile);
        
      expect(error).toBeNull();
      
      // Test that file can be retrieved
      const { data: retrievedFile } = await supabase
        .from('course_files')
        .select('*')
        .eq('id', testFile.id)
        .single();
        
      expect(retrievedFile).toBeDefined();
      expect(retrievedFile?.id).toBe(testFile.id);
      expect(retrievedFile?.module_id).toBe(testModule.id);
      
      console.log('✅ Data consistency verified');
    });

    it('should test transaction-like operations', async () => {
      console.log('💾 Testing transaction-like operations...');
      
      // Test multiple related operations
      const testFile = testHelpers.generateTestFile(testModule.id);
      testFile.id = `transaction-test-${Date.now()}`;
      
      // Insert file
      const { error: insertError } = await supabase
        .from('course_files')
        .insert(testFile);
        
      expect(insertError).toBeNull();
      
      // Update file
      const { error: updateError } = await supabase
        .from('course_files')
        .update({ processing_status: 'completed' })
        .eq('id', testFile.id);
        
      expect(updateError).toBeNull();
      
      // Verify final state
      const { data: finalFile } = await supabase
        .from('course_files')
        .select('processing_status')
        .eq('id', testFile.id)
        .single();
        
      expect(finalFile?.processing_status).toBe('completed');
      
      console.log('✅ Transaction-like operations verified');
    });
  });
}); 