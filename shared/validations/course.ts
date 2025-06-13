import { z } from 'zod';
import { CommonValidations, BaseSchemas } from './base';

// Course settings schema
export const courseSettingsSchema = z.object({
  allowDownloads: z.boolean().optional(),
  allowSharing: z.boolean().optional(),
  requireSequentialProgress: z.boolean().optional(),
  aiPersonalizationEnabled: z.boolean().optional(),
});

// Course schemas
export const createCourseSchema = z.object({
  title: CommonValidations.requiredString('Title'),
  description: CommonValidations.optionalString(2000),
  thumbnailUrl: CommonValidations.url(),
  isPublic: z.boolean().optional().default(false),
  settings: courseSettingsSchema.optional(),
}).merge(BaseSchemas.metadata);

export const updateCourseSchema = createCourseSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

// Module schemas
export const createModuleSchema = z.object({
  courseId: CommonValidations.uuid('Course ID'),
  title: CommonValidations.requiredString('Title'),
  description: CommonValidations.optionalString(1000),
  estimatedDuration: CommonValidations.positiveNumber('Duration', 1, 480).optional(),
});

export const updateModuleSchema = createModuleSchema
  .omit({ courseId: true })
  .partial()
  .extend({
    position: z.number().min(0).optional(),
    isPublished: z.boolean().optional(),
  });

// File processing options
export const processingOptionsSchema = z.object({
  generateSummary: z.boolean().optional(),
  extractKeypoints: z.boolean().optional(),
  generateQuestions: z.boolean().optional(),
  chunkSize: z.number().min(100).max(10000).optional(),
  extractText: z.boolean().optional(),
  generateThumbnail: z.boolean().optional(),
  transcribe: z.boolean().optional(),
});

// File schemas
export const createFileSchema = z.object({
  moduleId: CommonValidations.uuid('Module ID'),
  name: CommonValidations.requiredString('Name').optional(), // Optional because it can be derived from file
  description: CommonValidations.optionalString(1000),
  processingOptions: processingOptionsSchema.optional(),
});

export const updateFileSchema = z.object({
  name: CommonValidations.requiredString('Name'),
  description: CommonValidations.optionalString(1000),
});

export const fileUploadSchema = z.object({
  moduleId: CommonValidations.uuid('Module ID'),
  files: z.array(z.instanceof(File))
    .min(1, 'At least one file is required')
    .max(10, 'Maximum 10 files can be uploaded at once'),
});

// Search and filter schemas
export const courseFiltersSchema = z.object({
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  userId: CommonValidations.uuid('User ID').optional(),
  userIdOrPublic: CommonValidations.uuid('User ID').optional(),
}).merge(CommonValidations.paginationQuery())
  .merge(CommonValidations.sortQuery(['title', 'createdAt', 'updatedAt', 'moduleCount']));

// Query string version (for URLs)
export const courseSearchQuerySchema = z.object({
  search: z.string().optional(),
  isPublic: CommonValidations.booleanFromString(),
  isArchived: CommonValidations.booleanFromString(),
  userId: z.string().uuid().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'moduleCount']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Reorder schemas
export const reorderModulesSchema = z.object({
  moduleId: CommonValidations.uuid('Module ID'),
  newPosition: z.number().min(0),
});

export const reorderFilesSchema = z.object({
  fileIds: z.array(CommonValidations.uuid('File ID')).min(1),
});

// Validation for Express middleware
export const ExpressSchemas = {
  createCourse: z.object({
    body: createCourseSchema,
  }),
  
  updateCourse: z.object({
    params: z.object({
      id: CommonValidations.uuid('Course ID'),
    }),
    body: updateCourseSchema,
  }),
  
  getCourse: z.object({
    params: z.object({
      id: CommonValidations.uuid('Course ID'),
    }),
  }),
  
  courseSearch: z.object({
    query: courseSearchQuerySchema.shape,
  }),
  
  createModule: z.object({
    body: createModuleSchema,
  }),
  
  updateModule: z.object({
    params: z.object({
      id: CommonValidations.uuid('Module ID'),
    }),
    body: updateModuleSchema,
  }),
  
  updateFile: z.object({
    params: z.object({
      id: CommonValidations.uuid('File ID'),
    }),
    body: updateFileSchema,
  }),
  
  reorderModules: z.object({
    body: reorderModulesSchema,
  }),
  
  reorderFiles: z.object({
    params: z.object({
      moduleId: CommonValidations.uuid('Module ID'),
    }),
    body: reorderFilesSchema,
  }),
};

// Type exports
export type CourseSettings = z.infer<typeof courseSettingsSchema>;
export type CreateCourseData = z.infer<typeof createCourseSchema>;
export type UpdateCourseData = z.infer<typeof updateCourseSchema>;
export type CreateModuleData = z.infer<typeof createModuleSchema>;
export type UpdateModuleData = z.infer<typeof updateModuleSchema>;
export type ProcessingOptions = z.infer<typeof processingOptionsSchema>;
export type CreateFileData = z.infer<typeof createFileSchema>;
export type UpdateFileData = z.infer<typeof updateFileSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type CourseFilters = z.infer<typeof courseFiltersSchema>;
export type CourseSearchQuery = z.infer<typeof courseSearchQuerySchema>;
export type ReorderModulesData = z.infer<typeof reorderModulesSchema>;
export type ReorderFilesData = z.infer<typeof reorderFilesSchema>;