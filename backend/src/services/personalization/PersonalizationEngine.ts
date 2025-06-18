import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { promptTemplates } from '../ai/PromptTemplates';
import { openAIService } from '../openai/OpenAIService';
import { UserPersona, PersonaRow, UserPersonaRow, ContentFeedbackParams } from '../../types';

export interface PersonalizationParams {
  userId: string;
  concept: string;
  context?: string;
}

export class PersonalizationEngine {
  async getUserPersona(userId: string): Promise<UserPersona | null> {
    try {
      // Query the personas table (with JSONB fields)
      const { data: personaData, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!personaError && personaData) {
        return this.mapPersonasTableToUserPersona(personaData);
      }

      // Fallback to user_personas table (older format)
      const { data: userPersonaData, error: userPersonaError } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!userPersonaError && userPersonaData) {
        return this.mapToUserPersona(userPersonaData);
      }

      // No persona found, return null (not an error)
      logger.info(`No persona found for user ${userId}`);
      return null;
    } catch (error) {
      logger.error('Error getting user persona:', error);
      return null;
    }
  }

  private mapPersonasTableToUserPersona(data: PersonaRow): UserPersona {
    // Map from personas table with JSONB fields according to exact structure
    const professional = data.professional_context || {};
    const interests = data.personal_interests || {};
    const learningStyle = data.learning_style || {};
    const contentPrefs = data.content_preferences || {};
    const communication = data.communication_tone || {};

    return {
      id: data.id,
      userId: data.user_id,
      
      // Professional Context from JSONB
      currentRole: professional.role || 'Student',
      industry: professional.industry || 'General',
      experienceYears: professional.experienceYears || 0,
      careerGoals: professional.careerAspirations ? [professional.careerAspirations] : [],
      technicalLevel: professional.technicalLevel || 'beginner',
      
      // Personal Interests from JSONB
      primaryInterests: interests.primary || [],
      secondaryInterests: interests.secondary || [],
      hobbies: interests.hobbies || [],
      
      // Learning Style from JSONB
      learningStyle: learningStyle.primary || 'visual',
      learningGoals: interests.learningTopics || [],
      preferredContentTypes: [],
      dailyLearningTime: 30, // Default as not in current structure
      preferredSessionLength: 15, // Default as not in current structure
      
      // Content Preferences from JSONB
      contentDensity: contentPrefs.density === 'balanced' ? 'comprehensive' : (contentPrefs.density || 'concise'),
      explanationDepth: this.mapDetailTolerance(contentPrefs.detailTolerance),
      exampleFrequency: this.mapExampleFrequency(contentPrefs.examplesPerConcept),
      visualPreference: 'moderate', // Not in current structure, using default
      
      // Communication Style from JSONB
      communicationTone: communication.style === 'professional_friendly' ? 'friendly' : 
                        (communication.style || 'friendly'),
      formalityLevel: this.mapTechnicalComfortToFormality(communication.technicalComfort),
      encouragementLevel: communication.encouragementLevel || 'moderate',
      humorAppreciation: communication.humorAppropriate ? 'moderate' : 'none',
      
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }


  private mapToUserPersona(data: UserPersonaRow): UserPersona {
    return {
      id: data.id,
      userId: data.user_id,
      currentRole: data.current_role,
      industry: data.industry,
      experienceYears: data.experience_years,
      careerGoals: data.career_goals,
      technicalLevel: this.mapTechnicalLevel(data.technical_level),
      primaryInterests: data.primary_interests || [],
      secondaryInterests: data.secondary_interests || [],
      hobbies: data.hobbies || [],
      learningStyle: this.mapLearningStyle(data.learning_style),
      learningGoals: data.learning_goals || [],
      preferredContentTypes: data.preferred_content_types || [],
      dailyLearningTime: data.daily_learning_time,
      preferredSessionLength: data.preferred_session_length,
      contentDensity: this.mapContentDensity(data.content_density),
      explanationDepth: this.mapExplanationDepth(data.explanation_depth),
      exampleFrequency: this.mapExampleFrequencyFromString(data.example_frequency),
      visualPreference: this.mapVisualPreference(data.visual_preference),
      communicationTone: this.mapCommunicationTone(data.communication_tone),
      formalityLevel: this.mapFormalityLevel(data.formality_level),
      encouragementLevel: this.mapEncouragementLevel(data.encouragement_level),
      humorAppreciation: this.mapHumorAppreciation(data.humor_appreciation),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async generateAnalogy(params: PersonalizationParams): Promise<string> {
    try {
      const persona = await this.getUserPersona(params.userId);
      if (!persona) {
        throw new Error('User persona not found');
      }

      const interests = [...persona.primaryInterests, ...persona.secondaryInterests];
      if (interests.length === 0) {
        interests.push('everyday life'); // Fallback
      }

      const prompt = promptTemplates.buildAnalogyPrompt(params.concept, interests);

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Failed to generate analogy:', error);
      throw error;
    }
  }

  getToneInstruction(persona: UserPersona): string {
    const toneMap: Record<string, string> = {
      formal: 'Use formal language with proper grammar and professional terminology.',
      professional: 'Maintain a professional yet approachable tone.',
      friendly: 'Be warm, encouraging, and conversational.',
      casual: 'Use relaxed, everyday language as if talking to a friend.',
      academic: 'Use scholarly language with precise terminology.',
    };

    return toneMap[persona.communicationTone || 'friendly'];
  }

  getDensityInstruction(persona: UserPersona): string {
    const densityMap: Record<string, string> = {
      concise: 'Be brief and to the point. Focus on key information.',
      comprehensive: 'Provide detailed explanations with context and examples.',
    };

    return densityMap[persona.contentDensity || 'concise'];
  }

  getExampleStrategy(persona: UserPersona): {
    frequency: 'minimal' | 'moderate' | 'frequent';
    relevance: string[];
  } {
    const frequencyMap: Record<string, 'minimal' | 'moderate' | 'frequent'> = {
      low: 'minimal',
      medium: 'moderate',
      high: 'frequent',
    };

    return {
      frequency: frequencyMap[persona.exampleFrequency || 'medium'] || 'moderate',
      relevance: [
        persona.currentRole || 'general',
        persona.industry || 'general',
        ...persona.primaryInterests,
      ],
    };
  }

  async getPersona(personaId: string): Promise<UserPersona | null> {
    try {
      // First try personas table (JSONB format)
      const { data: personaData, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();

      if (!personaError && personaData) {
        return this.mapPersonasTableToUserPersona(personaData);
      }

      // Fallback to user_personas table
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('id', personaId)
        .single();

      if (!error && data) {
        return this.mapToUserPersona(data);
      }

      logger.error('Failed to fetch persona by id');
      return null;
    } catch (error) {
      logger.error('Error getting persona by id:', error);
      return null;
    }
  }

  async getLatestPersona(userId: string): Promise<UserPersona | null> {
    try {
      // First try personas table (JSONB format)
      const { data: personaData, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!personaError && personaData) {
        return this.mapPersonasTableToUserPersona(personaData);
      }

      // Fallback to user_personas table
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', userId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return this.mapToUserPersona(data);
      }

      logger.info(`No persona found for user ${userId}`);
      return null;
    } catch (error) {
      logger.error('Error getting latest persona:', error);
      return null;
    }
  }

  async saveContentFeedback(params: ContentFeedbackParams): Promise<void> {
    try {
      await supabase.from('content_feedback').insert({
        user_id: params.userId,
        content_id: params.contentId,
        helpful: params.helpful,
        rating: params.rating,
        comments: params.comments,
      });

      logger.info(`Feedback saved for content ${params.contentId}`);
    } catch (error) {
      logger.error('Failed to save content feedback:', error);
    }
  }

  async getPersonalizationMetrics(userId: string): Promise<{
    analogyEffectiveness: number;
    contentHelpfulness: number;
    engagementRate: number;
  }> {
    try {
      const { data: feedback } = await supabase
        .from('content_feedback')
        .select('helpful, rating')
        .eq('user_id', userId);

      if (!feedback || feedback.length === 0) {
        return {
          analogyEffectiveness: 0,
          contentHelpfulness: 0,
          engagementRate: 0,
        };
      }

      const helpfulCount = feedback.filter((f) => f.helpful).length;
      const avgRating =
        feedback.filter((f) => f.rating !== null).reduce((sum, f) => sum + (f.rating || 0), 0) /
        feedback.length;

      return {
        analogyEffectiveness: avgRating / 5, // Normalize to 0-1
        contentHelpfulness: helpfulCount / feedback.length,
        engagementRate: feedback.length > 10 ? 1 : feedback.length / 10,
      };
    } catch (error) {
      logger.error('Failed to get personalization metrics:', error);
      return {
        analogyEffectiveness: 0,
        contentHelpfulness: 0,
        engagementRate: 0,
      };
    }
  }

  // Type mapping helper methods
  private mapDetailTolerance(value?: string): 'surface' | 'moderate' | 'deep' {
    if (!value) return 'moderate';
    switch (value) {
      case 'minimal': return 'surface';
      case 'moderate': return 'moderate';
      case 'extensive': return 'deep';
      default: return 'moderate';
    }
  }

  private mapExampleFrequency(count?: number): 'low' | 'medium' | 'high' {
    if (!count) return 'medium';
    if (count <= 1) return 'low';
    if (count <= 3) return 'medium';
    return 'high';
  }

  private mapTechnicalComfortToFormality(comfort?: number): 'formal' | 'neutral' | 'informal' {
    if (!comfort) return 'neutral';
    if (comfort >= 0.7) return 'formal';
    if (comfort >= 0.3) return 'neutral';
    return 'informal';
  }

  private mapTechnicalLevel(value?: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (!value) return 'intermediate';
    const level = value.toLowerCase();
    if (['beginner', 'intermediate', 'advanced', 'expert'].includes(level)) {
      return level as 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }
    return 'intermediate';
  }

  private mapLearningStyle(value?: string): 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed' {
    if (!value) return 'mixed';
    const style = value.toLowerCase();
    if (['visual', 'auditory', 'reading', 'kinesthetic', 'mixed'].includes(style)) {
      return style as 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
    }
    return 'mixed';
  }

  private mapContentDensity(value?: string): 'concise' | 'comprehensive' {
    if (!value) return 'concise';
    return value === 'comprehensive' ? 'comprehensive' : 'concise';
  }

  private mapExplanationDepth(value?: string): 'surface' | 'moderate' | 'deep' {
    if (!value) return 'moderate';
    switch (value.toLowerCase()) {
      case 'surface': return 'surface';
      case 'moderate': return 'moderate';
      case 'deep': return 'deep';
      default: return 'moderate';
    }
  }

  private mapExampleFrequencyFromString(value?: string): 'low' | 'medium' | 'high' {
    if (!value) return 'medium';
    switch (value.toLowerCase()) {
      case 'low': return 'low';
      case 'medium': return 'medium';
      case 'high': return 'high';
      default: return 'medium';
    }
  }

  private mapCommunicationTone(value?: string): 'casual' | 'academic' | 'formal' | 'friendly' | 'professional' {
    if (!value) return 'friendly';
    switch (value.toLowerCase()) {
      case 'casual': return 'casual';
      case 'academic': return 'academic';
      case 'formal': return 'formal';
      case 'friendly': return 'friendly';
      case 'professional': return 'professional';
      default: return 'friendly';
    }
  }

  private mapFormalityLevel(value?: string): 'formal' | 'neutral' | 'informal' | 'very_formal' | 'very_informal' {
    if (!value) return 'neutral';
    switch (value.toLowerCase()) {
      case 'formal': return 'formal';
      case 'neutral': return 'neutral';
      case 'informal': return 'informal';
      case 'very_formal': return 'very_formal';
      case 'very_informal': return 'very_informal';
      default: return 'neutral';
    }
  }

  private mapEncouragementLevel(value?: string): 'minimal' | 'moderate' | 'high' {
    if (!value) return 'moderate';
    switch (value.toLowerCase()) {
      case 'minimal': return 'minimal';
      case 'moderate': return 'moderate';
      case 'high': return 'high';
      default: return 'moderate';
    }
  }

  private mapHumorAppreciation(value?: string): 'moderate' | 'high' | 'none' | 'light' {
    if (!value) return 'none';
    switch (value.toLowerCase()) {
      case 'moderate': return 'moderate';
      case 'high': return 'high';
      case 'none': return 'none';
      case 'light': return 'light';
      default: return 'none';
    }
  }

  private mapVisualPreference(value?: string): 'minimal' | 'moderate' | 'heavy' {
    if (!value) return 'moderate';
    switch (value.toLowerCase()) {
      case 'minimal': return 'minimal';
      case 'moderate': return 'moderate';
      case 'heavy': return 'heavy';
      default: return 'moderate';
    }
  }
}
