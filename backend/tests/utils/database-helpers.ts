import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Test configuration for database helpers

export interface TestUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface TestCourse {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface TestModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface TestFile {
  id: string;
  module_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  processing_status: string;
  created_at: string;
}

export class DatabaseHelpers {
  private static supabase: SupabaseClient;
  private static testPrefix = 'test_';

  static initialize(): void {
    this.supabase = createClient(
      process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
      process.env.TEST_SUPABASE_SERVICE_KEY || 'test-service-key'
    );
  }

  static getClient(): SupabaseClient {
    if (!this.supabase) {
      this.initialize();
    }
    return this.supabase;
  }

  // User helpers
  static async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const timestamp = Date.now();
    const testUser: TestUser = {
      id: `${this.testPrefix}user_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      full_name: `Test User ${timestamp}`,
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { error } = await this.supabase
      .from('users')
      .insert(testUser);

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    return testUser;
  }

  static async createTestCourse(
    userId: string, 
    overrides: Partial<TestCourse> = {}
  ): Promise<TestCourse> {
    const timestamp = Date.now();
    const testCourse: TestCourse = {
      id: `${this.testPrefix}course_${timestamp}`,
      user_id: userId,
      title: `Test Course ${timestamp}`,
      description: `Test course description ${timestamp}`,
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { error } = await this.supabase
      .from('courses')
      .insert(testCourse);

    if (error) {
      throw new Error(`Failed to create test course: ${error.message}`);
    }

    return testCourse;
  }

  static async createTestModule(
    courseId: string,
    overrides: Partial<TestModule> = {}
  ): Promise<TestModule> {
    const timestamp = Date.now();
    const testModule: TestModule = {
      id: `${this.testPrefix}module_${timestamp}`,
      course_id: courseId,
      title: `Test Module ${timestamp}`,
      description: `Test module description ${timestamp}`,
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { error } = await this.supabase
      .from('modules')
      .insert(testModule);

    if (error) {
      throw new Error(`Failed to create test module: ${error.message}`);
    }

    return testModule;
  }

  static async createTestFile(
    moduleId: string,
    overrides: Partial<TestFile> = {}
  ): Promise<TestFile> {
    const timestamp = Date.now();
    const testFile: TestFile = {
      id: `${this.testPrefix}file_${timestamp}`,
      module_id: moduleId,
      filename: `test_file_${timestamp}.txt`,
      file_path: `/test/path/test_file_${timestamp}.txt`,
      file_size: 1024,
      mime_type: 'text/plain',
      processing_status: 'pending',
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { error } = await this.supabase
      .from('files')
      .insert(testFile);

    if (error) {
      throw new Error(`Failed to create test file: ${error.message}`);
    }

    return testFile;
  }

  // Persona helpers
  static async createTestPersona(userId: string, personaData: any): Promise<any> {
    const timestamp = Date.now();
    const testPersona = {
      id: `${this.testPrefix}persona_${timestamp}`,
      user_id: userId,
      learning_style: personaData.learning_style || 'visual',
      communication_style: personaData.communication_style || 'casual',
      technical_level: personaData.technical_level || 'beginner',
      interests: personaData.interests || ['technology'],
      academic_level: personaData.academic_level || 'undergraduate',
      career_focus: personaData.career_focus || 'general',
      content_preferences: personaData.content_preferences || {},
      personality_traits: personaData.personality_traits || {},
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('user_personas')
      .insert(testPersona);

    if (error) {
      throw new Error(`Failed to create test persona: ${error.message}`);
    }

    return testPersona;
  }

  // Embedding helpers
  static async createTestEmbedding(
    chunkId: string,
    embedding: number[] = []
  ): Promise<any> {
    const timestamp = Date.now();
    
    // Create a mock embedding vector if none provided
    const mockEmbedding = embedding.length > 0 ? embedding : Array(1536).fill(0).map(() => Math.random());

    const testEmbedding = {
      id: `${this.testPrefix}embedding_${timestamp}`,
      chunk_id: chunkId,
      embedding: mockEmbedding,
      model: 'text-embedding-ada-002',
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('embeddings')
      .insert(testEmbedding);

    if (error) {
      throw new Error(`Failed to create test embedding: ${error.message}`);
    }

    return testEmbedding;
  }

  static async createTestChunk(
    fileId: string,
    content: string = 'Test chunk content',
    overrides: any = {}
  ): Promise<any> {
    const timestamp = Date.now();
    const testChunk = {
      id: `${this.testPrefix}chunk_${timestamp}`,
      file_id: fileId,
      content,
      chunk_index: 0,
      start_char: 0,
      end_char: content.length,
      token_count: Math.ceil(content.length / 4), // Rough token estimate
      metadata: {},
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { error } = await this.supabase
      .from('chunks')
      .insert(testChunk);

    if (error) {
      throw new Error(`Failed to create test chunk: ${error.message}`);
    }

    return testChunk;
  }

  // AI Content helpers
  static async createTestAIContent(
    fileId: string,
    contentType: string,
    content: any,
    overrides: any = {}
  ): Promise<any> {
    const timestamp = Date.now();
    const testAIContent = {
      id: `${this.testPrefix}ai_content_${timestamp}`,
      file_id: fileId,
      content_type: contentType,
      content: typeof content === 'object' ? content : { text: content },
      generation_metadata: {
        model: 'gpt-3.5-turbo',
        tokens_used: 100,
        cost: 0.001,
      },
      created_at: new Date().toISOString(),
      ...overrides,
    };

    const { error } = await this.supabase
      .from('ai_content')
      .insert(testAIContent);

    if (error) {
      throw new Error(`Failed to create test AI content: ${error.message}`);
    }

    return testAIContent;
  }

  // Cleanup helpers
  static async cleanupTestData(): Promise<void> {
    const tables = [
      'ai_content',
      'embeddings',
      'chunks',
      'files',
      'modules',
      'courses',
      'user_personas',
      'users',
    ];

    for (const table of tables) {
      try {
        await this.supabase
          .from(table)
          .delete()
          .like('id', `${this.testPrefix}%`);
      } catch (error) {
        console.warn(`Warning: Failed to cleanup table ${table}:`, error);
      }
    }
  }

  static async cleanupTestDataById(ids: string[]): Promise<void> {
    const tables = [
      'ai_content',
      'embeddings', 
      'chunks',
      'files',
      'modules',
      'courses',
      'user_personas',
      'users',
    ];

    for (const table of tables) {
      try {
        await this.supabase
          .from(table)
          .delete()
          .in('id', ids);
      } catch (error) {
        console.warn(`Warning: Failed to cleanup table ${table}:`, error);
      }
    }
  }

  // Query helpers
  static async getTestUser(userId: string): Promise<TestUser | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return null;
    }

    return data as TestUser;
  }

  static async getFileProcessingStatus(fileId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('files')
      .select('processing_status')
      .eq('id', fileId)
      .single();

    if (error) {
      return null;
    }

    return data.processing_status;
  }

  static async waitForFileProcessing(
    fileId: string,
    expectedStatus: string = 'completed',
    timeoutMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getFileProcessingStatus(fileId);
      
      if (status === expectedStatus) {
        return true;
      }
      
      if (status === 'failed') {
        throw new Error(`File processing failed for file ${fileId}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  // Database health checks
  static async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  static async getTableRowCount(tableName: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to get row count for ${tableName}: ${error.message}`);
    }

    return count || 0;
  }
}

export default DatabaseHelpers;