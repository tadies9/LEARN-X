const { supabase } = require('../src/config/supabase');
const { redisClient } = require('../src/config/redis');

// Generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Test utilities
const generateTestData = {
  user: () => ({
    id: generateUUID(),
    email: `test-${Date.now()}@example.com`,
    full_name: 'Test User',
  }),
  
  course: (userId) => ({
    id: generateUUID(),
    user_id: userId,
    title: 'Test Course',
    description: 'Test course description',
  }),
  
  module: (courseId) => ({
    id: generateUUID(),
    course_id: courseId,
    title: 'Test Module',
    description: 'Test module description',
    order_index: 1,
  }),
  
  file: (courseId, moduleId) => ({
    id: generateUUID(),
    course_id: courseId,
    module_id: moduleId,
    name: 'test-document.pdf',
    original_name: 'test-document.pdf',
    size_bytes: 12345,
    mime_type: 'application/pdf',
    storage_path: 'test/path/test-document.pdf',
    status: 'pending',
  })
};

// Track test IDs for cleanup
let testIds = {
  users: [],
  courses: [],
  modules: [],
  files: []
};

const cleanupTestData = async () => {
  try {
    // Clean up test files
    if (testIds.files.length > 0) {
      await supabase.from('course_files').delete().in('id', testIds.files);
    }
    // Clean up test modules
    if (testIds.modules.length > 0) {
      await supabase.from('modules').delete().in('id', testIds.modules);
    }
    // Clean up test courses
    if (testIds.courses.length > 0) {
      await supabase.from('courses').delete().in('id', testIds.courses);
    }
    // Clean up test users
    if (testIds.users.length > 0) {
      await supabase.from('users').delete().in('id', testIds.users);
    }
    console.log('✅ Test data cleaned up');
  } catch (_error) {
    console.error('❌ Test data cleanup failed:', _error);
  }
};

describe('Complete Integration Tests', () => {
  let testUser, testCourse, testModule;

  beforeAll(async () => {
    console.log('🚀 Setting up integration tests...');
    
    // Test Redis connection
    try {
      await redisClient.ping();
      console.log('✅ Redis connection established');
    } catch (_error) {
      console.error('❌ Redis connection failed:', _error);
    }
    
    // Create test data
    testUser = generateTestData.user();
    testCourse = generateTestData.course(testUser.id);
    testModule = generateTestData.module(testCourse.id);
    
    // Track IDs for cleanup
    testIds.users.push(testUser.id);
    testIds.courses.push(testCourse.id);
    testIds.modules.push(testModule.id);
    
    // Insert test user
    const { error: userError } = await supabase.from('users').insert(testUser);
    if (userError) throw userError;
    
    // Insert test course
    const { error: courseError } = await supabase.from('courses').insert(testCourse);
    if (courseError) throw courseError;
    
    // Insert test module
    const { error: moduleError } = await supabase.from('modules').insert(testModule);
    if (moduleError) throw moduleError;
    
    console.log('✅ Test data created');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up...');
    
    await cleanupTestData();
    
    // Clean up Redis test data
    try {
      const testKeys = await redisClient.keys('test:*');
      if (testKeys.length > 0) {
        await redisClient.del(...testKeys);
      }
      await redisClient.quit();
      console.log('✅ Redis cleaned up');
    } catch (_error) {
      console.error('❌ Redis cleanup failed:', _error);
    }
  });

  describe('Database Operations', () => {
    it('should create and retrieve test user', async () => {
      console.log('👤 Testing user operations...');
      
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUser.id)
        .single();
        
      expect(userData).toBeDefined();
      expect(userData.id).toBe(testUser.id);
      expect(userData.email).toBe(testUser.email);
      expect(userData.full_name).toBe(testUser.full_name);
      
      console.log('✅ User operations verified');
    });

    it('should create and retrieve test course', async () => {
      console.log('📚 Testing course operations...');
      
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', testCourse.id)
        .single();
        
      expect(courseData).toBeDefined();
      expect(courseData.id).toBe(testCourse.id);
      expect(courseData.user_id).toBe(testUser.id);
      
      console.log('✅ Course operations verified');
    });

    it('should create and retrieve test module', async () => {
      console.log('📖 Testing module operations...');
      
      const { data: moduleData } = await supabase
        .from('modules')
        .select('*')
        .eq('id', testModule.id)
        .single();
        
      expect(moduleData).toBeDefined();
      expect(moduleData.id).toBe(testModule.id);
      expect(moduleData.course_id).toBe(testCourse.id);
      
      console.log('✅ Module operations verified');
    });

    it('should handle file metadata operations', async () => {
      console.log('📁 Testing file operations...');
      
      const testFile = generateTestData.file(testCourse.id, testModule.id);
      
      // Track file ID for cleanup
      testIds.files.push(testFile.id);
      
      // Create file
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
      expect(fileData.id).toBe(testFile.id);
      expect(fileData.module_id).toBe(testModule.id);
      expect(fileData.course_id).toBe(testCourse.id);
      
      console.log('✅ File operations verified');
    });
  });

  describe('Service Imports and Initialization', () => {
    it('should load and initialize file processing service', async () => {
      console.log('🔧 Testing file processing service...');
      
      try {
        const { EnhancedFileProcessingService } = require('../src/services/EnhancedFileProcessingService');
        const processingService = new EnhancedFileProcessingService();
        
        expect(processingService).toBeDefined();
        expect(typeof processingService.sanitizeChunkContent).toBe('function');
        
        // Test text sanitization
        const testText = 'This is test content\u0000\u0001with special chars';
        const sanitized = processingService.sanitizeChunkContent(testText);
        
        expect(sanitized).toBeDefined();
        expect(sanitized).not.toContain('\u0000');
        expect(sanitized).not.toContain('\u0001');
        
        console.log('✅ File processing service verified');
      } catch (_error) {
        console.error('❌ File processing service error:', _error);
        throw _error;
      }
    });

    it('should load and initialize embedding service', async () => {
      console.log('🔍 Testing embedding service...');
      
      try {
        const { VectorEmbeddingService } = require('../src/services/embeddings/VectorEmbeddingService');
        const embeddingService = new VectorEmbeddingService();
        
        expect(embeddingService).toBeDefined();
        
        console.log('✅ Embedding service verified');
      } catch (_error) {
        console.error('❌ Embedding service error:', _error);
        throw _error;
      }
    });

    it('should load and initialize queue services', async () => {
      console.log('⚡ Testing queue services...');
      
      try {
        const { PGMQService } = require('../src/services/queue/PGMQService');
        const queueService = new PGMQService();
        
        expect(queueService).toBeDefined();
        
        console.log('✅ Queue service verified');
      } catch (_error) {
        console.error('❌ Queue service error:', _error);
        throw _error;
      }
    });

    it('should load and initialize content generation services', async () => {
      console.log('🤖 Testing content generation services...');
      
      try {
        const { ContentGenerationService } = require('../src/services/content/ContentGenerationService');
        const contentService = new ContentGenerationService();
        
        expect(contentService).toBeDefined();
        
        console.log('✅ Content generation service verified');
      } catch (_error) {
        console.error('❌ Content generation service error:', _error);
        throw _error;
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
      
      // Delete value
      await redisClient.del(testKey);
      
      console.log('✅ Redis operations verified');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid database queries gracefully', async () => {
      console.log('🚨 Testing error handling...');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', 'non-existent-user');
      
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
      
      console.log('✅ Error handling verified');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent database operations', async () => {
      console.log('⚡ Testing concurrent operations...');
      
      const startTime = Date.now();
      
      // Create multiple concurrent operations
      const operations = Array.from({ length: 5 }, (_, _i) => 
        supabase.from('users').select('id').limit(1)
      );
      
      const results = await Promise.all(operations);
      
      const endTime = Date.now();
      
      expect(results).toBeDefined();
      expect(results.length).toBe(5);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      
      console.log('✅ Concurrent operations verified');
    });
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
}); 