import crypto from 'crypto';
import { UserPersona } from '../../types/persona';
import { logger } from '../../utils/logger';

export class CacheKeyGenerator {
  private readonly VERSION = 'v1';
  private readonly SEPARATOR = ':';

  /**
   * Generate a cache key with proper versioning and namespacing
   */
  generateKey(params: {
    service: 'explain' | 'summary' | 'quiz' | 'flashcard' | 'chat' | 'embedding';
    userId: string;
    contentHash?: string;
    persona?: UserPersona;
    additionalParams?: Record<string, any>;
  }): string {
    const parts = ['ai_cache', this.VERSION, params.service, params.userId];

    // Add persona-based components
    if (params.persona) {
      const personaHash = this.hashPersona(params.persona);
      parts.push(personaHash);
    }

    // Add content hash if provided
    if (params.contentHash) {
      parts.push(params.contentHash.substring(0, 8));
    }

    // Add additional parameters
    if (params.additionalParams && Object.keys(params.additionalParams).length > 0) {
      const paramHash = this.hashObject(params.additionalParams);
      parts.push(paramHash);
    }

    return parts.join(this.SEPARATOR);
  }

  /**
   * Generate pattern for cache invalidation
   */
  generateInvalidationPattern(params: {
    service?: string;
    userId?: string;
    all?: boolean;
  }): string {
    if (params.all) {
      return 'ai_cache:*';
    }

    const parts = ['ai_cache', this.VERSION];

    if (params.service) {
      parts.push(params.service);
    } else {
      parts.push('*');
    }

    if (params.userId) {
      parts.push(params.userId);
      parts.push('*');
    } else {
      parts.push('*');
    }

    return parts.join(this.SEPARATOR);
  }

  /**
   * Hash persona attributes for cache key
   */
  private hashPersona(persona: UserPersona): string {
    const relevantFields = {
      learningStyle: persona.learningStyle,
      experienceLevel: persona.technicalLevel,
      currentRole: persona.currentRole,
      industry: persona.industry,
      primaryInterests: persona.primaryInterests || [],
      preferences: {
        contentDensity: persona.contentDensity,
        explanationDepth: persona.explanationDepth,
        preferredSessionLength: persona.preferredSessionLength,
      },
    };

    return this.hashObject(relevantFields);
  }

  /**
   * Create a deterministic hash of an object
   */
  private hashObject(obj: any): string {
    const normalized = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 12);
  }

  /**
   * Extract metadata from cache key
   */
  parseKey(key: string): {
    version: string;
    service: string;
    userId: string;
    personaHash?: string;
    contentHash?: string;
  } | null {
    try {
      const parts = key.split(this.SEPARATOR);
      if (parts.length < 4 || parts[0] !== 'ai_cache') {
        return null;
      }

      return {
        version: parts[1],
        service: parts[2],
        userId: parts[3],
        personaHash: parts[4],
        contentHash: parts[5],
      };
    } catch (error) {
      logger.error('Failed to parse cache key:', error);
      return null;
    }
  }

  /**
   * Get TTL based on service type and content
   */
  getTTL(service: string, params?: any): number {
    const ttlMap: Record<string, number> = {
      explain: 3600 * 24 * 7, // 7 days - explanations are stable
      summary: 3600 * 24 * 3, // 3 days - summaries may change with context
      quiz: 3600 * 24, // 1 day - keep fresh for learning
      flashcard: 3600 * 24, // 1 day
      chat: 3600 * 2, // 2 hours - conversational context changes
      embedding: 3600 * 24 * 30, // 30 days - embeddings are stable
    };

    // Adjust TTL based on parameters
    let ttl = ttlMap[service] || 3600;

    // Reduce TTL for streaming content
    if (params?.stream) {
      ttl = Math.min(ttl, 3600); // Max 1 hour for streaming
    }

    // Reduce TTL for highly personalized content
    if (params?.personalizationScore && params.personalizationScore > 0.8) {
      ttl = Math.min(ttl, 3600 * 12); // Max 12 hours for highly personalized
    }

    return ttl;
  }
}

export const cacheKeyGenerator = new CacheKeyGenerator();
