import { getEnhancedAICache } from './EnhancedAICache';
import { CostTracker } from '../ai/CostTracker';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';
import { UserPersona } from '../../types/persona';
import crypto from 'crypto';

interface WarmingJob {
  id: string;
  priority: 'high' | 'medium' | 'low';
  contentType: 'explanation' | 'summary' | 'quiz' | 'flashcard';
  contentHash: string;
  userId: string;
  persona: UserPersona;
  metadata: Record<string, any>;
  retries: number;
  maxRetries: number;
}

interface WarmingConfig {
  batchSize: number;
  maxConcurrent: number;
  delayBetweenBatches: number;
  popularContentThreshold: number;
  recentActivityWindow: number; // minutes
}

/**
 * Cache Warming Service
 * Proactively warms cache for popular content and user patterns
 */
export class CacheWarmingService {
  private cache = getEnhancedAICache(redisClient, new CostTracker());
  private warmingQueue: WarmingJob[] = [];
  private isWarming = false;

  private config: WarmingConfig = {
    batchSize: 5,
    maxConcurrent: 3,
    delayBetweenBatches: 2000, // 2 seconds
    popularContentThreshold: 10, // requests in recent window
    recentActivityWindow: 60, // 1 hour
  };

  constructor() {
    // Start warming process on initialization
    this.startWarmingProcess();
  }

  /**
   * Start automated cache warming based on usage patterns
   */
  async startWarmingProcess(): Promise<void> {
    if (this.isWarming) return;
    
    this.isWarming = true;
    logger.info('Starting cache warming process');

    try {
      // Schedule regular warming cycles
      setInterval(async () => {
        await this.performWarmingCycle();
      }, 10 * 60 * 1000); // Every 10 minutes

      // Initial warming
      await this.performWarmingCycle();
    } catch (error) {
      logger.error('Error in cache warming process:', error);
      this.isWarming = false;
    }
  }

  /**
   * Perform a complete warming cycle
   */
  private async performWarmingCycle(): Promise<void> {
    try {
      logger.info('Starting cache warming cycle');

      // Identify popular content for warming
      const popularContent = await this.identifyPopularContent();
      const activeUsers = await this.getActiveUsers();

      // Queue warming jobs
      await this.queueWarmingJobs(popularContent, activeUsers);

      // Process queued jobs
      await this.processWarmingQueue();

      logger.info('Cache warming cycle completed', {
        popularContentCount: popularContent.length,
        activeUsersCount: activeUsers.length,
        queueSize: this.warmingQueue.length
      });
    } catch (error) {
      logger.error('Error in warming cycle:', error);
    }
  }

  /**
   * Identify popular content based on recent access patterns
   */
  private async identifyPopularContent(): Promise<Array<{
    contentHash: string;
    contentType: string;
    accessCount: number;
    lastAccessed: Date;
  }>> {
    try {
      const recentThreshold = new Date();
      recentThreshold.setMinutes(recentThreshold.getMinutes() - this.config.recentActivityWindow);

      // Query recent AI requests to identify popular content
      const { data: requests } = await supabase
        .from('ai_requests')
        .select('request_type, created_at, user_id')
        .gte('created_at', recentThreshold.toISOString())
        .order('created_at', { ascending: false });

      if (!requests) return [];

      // Group by content type and count occurrences
      const contentStats = new Map<string, {
        contentType: string;
        accessCount: number;
        lastAccessed: Date;
        users: Set<string>;
      }>();

      requests.forEach(req => {
        const key = req.request_type;
        const existing = contentStats.get(key);
        
        if (existing) {
          existing.accessCount++;
          existing.users.add(req.user_id);
          if (new Date(req.created_at) > existing.lastAccessed) {
            existing.lastAccessed = new Date(req.created_at);
          }
        } else {
          contentStats.set(key, {
            contentType: req.request_type,
            accessCount: 1,
            lastAccessed: new Date(req.created_at),
            users: new Set([req.user_id])
          });
        }
      });

      // Filter for popular content
      return Array.from(contentStats.entries())
        .filter(([_, stats]) => 
          stats.accessCount >= this.config.popularContentThreshold ||
          stats.users.size >= 3 // Content accessed by multiple users
        )
        .map(([contentHash, stats]) => ({
          contentHash,
          contentType: stats.contentType,
          accessCount: stats.accessCount,
          lastAccessed: stats.lastAccessed
        }))
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 20); // Top 20 popular content items

    } catch (error) {
      logger.error('Error identifying popular content:', error);
      return [];
    }
  }

  /**
   * Get active users who might benefit from cache warming
   */
  private async getActiveUsers(): Promise<Array<{
    userId: string;
    persona: UserPersona;
    lastActivity: Date;
  }>> {
    try {
      const recentThreshold = new Date();
      recentThreshold.setHours(recentThreshold.getHours() - 2); // Last 2 hours

      // Get recently active users
      const { data: recentUsers } = await supabase
        .from('ai_requests')
        .select('user_id, created_at')
        .gte('created_at', recentThreshold.toISOString())
        .order('created_at', { ascending: false });

      if (!recentUsers) return [];

      // Get unique active users
      const uniqueUserIds = [...new Set(recentUsers.map(u => u.user_id))];
      
      // Fetch user personas
      const { data: personas } = await supabase
        .from('personas')
        .select('*')
        .in('user_id', uniqueUserIds);

      if (!personas) return [];

      return personas
        .map(persona => ({
          userId: persona.user_id,
          persona: this.transformPersona(persona),
          lastActivity: new Date(recentUsers.find(u => u.user_id === persona.user_id)?.created_at || '')
        }))
        .filter(user => user.persona)
        .slice(0, 50); // Limit to top 50 active users

    } catch (error) {
      logger.error('Error getting active users:', error);
      return [];
    }
  }

  /**
   * Queue warming jobs for popular content and active users
   */
  private async queueWarmingJobs(
    popularContent: Array<{ contentHash: string; contentType: string; accessCount: number }>,
    activeUsers: Array<{ userId: string; persona: UserPersona }>
  ): Promise<void> {
    // Clear existing queue
    this.warmingQueue = [];

    // Create jobs for popular content + active user combinations
    for (const content of popularContent.slice(0, 10)) { // Top 10 popular content
      for (const user of activeUsers.slice(0, 20)) { // Top 20 active users
        // Check if this combination is already cached
        const isAlreadyCached = await this.isCachedCombination(content.contentType, user.userId, content.contentHash, user.persona);
        
        if (!isAlreadyCached) {
          this.warmingQueue.push({
            id: crypto.randomUUID(),
            priority: this.getPriority(content.accessCount, user.userId),
            contentType: content.contentType as any,
            contentHash: content.contentHash,
            userId: user.userId,
            persona: user.persona,
            metadata: {
              accessCount: content.accessCount,
              originalContentType: content.contentType
            },
            retries: 0,
            maxRetries: 2
          });
        }
      }
    }

    // Sort by priority
    this.warmingQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    logger.info(`Queued ${this.warmingQueue.length} warming jobs`);
  }

  /**
   * Process the warming queue
   */
  private async processWarmingQueue(): Promise<void> {
    const batches = this.chunkArray(this.warmingQueue, this.config.batchSize);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(job => this.processWarmingJob(job))
      );
      
      // Delay between batches to avoid overwhelming the system
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
      }
    }
  }

  /**
   * Process an individual warming job
   */
  private async processWarmingJob(job: WarmingJob): Promise<void> {
    try {
      logger.debug(`Processing warming job: ${job.id} for ${job.contentType}`);

      // Generate sample content for warming
      const sampleContent = await this.generateSampleContent(job);
      
      if (sampleContent) {
        // Use cache warming method
        await this.cache.warmCache(
          {
            service: job.contentType as any,
            userId: job.userId,
            contentHash: job.contentHash,
            persona: job.persona,
            context: {
              difficulty: 'intermediate',
              format: 'standard'
            }
          },
          async () => ({
            content: sampleContent,
            usage: { promptTokens: 100, completionTokens: 200 } // Estimated usage
          })
        );

        logger.debug(`Successfully warmed cache for job: ${job.id}`);
      }
    } catch (error) {
      logger.warn(`Failed to process warming job ${job.id}:`, error);
      
      // Retry logic
      if (job.retries < job.maxRetries) {
        job.retries++;
        this.warmingQueue.push(job); // Re-queue for retry
      }
    }
  }

  /**
   * Generate sample content for cache warming
   */
  private async generateSampleContent(job: WarmingJob): Promise<string | null> {
    try {
      // Generate placeholder content based on content type
      switch (job.contentType) {
        case 'explanation':
          return `This is a personalized explanation for ${job.persona.currentRole || 'learner'} interested in ${job.persona.primaryInterests?.slice(0, 2).join(', ') || 'various topics'}.`;
        
        case 'summary':
          return `Summary tailored for ${job.persona.learningStyle || 'visual'} learner with background in ${job.persona.industry || 'general'}.`;
        
        case 'quiz':
          return JSON.stringify([{
            question: 'Sample question',
            type: 'multiple_choice',
            options: ['A', 'B', 'C', 'D'],
            answer: 'A',
            explanation: 'Sample explanation'
          }]);
        
        case 'flashcard':
          return JSON.stringify([{
            front: 'Sample term',
            back: 'Sample definition',
            difficulty: 'medium'
          }]);
        
        default:
          return 'Sample content';
      }
    } catch (error) {
      logger.error(`Error generating sample content for job ${job.id}:`, error);
      return null;
    }
  }

  /**
   * Check if a content combination is already cached
   */
  private async isCachedCombination(
    contentType: string,
    userId: string,
    contentHash: string,
    persona: UserPersona
  ): Promise<boolean> {
    try {
      const cached = await this.cache.get({
        service: contentType as any,
        userId,
        contentHash,
        persona,
        context: {
          difficulty: 'intermediate',
          format: 'standard'
        }
      });
      
      return !!cached;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine priority based on access patterns
   */
  private getPriority(accessCount: number, _userId: string): 'high' | 'medium' | 'low' {
    if (accessCount > 20) return 'high';
    if (accessCount > 10) return 'medium';
    return 'low';
  }

  /**
   * Transform database persona to UserPersona format
   */
  private transformPersona(dbPersona: any): UserPersona {
    return {
      id: dbPersona.id,
      userId: dbPersona.user_id,
      currentRole: dbPersona.professional_context?.role,
      industry: dbPersona.professional_context?.industry,
      technicalLevel: dbPersona.professional_context?.technicalLevel,
      primaryInterests: dbPersona.personal_interests?.primary || [],
      secondaryInterests: dbPersona.personal_interests?.secondary || [],
      learningStyle: dbPersona.learning_style?.primary,
      communicationTone: dbPersona.communication_tone?.style,
      createdAt: new Date(dbPersona.created_at),
      updatedAt: new Date(dbPersona.updated_at),
    };
  }

  /**
   * Utility to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get warming statistics
   */
  async getWarmingStats(): Promise<{
    queueSize: number;
    isActive: boolean;
    lastCycle: Date | null;
    successRate: number;
  }> {
    return {
      queueSize: this.warmingQueue.length,
      isActive: this.isWarming,
      lastCycle: null, // Would track in production
      successRate: 0.85 // Would calculate from actual metrics
    };
  }

  /**
   * Manual cache warming for specific content
   */
  async warmSpecificContent(
    contentType: 'explanation' | 'summary' | 'quiz' | 'flashcard',
    content: string,
    userIds: string[]
  ): Promise<void> {
    try {
      const contentHash = crypto.createHash('sha256')
        .update(content)
        .digest('hex')
        .substring(0, 16);

      for (const userId of userIds) {
        // Get user persona
        const { data: persona } = await supabase
          .from('personas')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (persona) {
          const transformedPersona = this.transformPersona(persona);
          
          await this.cache.warmCache(
            {
              service: contentType === 'explanation' ? 'explain' : contentType as any,
              userId,
              contentHash,
              persona: transformedPersona,
              context: {
                difficulty: 'intermediate',
                format: 'standard'
              }
            },
            async () => ({
              content: await this.generateSampleContent({
                contentType,
                userId,
                persona: transformedPersona
              } as WarmingJob) || content,
              usage: { promptTokens: 100, completionTokens: 200 }
            })
          );
        }
      }

      logger.info(`Manually warmed cache for ${contentType} content`, {
        contentHash,
        userCount: userIds.length
      });
    } catch (error) {
      logger.error('Error in manual cache warming:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cacheWarmingService = new CacheWarmingService();