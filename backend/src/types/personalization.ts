// Database row interfaces
export interface UserInteractionRow {
  id: string;
  user_id: string;
  session_id?: string;
  action_type: 'start' | 'engage' | 'struggle' | 'skip' | 'complete' | 'revisit';
  duration?: number;
  metadata?: InteractionMetadata;
  created_at: string;
  updated_at?: string;
}

export interface ContentFeedbackRow {
  id: string;
  user_id: string;
  content_id?: string;
  rating?: number;
  helpful?: boolean;
  comments?: string;
  created_at: string;
  updated_at?: string;
}

export interface PersonaRow {
  id: string;
  user_id: string;
  professional_context?: ProfessionalContext;
  personal_interests?: PersonalInterests;
  learning_style?: LearningStyleData;
  content_preferences?: ContentPreferences;
  communication_tone?: CommunicationTone;
  created_at: string;
  updated_at: string;
}

export interface UserPersonaRow {
  id: string;
  user_id: string;
  current_role?: string;
  industry?: string;
  experience_years?: number;
  career_goals?: string[];
  technical_level?: string;
  primary_interests?: string[];
  secondary_interests?: string[];
  hobbies?: string[];
  learning_style?: string;
  learning_goals?: string[];
  preferred_content_types?: string[];
  daily_learning_time?: number;
  preferred_session_length?: number;
  content_density?: string;
  explanation_depth?: string;
  example_frequency?: string;
  visual_preference?: string;
  communication_tone?: string;
  formality_level?: string;
  encouragement_level?: string;
  humor_appreciation?: string;
  created_at: string;
  updated_at: string;
}

// JSONB field interfaces
export interface ProfessionalContext {
  role?: string;
  industry?: string;
  experienceYears?: number;
  careerAspirations?: string;
  technicalLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface PersonalInterests {
  primary?: string[];
  secondary?: string[];
  hobbies?: string[];
  learningTopics?: string[];
}

export interface LearningStyleData {
  primary?: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
}

export interface ContentPreferences {
  density?: 'concise' | 'balanced' | 'comprehensive';
  detailTolerance?: 'minimal' | 'moderate' | 'extensive';
  examplesPerConcept?: number;
}

export interface CommunicationTone {
  style?: 'casual' | 'professional_friendly' | 'academic' | 'formal';
  technicalComfort?: number; // 0-1 scale
  encouragementLevel?: 'minimal' | 'moderate' | 'high';
  humorAppropriate?: boolean;
}

// Interaction metadata interface
export interface InteractionMetadata {
  timeSpent?: number;
  difficulty?: number;
  contentType?: string;
  topicId?: string;
  moduleId?: string;
  courseId?: string;
  strugglingAreas?: string[];
  helpRequested?: boolean;
  [key: string]: unknown;
}

// Feedback analysis interfaces
export interface FeedbackAnalysis {
  avgRating: number;
  helpfulPercentage: number;
  commonComments: string[];
  difficultyIndicators: string[];
}

export interface ConceptPerformance {
  struggling: string[];
  strong: string[];
}

// Personalization result interfaces
export interface PersonalizationMetrics {
  analogyEffectiveness: number;
  contentHelpfulness: number;
  engagementRate: number;
}

export interface ContentFeedbackParams {
  userId: string;
  contentId: string;
  helpful: boolean;
  rating?: number;
  comments?: string;
}