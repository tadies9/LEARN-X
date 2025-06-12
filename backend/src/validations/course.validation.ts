import { z } from 'zod';

// Course validation schemas
export const courseSettingsSchema = z.object({
  allowDownloads: z.boolean().optional(),
  allowSharing: z.boolean().optional(),
  requireSequentialProgress: z.boolean().optional(),
  aiPersonalizationEnabled: z.boolean().optional(),
});

export const createCourseSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters')
      .trim(),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    isPublic: z.boolean().optional().default(false),
    settings: courseSettingsSchema.optional(),
  }),
});

export const updateCourseSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters')
      .trim()
      .optional(),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    isPublic: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    settings: courseSettingsSchema.optional(),
  }),
});

export const courseSearchSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isPublic: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    isArchived: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    userId: z.string().uuid().optional(),
    page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
    sortBy: z
      .enum(['title', 'created_at', 'updated_at', 'module_count'])
      .optional()
      .default('updated_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

// File validation schemas
export const updateFileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters')
      .optional(),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  }),
});
