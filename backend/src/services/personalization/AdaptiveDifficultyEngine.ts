import { UserPersona } from '../../types';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

interface EngagementData {
  sessionDuration: number;
  completionRate: number;
  interactionCount: number;
  feedbackScore: number;
  skipRate: number;
  revisitRate: number;
  timeOnContent: number;
  difficultyRating: number;
}

interface DifficultyAdjustment {
  conceptualDepth: 'simplified' | 'standard' | 'enhanced' | 'advanced';
  technicalLanguage: 'minimal' | 'balanced' | 'detailed' | 'comprehensive';
  exampleComplexity: 'basic' | 'intermediate' | 'sophisticated' | 'expert';
  pace: 'slow' | 'moderate' | 'fast' | 'accelerated';
  scaffolding: 'high' | 'medium' | 'low' | 'minimal';
}

interface LearningState {
  currentMastery: number; // 0-100
  confidenceLevel: number; // 0-100
  preferredPace: 'slow' | 'moderate' | 'fast';
  strugglingConcepts: string[];
  strongConcepts: string[];
  optimalDifficulty: number; // 0-100
}

/**
 * Adaptive Difficulty Engine
 * Dynamically adjusts content difficulty based on real-time user engagement
 */
export class AdaptiveDifficultyEngine {

  /**
   * Analyze user engagement patterns to determine optimal difficulty
   */
  async analyzeEngagement(userId: string, topicId: string): Promise<EngagementData> {
    try {
      // Get recent engagement data
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const { data: feedback } = await supabase
        .from('content_feedback')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!interactions || interactions.length === 0) {
        return this.getDefaultEngagement();
      }

      // Calculate engagement metrics
      const sessionDuration = interactions.reduce((sum, i) => sum + (i.duration || 0), 0) / interactions.length;
      const completionRate = interactions.filter(i => i.action_type === 'complete').length / interactions.length;
      const interactionCount = interactions.length;
      const skipRate = interactions.filter(i => i.action_type === 'skip').length / interactions.length;
      const revisitRate = interactions.filter(i => i.action_type === 'revisit').length / interactions.length;

      const avgFeedbackScore = feedback && feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.rating || 3), 0) / feedback.length
        : 3;

      return {
        sessionDuration,
        completionRate,
        interactionCount,
        feedbackScore: avgFeedbackScore,
        skipRate,
        revisitRate,
        timeOnContent: sessionDuration * completionRate,
        difficultyRating: this.inferDifficultyRating(interactions, feedback)
      };

    } catch (error) {
      logger.error('Failed to analyze engagement:', error);
      return this.getDefaultEngagement();
    }
  }

  /**
   * Determine optimal difficulty adjustment based on engagement patterns
   */
  calculateDifficultyAdjustment(
    engagementData: EngagementData,
    persona: UserPersona,
    currentTopic: string
  ): DifficultyAdjustment {
    // Base difficulty on user's technical level
    let baseDifficulty = this.getBaseDifficulty(persona.technicalLevel);

    // Adjust based on engagement patterns
    const adjustments = this.analyzeEngagementPatterns(engagementData);

    // Apply domain expertise bonus
    const domainBonus = this.calculateDomainExpertise(persona, currentTopic);

    return {
      conceptualDepth: this.adjustConceptualDepth(baseDifficulty, adjustments, domainBonus),
      technicalLanguage: this.adjustTechnicalLanguage(baseDifficulty, adjustments, persona),
      exampleComplexity: this.adjustExampleComplexity(baseDifficulty, adjustments, domainBonus),
      pace: this.adjustPace(engagementData, persona),
      scaffolding: this.adjustScaffolding(engagementData, baseDifficulty)
    };
  }

  /**
   * Track real-time engagement and adjust difficulty mid-session
   */
  async trackRealTimeEngagement(
    userId: string,
    sessionId: string,
    action: 'start' | 'engage' | 'struggle' | 'skip' | 'complete',
    metadata?: any
  ): Promise<DifficultyAdjustment | null> {
    try {
      // Log the interaction
      await supabase.from('user_interactions').insert({
        user_id: userId,
        session_id: sessionId,
        action_type: action,
        metadata,
        created_at: new Date().toISOString()
      });

      // Check if adjustment is needed
      if (action === 'struggle' || action === 'skip') {
        const recentInteractions = await this.getRecentSessionInteractions(sessionId);
        const struggleRate = recentInteractions.filter(i => 
          i.action_type === 'struggle' || i.action_type === 'skip'
        ).length / recentInteractions.length;

        // If struggling frequently, simplify
        if (struggleRate > 0.3) {
          return {
            conceptualDepth: 'simplified',
            technicalLanguage: 'minimal',
            exampleComplexity: 'basic',
            pace: 'slow',
            scaffolding: 'high'
          };
        }
      }

      // Check if user is breezing through content
      if (action === 'complete') {
        const recentInteractions = await this.getRecentSessionInteractions(sessionId);
        const avgTimePerItem = recentInteractions.reduce((sum, i) => 
          sum + (i.metadata?.timeSpent || 0), 0
        ) / recentInteractions.length;

        // If completing too quickly, increase difficulty
        if (avgTimePerItem < 30000) { // Less than 30 seconds per item
          return {
            conceptualDepth: 'enhanced',
            technicalLanguage: 'detailed',
            exampleComplexity: 'sophisticated',
            pace: 'fast',
            scaffolding: 'low'
          };
        }
      }

      return null; // No adjustment needed

    } catch (error) {
      logger.error('Failed to track real-time engagement:', error);
      return null;
    }
  }

  /**
   * Get personalized learning state for the user
   */
  async getLearningState(userId: string, topicId?: string): Promise<LearningState> {
    try {
      const engagementData = await this.analyzeEngagement(userId, topicId || '');
      
      // Calculate mastery based on completion rates and feedback
      const currentMastery = Math.min(100, engagementData.completionRate * 100);
      
      // Calculate confidence based on engagement patterns
      const confidenceLevel = this.calculateConfidence(engagementData);
      
      // Determine preferred pace
      const preferredPace = this.determinePreferredPace(engagementData);
      
      // Get struggling and strong concepts
      const conceptAnalysis = await this.analyzeConceptPerformance(userId);

      return {
        currentMastery,
        confidenceLevel,
        preferredPace,
        strugglingConcepts: conceptAnalysis.struggling,
        strongConcepts: conceptAnalysis.strong,
        optimalDifficulty: this.calculateOptimalDifficulty(engagementData)
      };

    } catch (error) {
      logger.error('Failed to get learning state:', error);
      return this.getDefaultLearningState();
    }
  }

  /**
   * Generate difficulty-adjusted prompt instructions
   */
  generateDifficultyInstructions(
    adjustment: DifficultyAdjustment,
    persona: UserPersona
  ): string {
    const instructions = [];

    // Conceptual depth
    const depthMap = {
      simplified: 'Focus on core concepts only. Use simple, clear explanations without complexity.',
      standard: 'Provide balanced explanations with appropriate detail.',
      enhanced: 'Include deeper insights and connections between concepts.',
      advanced: 'Explore sophisticated applications and nuanced understanding.'
    };
    instructions.push(`Conceptual Depth: ${depthMap[adjustment.conceptualDepth]}`);

    // Technical language
    const languageMap = {
      minimal: 'Use everyday language. Avoid technical jargon.',
      balanced: 'Use appropriate technical terms with clear explanations.',
      detailed: 'Include relevant technical vocabulary and precise terminology.',
      comprehensive: 'Use sophisticated technical language appropriate for experts.'
    };
    instructions.push(`Language Level: ${languageMap[adjustment.technicalLanguage]}`);

    // Example complexity
    const exampleMap = {
      basic: 'Use simple, straightforward examples that illustrate one concept at a time.',
      intermediate: 'Provide realistic examples that show practical application.',
      sophisticated: 'Use complex, multi-layered examples that demonstrate nuanced understanding.',
      expert: 'Include advanced scenarios that require deep expertise to fully appreciate.'
    };
    instructions.push(`Examples: ${exampleMap[adjustment.exampleComplexity]}`);

    // Pace and scaffolding
    const paceMap = {
      slow: 'Take time to build understanding gradually. Include plenty of reinforcement.',
      moderate: 'Progress at a steady, comfortable pace with appropriate support.',
      fast: 'Move efficiently through concepts. Assume quick comprehension.',
      accelerated: 'Cover material rapidly. Focus on key insights and connections.'
    };
    instructions.push(`Pacing: ${paceMap[adjustment.pace]}`);

    const scaffoldingMap = {
      high: 'Provide extensive support, step-by-step guidance, and frequent check-ins.',
      medium: 'Include helpful guidance and context when introducing new concepts.',
      low: 'Provide minimal scaffolding. Assume learner can make connections.',
      minimal: 'Offer little guidance. Present concepts directly and efficiently.'
    };
    instructions.push(`Support Level: ${scaffoldingMap[adjustment.scaffolding]}`);

    return instructions.join('\n');
  }

  // Helper methods

  private getDefaultEngagement(): EngagementData {
    return {
      sessionDuration: 300000, // 5 minutes
      completionRate: 0.7,
      interactionCount: 10,
      feedbackScore: 3.5,
      skipRate: 0.1,
      revisitRate: 0.2,
      timeOnContent: 210000, // 3.5 minutes
      difficultyRating: 3
    };
  }

  private getBaseDifficulty(technicalLevel?: string): number {
    const levelMap = {
      beginner: 25,
      intermediate: 50,
      advanced: 75,
      expert: 90
    };
    return levelMap[technicalLevel as keyof typeof levelMap] || 50;
  }

  private analyzeEngagementPatterns(data: EngagementData): number {
    // Positive indicators: high completion, good feedback, appropriate time
    const positiveScore = (data.completionRate * 30) + 
                         ((data.feedbackScore - 3) * 10) + 
                         (Math.min(data.timeOnContent / 180000, 1) * 20);

    // Negative indicators: high skip rate, low interaction
    const negativeScore = (data.skipRate * -20) + 
                         (data.interactionCount < 5 ? -10 : 0);

    return Math.max(-25, Math.min(25, positiveScore + negativeScore));
  }

  private calculateDomainExpertise(persona: UserPersona, topic: string): number {
    const interests = [...(persona.primaryInterests || []), ...(persona.hobbies || [])];
    const topicLower = topic.toLowerCase();
    
    const hasExpertise = interests.some(interest => 
      topicLower.includes(interest.toLowerCase()) || 
      interest.toLowerCase().includes(topicLower)
    );

    return hasExpertise ? 15 : 0;
  }

  private adjustConceptualDepth(
    base: number, 
    adjustment: number, 
    domainBonus: number
  ): DifficultyAdjustment['conceptualDepth'] {
    const total = base + adjustment + domainBonus;
    if (total < 30) return 'simplified';
    if (total < 60) return 'standard';
    if (total < 80) return 'enhanced';
    return 'advanced';
  }

  private adjustTechnicalLanguage(
    base: number, 
    adjustment: number, 
    persona: UserPersona
  ): DifficultyAdjustment['technicalLanguage'] {
    const total = base + adjustment;
    const isAcademic = persona.communicationTone === 'academic';
    
    if (total < 25) return 'minimal';
    if (total < 50) return 'balanced';
    if (total < 75 && !isAcademic) return 'detailed';
    return 'comprehensive';
  }

  private adjustExampleComplexity(
    base: number, 
    adjustment: number, 
    domainBonus: number
  ): DifficultyAdjustment['exampleComplexity'] {
    const total = base + adjustment + domainBonus;
    if (total < 30) return 'basic';
    if (total < 60) return 'intermediate';
    if (total < 80) return 'sophisticated';
    return 'expert';
  }

  private adjustPace(
    data: EngagementData, 
    persona: UserPersona
  ): DifficultyAdjustment['pace'] {
    const baseSpeed = persona.learningStyle === 'reading' ? 1.2 : 1.0;
    const engagementSpeed = data.completionRate > 0.8 ? 1.3 : 
                           data.completionRate < 0.5 ? 0.7 : 1.0;
    
    const totalSpeed = baseSpeed * engagementSpeed;
    
    if (totalSpeed < 0.8) return 'slow';
    if (totalSpeed < 1.1) return 'moderate';
    if (totalSpeed < 1.4) return 'fast';
    return 'accelerated';
  }

  private adjustScaffolding(
    data: EngagementData, 
    baseDifficulty: number
  ): DifficultyAdjustment['scaffolding'] {
    const needsSupport = data.skipRate > 0.2 || data.completionRate < 0.6;
    const confident = data.feedbackScore > 4 && data.completionRate > 0.8;
    
    if (needsSupport) return 'high';
    if (confident && baseDifficulty > 60) return 'minimal';
    if (confident) return 'low';
    return 'medium';
  }

  private inferDifficultyRating(interactions: any[], feedback: any[]): number {
    // Infer perceived difficulty from behavior patterns
    const skipRate = interactions.filter(i => i.action_type === 'skip').length / interactions.length;
    const revisitRate = interactions.filter(i => i.action_type === 'revisit').length / interactions.length;
    
    let difficulty = 3; // Neutral
    
    if (skipRate > 0.3) difficulty += 1.5; // High skip rate = too difficult
    if (revisitRate > 0.4) difficulty += 1; // High revisit = struggling
    if (feedback.some(f => f.comments?.includes('difficult'))) difficulty += 0.5;
    if (feedback.some(f => f.comments?.includes('easy'))) difficulty -= 0.5;
    
    return Math.max(1, Math.min(5, difficulty));
  }

  private calculateConfidence(data: EngagementData): number {
    return Math.min(100, 
      (data.completionRate * 40) + 
      ((data.feedbackScore - 1) * 15) + 
      ((1 - data.skipRate) * 30) +
      (data.interactionCount > 10 ? 15 : data.interactionCount * 1.5)
    );
  }

  private determinePreferredPace(data: EngagementData): 'slow' | 'moderate' | 'fast' {
    const avgTimePerItem = data.timeOnContent / data.interactionCount;
    
    if (avgTimePerItem > 60000) return 'slow'; // > 1 minute per item
    if (avgTimePerItem < 20000) return 'fast'; // < 20 seconds per item
    return 'moderate';
  }

  private async analyzeConceptPerformance(userId: string): Promise<{
    struggling: string[];
    strong: string[];
  }> {
    // This would analyze performance across different concepts
    // For now, return empty arrays
    return { struggling: [], strong: [] };
  }

  private calculateOptimalDifficulty(data: EngagementData): number {
    // Sweet spot: challenging but achievable
    const baseOptimal = 60; // Moderate difficulty
    
    if (data.completionRate > 0.9 && data.feedbackScore > 4) {
      return Math.min(85, baseOptimal + 15); // Increase difficulty
    }
    
    if (data.completionRate < 0.5 || data.skipRate > 0.3) {
      return Math.max(25, baseOptimal - 20); // Decrease difficulty
    }
    
    return baseOptimal;
  }

  private async getRecentSessionInteractions(sessionId: string): Promise<any[]> {
    const { data } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('session_id', sessionId)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
      .order('created_at', { ascending: false });
    
    return data || [];
  }

  private getDefaultLearningState(): LearningState {
    return {
      currentMastery: 50,
      confidenceLevel: 50,
      preferredPace: 'moderate',
      strugglingConcepts: [],
      strongConcepts: [],
      optimalDifficulty: 60
    };
  }
}

export const adaptiveDifficultyEngine = new AdaptiveDifficultyEngine();