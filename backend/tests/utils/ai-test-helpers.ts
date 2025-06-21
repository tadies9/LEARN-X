import { readFileSync } from 'fs';
import path from 'path';

export interface MockAIResponse {
  summary: string;
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  }>;
  personalizedContent: string;
}

export interface ContentQualityMetrics {
  relevance_score: number;
  clarity_score: number;
  completeness_score: number;
  personalization_score: number;
  accuracy_score: number;
}

export class AITestHelpers {
  private static basePath = path.join(__dirname, '../fixtures');

  static loadPersona(personaName: string): any {
    const personaPath = path.join(this.basePath, 'personas', `${personaName}-persona.json`);
    const content = readFileSync(personaPath, 'utf-8');
    return JSON.parse(content);
  }

  static createMockAIResponse(persona?: any): MockAIResponse {
    const baseResponse = {
      summary: this.generatePersonalizedSummary(persona),
      flashcards: this.generateFlashcards(persona),
      quiz: this.generateQuizQuestions(persona),
      personalizedContent: this.generatePersonalizedContent(persona),
    };

    return baseResponse;
  }

  private static generatePersonalizedSummary(persona?: any): string {
    if (!persona) {
      return 'This document covers machine learning fundamentals including supervised, unsupervised, and reinforcement learning approaches.';
    }

    const style = persona.communication_style || 'casual';
    const level = persona.technical_level || 'beginner';

    if (style === 'professional' && level === 'advanced') {
      return 'This comprehensive analysis examines machine learning paradigms, encompassing supervised methodologies with labeled datasets, unsupervised pattern recognition techniques, and reinforcement learning frameworks optimized through environmental interaction mechanisms.';
    }

    return 'Hey! This document is all about machine learning - basically how computers can learn stuff on their own. It covers the main types like supervised learning (learning from examples with answers), unsupervised learning (finding patterns without answers), and reinforcement learning (learning by trial and error).';
  }

  private static generateFlashcards(persona?: any): Array<{ front: string; back: string }> {
    const baseCards = [
      {
        front: 'What is machine learning?',
        back: 'A subset of AI that enables systems to learn from data without explicit programming.',
      },
      {
        front: 'Define supervised learning',
        back: 'Learning from labeled training data to make predictions on new data.',
      },
      {
        front: 'What is unsupervised learning?',
        back: 'Finding patterns and structures in data without labeled examples.',
      },
    ];

    if (persona?.technical_level === 'advanced') {
      baseCards.push({
        front: 'Explain gradient descent optimization',
        back: 'An iterative optimization algorithm used to minimize cost functions by updating parameters in the direction of steepest descent.',
      });
    }

    return baseCards;
  }

  private static generateQuizQuestions(persona?: any): Array<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  }> {
    const baseQuestions = [
      {
        question: 'Which of the following is a type of machine learning?',
        options: ['Supervised', 'Unsupervised', 'Reinforcement', 'All of the above'],
        correct_answer: 3,
        explanation:
          'All three - supervised, unsupervised, and reinforcement learning - are main types of machine learning approaches.',
      },
    ];

    if (persona?.technical_level === 'advanced') {
      baseQuestions.push({
        question: 'What is the primary purpose of regularization in machine learning?',
        options: [
          'Increase model complexity',
          'Prevent overfitting',
          'Speed up training',
          'Reduce data size',
        ],
        correct_answer: 1,
        explanation:
          'Regularization techniques like L1/L2 regularization help prevent overfitting by adding penalties for model complexity.',
      });
    }

    return baseQuestions;
  }

  private static generatePersonalizedContent(persona?: any): string {
    if (!persona) return 'Standard content explanation without personalization.';

    const interests = persona.interests || [];
    const learningStyle = persona.learning_style || 'visual';
    const careerFocus = persona.career_focus || 'general';

    let content = 'Based on your profile:\n\n';

    if (interests.includes('programming')) {
      content +=
        '🔧 **For Programming**: Think of machine learning like writing smart functions that improve themselves by analyzing data patterns.\n\n';
    }

    if (learningStyle === 'visual') {
      content +=
        '👁️ **Visual Learning**: Imagine machine learning as a pattern recognition system - like teaching a computer to recognize cats in photos by showing it thousands of cat pictures.\n\n';
    }

    if (careerFocus === 'data science') {
      content +=
        "📊 **Data Science Focus**: In your field, you'll primarily use supervised learning for predictive modeling, unsupervised learning for customer segmentation, and feature engineering for improved model performance.\n\n";
    }

    return content;
  }

  static evaluateContentQuality(
    content: string,
    expectedKeywords: string[],
    persona?: any
  ): ContentQualityMetrics {
    const relevanceScore = this.calculateRelevanceScore(content, expectedKeywords);
    const clarityScore = this.calculateClarityScore(content);
    const completenessScore = this.calculateCompletenessScore(content, expectedKeywords);
    const personalizationScore = this.calculatePersonalizationScore(content, persona);
    const accuracyScore = this.calculateAccuracyScore(content);

    return {
      relevance_score: relevanceScore,
      clarity_score: clarityScore,
      completeness_score: completenessScore,
      personalization_score: personalizationScore,
      accuracy_score: accuracyScore,
    };
  }

  private static calculateRelevanceScore(content: string, keywords: string[]): number {
    const lowerContent = content.toLowerCase();
    const foundKeywords = keywords.filter((keyword) =>
      lowerContent.includes(keyword.toLowerCase())
    );
    return foundKeywords.length / keywords.length;
  }

  private static calculateClarityScore(content: string): number {
    // Simple heuristic: shorter sentences and common words indicate better clarity
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

    // Normalize score (shorter sentences = higher clarity, up to a point)
    const optimalLength = 100;
    const clarityScore = Math.max(
      0,
      1 - Math.abs(avgSentenceLength - optimalLength) / optimalLength
    );
    return Math.min(1, clarityScore);
  }

  private static calculateCompletenessScore(content: string, expectedKeywords: string[]): number {
    // Check if content covers all expected topics
    const coverage = this.calculateRelevanceScore(content, expectedKeywords);
    const lengthFactor = Math.min(1, content.length / 500); // Assume 500 chars minimum for complete content
    return (coverage + lengthFactor) / 2;
  }

  private static calculatePersonalizationScore(content: string, persona?: any): number {
    if (!persona) return 0;

    let score = 0;
    const lowerContent = content.toLowerCase();

    // Check for persona-specific elements
    if (persona.interests) {
      const interestMatches = persona.interests.filter((interest: string) =>
        lowerContent.includes(interest.toLowerCase())
      );
      score += (interestMatches.length / persona.interests.length) * 0.3;
    }

    if (persona.communication_style === 'casual' && lowerContent.includes('hey')) {
      score += 0.2;
    }

    if (persona.communication_style === 'professional' && lowerContent.includes('comprehensive')) {
      score += 0.2;
    }

    if (persona.learning_style === 'visual' && lowerContent.includes('imagine')) {
      score += 0.3;
    }

    return Math.min(1, score);
  }

  private static calculateAccuracyScore(content: string): number {
    // Simple heuristic for accuracy - check for common machine learning terms and concepts
    const accurateTerms = [
      'supervised learning',
      'unsupervised learning',
      'reinforcement learning',
      'training data',
      'model',
      'algorithm',
      'prediction',
      'pattern',
    ];

    const lowerContent = content.toLowerCase();
    const foundTerms = accurateTerms.filter((term) => lowerContent.includes(term));

    return foundTerms.length / accurateTerms.length;
  }

  static createLargeTextContent(sizeInKB: number = 100): string {
    const baseText =
      'Machine learning is a powerful technology that enables computers to learn from data. ';
    const targetSize = sizeInKB * 1024;
    let content = '';

    while (content.length < targetSize) {
      content +=
        baseText + `Section ${Math.floor(content.length / 1000) + 1}: ${baseText.repeat(10)}`;
    }

    return content.substring(0, targetSize);
  }

  static createMalformedContent(): Array<{ content: string; type: string }> {
    return [
      { content: '', type: 'empty' },
      { content: '   \n\t   ', type: 'whitespace_only' },
      { content: '🚀🌟💫✨🎉🔥💯', type: 'emoji_only' },
      { content: 'a'.repeat(50000), type: 'extremely_long_single_word' },
      { content: '{{invalid json}}', type: 'invalid_json' },
      { content: '<script>alert("xss")</script>', type: 'potential_xss' },
      { content: 'SELECT * FROM users; DROP TABLE users;', type: 'sql_injection_attempt' },
    ];
  }
}

export default AITestHelpers;
