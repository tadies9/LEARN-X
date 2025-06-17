import { z } from 'zod';
import { CommonValidations, BaseSchemas } from './base';

// Academic & Career Goals schema (matches frontend UI)
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

// Personal interests schema
export const personalInterestsSchema = z.object({
  primary: z.array(z.string()).min(1, 'At least one primary interest is required').max(5),
  secondary: z.array(z.string()).max(5).optional().default([]),
  learningTopics: z.array(z.string()).min(1, 'At least one learning topic is required').max(10),
});

// Learning style schema (with secondary option)
export const learningStyleSchema = z.object({
  primary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']),
  secondary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']).optional(),
  preferenceStrength: z.number().min(0).max(1),
});

// Content preferences schema
export const contentPreferencesSchema = z.object({
  density: z.enum(['concise', 'balanced', 'comprehensive']),
  examplesPerConcept: z.number().min(1).max(5).default(2),
  summaryStyle: z.enum(['bullet_points', 'paragraphs', 'visual']).default('bullet_points'),
  detailTolerance: z.enum(['low', 'medium', 'high']),
  repetitionPreference: z.enum(['minimal', 'moderate', 'frequent']),
});

// Communication tone schema (removed technicalComfort)
export const communicationToneSchema = z.object({
  style: z.enum(['formal', 'professional_friendly', 'conversational', 'casual']),
  encouragementLevel: z.enum(['minimal', 'moderate', 'high']),
  humorAppropriate: z.boolean(),
  // Legacy field for backward compatibility
  technicalComfort: z.number().min(0).max(1).optional(),
});

// Complete persona schema
export const personaSchema = z.object({
  userId: CommonValidations.uuid('User ID'),
  academicCareer: academicCareerSchema,
  interests: personalInterestsSchema,
  learningStyle: learningStyleSchema,
  contentPreferences: contentPreferencesSchema,
  communication: communicationToneSchema,
  version: z.number().min(1).optional().default(1),
  // Legacy field for backward compatibility
  professional: academicCareerSchema.optional(),
}).merge(BaseSchemas.timestamps);

// Create persona schema (without timestamps and version)
export const PersonaCreateSchemas = {
  // For creating persona
  create: z.object({
    academicCareer: academicCareerSchema,
    interests: personalInterestsSchema,
    learningStyle: learningStyleSchema,
    contentPreferences: contentPreferencesSchema,
    communication: communicationToneSchema,
    // Legacy field for backward compatibility
    professional: academicCareerSchema.optional(),
  }),

  // For updating persona  
  update: z.object({
    academicCareer: academicCareerSchema.optional(),
    interests: personalInterestsSchema.optional(),
    learningStyle: learningStyleSchema.optional(),
    contentPreferences: contentPreferencesSchema.optional(),
    communication: communicationToneSchema.optional(),
    // Legacy field for backward compatibility
    professional: academicCareerSchema.optional(),
  }),

  // For getting persona by user ID
  getByUserId: z.object({
    userId: CommonValidations.uuid('User ID'),
  }),

  // For getting persona by ID
  getById: z.object({
    id: CommonValidations.uuid('Persona ID'),
  }),
};

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
export type ProfessionalContext = AcademicCareerData;
export type PersonalInterests = PersonalInterestsData;
export type LearningStyle = LearningStyleData;
export type ContentPreferences = ContentPreferencesData;
export type CommunicationTone = CommunicationToneData;

// Onboarding step validation
export const onboardingStepSchema = z.object({
  step: z.enum(['welcome', 'academic-career', 'interests', 'learning-style', 'content-preferences', 'communication', 'review']),
  data: z.record(z.any()),
  timeSpent: CommonValidations.positiveNumber('Time spent', 0).optional(),
});

// Persona analytics schema
export const personaAnalyticsSchema = z.object({
  userId: CommonValidations.uuid('User ID'),
  event: z.enum(['step_started', 'step_completed', 'step_skipped', 'persona_saved', 'persona_updated']),
  step: z.enum(['welcome', 'academic-career', 'interests', 'learning-style', 'content-preferences', 'communication', 'review']).optional(),
  timeSpent: CommonValidations.positiveNumber('Time spent', 0).optional(),
  metadata: z.record(z.any()).optional(),
});

// Predefined options validation
export const interestCategoriesSchema = z.object({
  sports: z.array(z.string()),
  arts: z.array(z.string()),
  technology: z.array(z.string()),
  hobbies: z.array(z.string()),
  science: z.array(z.string()),
  business: z.array(z.string()),
});

export const industriesSchema = z.array(z.string()).min(1);
export const learningTopicsSchema = z.array(z.string()).min(1);

// Express validation schemas
export const ExpressPersonaSchemas = {
  createPersona: z.object({
    body: PersonaCreateSchemas.create,
  }),
  
  updatePersona: z.object({
    params: PersonaCreateSchemas.getById,
    body: PersonaCreateSchemas.update,
  }),
  
  getPersona: z.object({
    params: PersonaCreateSchemas.getByUserId,
  }),
  
  trackOnboarding: z.object({
    body: personaAnalyticsSchema,
  }),
  
  submitOnboardingStep: z.object({
    body: onboardingStepSchema,
  }),
};

// Type exports
export type OnboardingStepData = z.infer<typeof onboardingStepSchema>;
export type PersonaAnalyticsData = z.infer<typeof personaAnalyticsSchema>;
export type InterestCategories = z.infer<typeof interestCategoriesSchema>;
export type OnboardingStep = 'welcome' | 'academic-career' | 'interests' | 'learning-style' | 'content-preferences' | 'communication' | 'review';