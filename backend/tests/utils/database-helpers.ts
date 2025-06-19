import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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
  private static createdTestIds: string[] = [];

  static initialize(): void {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.TEST_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
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
    const email = overrides.email || `test_${timestamp}@example.com`;
    const password = 'TestPassword123!';

    // First create the user in auth.users
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const testUser: TestUser = {
      id: authData.user.id,
      email,
      full_name: overrides.full_name || `Test User ${timestamp}`,
      created_at: overrides.created_at || new Date().toISOString(),
    };

    const { error } = await this.supabase.from('users').insert(testUser);

    if (error) {
      // Clean up auth user if profile creation fails
      await this.supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create test user profile: ${error.message}`);
    }

    this.createdTestIds.push(testUser.id);
    return testUser;
  }

  static async createTestCourse(
    userId: string,
    overrides: Partial<TestCourse> = {}
  ): Promise<TestCourse> {
    const timestamp = Date.now();
    const testCourse: TestCourse = {
      id: overrides.id || uuidv4(),
      user_id: userId,
      title: overrides.title || `Test Course ${timestamp}`,
      description: overrides.description || `Test course description ${timestamp}`,
      created_at: overrides.created_at || new Date().toISOString(),
    };

    const { error } = await this.supabase.from('courses').insert(testCourse);

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
      id: overrides.id || uuidv4(),
      course_id: courseId,
      title: overrides.title || `Test Module ${timestamp}`,
      description: overrides.description || `Test module description ${timestamp}`,
      created_at: overrides.created_at || new Date().toISOString(),
    };

    const { error } = await this.supabase.from('modules').insert(testModule);

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
      id: overrides.id || uuidv4(),
      module_id: moduleId,
      filename: overrides.filename || `test_file_${timestamp}.txt`,
      file_path: overrides.file_path || `/test/path/test_file_${timestamp}.txt`,
      file_size: overrides.file_size || 1024,
      mime_type: overrides.mime_type || 'text/plain',
      processing_status: overrides.processing_status || 'pending',
      created_at: overrides.created_at || new Date().toISOString(),
    };

    const { error } = await this.supabase.from('files').insert(testFile);

    if (error) {
      throw new Error(`Failed to create test file: ${error.message}`);
    }

    return testFile;
  }

  // Persona helpers
  static async createTestPersona(userId: string, personaData: any): Promise<any> {
    const testPersona = {
      id: personaData.id || uuidv4(),
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

    const { error } = await this.supabase.from('user_personas').insert(testPersona);

    if (error) {
      throw new Error(`Failed to create test persona: ${error.message}`);
    }

    return testPersona;
  }

  // Embedding helpers
  static async createTestEmbedding(chunkId: string, embedding: number[] = []): Promise<any> {
    // Create a mock embedding vector if none provided
    const mockEmbedding =
      embedding.length > 0
        ? embedding
        : Array(1536)
            .fill(0)
            .map(() => Math.random());

    const testEmbedding = {
      id: uuidv4(),
      chunk_id: chunkId,
      embedding: mockEmbedding,
      model: 'text-embedding-ada-002',
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase.from('embeddings').insert(testEmbedding);

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
    const testChunk = {
      id: overrides.id || uuidv4(),
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

    const { error } = await this.supabase.from('chunks').insert(testChunk);

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
    const testAIContent = {
      id: overrides.id || uuidv4(),
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

    const { error } = await this.supabase.from('ai_content').insert(testAIContent);

    if (error) {
      throw new Error(`Failed to create test AI content: ${error.message}`);
    }

    return testAIContent;
  }

  // Cleanup helpers
  static async cleanupTestData(): Promise<void> {
    if (this.createdTestIds.length === 0) return;

    // First get all user IDs that need auth cleanup
    const { data: users } = await this.supabase
      .from('users')
      .select('id')
      .in('id', this.createdTestIds);

    const userIds = users?.map((u) => u.id) || [];

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
        await this.supabase.from(table).delete().in('id', this.createdTestIds);
      } catch (error) {
        console.warn(`Warning: Failed to cleanup table ${table}:`, error);
      }
    }

    // Clean up auth users
    for (const userId of userIds) {
      try {
        await this.supabase.auth.admin.deleteUser(userId);
      } catch (error) {
        console.warn(`Warning: Failed to cleanup auth user ${userId}:`, error);
      }
    }

    // Clear the tracked IDs after cleanup
    this.createdTestIds = [];
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
        await this.supabase.from(table).delete().in('id', ids);
      } catch (error) {
        console.warn(`Warning: Failed to cleanup table ${table}:`, error);
      }
    }
  }

  // Query helpers
  static async getTestUser(userId: string): Promise<TestUser | null> {
    const { data, error } = await this.supabase.from('users').select('*').eq('id', userId).single();

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

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  // Database health checks
  static async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('users').select('count').limit(1);

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
