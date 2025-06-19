import crypto from 'crypto';
import { UserPersona } from '../../types/persona';
import { logger } from '../../utils/logger';

interface CacheKeyParams {
  service: 'explain' | 'summary' | 'quiz' | 'flashcard' | 'chat' | 'embedding' | 'practice' | 'introduction';
  userId: string;
  contentHash?: string;
  persona?: UserPersona;
  context?: {
    moduleId?: string;
    courseId?: string;
    sessionContext?: string;
    difficulty?: string;
    format?: string;
  };
  additionalParams?: Record<string, any>;
}

interface PersonaDimensions {
  experienceLevel?: string;
  learningStyle?: string;
  communicationTone?: string;
  contentDensity?: string;
  interestProfile?: string;
  pacePreference?: string;
  depthPreference?: string;
}

export class PersonalizedCacheKeyGenerator {
  private readonly VERSION = 'v2'; // Upgraded for enhanced personalization
  private readonly SEPARATOR = ':';
  private readonly MAX_KEY_LENGTH = 250; // Redis key length best practice

  /**
   * Generate a cache key with comprehensive persona dimensions
   */
  generateKey(params: CacheKeyParams): string {
    const parts: string[] = ['ai_cache', this.VERSION, params.service, params.userId];

    // Add persona-based components with all 5 dimensions
    if (params.persona) {
      const personaHash = this.hashPersonaDimensions(params.persona);
      parts.push(personaHash);
    }

    // Add content hash if provided
    if (params.contentHash) {
      parts.push(params.contentHash.substring(0, 12));
    }

    // Add context information
    if (params.context) {
      const contextHash = this.hashContext(params.context);
      parts.push(contextHash);
    }

    // Add additional parameters
    if (params.additionalParams && Object.keys(params.additionalParams).length > 0) {
      const paramHash = this.hashObject(params.additionalParams);
      parts.push(paramHash);
    }

    const key = parts.join(this.SEPARATOR);
    
    // Ensure key doesn't exceed max length
    if (key.length > this.MAX_KEY_LENGTH) {
      logger.warn(`Cache key too long (${key.length} chars), truncating`);
      return this.truncateKey(key);
    }

    return key;
  }

  /**
   * Generate pattern for cache invalidation
   */
  generateInvalidationPattern(params: {
    service?: string;
    userId?: string;
    personaChanged?: boolean;
    contentUpdated?: boolean;
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
      
      // If persona changed, invalidate all user's personalized content
      if (params.personaChanged) {
        parts.push('*');
      }
    } else {
      parts.push('*');
    }

    return parts.join(this.SEPARATOR);
  }

  /**
   * Hash persona dimensions according to CLAUDE.md specifications
   */
  private hashPersonaDimensions(persona: UserPersona): string {
    const dimensions: PersonaDimensions = {
      // Core dimensions from CLAUDE.md
      experienceLevel: persona.technicalLevel || persona.experienceYears?.toString(),
      learningStyle: persona.learningStyle,
      communicationTone: persona.communicationTone,
      contentDensity: persona.contentDensity || persona.explanationDepth,
      
      // Additional personalization factors
      interestProfile: this.hashInterests(persona.primaryInterests || []),
      pacePreference: persona.preferredSessionLength?.toString(),
      depthPreference: persona.explanationDepth,
    };

    // Include professional context for relevance
    const professionalContext = {
      role: persona.currentRole,
      industry: persona.industry,
      goals: persona.careerGoals?.slice(0, 3), // Top 3 goals only
    };

    const combinedDimensions = {
      ...dimensions,
      professional: this.hashObject(professionalContext),
    };

    return this.hashObject(combinedDimensions);
  }

  /**
   * Hash context information for cache key
   */
  private hashContext(context: CacheKeyParams['context']): string {
    const relevantContext = {
      module: context?.moduleId?.substring(0, 8),
      course: context?.courseId?.substring(0, 8),
      session: context?.sessionContext?.substring(0, 16),
      difficulty: context?.difficulty,
      format: context?.format,
    };

    // Remove undefined values
    const cleanContext = Object.fromEntries(
      Object.entries(relevantContext).filter(([_, v]) => v !== undefined)
    );

    return this.hashObject(cleanContext);
  }

  /**
   * Hash user interests for cache key
   */
  private hashInterests(interests: string[]): string {
    if (!interests || interests.length === 0) return 'none';
    
    // Sort and take top 5 interests for consistency
    const topInterests = interests.slice(0, 5).sort();
    return this.hashObject(topInterests);
  }

  /**
   * Create a deterministic hash of an object
   */
  private hashObject(obj: any): string {
    const normalized = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Truncate key while preserving uniqueness
   */
  private truncateKey(key: string): string {
    const parts = key.split(this.SEPARATOR);
    const essentialParts = parts.slice(0, 4); // Keep service info
    const hash = this.hashObject(parts.slice(4)); // Hash the rest
    
    return [...essentialParts, hash].join(this.SEPARATOR);
  }

  /**
   * Extract metadata from cache key for debugging/analytics
   */
  parseKey(key: string): {
    version: string;
    service: string;
    userId: string;
    personaHash?: string;
    contentHash?: string;
    contextHash?: string;
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
        contextHash: parts[6],
      };
    } catch (error) {
      logger.error('Failed to parse cache key:', error);
      return null;
    }
  }

  /**
   * Get TTL based on service type, personalization level, and content stability
   */
  getTTL(service: string, params?: {
    personalizationScore?: number;
    contentStability?: 'stable' | 'moderate' | 'volatile';
    isStreaming?: boolean;
  }): number {
    // Base TTL by service type
    const baseTTL: Record<string, number> = {
      explain: 3600 * 24 * 7,      // 7 days - explanations are stable
      summary: 3600 * 24 * 3,      // 3 days - summaries may change
      quiz: 3600 * 24,             // 1 day - keep fresh for learning
      flashcard: 3600 * 24 * 2,    // 2 days - relatively stable
      practice: 3600 * 12,         // 12 hours - practice should vary
      introduction: 3600 * 24 * 5, // 5 days - introductions are stable
      chat: 3600 * 2,              // 2 hours - conversational context
      embedding: 3600 * 24 * 30,   // 30 days - embeddings are very stable
    };

    let ttl = baseTTL[service] || 3600 * 6; // Default 6 hours

    // Adjust based on content stability
    if (params?.contentStability) {
      const stabilityMultiplier = {
        stable: 1.5,
        moderate: 1.0,
        volatile: 0.5,
      };
      ttl *= stabilityMultiplier[params.contentStability];
    }

    // Reduce TTL for streaming content
    if (params?.isStreaming) {
      ttl = Math.min(ttl, 3600 * 2); // Max 2 hours for streaming
    }

    // Reduce TTL for highly personalized content
    if (params?.personalizationScore && params.personalizationScore > 0.8) {
      ttl = Math.min(ttl, 3600 * 24); // Max 24 hours for highly personalized
    }

    return Math.floor(ttl);
  }

  /**
   * Calculate personalization score based on persona completeness
   */
  calculatePersonalizationScore(persona?: UserPersona): number {
    if (!persona) return 0;

    const weights = {
      technicalLevel: 0.2,
      learningStyle: 0.2,
      communicationTone: 0.15,
      contentDensity: 0.15,
      interests: 0.1,
      goals: 0.1,
      preferences: 0.1,
    };

    let score = 0;
    
    if (persona.technicalLevel) score += weights.technicalLevel;
    if (persona.learningStyle) score += weights.learningStyle;
    if (persona.communicationTone) score += weights.communicationTone;
    if (persona.contentDensity || persona.explanationDepth) score += weights.contentDensity;
    if (persona.primaryInterests?.length > 0) score += weights.interests;
    if (persona.careerGoals && persona.careerGoals.length > 0) score += weights.goals;
    if (persona.preferredSessionLength || persona.dailyLearningTime) score += weights.preferences;

    return Math.min(score, 1.0);
  }
}

export const personalizedCacheKeyGenerator = new PersonalizedCacheKeyGenerator();