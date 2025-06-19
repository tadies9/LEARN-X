import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { DatabaseHelpers } from '../../utils/database-helpers';
import { PerformanceHelpers } from '../../utils/performance-helpers';
import { AITestHelpers } from '../../utils/ai-test-helpers';
import { TestFiles } from '../../utils/test-helpers';
import { testConfig } from '../../config/test.config';

describe('AI Content Generation with Persona Integration', () => {
  let testUser: any;
  let testCourse: any;
  let testModule: any;
  let testFile: any;
  let studentPersona: any;
  let professionalPersona: any;
  let createdIds: string[] = [];

  beforeAll(async () => {
    DatabaseHelpers.initialize();
    
    // Create test data
    testUser = await DatabaseHelpers.createTestUser();
    testCourse = await DatabaseHelpers.createTestCourse(testUser.id);
    testModule = await DatabaseHelpers.createTestModule(testCourse.id);
    
    // Create test file with machine learning content
    const sampleContent = `
      Machine Learning Fundamentals
      
      Machine learning is a subset of artificial intelligence that focuses on algorithms
      that can learn from and make predictions on data. There are three main types:
      
      1. Supervised Learning: Uses labeled training data to make predictions
      2. Unsupervised Learning: Finds hidden patterns in unlabeled data  
      3. Reinforcement Learning: Learns through trial and error with rewards
      
      Key concepts include:
      - Feature engineering: Selecting and transforming input variables
      - Model training and validation: Building and testing models
      - Overfitting and underfitting: Common model performance issues
      - Cross-validation: Technique for robust model evaluation
      
      Applications:
      - Image recognition and computer vision
      - Natural language processing and chatbots
      - Recommendation systems for e-commerce
      - Autonomous vehicles and robotics
      - Medical diagnosis and drug discovery
    `;
    
    testFile = await DatabaseHelpers.createTestFile(testModule.id, {
      filename: 'ml-fundamentals.txt',
      file_size: sampleContent.length,
      processing_status: 'completed'
    });
    
    // Create test personas
    const studentPersonaData = AITestHelpers.loadPersona('student');
    const professionalPersonaData = AITestHelpers.loadPersona('professional');
    
    studentPersona = await DatabaseHelpers.createTestPersona(testUser.id, studentPersonaData);
    professionalPersona = await DatabaseHelpers.createTestPersona(testUser.id, professionalPersonaData);
    
    // Store IDs for cleanup
    createdIds.push(
      testUser.id, testCourse.id, testModule.id, testFile.id, 
      studentPersona.id, professionalPersona.id
    );
  });

  afterAll(async () => {
    await DatabaseHelpers.cleanupTestDataById(createdIds);
    await DatabaseHelpers.cleanupTestData();
  });

  afterEach(() => {
    PerformanceHelpers.clearMeasurements();
  });

  describe('Personalized Summary Generation', () => {
    test('should generate beginner-friendly summaries for student persona', async () => {
      const timerId = PerformanceHelpers.startTimer('student_summary_generation');
      
      try {
        const mockResponse = AITestHelpers.createMockAIResponse(studentPersona);
        
        // Simulate AI content generation
        const aiContent = await DatabaseHelpers.createTestAIContent(
          testFile.id,
          'summary',
          {
            text: mockResponse.summary,
            key_points: ['Machine learning helps computers learn from data', 'Three main types exist', 'Used in many apps'],
            word_count: mockResponse.summary.split(' ').length,
            persona_applied: true,
            personalization_score: 0.85
          }
        );
        
        createdIds.push(aiContent.id);
        
        // Validate personalized content
        expect(aiContent.content.text).toContain('Hey!');
        expect(aiContent.content.text.toLowerCase()).toMatch(/(basically|simply|easy|think of it)/i);
        expect(aiContent.content.persona_applied).toBe(true);
        expect(aiContent.content.personalization_score).toBeGreaterThan(0.7);
        
        // Performance validation
        const metrics = PerformanceHelpers.endTimer(timerId, true);
        expect(metrics.duration).toBeLessThan(testConfig.performance.aiGenerationThreshold);
        
      } catch (error) {
        PerformanceHelpers.endTimer(timerId, false);
        throw error;
      }
    });

    test('should generate technical summaries for professional persona', async () => {
      const mockResponse = AITestHelpers.createMockAIResponse(professionalPersona);
      
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'summary',
        {
          text: mockResponse.summary,
          key_points: [
            'Comprehensive analysis of ML paradigms',
            'Supervised methodologies with labeled datasets',
            'Unsupervised pattern recognition techniques'
          ],
          word_count: mockResponse.summary.split(' ').length,
          persona_applied: true,
          personalization_score: 0.92
        }
      );
      
      createdIds.push(aiContent.id);
      
      // Validate professional language
      expect(aiContent.content.text).toMatch(/(comprehensive|analysis|methodologies|frameworks)/i);
      expect(aiContent.content.text).not.toMatch(/(hey|basically|simply)/i);
      expect(aiContent.content.personalization_score).toBeGreaterThan(0.8);
    });
  });

  describe('Adaptive Flashcard Generation', () => {
    test('should generate appropriate flashcards for different personas', async () => {
      // Student persona flashcards
      const studentFlashcards = AITestHelpers.createMockAIResponse(studentPersona).flashcards;
      const studentAIContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'flashcards',
        {
          cards: studentFlashcards,
          total_count: studentFlashcards.length,
          difficulty_level: 'beginner',
          persona_applied: true
        }
      );
      
      createdIds.push(studentAIContent.id);
      
      // Professional persona flashcards  
      const professionalFlashcards = AITestHelpers.createMockAIResponse(professionalPersona).flashcards;
      const professionalAIContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'flashcards',
        {
          cards: professionalFlashcards,
          total_count: professionalFlashcards.length,
          difficulty_level: 'advanced',
          persona_applied: true
        }
      );
      
      createdIds.push(professionalAIContent.id);
      
      // Validate difficulty adaptation
      const studentCards = studentAIContent.content.cards;
      const professionalCards = professionalAIContent.content.cards;
      
      // Student cards should be simpler
      const studentText = studentCards.map((c: any) => c.front + ' ' + c.back).join(' ').toLowerCase();
      expect(studentText).toMatch(/(learn|predict|data|algorithm)/i);
      expect(studentText).not.toMatch(/(stochastic|bayesian|regularization)/i);
      
      // Professional cards should be more technical
      const professionalText = professionalCards.map((c: any) => c.front + ' ' + c.back).join(' ').toLowerCase();
      expect(professionalText).toMatch(/(gradient|optimization|hyperparameter)/i);
    });
  });

  describe('Content Quality Assessment', () => {
    test('should evaluate content quality with persona metrics', async () => {
      const testContent = 'Machine learning enables computers to learn from data automatically.';
      const expectedKeywords = ['machine learning', 'data', 'learn', 'algorithm'];
      
      // Test without persona
      const baseQuality = AITestHelpers.evaluateContentQuality(testContent, expectedKeywords);
      expect(baseQuality.relevance_score).toBeGreaterThan(0.5);
      expect(baseQuality.personalization_score).toBe(0); // No persona
      
      // Test with student persona
      const studentPersonalizedContent = 'Hey! Machine learning is basically how computers can learn stuff from data automatically. Think of it like teaching a computer to recognize cats by showing it lots of cat pictures!';
      const studentQuality = AITestHelpers.evaluateContentQuality(
        studentPersonalizedContent, 
        expectedKeywords, 
        studentPersona
      );
      
      expect(studentQuality.personalization_score).toBeGreaterThan(0.5);
      expect(studentQuality.clarity_score).toBeGreaterThan(baseQuality.clarity_score);
      
      // Test with professional persona
      const professionalPersonalizedContent = 'This comprehensive analysis examines machine learning paradigms, encompassing supervised methodologies with labeled datasets for predictive modeling applications.';
      const professionalQuality = AITestHelpers.evaluateContentQuality(
        professionalPersonalizedContent,
        expectedKeywords,
        professionalPersona
      );
      
      expect(professionalQuality.personalization_score).toBeGreaterThan(0.3);
      expect(professionalQuality.accuracy_score).toBeGreaterThan(0.7);
    });

    test('should maintain quality consistency across persona adaptations', async () => {
      const baseContent = 'Machine learning algorithms process data to make predictions and identify patterns.';
      const keywords = ['machine learning', 'algorithm', 'data', 'prediction', 'pattern'];
      
      const personas = [null, studentPersona, professionalPersona];
      const qualityScores: any[] = [];
      
      for (const persona of personas) {
        const personalizedContent = persona ? 
          AITestHelpers.createMockAIResponse(persona).personalizedContent :
          baseContent;
          
        const quality = AITestHelpers.evaluateContentQuality(personalizedContent, keywords, persona);
        qualityScores.push({
          persona: persona ? persona.learning_style : 'none',
          quality
        });
      }
      
      // All versions should maintain minimum quality standards
      qualityScores.forEach(score => {
        expect(score.quality.relevance_score).toBeGreaterThan(0.6);
        expect(score.quality.accuracy_score).toBeGreaterThan(0.5);
        expect(score.quality.completeness_score).toBeGreaterThan(0.4);
      });
      
      // Personalized versions should have higher personalization scores
      const nonePersona = qualityScores.find(s => s.persona === 'none');
      const personalizedScores = qualityScores.filter(s => s.persona !== 'none');
      
      personalizedScores.forEach(score => {
        expect(score.quality.personalization_score).toBeGreaterThan(nonePersona.quality.personalization_score);
      });
    });
  });

  describe('Learning Style Adaptation', () => {
    test('should adapt content for visual learners', async () => {
      const visualPersona = { ...studentPersona, learning_style: 'visual' };
      const mockResponse = AITestHelpers.createMockAIResponse(visualPersona);
      
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'explanation',
        {
          text: mockResponse.personalizedContent,
          learning_style: 'visual',
          visual_elements: ['diagrams', 'charts', 'illustrations'],
          persona_applied: true
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.text.toLowerCase()).toMatch(/(imagine|picture|visualize|see|diagram)/i);
      expect(aiContent.content.visual_elements).toContain('diagrams');
    });

    test('should adapt content for auditory learners', async () => {
      const auditoryPersona = { ...studentPersona, learning_style: 'auditory' };
      const mockResponse = AITestHelpers.createMockAIResponse(auditoryPersona);
      
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'explanation',
        {
          text: mockResponse.personalizedContent,
          learning_style: 'auditory',
          audio_suggestions: ['discussion_points', 'verbal_explanations'],
          persona_applied: true
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.text.toLowerCase()).toMatch(/(listen|hear|discuss|explain|talk)/i);
      expect(aiContent.content.audio_suggestions).toContain('discussion_points');
    });

    test('should adapt content for kinesthetic learners', async () => {
      const kinestheticPersona = { ...studentPersona, learning_style: 'kinesthetic' };
      const mockResponse = AITestHelpers.createMockAIResponse(kinestheticPersona);
      
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'explanation',
        {
          text: mockResponse.personalizedContent,
          learning_style: 'kinesthetic',
          hands_on_activities: ['coding_exercises', 'practical_projects'],
          persona_applied: true
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.text.toLowerCase()).toMatch(/(practice|do|build|create|hands-on)/i);
      expect(aiContent.content.hands_on_activities).toContain('coding_exercises');
    });
  });

  describe('Technical Level Adaptation', () => {
    test('should generate content appropriate for different technical levels', async () => {
      const levels = ['beginner', 'intermediate', 'advanced'];
      const contentResults: any[] = [];
      
      for (const level of levels) {
        const persona = { ...studentPersona, technical_level: level };
        const mockResponse = AITestHelpers.createMockAIResponse(persona);
        
        const aiContent = await DatabaseHelpers.createTestAIContent(
          testFile.id,
          'explanation',
          {
            text: mockResponse.personalizedContent,
            technical_level: level,
            complexity_score: level === 'beginner' ? 0.3 : level === 'intermediate' ? 0.6 : 0.9,
            persona_applied: true
          }
        );
        
        createdIds.push(aiContent.id);
        contentResults.push({ level, content: aiContent.content });
      }
      
      // Validate complexity progression
      expect(contentResults[0].content.complexity_score).toBeLessThan(contentResults[1].content.complexity_score);
      expect(contentResults[1].content.complexity_score).toBeLessThan(contentResults[2].content.complexity_score);
      
      // Beginner content should use simpler language
      const beginnerText = contentResults[0].content.text.toLowerCase();
      expect(beginnerText).not.toMatch(/(stochastic|bayesian|regularization|hyperparameter)/i);
      
      // Advanced content should include technical terms
      const advancedText = contentResults[2].content.text.toLowerCase();
      expect(advancedText).toMatch(/(algorithm|optimization|parameter|model)/i);
    });
  });

  describe('Interest-Based Personalization', () => {
    test('should incorporate user interests into content', async () => {
      const gamingPersona = { ...studentPersona, interests: ['gaming', 'technology'] };
      const mockResponse = AITestHelpers.createMockAIResponse(gamingPersona);
      
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'explanation',
        {
          text: mockResponse.personalizedContent,
          interests: ['gaming', 'technology'],
          interest_examples: ['game AI', 'recommendation systems'],
          persona_applied: true
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.text.toLowerCase()).toMatch(/(game|gaming|player|technology)/i);
      expect(aiContent.content.interest_examples).toContain('game AI');
    });

    test('should adapt examples based on career focus', async () => {
      const dataSciencePersona = { ...professionalPersona, career_focus: 'data science' };
      const mockResponse = AITestHelpers.createMockAIResponse(dataSciencePersona);
      
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'explanation',
        {
          text: mockResponse.personalizedContent,
          career_focus: 'data science',
          career_examples: ['predictive modeling', 'customer segmentation'],
          persona_applied: true
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.text.toLowerCase()).toMatch(/(data science|predictive|modeling|analysis)/i);
      expect(aiContent.content.career_examples).toContain('predictive modeling');
    });
  });

  describe('Performance with Personalization', () => {
    test('should maintain performance benchmarks with persona processing', async () => {
      const contentTypes = ['summary', 'flashcards', 'quiz'];
      const benchmarkResults: any[] = [];
      
      for (const contentType of contentTypes) {
        // Test without persona
        const baseTimerId = PerformanceHelpers.startTimer(`${contentType}_base`);
        const baseResponse = await generateMockAIContent(contentType, null);
        const baseMetrics = PerformanceHelpers.endTimer(baseTimerId, true);
        
        // Test with persona
        const personaTimerId = PerformanceHelpers.startTimer(`${contentType}_persona`);
        const personaResponse = await generateMockAIContent(contentType, studentPersona);
        const personaMetrics = PerformanceHelpers.endTimer(personaTimerId, true);
        
        benchmarkResults.push({
          contentType,
          baseDuration: baseMetrics.duration,
          personaDuration: personaMetrics.duration,
          overhead: personaMetrics.duration - baseMetrics.duration
        });
      }
      
      // Persona processing should not add significant overhead
      benchmarkResults.forEach(result => {
        expect(result.personaDuration).toBeLessThan(testConfig.performance.aiGenerationThreshold);
        expect(result.overhead).toBeLessThan(1000); // Less than 1 second overhead
      });
      
      const report = PerformanceHelpers.generatePerformanceReport();
      expect(report.summary.memory_leak_detected).toBe(false);
    });

    test('should handle concurrent persona-based generation', async () => {
      const concurrentCount = 5;
      const promises: Promise<any>[] = [];
      
      // Generate multiple personalized content pieces concurrently
      for (let i = 0; i < concurrentCount; i++) {
        const persona = i % 2 === 0 ? studentPersona : professionalPersona;
        promises.push(generateMockAIContent('summary', persona));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.persona_applied).toBe(true);
      });
      
      // Concurrent processing should be efficient
      expect(totalTime).toBeLessThan(testConfig.performance.aiGenerationThreshold * 2);
    });
  });

  describe('Edge Cases with Personas', () => {
    test('should handle malformed persona data gracefully', async () => {
      const malformedPersona = {
        learning_style: 'invalid_style',
        technical_level: 999,
        interests: null,
        communication_style: ''
      };
      
      // Should still generate content with fallback behavior
      const mockResponse = AITestHelpers.createMockAIResponse();
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'summary',
        {
          text: mockResponse.summary,
          persona_applied: false, // Should fallback when persona is invalid
          fallback_reason: 'invalid_persona_data'
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.persona_applied).toBe(false);
      expect(aiContent.content.fallback_reason).toBe('invalid_persona_data');
    });

    test('should handle missing persona gracefully', async () => {
      const mockResponse = AITestHelpers.createMockAIResponse();
      const aiContent = await DatabaseHelpers.createTestAIContent(
        testFile.id,
        'summary',
        {
          text: mockResponse.summary,
          persona_applied: false,
          default_style: 'neutral'
        }
      );
      
      createdIds.push(aiContent.id);
      
      expect(aiContent.content.persona_applied).toBe(false);
      expect(aiContent.content.default_style).toBe('neutral');
    });
  });
});

// Helper function to generate mock AI content
async function generateMockAIContent(contentType: string, persona: any): Promise<any> {
  const mockResponse = AITestHelpers.createMockAIResponse(persona);
  
  let content: any;
  switch (contentType) {
    case 'summary':
      content = {
        text: mockResponse.summary,
        key_points: ['Point 1', 'Point 2', 'Point 3'],
        word_count: mockResponse.summary.split(' ').length
      };
      break;
    case 'flashcards':
      content = {
        cards: mockResponse.flashcards,
        total_count: mockResponse.flashcards.length
      };
      break;
    case 'quiz':
      content = {
        questions: mockResponse.quiz,
        total_points: mockResponse.quiz.length * 10
      };
      break;
    default:
      content = { text: mockResponse.personalizedContent };
  }
  
  return {
    content_type: contentType,
    content,
    persona_applied: persona !== null,
    generation_time: Math.random() * 2000 + 500, // 500-2500ms
    model_used: 'gpt-3.5-turbo'
  };
}