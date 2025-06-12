import { z } from 'zod';

// Professional Context Schema
export const professionalContextSchema = z.object({
  role: z.string().min(1, 'Current role is required').max(100),
  experienceYears: z.number().min(0).max(50),
  industry: z.string().min(1, 'Industry is required'),
  technicalLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  careerAspirations: z.string().max(500).optional(),
  domainExpertise: z.array(z.string()).max(10).optional(),
});

// Personal Interests Schema
export const personalInterestsSchema = z.object({
  primary: z.array(z.string()).min(1, 'Select at least one primary interest').max(5),
  secondary: z.array(z.string()).max(5).default([]),
  learningTopics: z.array(z.string()).min(1, 'Select at least one learning topic').max(10),
});

// Learning Style Schema
export const learningStyleSchema = z.object({
  primary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']),
  secondary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']).optional(),
  preferenceStrength: z.number().min(0).max(1).default(0.8),
});

// Content Preferences Schema
export const contentPreferencesSchema = z.object({
  density: z.enum(['concise', 'balanced', 'comprehensive']),
  examplesPerConcept: z.number().min(1).max(5).default(2),
  summaryStyle: z.enum(['bullet_points', 'paragraphs', 'visual']),
  detailTolerance: z.enum(['low', 'medium', 'high']),
  repetitionPreference: z.enum(['minimal', 'moderate', 'frequent']),
});

// Communication Tone Schema
export const communicationToneSchema = z.object({
  style: z.enum(['formal', 'professional_friendly', 'conversational', 'casual']),
  technicalComfort: z.number().min(0).max(1).default(0.5),
  encouragementLevel: z.enum(['minimal', 'moderate', 'high']),
  humorAppropriate: z.boolean().default(false),
});

// Complete Persona Schema
export const personaSchema = z.object({
  professional: professionalContextSchema,
  interests: personalInterestsSchema,
  learningStyle: learningStyleSchema,
  contentPreferences: contentPreferencesSchema,
  communication: communicationToneSchema,
});

// Type exports
export type ProfessionalContextData = z.infer<typeof professionalContextSchema>;
export type PersonalInterestsData = z.infer<typeof personalInterestsSchema>;
export type LearningStyleData = z.infer<typeof learningStyleSchema>;
export type ContentPreferencesData = z.infer<typeof contentPreferencesSchema>;
export type CommunicationToneData = z.infer<typeof communicationToneSchema>;
export type PersonaData = z.infer<typeof personaSchema>;
