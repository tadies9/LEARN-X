import { z } from 'zod';
import { CommonValidations, BaseSchemas } from './base';

// Professional context schema
export const professionalContextSchema = z.object({
  role: CommonValidations.requiredString('Role', 1, 100),
  experienceYears: CommonValidations.positiveNumber('Experience years', 0, 50),
  industry: CommonValidations.requiredString('Industry', 1, 100),
  technicalLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  careerAspirations: CommonValidations.optionalString(500),
  domainExpertise: z.array(z.string()).optional(),
});

// Personal interests schema
export const personalInterestsSchema = z.object({
  primary: z.array(CommonValidations.requiredString('Interest', 1, 50))
    .min(1, 'At least one primary interest is required')
    .max(5, 'Maximum 5 primary interests allowed'),
  secondary: z.array(CommonValidations.requiredString('Interest', 1, 50))
    .max(10, 'Maximum 10 secondary interests allowed')
    .optional(),
  learningTopics: z.array(CommonValidations.requiredString('Learning topic', 1, 50))
    .min(1, 'At least one learning topic is required')
    .max(10, 'Maximum 10 learning topics allowed'),
});

// Learning style schema
export const learningStyleSchema = z.object({
  primary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']),
  secondary: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']).optional(),
  preferenceStrength: z.number().min(0).max(1),
});

// Content preferences schema
export const contentPreferencesSchema = z.object({
  density: z.enum(['concise', 'balanced', 'comprehensive']),
  examplesPerConcept: CommonValidations.positiveNumber('Examples per concept', 1, 5),
  summaryStyle: z.enum(['bullet_points', 'paragraphs', 'visual']),
  detailTolerance: z.enum(['low', 'medium', 'high']),
  repetitionPreference: z.enum(['minimal', 'moderate', 'frequent']),
});

// Communication tone schema
export const communicationToneSchema = z.object({
  style: z.enum(['formal', 'professional_friendly', 'conversational', 'casual']),
  technicalComfort: z.number().min(0).max(1),
  encouragementLevel: z.enum(['minimal', 'moderate', 'high']),
  humorAppropriate: z.boolean(),
});

// Complete persona schema
export const personaSchema = z.object({
  userId: CommonValidations.uuid('User ID'),
  professional: professionalContextSchema,
  interests: personalInterestsSchema,
  learningStyle: learningStyleSchema,
  contentPreferences: contentPreferencesSchema,
  communication: communicationToneSchema,
  version: z.number().min(1).optional().default(1),
}).merge(BaseSchemas.timestamps);

// Create persona schema (without timestamps and version)
export const createPersonaSchema = personaSchema.omit({
  createdAt: true,
  updatedAt: true,
  version: true,
});

// Update persona schema (all fields optional except userId)
export const updatePersonaSchema = personaSchema.partial().extend({
  userId: CommonValidations.uuid('User ID'),
});

// Onboarding step validation
export const onboardingStepSchema = z.object({
  step: z.enum(['welcome', 'professional', 'interests', 'learning-style', 'content-preferences', 'communication', 'review']),
  data: z.record(z.any()),
  timeSpent: CommonValidations.positiveNumber('Time spent', 0).optional(),
});

// Persona analytics schema
export const personaAnalyticsSchema = z.object({
  userId: CommonValidations.uuid('User ID'),
  event: z.enum(['step_started', 'step_completed', 'step_skipped', 'persona_saved', 'persona_updated']),
  step: z.enum(['welcome', 'professional', 'interests', 'learning-style', 'content-preferences', 'communication', 'review']).optional(),
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
    body: createPersonaSchema,
  }),
  
  updatePersona: z.object({
    params: z.object({
      id: CommonValidations.uuid('Persona ID'),
    }),
    body: updatePersonaSchema,
  }),
  
  getPersona: z.object({
    params: z.object({
      userId: CommonValidations.uuid('User ID'),
    }),
  }),
  
  trackOnboarding: z.object({
    body: personaAnalyticsSchema,
  }),
  
  submitOnboardingStep: z.object({
    body: onboardingStepSchema,
  }),
};

// Type exports
export type ProfessionalContext = z.infer<typeof professionalContextSchema>;
export type PersonalInterests = z.infer<typeof personalInterestsSchema>;
export type LearningStyle = z.infer<typeof learningStyleSchema>;
export type ContentPreferences = z.infer<typeof contentPreferencesSchema>;
export type CommunicationTone = z.infer<typeof communicationToneSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type CreatePersonaData = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaData = z.infer<typeof updatePersonaSchema>;
export type OnboardingStepData = z.infer<typeof onboardingStepSchema>;
export type PersonaAnalyticsData = z.infer<typeof personaAnalyticsSchema>;
export type InterestCategories = z.infer<typeof interestCategoriesSchema>;
export type OnboardingStep = 'welcome' | 'professional' | 'interests' | 'learning-style' | 'content-preferences' | 'communication' | 'review';