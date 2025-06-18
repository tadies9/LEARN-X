import { z } from 'zod';

// Common validation helpers
const CommonValidations = {
  requiredString: (field: string, min = 1, max = 255) =>
    z.string().min(min, `${field} is required`).max(max, `${field} is too long`),
  optionalString: (max = 255) => z.string().max(max).optional(),
  positiveNumber: (field: string, min = 0, max = 100) =>
    z
      .number()
      .min(min, `${field} must be at least ${min}`)
      .max(max, `${field} must be at most ${max}`),
};

// Academic & Career Goals Schema (matches UI exactly)
export const academicCareerSchema = z.object({
  currentStatus: CommonValidations.requiredString('Current status', 1, 100),
  aspiredIndustry: CommonValidations.requiredString('Aspired industry', 1, 100),
  fieldOfStudy: CommonValidations.optionalString(100),
  careerGoalsLearningObjectives: CommonValidations.optionalString(500),
  // Legacy fields for backward compatibility
  role: CommonValidations.optionalString(100),
  industry: CommonValidations.optionalString(100),
  domainExpertise: z.array(z.string()).optional(),
  careerAspirations: CommonValidations.optionalString(500),
  experienceYears: CommonValidations.positiveNumber('Experience years', 0, 50).optional(),
  technicalLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

// Personal Interests Schema
export const personalInterestsSchema = z.object({
  primary: z.array(z.string()).min(1, 'At least one primary interest is required').max(5),
  secondary: z.array(z.string()).max(5).default([]),
  learningTopics: z.array(z.string()).min(1, 'At least one learning topic is required').max(10),
});

// Learning Style Schema
export const learningStyleSchema = z.object({
  primary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']),
  secondary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']).optional(),
  preferenceStrength: z.number().min(0).max(1),
});

// Content Preferences Schema
export const contentPreferencesSchema = z.object({
  density: z.enum(['concise', 'balanced', 'comprehensive']),
  examplesPerConcept: z.number().min(1).max(5).default(2),
  summaryStyle: z.enum(['bullet_points', 'paragraphs', 'visual']).default('bullet_points'),
  detailTolerance: z.enum(['low', 'medium', 'high']),
  repetitionPreference: z.enum(['minimal', 'moderate', 'frequent']),
});

// Communication Tone Schema (removed technicalComfort)
export const communicationToneSchema = z.object({
  style: z.enum(['formal', 'professional_friendly', 'conversational', 'casual']),
  encouragementLevel: z.enum(['minimal', 'moderate', 'high']),
  humorAppropriate: z.boolean(),
  // Legacy field for backward compatibility
  technicalComfort: z.number().min(0).max(1).optional(),
});

// Complete Persona Schema
export const personaSchema = z.object({
  academicCareer: academicCareerSchema,
  interests: personalInterestsSchema,
  learningStyle: learningStyleSchema,
  contentPreferences: contentPreferencesSchema,
  communication: communicationToneSchema,
  // Legacy field for backward compatibility
  professional: academicCareerSchema.optional(),
});

// Export types
export type AcademicCareerData = z.infer<typeof academicCareerSchema>;
export type PersonalInterestsData = z.infer<typeof personalInterestsSchema>;
export type LearningStyleData = z.infer<typeof learningStyleSchema>;
export type ContentPreferencesData = z.infer<typeof contentPreferencesSchema>;
export type CommunicationToneData = z.infer<typeof communicationToneSchema>;
export type PersonaData = z.infer<typeof personaSchema>;

// Legacy exports for backward compatibility
export const professionalContextSchema = academicCareerSchema;
export type ProfessionalContextData = AcademicCareerData;
