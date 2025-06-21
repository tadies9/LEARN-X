/**
 * Persona Types
 * Type definitions for user personas used in content generation
 */

export interface ProfessionalContext {
  role: string;
  industry: string;
  technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  careerAspirations: string;
}

export interface PersonalInterests {
  primary: string[];
  secondary: string[];
  learningTopics: string[];
}

export interface LearningStyle {
  primary: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  secondary: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferenceStrength: number; // 0-1
}

export interface ContentPreferences {
  density: 'light' | 'moderate' | 'dense';
  examplesPerConcept: number;
  detailTolerance: 'low' | 'medium' | 'high';
  repetitionPreference: 'low' | 'moderate' | 'high';
}

export interface CommunicationTone {
  style: 'formal' | 'friendly' | 'casual' | 'academic';
  technicalComfort: number; // 1-10
  encouragementLevel: 'minimal' | 'moderate' | 'high';
  humorAppropriate: boolean;
}

export interface Persona {
  id: string;
  user_id: string;
  professional_context: ProfessionalContext;
  personal_interests: PersonalInterests;
  learning_style: LearningStyle;
  content_preferences: ContentPreferences;
  communication_tone: CommunicationTone;
  created_at: string;
  updated_at: string;
}