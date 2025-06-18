// JSONB field interfaces for the personas table
export interface ProfessionalContext {
  role?: string;
  currentStatus?: string;
  industry?: string;
  aspiredIndustry?: string;
  experienceYears?: number;
  technicalLevel?: string;
  careerAspirations?: string;
}

export interface PersonalInterests {
  primary: string[];
  secondary?: string[];
  learningTopics: string[];
}

export interface LearningStyle {
  primary: string;
  secondary?: string;
  preferenceStrength: number;
}

export interface ContentPreferences {
  density: string;
  examplesPerConcept?: number;
  summaryStyle?: string;
  detailTolerance: string;
  repetitionPreference: string;
}

export interface CommunicationTone {
  style: string;
  technicalComfort?: number;
  encouragementLevel: string;
  humorAppropriate: boolean;
}

// Database row interface for personas table
export interface PersonaRow {
  id: string;
  user_id: string;
  professional_context: ProfessionalContext;
  personal_interests: PersonalInterests;
  learning_style: LearningStyle;
  content_preferences: ContentPreferences;
  communication_tone: CommunicationTone;
  version: number;
  created_at: string;
  updated_at: string;
}

// Legacy interface for backward compatibility
export interface UserPersona {
  id: string;
  userId: string;

  // Professional Context
  currentRole?: string;
  industry?: string;
  experienceYears?: number;
  careerGoals?: string[];
  technicalLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  // Personal Interests
  primaryInterests: string[];
  secondaryInterests: string[];
  hobbies?: string[];

  // Learning Preferences
  learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
  learningGoals?: string[];
  preferredContentTypes?: string[];
  dailyLearningTime?: number;
  preferredSessionLength?: number;

  // Content Preferences
  contentDensity?: 'concise' | 'comprehensive';
  explanationDepth?: 'surface' | 'moderate' | 'deep';
  exampleFrequency?: 'low' | 'medium' | 'high';
  visualPreference?: 'minimal' | 'moderate' | 'heavy';

  // Communication Style
  communicationTone?: 'formal' | 'professional' | 'friendly' | 'casual' | 'academic';
  formalityLevel?: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
  encouragementLevel?: 'minimal' | 'moderate' | 'high';
  humorAppreciation?: 'none' | 'light' | 'moderate' | 'high';

  createdAt: Date;
  updatedAt: Date;
}
