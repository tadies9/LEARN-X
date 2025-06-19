import { encoding_for_model, TiktokenModel } from 'tiktoken';
import { logger } from '../../utils/logger';

export class TokenCounter {
  private static encodings = new Map<string, any>();

  static getEncoding(model: string = 'gpt-4o'): any {
    if (!this.encodings.has(model)) {
      try {
        // Map model names to tiktoken model names
        const tiktokenModel = this.mapToTiktokenModel(model);
        const encoding = encoding_for_model(tiktokenModel);
        this.encodings.set(model, encoding);
      } catch (error) {
        logger.error(`Failed to get encoding for model ${model}:`, error);
        // Fallback to gpt-4 encoding
        const fallback = encoding_for_model('gpt-4');
        this.encodings.set(model, fallback);
      }
    }
    return this.encodings.get(model);
  }

  static countTokens(text: string, model: string = 'gpt-4o'): number {
    try {
      const encoding = this.getEncoding(model);
      const tokens = encoding.encode(text);
      return tokens.length;
    } catch (error) {
      logger.error('Token counting failed:', error);
      // Rough estimate: ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Estimate tokens for a text input
   * Alias for countTokens for backward compatibility
   */
  static estimateTokens(text: string, model: string = 'gpt-4o'): number {
    return this.countTokens(text, model);
  }

  static estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: string = 'gpt-4o'
  ): number {
    // Prices per 1K tokens (as of the model date)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4o': { prompt: 0.01, completion: 0.03 },
      'gpt-4o-mini': { prompt: 0.002, completion: 0.006 },
      'text-embedding-3-small': { prompt: 0.00002, completion: 0 },
      'text-embedding-3-large': { prompt: 0.00013, completion: 0 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o'];
    const promptCost = (promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000) * modelPricing.completion;

    return promptCost + completionCost;
  }

  private static mapToTiktokenModel(model: string): TiktokenModel {
    // Map our model names to tiktoken model names
    const modelMap: Record<string, TiktokenModel> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'text-embedding-3-small': 'text-embedding-ada-002', // Use ada for embeddings
      'text-embedding-3-large': 'text-embedding-ada-002',
    };

    return modelMap[model] || 'gpt-4';
  }

  static cleanup(): void {
    // Free encodings to prevent memory leaks
    this.encodings.forEach((encoding) => {
      if (encoding && encoding.free) {
        encoding.free();
      }
    });
    this.encodings.clear();
  }
}

// Cleanup on process exit
process.on('exit', () => {
  TokenCounter.cleanup();
});
