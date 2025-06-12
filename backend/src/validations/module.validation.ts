import { z } from 'zod';

export const createModuleSchema = z.object({
  body: z.object({
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
  }),
});

export const updateModuleSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters')
      .trim()
      .optional(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    estimatedDuration: z
      .number()
      .min(1, 'Duration must be at least 1 minute')
      .max(480, 'Duration must be less than 8 hours')
      .optional(),
    isPublished: z.boolean().optional(),
    position: z.number().min(0).optional(),
  }),
});

export const reorderModulesSchema = z.object({
  body: z.object({
    moduleId: z.string().uuid('Invalid module ID'),
    newPosition: z.number().min(1, 'Position must be at least 1'),
  }),
});
