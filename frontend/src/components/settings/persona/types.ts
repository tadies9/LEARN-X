// Type definitions for persona components

export type PersonaSection =
  | 'academicCareer'
  | 'interests'
  | 'learningStyle'
  | 'communication'
  | 'contentPreferences';

export interface AcademicCareerData {
  currentStatus?: string;
  fieldOfStudy?: string;
  aspiredIndustry?: string;
  careerGoalsLearningObjectives?: string;
}

export interface InterestsData {
  primary?: string[];
  secondary?: string[];
  learningTopics?: string[];
}

export interface LearningStyleData {
  primary?: string;
  secondary?: string;
  preferenceStrength?: number;
}

export interface CommunicationData {
  style?: string;
  encouragementLevel?: string;
  humorAppropriate?: boolean;
}

export interface ContentPreferencesData {
  density?: string;
  detailTolerance?: string;
  repetitionPreference?: string;
}

export type EditData =
  | AcademicCareerData
  | InterestsData
  | LearningStyleData
  | CommunicationData
  | ContentPreferencesData;

export const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual' },
  { id: 'auditory', label: 'Auditory' },
  { id: 'reading', label: 'Reading/Writing' },
  { id: 'kinesthetic', label: 'Kinesthetic' },
];

export const COMMUNICATION_STYLES = [
  { value: 'formal', label: 'Formal' },
  { value: 'professional_friendly', label: 'Professional & Friendly' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'casual', label: 'Casual' },
];

export const ENCOURAGEMENT_LEVELS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

export const CONTENT_DENSITY_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'comprehensive', label: 'Comprehensive' },
];
