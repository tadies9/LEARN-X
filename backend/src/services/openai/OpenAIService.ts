import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new AppError('OPENAI_API_KEY not configured', 500);
    }

    this.client = new OpenAI({
      apiKey,
    });

    logger.info('OpenAI service initialized');
  }

  getClient(): OpenAI {
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simple test to verify API key works
      const response = await this.client.models.list();
      return response.data.length > 0;
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const openAIService = new OpenAIService();
