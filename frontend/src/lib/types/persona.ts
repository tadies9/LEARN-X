// Persona type definitions based on docs/core/CLAUDE.md specifications

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

export interface ProfessionalContext {
  currentStatus: string;
  fieldOfStudy?: string;
  aspiredIndustry: string;
  careerGoalsLearningObjectives?: string;
  // Legacy fields for backward compatibility
  role?: string;
  experienceYears?: number;
  industry?: string;
  technicalLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  careerAspirations?: string;
  domainExpertise?: string[];
}

export interface PersonalInterests {
  primary: string[];
  secondary: string[];
  learningTopics: string[];
}

export interface LearningStyle {
  primary: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  secondary?: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  preferenceStrength: number; // 0.0 to 1.0
}

export interface ContentPreferences {
  density: 'concise' | 'balanced' | 'comprehensive';
  examplesPerConcept: number; // 1-5
  summaryStyle: 'bullet_points' | 'paragraphs' | 'visual';
  detailTolerance: 'low' | 'medium' | 'high';
  repetitionPreference: 'minimal' | 'moderate' | 'frequent';
}

export interface CommunicationTone {
  style: 'formal' | 'professional_friendly' | 'conversational' | 'casual';
  encouragementLevel: 'minimal' | 'moderate' | 'high';
  humorAppropriate: boolean;
  // Legacy field for backward compatibility
  technicalComfort?: number;
}

export interface Persona {
  id?: string;
  userId: string;
  academicCareer: ProfessionalContext;
  interests: PersonalInterests;
  learningStyle: LearningStyle;
  contentPreferences: ContentPreferences;
  communication: CommunicationTone;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  // Legacy field for backward compatibility
  professional?: ProfessionalContext;
}

// Onboarding step types
export type OnboardingStep =
  | 'welcome'
  | 'academic-career'
  | 'interests'
  | 'learning-style'
  | 'content-preferences'
  | 'communication'
  | 'review';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  component: React.ComponentType<unknown>;
}

// Common interests categories
export const INTEREST_CATEGORIES = {
  sports: ['Basketball', 'Soccer', 'Tennis', 'Golf', 'Running', 'Cycling', 'Swimming', 'Yoga'],
  arts: ['Music', 'Painting', 'Photography', 'Writing', 'Dance', 'Theater', 'Film'],
  technology: ['Programming', 'Gaming', 'Robotics', 'AI/ML', 'Cybersecurity', 'Web3'],
  hobbies: ['Cooking', 'Gardening', 'Travel', 'Reading', 'Podcasts', 'Board Games'],
  science: ['Astronomy', 'Biology', 'Chemistry', 'Physics', 'Environmental Science'],
  business: ['Entrepreneurship', 'Investing', 'Marketing', 'Finance', 'Real Estate'],
} as const;

// Industry options
export const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Media & Entertainment',
  'Government',
  'Non-profit',
  'Real Estate',
  'Legal',
  'Other',
] as const;

// Learning topics
export const LEARNING_TOPICS = [
  'Artificial Intelligence',
  'Data Science',
  'Web Development',
  'Mobile Development',
  'Cloud Computing',
  'Cybersecurity',
  'Blockchain',
  'Machine Learning',
  'DevOps',
  'UI/UX Design',
  'Digital Marketing',
  'Project Management',
  'Business Analysis',
  'Financial Analysis',
  'Other',
] as const;
