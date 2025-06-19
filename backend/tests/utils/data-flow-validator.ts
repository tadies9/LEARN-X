import { TestDatabase } from './test-helpers';

/**
 * Data Flow Validator
 * 
 * Validates data integrity and flow through all system components,
 * ensuring persona data, file metadata, cost tracking, and performance 
 * metrics are properly propagated and maintained.
 */
export class DataFlowValidator {
  private db: TestDatabase;

  constructor(db: TestDatabase) {
    this.db = db;
  }

  /**
   * Validates complete data flow from user input to final output
   */
  async validateCompleteDataFlow(
    userId: string,
    fileId: string
  ): Promise<{
    personaDataFlow: boolean;
    fileMetadataFlow: boolean;
    costTrackingFlow: boolean;
    performanceMetricsFlow: boolean;
    overallIntegrity: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    console.log('📊 Validating complete data flow...');

    // Validate persona data flow
    const personaFlow = await this.validatePersonaDataFlow(userId);
    if (!personaFlow.isValid) {
      issues.push(...personaFlow.issues);
    }

    // Validate file metadata flow
    const fileFlow = await this.validateFileMetadataFlow(fileId);
    if (!fileFlow.isValid) {
      issues.push(...fileFlow.issues);
    }

    // Validate cost tracking flow
    const costFlow = await this.validateCostTrackingFlow(userId, fileId);
    if (!costFlow.isValid) {
      issues.push(...costFlow.issues);
    }

    // Validate performance metrics flow
    const metricsFlow = await this.validatePerformanceMetricsFlow(userId, fileId);
    if (!metricsFlow.isValid) {
      issues.push(...metricsFlow.issues);
    }

    const validFlows = [
      personaFlow.isValid,
      fileFlow.isValid,
      costFlow.isValid,
      metricsFlow.isValid
    ];
    const overallIntegrity = validFlows.filter(Boolean).length / validFlows.length;

    return {
      personaDataFlow: personaFlow.isValid,
      fileMetadataFlow: fileFlow.isValid,
      costTrackingFlow: costFlow.isValid,
      performanceMetricsFlow: metricsFlow.isValid,
      overallIntegrity,
      issues
    };
  }

  /**
   * Validates persona data flow through AI personalization
   */
  async validatePersonaDataFlow(userId: string): Promise<{
    isValid: boolean;
    persona: any;
    personalizationApplied: boolean;
    consistencyScore: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let persona = null;
    let personalizationApplied = false;
    let consistencyScore = 0;

    try {
      // Check if user has persona data
      const userPersona = await this.fetchUserPersona(userId);
      if (!userPersona) {
        issues.push('User persona not found');
        return {
          isValid: false,
          persona: null,
          personalizationApplied: false,
          consistencyScore: 0,
          issues
        };
      }

      persona = userPersona;

      // Check if persona is applied in AI content generation
      const aiContent = await this.fetchLatestAIContent(userId);
      if (aiContent) {
        personalizationApplied = aiContent.metadata?.persona_applied || false;
        
        if (!personalizationApplied) {
          issues.push('Persona not applied in AI content generation');
        }

        // Validate consistency of persona application
        consistencyScore = await this.calculatePersonaConsistency(persona, aiContent);
        
        if (consistencyScore < 0.7) {
          issues.push(`Low persona consistency score: ${consistencyScore.toFixed(2)}`);
        }
      } else {
        issues.push('No AI content found for user');
      }

      // Check persona propagation to recommendations
      const recommendations = await this.fetchUserRecommendations(userId);
      if (recommendations && recommendations.length > 0) {
        const recommendationPersonalized = recommendations.some(
          (rec: any) => rec.personalization_factors?.includes(persona.learning_style)
        );
        
        if (!recommendationPersonalized) {
          issues.push('Persona not reflected in recommendations');
        }
      }

    } catch (error) {
      issues.push(`Persona validation error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      persona,
      personalizationApplied,
      consistencyScore,
      issues
    };
  }

  /**
   * Validates file processing metadata flow
   */
  async validateFileMetadataFlow(fileId: string): Promise<{
    isValid: boolean;
    fileMetadata: any;
    chunkMetadata: any[];
    embeddingMetadata: any;
    metadataConsistency: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let fileMetadata = null;
    let chunkMetadata: any[] = [];
    let embeddingMetadata = null;
    let metadataConsistency = 0;

    try {
      // Fetch file metadata
      fileMetadata = await this.fetchFileMetadata(fileId);
      if (!fileMetadata) {
        issues.push('File metadata not found');
        return {
          isValid: false,
          fileMetadata: null,
          chunkMetadata: [],
          embeddingMetadata: null,
          metadataConsistency: 0,
          issues
        };
      }

      // Validate required metadata fields
      const requiredFields = ['file_size', 'mime_type', 'processing_status', 'created_at'];
      for (const field of requiredFields) {
        if (!(field in fileMetadata)) {
          issues.push(`Missing file metadata field: ${field}`);
        }
      }

      // Fetch chunk metadata
      chunkMetadata = await this.fetchChunkMetadata(fileId);
      if (chunkMetadata.length === 0) {
        issues.push('No chunk metadata found');
      } else {
        // Validate chunk metadata consistency
        const totalChunkSize = chunkMetadata.reduce(
          (sum: number, chunk: any) => sum + (chunk.content_length || 0), 
          0
        );
        
        if (Math.abs(totalChunkSize - (fileMetadata.content_length || 0)) > 100) {
          issues.push('Chunk content length mismatch with file metadata');
        }

        // Check chunk ordering
        const chunkIndexes = chunkMetadata.map((chunk: any) => chunk.chunk_index).sort((a, b) => a - b);
        for (let i = 0; i < chunkIndexes.length; i++) {
          if (chunkIndexes[i] !== i) {
            issues.push('Chunk indexing is not sequential');
            break;
          }
        }
      }

      // Fetch embedding metadata
      embeddingMetadata = await this.fetchEmbeddingMetadata(fileId);
      if (!embeddingMetadata) {
        issues.push('Embedding metadata not found');
      } else {
        // Validate embedding dimensions
        if (embeddingMetadata.dimensions !== 1536) { // OpenAI text-embedding-3-small
          issues.push(`Unexpected embedding dimensions: ${embeddingMetadata.dimensions}`);
        }

        // Check embedding status
        if (embeddingMetadata.status !== 'completed') {
          issues.push(`Embedding not completed: ${embeddingMetadata.status}`);
        }
      }

      // Calculate metadata consistency score
      metadataConsistency = this.calculateMetadataConsistency(
        fileMetadata,
        chunkMetadata,
        embeddingMetadata
      );

      if (metadataConsistency < 0.8) {
        issues.push(`Low metadata consistency: ${metadataConsistency.toFixed(2)}`);
      }

    } catch (error) {
      issues.push(`File metadata validation error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      fileMetadata,
      chunkMetadata,
      embeddingMetadata,
      metadataConsistency,
      issues
    };
  }

  /**
   * Validates cost tracking accuracy throughout the system
   */
  async validateCostTrackingFlow(userId: string, fileId: string): Promise<{
    isValid: boolean;
    totalCosts: number;
    costBreakdown: any;
    trackingAccuracy: number;
    budgetCompliance: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let totalCosts = 0;
    let costBreakdown = {};
    let trackingAccuracy = 0;
    let budgetCompliance = true;

    try {
      // Fetch cost tracking data
      const costData = await this.fetchCostTrackingData(userId, fileId);
      if (!costData) {
        issues.push('Cost tracking data not found');
        return {
          isValid: false,
          totalCosts: 0,
          costBreakdown: {},
          trackingAccuracy: 0,
          budgetCompliance: false,
          issues
        };
      }

      totalCosts = costData.totalCosts || 0;
      costBreakdown = costData.breakdown || {};

      // Validate cost components
      const expectedComponents = ['embeddings', 'content_generation', 'processing'];
      for (const component of expectedComponents) {
        if (!(component in costBreakdown)) {
          issues.push(`Missing cost component: ${component}`);
        }
      }

      // Calculate tracking accuracy by comparing with expected costs
      const expectedCosts = await this.calculateExpectedCosts(userId, fileId);
      if (expectedCosts > 0) {
        trackingAccuracy = Math.min(totalCosts / expectedCosts, 1);
        
        if (Math.abs(totalCosts - expectedCosts) / expectedCosts > 0.1) {
          issues.push(`Cost tracking inaccuracy: expected ${expectedCosts}, tracked ${totalCosts}`);
        }
      }

      // Check budget compliance
      const userBudget = await this.fetchUserBudget(userId);
      if (userBudget) {
        const dailySpent = await this.fetchDailySpending(userId);
        budgetCompliance = dailySpent <= userBudget.daily_limit;
        
        if (!budgetCompliance) {
          issues.push(`Budget exceeded: spent ${dailySpent}, limit ${userBudget.daily_limit}`);
        }
      }

      // Validate cost timestamps and attribution
      const costEntries = await this.fetchCostEntries(userId, fileId);
      for (const entry of costEntries) {
        if (!entry.timestamp || !entry.operation_type) {
          issues.push('Incomplete cost entry data');
        }
        
        if (entry.amount <= 0) {
          issues.push(`Invalid cost amount: ${entry.amount}`);
        }
      }

    } catch (error) {
      issues.push(`Cost tracking validation error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      totalCosts,
      costBreakdown,
      trackingAccuracy,
      budgetCompliance,
      issues
    };
  }

  /**
   * Validates performance metrics collection and reporting
   */
  async validatePerformanceMetricsFlow(userId: string, fileId: string): Promise<{
    isValid: boolean;
    metricsCollected: string[];
    completeness: number;
    accuracy: number;
    realTimeUpdates: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let metricsCollected: string[] = [];
    let completeness = 0;
    let accuracy = 0;
    let realTimeUpdates = false;

    try {
      // Fetch performance metrics
      const performanceData = await this.fetchPerformanceMetrics(userId, fileId);
      if (!performanceData) {
        issues.push('Performance metrics not found');
        return {
          isValid: false,
          metricsCollected: [],
          completeness: 0,
          accuracy: 0,
          realTimeUpdates: false,
          issues
        };
      }

      metricsCollected = Object.keys(performanceData.metrics || {});

      // Check for required metrics
      const requiredMetrics = [
        'file_processing_time',
        'ai_generation_time',
        'embedding_time',
        'search_response_time',
        'cache_hit_rate'
      ];

      const missingMetrics = requiredMetrics.filter(
        metric => !metricsCollected.includes(metric)
      );

      if (missingMetrics.length > 0) {
        issues.push(`Missing performance metrics: ${missingMetrics.join(', ')}`);
      }

      completeness = (requiredMetrics.length - missingMetrics.length) / requiredMetrics.length;

      // Validate metric accuracy
      const validMetrics = metricsCollected.filter(metric => {
        const value = performanceData.metrics[metric];
        return typeof value === 'number' && value >= 0 && !isNaN(value);
      });

      accuracy = validMetrics.length / Math.max(metricsCollected.length, 1);

      if (accuracy < 0.9) {
        issues.push(`Low metrics accuracy: ${(accuracy * 100).toFixed(1)}%`);
      }

      // Check real-time updates
      const latestTimestamp = performanceData.lastUpdated;
      if (latestTimestamp) {
        const age = Date.now() - new Date(latestTimestamp).getTime();
        realTimeUpdates = age < 60000; // Within 1 minute
        
        if (!realTimeUpdates) {
          issues.push(`Stale performance metrics: ${Math.floor(age / 1000)}s old`);
        }
      } else {
        issues.push('Performance metrics missing timestamp');
      }

      // Validate metric thresholds
      const thresholds = {
        file_processing_time: 30000, // 30s
        ai_generation_time: 15000,   // 15s
        search_response_time: 1000   // 1s
      };

      for (const [metric, threshold] of Object.entries(thresholds)) {
        const value = performanceData.metrics[metric];
        if (value && value > threshold) {
          issues.push(`Performance threshold exceeded for ${metric}: ${value}ms > ${threshold}ms`);
        }
      }

    } catch (error) {
      issues.push(`Performance metrics validation error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      metricsCollected,
      completeness,
      accuracy,
      realTimeUpdates,
      issues
    };
  }

  // Helper methods for data fetching

  private async fetchUserPersona(userId: string): Promise<any> {
    // Simulate database query - in real implementation, use Supabase client
    return {
      learning_style: 'visual',
      expertise_level: 'intermediate',
      interests: ['programming', 'web development'],
      communication_preference: 'detailed'
    };
  }

  private async fetchLatestAIContent(userId: string): Promise<any> {
    // Simulate AI content fetch
    return {
      content: 'AI generated content...',
      metadata: {
        persona_applied: true,
        learning_style: 'visual',
        expertise_level: 'intermediate'
      }
    };
  }

  private async fetchUserRecommendations(userId: string): Promise<any[]> {
    // Simulate recommendations fetch
    return [
      {
        type: 'content',
        personalization_factors: ['visual', 'intermediate']
      }
    ];
  }

  private async fetchFileMetadata(fileId: string): Promise<any> {
    // Simulate file metadata fetch
    return {
      id: fileId,
      file_size: 102400,
      mime_type: 'text/plain',
      processing_status: 'completed',
      content_length: 5000,
      created_at: new Date().toISOString()
    };
  }

  private async fetchChunkMetadata(fileId: string): Promise<any[]> {
    // Simulate chunk metadata fetch
    return [
      { chunk_index: 0, content_length: 2500, file_id: fileId },
      { chunk_index: 1, content_length: 2500, file_id: fileId }
    ];
  }

  private async fetchEmbeddingMetadata(fileId: string): Promise<any> {
    // Simulate embedding metadata fetch
    return {
      dimensions: 1536,
      status: 'completed',
      model: 'text-embedding-3-small'
    };
  }

  private async fetchCostTrackingData(userId: string, fileId: string): Promise<any> {
    // Simulate cost tracking data fetch
    return {
      totalCosts: 0.05,
      breakdown: {
        embeddings: 0.02,
        content_generation: 0.03,
        processing: 0.001
      }
    };
  }

  private async fetchUserBudget(userId: string): Promise<any> {
    // Simulate user budget fetch
    return {
      daily_limit: 5.00,
      monthly_limit: 50.00
    };
  }

  private async fetchDailySpending(userId: string): Promise<number> {
    // Simulate daily spending fetch
    return 2.50;
  }

  private async fetchCostEntries(userId: string, fileId: string): Promise<any[]> {
    // Simulate cost entries fetch
    return [
      {
        amount: 0.02,
        operation_type: 'embedding',
        timestamp: new Date().toISOString()
      },
      {
        amount: 0.03,
        operation_type: 'generation',
        timestamp: new Date().toISOString()
      }
    ];
  }

  private async fetchPerformanceMetrics(userId: string, fileId: string): Promise<any> {
    // Simulate performance metrics fetch
    return {
      metrics: {
        file_processing_time: 2500,
        ai_generation_time: 3200,
        embedding_time: 1800,
        search_response_time: 250,
        cache_hit_rate: 0.75
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async calculateExpectedCosts(userId: string, fileId: string): Promise<number> {
    // Calculate expected costs based on operations performed
    return 0.048; // Simulated expected cost
  }

  private calculatePersonaConsistency(persona: any, aiContent: any): number {
    // Calculate how well the AI content reflects the persona
    let score = 0;
    let factors = 0;

    if (aiContent.metadata?.learning_style === persona.learning_style) {
      score += 1;
    }
    factors += 1;

    if (aiContent.metadata?.expertise_level === persona.expertise_level) {
      score += 1;
    }
    factors += 1;

    return factors > 0 ? score / factors : 0;
  }

  private calculateMetadataConsistency(
    fileMetadata: any,
    chunkMetadata: any[],
    embeddingMetadata: any
  ): number {
    let score = 0;
    let factors = 0;

    // Check if file processing completed
    if (fileMetadata?.processing_status === 'completed') {
      score += 1;
    }
    factors += 1;

    // Check if chunks exist
    if (chunkMetadata && chunkMetadata.length > 0) {
      score += 1;
    }
    factors += 1;

    // Check if embeddings completed
    if (embeddingMetadata?.status === 'completed') {
      score += 1;
    }
    factors += 1;

    return factors > 0 ? score / factors : 0;
  }
}