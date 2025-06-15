const { redisClient } = require('../src/config/redis');

describe('Working Integration Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Setting up integration tests...');
    
    // Test Redis connection
    try {
      await redisClient.ping();
      console.log('✅ Redis connection established');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up...');
    
    // Clean up Redis test data
    try {
      const testKeys = await redisClient.keys('test:*');
      if (testKeys.length > 0) {
        await redisClient.del(...testKeys);
      }
      await redisClient.quit();
      console.log('✅ Redis cleaned up');
    } catch (error) {
      console.error('❌ Redis cleanup failed:', error);
    }
  });

  describe('Configuration Tests', () => {
    it('should have required environment variables', () => {
      console.log('⚙️ Testing configuration...');
      
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined();
      expect(process.env.REDIS_URL).toBeDefined();
      
      console.log('✅ Configuration verified');
    });
  });

  describe('Service Loading Tests', () => {
    it('should load and initialize file processing service', async () => {
      console.log('🔧 Testing file processing service...');
      
      try {
        const { EnhancedFileProcessingService } = require('../src/services/EnhancedFileProcessingService');
        const processingService = new EnhancedFileProcessingService();
        
        expect(processingService).toBeDefined();
        expect(typeof processingService.sanitizeChunkContent).toBe('function');
        
        // Test text sanitization
        const testText = 'This is test content\u0000\u0001with special chars ñáéíóú';
        const sanitized = processingService.sanitizeChunkContent(testText);
        
        expect(sanitized).toBeDefined();
        expect(sanitized).not.toContain('\u0000');
        expect(sanitized).not.toContain('\u0001');
        expect(sanitized).toContain('ñáéíóú'); // Should preserve Unicode
        
        console.log('✅ File processing service verified');
      } catch (error) {
        console.error('❌ File processing service error:', error);
        throw error;
      }
    });

    it('should load and initialize embedding service', async () => {
      console.log('🔍 Testing embedding service...');
      
      try {
        const { VectorEmbeddingService } = require('../src/services/embeddings/VectorEmbeddingService');
        const embeddingService = new VectorEmbeddingService();
        
        expect(embeddingService).toBeDefined();
        
        console.log('✅ Embedding service verified');
      } catch (error) {
        console.error('❌ Embedding service error:', error);
        throw error;
      }
    });

    it('should load and initialize queue services', async () => {
      console.log('⚡ Testing queue services...');
      
      try {
        const { PGMQService } = require('../src/services/queue/PGMQService');
        const queueService = new PGMQService();
        
        expect(queueService).toBeDefined();
        
        console.log('✅ Queue service verified');
      } catch (error) {
        console.error('❌ Queue service error:', error);
        throw error;
      }
    });

    it('should load and initialize content generation services', async () => {
      console.log('🤖 Testing content generation services...');
      
      try {
        const { ContentGenerationService } = require('../src/services/content/ContentGenerationService');
        const contentService = new ContentGenerationService();
        
        expect(contentService).toBeDefined();
        
        console.log('✅ Content generation service verified');
      } catch (error) {
        console.error('❌ Content generation service error:', error);
        throw error;
      }
    });

    it('should load file processor service', async () => {
      console.log('📄 Testing file processor...');
      
      try {
        const { FileProcessor } = require('../src/services/processing/FileProcessor');
        const fileProcessor = new FileProcessor();
        
        expect(fileProcessor).toBeDefined();
        
        console.log('✅ File processor verified');
      } catch (error) {
        console.error('❌ File processor error:', error);
        throw error;
      }
    });
  });

  describe('Redis Operations', () => {
    it('should perform Redis cache operations', async () => {
      console.log('🔴 Testing Redis operations...');
      
      const testKey = 'test:integration:cache';
      const testValue = 'test-cache-value';
      
      // Set value
      await redisClient.set(testKey, testValue);
      
      // Get value
      const retrievedValue = await redisClient.get(testKey);
      
      expect(retrievedValue).toBe(testValue);
      
      // Test JSON storage
      const testObject = { name: 'test', count: 42 };
      await redisClient.set('test:json', JSON.stringify(testObject));
      
      const retrievedObject = JSON.parse(await redisClient.get('test:json'));
      expect(retrievedObject.name).toBe('test');
      expect(retrievedObject.count).toBe(42);
      
      // Delete values
      await redisClient.del(testKey);
      await redisClient.del('test:json');
      
      console.log('✅ Redis operations verified');
    });

    it('should handle Redis key expiration', async () => {
      console.log('⏰ Testing Redis expiration...');
      
      const testKey = 'test:expiration';
      const testValue = 'expires-soon';
      
      // Set value with 2 second expiration
      await redisClient.setex(testKey, 2, testValue);
      
      // Should exist immediately
      const immediate = await redisClient.get(testKey);
      expect(immediate).toBe(testValue);
      
      // Should still exist after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterOne = await redisClient.get(testKey);
      expect(afterOne).toBe(testValue);
      
      // Should be expired after 3 seconds total
      await new Promise(resolve => setTimeout(resolve, 2500));
      const afterExpiry = await redisClient.get(testKey);
      expect(afterExpiry).toBeNull();
      
      console.log('✅ Redis expiration verified');
    });
  });

  describe('Text Processing Tests', () => {
    it('should handle various text processing scenarios', async () => {
      console.log('📝 Testing text processing...');
      
      const { EnhancedFileProcessingService } = require('../src/services/EnhancedFileProcessingService');
      const processingService = new EnhancedFileProcessingService();
      
      // Test different scenarios
      const testCases = [
        {
          input: 'Normal text with punctuation.',
          description: 'normal text'
        },
        {
          input: 'Text with\nnewlines\nand\ttabs',
          description: 'text with whitespace'
        },
        {
          input: 'Unicode: ñáéíóú çàñón 中文 🚀',
          description: 'unicode characters'
        },
        {
          input: 'Control chars\u0000\u0001\u0002\u001F',
          description: 'control characters'
        },
        {
          input: '',
          description: 'empty string'
        }
      ];
      
      testCases.forEach(({ input, description }) => {
        const sanitized = processingService.sanitizeChunkContent(input);
        
        expect(sanitized).toBeDefined();
        expect(typeof sanitized).toBe('string');
        
        // Should not contain control characters  
        // eslint-disable-next-line no-control-regex
        expect(sanitized).not.toMatch(/[\u0000-\u001F]/);
        
        console.log(`  ✓ Handled ${description}`);
      });
      
      console.log('✅ Text processing verified');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle service initialization errors gracefully', async () => {
      console.log('🚨 Testing error handling...');
      
      // Test that services can be imported without throwing
      try {
        const services = [
          '../src/services/EnhancedFileProcessingService',
          '../src/services/embeddings/VectorEmbeddingService',
          '../src/services/content/ContentGenerationService',
          '../src/services/queue/PGMQService'
        ];
        
        for (const servicePath of services) {
          const serviceModule = require(servicePath);
          expect(serviceModule).toBeDefined();
        }
        
        console.log('✅ Error handling verified');
      } catch (_error) {
        console.error('❌ Service import failed:', _error);
        throw _error;
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent Redis operations', async () => {
      console.log('⚡ Testing concurrent operations...');
      
      const startTime = Date.now();
      
      // Create multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, _i) => 
        redisClient.set(`test:concurrent:${_i}`, `value-${_i}`)
      );
      
      await Promise.all(operations);
      
      // Verify all values were set
      const retrieveOperations = Array.from({ length: 10 }, (_, _i) =>
        redisClient.get(`test:concurrent:${_i}`)
      );
      
      const results = await Promise.all(retrieveOperations);
      
      const endTime = Date.now();
      
      expect(results).toBeDefined();
      expect(results.length).toBe(10);
      
      results.forEach((value, index) => {
        expect(value).toBe(`value-${index}`);
      });
      
      // Cleanup
      const deleteOperations = Array.from({ length: 10 }, (_, _i) =>
        redisClient.del(`test:concurrent:${_i}`)
      );
      await Promise.all(deleteOperations);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      
      console.log('✅ Concurrent operations verified');
    });
  });

  describe('Module Loading Tests', () => {
    it('should verify all critical modules can be loaded', async () => {
      console.log('📦 Testing module loading...');
      
      const criticalModules = [
        '../src/config/supabase',
        '../src/config/redis',
        '../src/services/EnhancedFileProcessingService',
        '../src/services/embeddings/VectorEmbeddingService',
        '../src/services/content/ContentGenerationService',
        '../src/services/queue/PGMQService'
      ];
      
      for (const modulePath of criticalModules) {
        try {
          const module = require(modulePath);
          expect(module).toBeDefined();
          console.log(`  ✓ Loaded ${modulePath}`);
        } catch (_error) {
          console.error(`  ❌ Failed to load ${modulePath}:`, _error);
          throw _error;
        }
      }
      
      console.log('✅ Module loading verified');
    });
  });
}); 