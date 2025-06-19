import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseHelpers } from '../../utils/database-helpers';
import { AITestHelpers } from '../../utils/ai-test-helpers';
import { TestFiles } from '../../utils/test-helpers';

describe('AI Content Generation Integration Tests', () => {
  let testUser: any;
  let testCourse: any;
  let testModule: any;
  let testFile: any;
  let createdIds: string[] = [];

  beforeAll(async () => {
    DatabaseHelpers.initialize();
    
    testUser = await DatabaseHelpers.createTestUser();
    testCourse = await DatabaseHelpers.createTestCourse(testUser.id);
    testModule = await DatabaseHelpers.createTestModule(testCourse.id);
    
    // Create a test file for AI content generation
    testFile = await DatabaseHelpers.createTestFile(testModule.id, {
      filename: 'machine-learning-basics.txt',
      content: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models...',
      processing_status: 'completed'
    });
    
    createdIds.push(testUser.id, testCourse.id, testModule.id, testFile.id);
  });

  afterAll(async () => {
    await DatabaseHelpers.cleanupTestDataById(createdIds);
    await DatabaseHelpers.cleanupTestData();
  });

  beforeEach(async () => {
    // Clear any cached AI responses
    await AITestHelpers.clearCache();
  });

  describe('Content Generation with Personas', () => {
    test('should generate personalized content for beginner persona', async () => {
      const beginnerPersona = await AITestHelpers.createTestPersona({
        experience_level: 'beginner',
        learning_style: 'visual',
        goals: ['understanding_fundamentals']
      });
      
      createdIds.push(beginnerPersona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: testFile.id,
        persona: beginnerPersona,
        contentType: 'explanation',
        userId: testUser.id
      });

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
      
      const content = response.content;
      expect(content.explanation).toBeDefined();
      expect(content.explanation.length).toBeGreaterThan(100);
      expect(content.difficulty_level).toBe('beginner');
      expect(content.visual_aids).toBeDefined();
      expect(Array.isArray(content.visual_aids.suggested_diagrams)).toBe(true);
    });

    test('should generate different content for advanced persona', async () => {
      const advancedPersona = await AITestHelpers.createTestPersona({
        experience_level: 'advanced',
        learning_style: 'analytical',
        goals: ['deep_understanding', 'practical_application']
      });
      
      createdIds.push(advancedPersona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: testFile.id,
        persona: advancedPersona,
        contentType: 'explanation',
        userId: testUser.id
      });

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
      
      const content = response.content;
      expect(content.explanation).toBeDefined();
      expect(content.difficulty_level).toBe('advanced');
      expect(content.technical_depth).toBeGreaterThan(0.7);
      expect(content.practical_examples).toBeDefined();
      expect(Array.isArray(content.practical_examples)).toBe(true);
    });
  });

  describe('Different Content Types', () => {
    test('should generate summary content', async () => {
      const persona = await AITestHelpers.createTestPersona({
        experience_level: 'intermediate'
      });
      
      createdIds.push(persona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: testFile.id,
        persona: persona,
        contentType: 'summary',
        userId: testUser.id
      });

      expect(response.success).toBe(true);
      const content = response.content;
      
      expect(content.summary).toBeDefined();
      expect(content.key_points).toBeDefined();
      expect(Array.isArray(content.key_points)).toBe(true);
      expect(content.key_points.length).toBeGreaterThan(3);
      expect(content.summary.length).toBeLessThan(content.key_points.join(' ').length);
    });

    test('should generate quiz content', async () => {
      const persona = await AITestHelpers.createTestPersona({
        experience_level: 'intermediate',
        preferred_assessment: 'multiple_choice'
      });
      
      createdIds.push(persona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: testFile.id,
        persona: persona,
        contentType: 'quiz',
        userId: testUser.id,
        options: { questionCount: 3 }
      });

      expect(response.success).toBe(true);
      const content = response.content;
      
      expect(content.questions).toBeDefined();
      expect(Array.isArray(content.questions)).toBe(true);
      expect(content.questions.length).toBe(3);
      
      content.questions.forEach((question: any) => {
        expect(question.question).toBeDefined();
        expect(question.options).toBeDefined();
        expect(Array.isArray(question.options)).toBe(true);
        expect(question.options.length).toBe(4);
        expect(question.correct_answer).toBeDefined();
        expect(question.explanation).toBeDefined();
      });
    });

    test('should generate flashcard content', async () => {
      const persona = await AITestHelpers.createTestPersona({
        experience_level: 'beginner',
        learning_style: 'visual'
      });
      
      createdIds.push(persona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: testFile.id,
        persona: persona,
        contentType: 'flashcards',
        userId: testUser.id,
        options: { cardCount: 5 }
      });

      expect(response.success).toBe(true);
      const content = response.content;
      
      expect(content.flashcards).toBeDefined();
      expect(Array.isArray(content.flashcards)).toBe(true);
      expect(content.flashcards.length).toBe(5);
      
      content.flashcards.forEach((card: any) => {
        expect(card.front).toBeDefined();
        expect(card.back).toBeDefined();
        expect(card.front.length).toBeGreaterThan(0);
        expect(card.back.length).toBeGreaterThan(0);
      });
    });

    test('should generate outline content', async () => {
      const persona = await AITestHelpers.createTestPersona({
        experience_level: 'intermediate',
        learning_style: 'structured'
      });
      
      createdIds.push(persona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: testFile.id,
        persona: persona,
        contentType: 'outline',
        userId: testUser.id
      });

      expect(response.success).toBe(true);
      const content = response.content;
      
      expect(content.content).toBeDefined();
      expect(content.content).toContain('I.');
      expect(content.content).toContain('II.');
      expect(content.metadata.format).toBe('outline');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent file gracefully', async () => {
      const persona = await AITestHelpers.createTestPersona({});
      createdIds.push(persona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: 'non-existent-file-id',
        persona: persona,
        contentType: 'summary',
        userId: testUser.id
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      const error = response.error;
      expect(error.error).toContain('File not found');
    });

    test('should handle empty file content', async () => {
      // Create an empty file
      const emptyFileResponse = await DatabaseHelpers.createTestFile(testModule.id, {
        filename: 'empty.txt',
        content: '',
        processing_status: 'completed'
      });
      const emptyFileId = emptyFileResponse.id;
      createdIds.push(emptyFileId);

      const persona = await AITestHelpers.createTestPersona({});
      createdIds.push(persona.id);

      const response = await AITestHelpers.generateAIContent({
        fileId: emptyFileId,
        persona: persona,
        contentType: 'summary',
        userId: testUser.id
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      const error = response.error;
      expect(error.error).toContain('Insufficient content');
    });
  });

  describe('Performance and Caching', () => {
    test('should cache AI responses for identical requests', async () => {
      const persona = await AITestHelpers.createTestPersona({
        experience_level: 'intermediate'
      });
      createdIds.push(persona.id);

      const requestParams = {
        fileId: testFile.id,
        persona: persona,
        contentType: 'summary' as const,
        userId: testUser.id
      };

      // First request
      const startTime1 = Date.now();
      const response1 = await AITestHelpers.generateAIContent(requestParams);
      const duration1 = Date.now() - startTime1;

      expect(response1.success).toBe(true);

      // Second identical request (should be cached)
      const startTime2 = Date.now();
      const response2 = await AITestHelpers.generateAIContent(requestParams);
      const duration2 = Date.now() - startTime2;

      expect(response2.success).toBe(true);
      expect(response2.content).toEqual(response1.content);
      expect(duration2).toBeLessThan(duration1); // Cached response should be faster
    });

    test('should handle concurrent AI generation requests', async () => {
      const persona = await AITestHelpers.createTestPersona({});
      createdIds.push(persona.id);

      const requests = Array.from({ length: 5 }, (_, i) => 
        AITestHelpers.generateAIContent({
          fileId: testFile.id,
          persona: persona,
          contentType: 'summary',
          userId: testUser.id,
          options: { requestId: `concurrent-${i}` }
        })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.content).toBeDefined();
      });

      // All successful responses should have similar content structure
      const successfulResponses = responses.filter(r => r.success);
      expect(successfulResponses.length).toBe(5);
    });
  });
});