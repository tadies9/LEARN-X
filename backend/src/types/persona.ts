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