import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { testConfig } from '../config/test.config';

// Database helpers
export class TestDatabase {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.TEST_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async cleanup() {
    // Clean up test data
    const tables = ['files', 'chunks', 'embeddings', 'ai_content', 'modules', 'courses', 'users'];

    for (const table of tables) {
      await this.supabase.from(table).delete().like('id', 'test-%');
    }
  }

  async seed() {
    // Seed test data
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;

    // Create auth user first
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const userId = authData.user.id;
    const courseId = uuidv4();
    const moduleId = uuidv4();

    // Create test user profile
    const { error: userError } = await this.supabase.from('users').insert({
      id: userId,
      email,
      full_name: 'Test User',
    });

    if (userError) {
      await this.supabase.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create user profile: ${userError.message}`);
    }

    // Create test course
    await this.supabase.from('courses').insert({
      id: courseId,
      user_id: userId,
      title: 'Test Course',
      description: 'Test course for integration tests',
    });

    // Create test module
    await this.supabase.from('modules').insert({
      id: moduleId,
      course_id: courseId,
      title: 'Test Module',
      description: 'Test module for integration tests',
    });

    return { userId, courseId, moduleId };
  }
}

// Redis helpers
export class TestRedis {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(testConfig.redis.url);
  }

  async cleanup() {
    await this.redis.flushdb();
  }

  async disconnect() {
    await this.redis.quit();
  }
}

// File helpers
export class TestFiles {
  static getSampleFile(filename: string): Buffer {
    const filePath = path.join(testConfig.testData.sampleFilesPath, filename);
    if (existsSync(filePath)) {
      return readFileSync(filePath);
    }
    // Return mock data if file doesn't exist
    return Buffer.from(`Mock content for ${filename}`);
  }

  static createMockFile(content: string, filename: string = 'test.txt'): Express.Multer.File {
    const buffer = Buffer.from(content);
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'text/plain',
      size: buffer.length,
      buffer,
      destination: '',
      filename,
      path: '',
      stream: null as any,
    };
  }

  static createLargeFile(sizeInMB: number = 10): Buffer {
    const size = sizeInMB * 1024 * 1024;
    const content = 'a'.repeat(size);
    return Buffer.from(content);
  }
}

// API helpers
export class TestAPI {
  private baseUrl: string;

  constructor(baseUrl: string = testConfig.api.baseUrl) {
    this.baseUrl = baseUrl;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    moduleId: string,
    authToken: string
  ): Promise<Response> {
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);
    formData.append('module_id', moduleId);

    return fetch(`${this.baseUrl}/api/v1/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });
  }

  async getFileProcessingStatus(fileId: string, authToken: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/v1/files/${fileId}/status`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }
}

// Performance helpers
export class PerformanceTracker {
  private startTime: number;
  private measurements: Map<string, number[]>;

  constructor() {
    this.startTime = Date.now();
    this.measurements = new Map();
  }

  start(name: string): void {
    this.measurements.set(name, [Date.now()]);
  }

  end(name: string): number {
    const times = this.measurements.get(name);
    if (!times || times.length === 0) {
      throw new Error(`No start time found for ${name}`);
    }

    const duration = Date.now() - times[0];
    times.push(Date.now());
    return duration;
  }

  getReport(): Record<string, { duration: number; start: number; end: number }> {
    const report: Record<string, { duration: number; start: number; end: number }> = {};

    this.measurements.forEach((times, name) => {
      if (times.length >= 2) {
        report[name] = {
          duration: times[1] - times[0],
          start: times[0],
          end: times[1],
        };
      }
    });

    return report;
  }
}

// Mock AI responses
export class MockAIResponses {
  static getSummary(): string {
    return `This is a comprehensive summary of the document. It covers the main topics including:
    1. Introduction to the subject matter
    2. Key concepts and definitions
    3. Practical applications
    4. Conclusion and future directions`;
  }

  static getFlashcards(): Array<{ front: string; back: string }> {
    return [
      {
        front: 'What is machine learning?',
        back: 'A subset of AI that enables systems to learn from data',
      },
      { front: 'Define supervised learning', back: 'Learning from labeled training data' },
      {
        front: 'What is a neural network?',
        back: 'A computing system inspired by biological neural networks',
      },
    ];
  }

  static getQuizQuestions(): Array<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  }> {
    return [
      {
        question: 'Which of the following is a type of machine learning?',
        options: ['Supervised', 'Unsupervised', 'Reinforcement', 'All of the above'],
        correct_answer: 3,
        explanation: 'All three are main types of machine learning approaches',
      },
    ];
  }

  static getPersonalizedContent(persona: any): string {
    return `Based on your ${persona.learning_style} learning style and interest in ${persona.interests?.[0] || 'technology'}, 
    here's a personalized explanation of the content...`;
  }
}

// Wait helpers
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError!;
}
