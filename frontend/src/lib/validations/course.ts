import { z } from 'zod';

// Course validation schemas
export const courseSettingsSchema = z.object({
  allowDownloads: z.boolean().optional(),
  allowSharing: z.boolean().optional(),
  requireSequentialProgress: z.boolean().optional(),
  aiPersonalizationEnabled: z.boolean().optional(),
});

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  isPublic: z.boolean().optional().default(false),
  settings: courseSettingsSchema.optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

// Module validation schemas
export const createModuleSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  estimatedDuration: z
    .number()
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration must be less than 8 hours')
    .optional(),
});

export const updateModuleSchema = createModuleSchema
  .omit({ courseId: true })
  .partial()
  .extend({
    position: z.number().min(0).optional(),
    isPublished: z.boolean().optional(),
  });

// File validation
export const fileUploadSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),
  files: z
    .array(z.instanceof(File))
    .min(1, 'At least one file is required')
    .max(10, 'Maximum 10 files can be uploaded at once'),
});

export const createFileSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be less than 255 characters')
    .trim(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  processingOptions: z
    .object({
      extractText: z.boolean().optional(),
      generateThumbnail: z.boolean().optional(),
      transcribe: z.boolean().optional(),
    })
    .optional(),
});

export const updateFileSchema = z.object({
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be less than 255 characters')
    .trim(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

// Search and filter schemas
export const courseSearchSchema = z.object({
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  userId: z.string().uuid().optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z
    .enum(['title', 'createdAt', 'updatedAt', 'moduleCount'])
    .optional()
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Type exports
export type CreateCourseData = z.infer<typeof createCourseSchema>;
export type UpdateCourseData = z.infer<typeof updateCourseSchema>;
export type CreateModuleData = z.infer<typeof createModuleSchema>;
export type UpdateModuleData = z.infer<typeof updateModuleSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type CreateFileData = z.infer<typeof createFileSchema>;
export type UpdateFileData = z.infer<typeof updateFileSchema>;
export type CourseSearchData = z.infer<typeof courseSearchSchema>;
