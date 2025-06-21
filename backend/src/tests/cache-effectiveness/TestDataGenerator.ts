import { UserPersona } from '../../types/persona';

export interface TestUser {
  userId: string;
  persona: UserPersona;
}

export interface TestContent {
  service: 'explain' | 'summary' | 'quiz';
  content: string;
  expectedTokens: {
    prompt: number;
    completion: number;
  };
}

export class TestDataGenerator {
  static generateTestUsers(): TestUser[] {
    const roles = ['Software Developer', 'Data Scientist', 'Product Manager', 'Student'];
    const industries = ['Technology', 'Healthcare', 'Finance', 'Education'];
    const learningStyles: Array<'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed'> = [
      'visual',
      'auditory',
      'kinesthetic',
      'reading',
    ];

    const testUsers: TestUser[] = [];

    for (let i = 0; i < 20; i++) {
      testUsers.push({
        userId: `test-user-${i}`,
        persona: {
          id: `persona-${i}`,
          userId: `test-user-${i}`,
          currentRole: roles[i % roles.length],
          industry: industries[i % industries.length],
          technicalLevel: i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced',
          primaryInterests: ['programming', 'technology', 'learning'],
          secondaryInterests: ['data analysis', 'web development'],
          learningStyle: learningStyles[i % learningStyles.length],
          communicationTone: i % 2 === 0 ? 'friendly' : 'professional',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return testUsers;
  }

  static generateTestContent(): TestContent[] {
    return [
      {
        service: 'explain',
        content:
          'JavaScript is a programming language that enables interactive web pages and is an essential part of web applications.',
        expectedTokens: { prompt: 150, completion: 300 },
      },
      {
        service: 'summary',
        content:
          'Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data.',
        expectedTokens: { prompt: 120, completion: 200 },
      },
      {
        service: 'quiz',
        content:
          'Python is a high-level, interpreted programming language with dynamic semantics. Its high-level built-in data structures make it attractive for Rapid Application Development.',
        expectedTokens: { prompt: 100, completion: 250 },
      },
    ];
  }

  static generateGenericPersona(): UserPersona {
    return {
      id: 'generic',
      userId: 'generic-user',
      currentRole: 'User',
      industry: 'General',
      technicalLevel: 'intermediate',
      primaryInterests: [],
      secondaryInterests: [],
      learningStyle: 'visual',
      communicationTone: 'professional',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static generateContentHash(content: string): string {
    return require('crypto').createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  static calculateExpectedCost(
    promptTokens: number,
    completionTokens: number,
    _model: string
  ): number {
    // Simplified cost calculation (GPT-4o pricing)
    const promptCost = promptTokens * 0.00001; // $0.01 per 1K tokens
    const completionCost = completionTokens * 0.00003; // $0.03 per 1K tokens
    return promptCost + completionCost;
  }
}