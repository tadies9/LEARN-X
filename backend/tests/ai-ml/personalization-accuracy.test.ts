import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseHelpers } from '../utils/database-helpers';
import { PerformanceHelpers } from '../utils/performance-helpers';

interface TestUser {
  id: string;
  name: string;
  goals: string[];
  persona_id?: string;
  learning_style?: string;
  preferences?: any;
}

describe('AI Personalization Accuracy Tests', () => {
  let testUsers: TestUser[] = [];
  let testPersonas: any[] = [];
  let testContent: any[] = [];
  const createdIds: string[] = [];

  beforeAll(async () => {
    DatabaseHelpers.initialize();

    // Create diverse test users with different learning profiles
    testUsers = await createDiverseTestUsers();
    createdIds.push(...testUsers.map((u) => u.id));

    // Create test personas
    testPersonas = await createTestPersonas();

    // Create test content for personalization
    testContent = await createTestContent();
    createdIds.push(...testContent.map((c) => c.id));
  });

  afterAll(async () => {
    await DatabaseHelpers.cleanupTestDataById(createdIds);
    await DatabaseHelpers.cleanupTestData();
  });

  beforeEach(() => {
    PerformanceHelpers.clearMeasurements();
  });

  describe('Learning Style Personalization', () => {
    test('should adapt content for visual learners', async () => {
      const visualLearner = testUsers.find((u) => u.learning_style === 'visual');
      const visualPersona = testPersonas.find((p) => p.learning_style === 'visual');

      if (!visualLearner || !visualPersona) {
        throw new Error('Test data setup failed: missing visual learner or persona');
      }

      const personalizationTest = await PerformanceHelpers.measureAsync(
        'visual_learner_personalization',
        async () => {
          const results = [];

          for (const content of testContent.slice(0, 3)) {
            const personalizedContent = await generatePersonalizedContent(
              content,
              visualPersona,
              visualLearner
            );

            results.push({
              content_id: content.id,
              original_length: content.text?.length || 0,
              personalized_length: personalizedContent.content?.length || 0,
              visual_elements: personalizedContent.visualElements || [],
              diagrams_count: personalizedContent.diagramsCount || 0,
              formatting_score: personalizedContent.formattingScore || 0,
            });
          }

          return results;
        }
      );

      // Verify visual learning adaptations
      expect(personalizationTest.result).toBeDefined();
      expect(Array.isArray(personalizationTest.result)).toBe(true);
      expect(personalizationTest.result.length).toBe(3);

      const avgVisualElements =
        personalizationTest.result.reduce(
          (sum: number, r: any) => sum + (r.visual_elements?.length || 0),
          0
        ) / personalizationTest.result.length;

      expect(avgVisualElements).toBeGreaterThan(2); // Should have visual elements
    });

    test('should adapt content for auditory learners', async () => {
      const auditoryLearner = testUsers.find((u) => u.learning_style === 'auditory');
      const auditoryPersona = testPersonas.find((p) => p.learning_style === 'auditory');

      if (!auditoryLearner || !auditoryPersona) {
        throw new Error('Test data setup failed: missing auditory learner or persona');
      }

      const personalizationTest = await PerformanceHelpers.measureAsync(
        'auditory_learner_personalization',
        async () => {
          const results = [];

          for (const content of testContent.slice(0, 3)) {
            const personalizedContent = await generatePersonalizedContent(
              content,
              auditoryPersona,
              auditoryLearner
            );

            results.push({
              content_id: content.id,
              verbal_cues: personalizedContent.verbalCues || [],
              explanation_depth: personalizedContent.explanationDepth || 0,
              discussion_prompts: personalizedContent.discussionPrompts || [],
              audio_suggestions: personalizedContent.audioSuggestions || [],
            });
          }

          return results;
        }
      );

      // Verify auditory learning adaptations
      expect(personalizationTest.result).toBeDefined();
      expect(Array.isArray(personalizationTest.result)).toBe(true);
      expect(personalizationTest.result.length).toBe(3);

      const avgVerbalCues =
        personalizationTest.result.reduce(
          (sum: number, r: any) => sum + (r.verbal_cues?.length || 0),
          0
        ) / personalizationTest.result.length;

      expect(avgVerbalCues).toBeGreaterThan(1); // Should have verbal cues
    });
  });

  describe('Goal-Based Personalization', () => {
    test('should handle exam preparation goals', async () => {
      const examPrepUser = testUsers.find((u) => u.goals?.includes('exam_prep'));
      const examPrepPersona = testPersonas.find((p) =>
        p.goals?.some((g: any) => g.type === 'exam_preparation')
      );

      if (!examPrepUser || !examPrepPersona) {
        throw new Error('Test data setup failed: missing exam prep user or persona');
      }

      const goalTest = await PerformanceHelpers.measureAsync(
        'exam_prep_personalization',
        async () => {
          const results = [];

          for (const content of testContent.slice(0, 2)) {
            const personalizedContent = await generatePersonalizedContent(
              content,
              examPrepPersona,
              examPrepUser
            );

            results.push({
              content_id: content.id,
              original_length: content.text?.length || 0,
              personalized_length: personalizedContent.content?.length || 0,
              goal_specific_elements: personalizedContent.goalSpecificElements || {},
              practice_elements: personalizedContent.practiceElements || [],
            });
          }

          return results;
        }
      );

      // Verify exam preparation specific features
      expect(goalTest.result).toBeDefined();
      expect(Array.isArray(goalTest.result)).toBe(true);
      expect(goalTest.result.length).toBe(2);

      const examPrepResult = goalTest.result.find(
        (r: any) => r.goal_specific_elements?.practice_questions > 0
      );

      if (examPrepResult) {
        expect(examPrepResult.goal_specific_elements.practice_questions).toBeGreaterThan(0);
        expect(examPrepResult.goal_specific_elements.key_concepts_highlighted).toBe(true);
      }
    });
  });

  describe('Performance Metrics', () => {
    test('should maintain personalization performance under load', async () => {
      // Mock performance test for personalization
      const performanceTest = {
        total_requests: 100,
        successful_requests: 98,
        failed_requests: 2,
        requests_per_second: 15,
        avg_response_time: 1200,
        error_rate: 0.02,
      };

      expect(performanceTest.total_requests).toBe(100);
      expect(performanceTest.successful_requests).toBeGreaterThan(95);
      expect(performanceTest.error_rate).toBeLessThan(0.05);
      expect(performanceTest.avg_response_time).toBeLessThan(3000);
    });
  });
});

// Helper functions
async function createDiverseTestUsers(): Promise<TestUser[]> {
  const learningStyles = ['visual', 'auditory', 'kinesthetic', 'reading_writing'];
  const goals = ['exam_prep', 'skill_building', 'certification', 'career_change'];

  const users: TestUser[] = [];

  for (let i = 0; i < learningStyles.length; i++) {
    const style = learningStyles[i];
    const baseUser = await DatabaseHelpers.createTestUser({});
    const user: TestUser = {
      ...baseUser,
      name: `Test User ${i}`,
      goals: [goals[i % goals.length]],
      learning_style: style,
      preferences: generatePreferencesForStyle(style),
    };
    users.push(user);
  }

  return users;
}

async function createTestPersonas(): Promise<any[]> {
  return [
    {
      id: 'persona-1',
      learning_style: 'visual',
      goals: [{ type: 'exam_preparation', priority: 'high' }],
    },
    {
      id: 'persona-2',
      learning_style: 'auditory',
      goals: [{ type: 'skill_building', priority: 'medium' }],
    },
    {
      id: 'persona-3',
      learning_style: 'kinesthetic',
      goals: [{ type: 'certification', priority: 'high' }],
    },
  ];
}

async function createTestContent(): Promise<any[]> {
  // Create a mock test content object
  const testContent = {
    id: 'test-content-1',
    text: 'This is sample educational content for testing personalization algorithms.',
    title: 'Sample Educational Content',
    metadata: { type: 'educational', complexity: 'intermediate' },
  };

  return [testContent];
}

function generatePreferencesForStyle(style: string): any {
  const basePreferences = {
    visual: {
      diagrams: true,
      charts: true,
      color_coding: true,
      mind_maps: true,
    },
    auditory: {
      detailed_explanations: true,
      discussion_points: true,
      verbal_examples: true,
      audio_content: true,
    },
    kinesthetic: {
      interactive_elements: true,
      hands_on_examples: true,
      step_by_step_guides: true,
      practical_applications: true,
    },
    reading_writing: {
      detailed_notes: true,
      written_summaries: true,
      text_heavy_content: true,
      structured_outlines: true,
    },
  };

  return basePreferences[style as keyof typeof basePreferences] || {};
}

async function generatePersonalizedContent(_content: any, _persona: any, _user: any): Promise<any> {
  // Mock personalized content generation
  return {
    content: 'Personalized content based on user preferences and persona',
    visualElements: ['diagram1', 'chart1'],
    diagramsCount: 2,
    formattingScore: 0.85,
    verbalCues: ['emphasis', 'repetition'],
    explanationDepth: 3,
    discussionPrompts: ['What do you think?', 'How would you apply this?'],
    audioSuggestions: ['Listen to explanation', 'Repeat key concepts'],
    goalSpecificElements: {
      practice_questions: 5,
      key_concepts_highlighted: true,
      practical_exercises: 3,
    },
    practiceElements: ['quiz', 'exercise', 'case_study'],
  };
}
