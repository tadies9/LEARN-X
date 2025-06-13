import { z } from 'zod';

// Common validation patterns
export const CommonValidations = {
  // String patterns
  requiredString: (fieldName: string, min = 1, max = 255) =>
    z.string()
      .min(1, `${fieldName} is required`)
      .min(min, `${fieldName} must be at least ${min} characters`)
      .max(max, `${fieldName} must be less than ${max} characters`)
      .trim(),

  optionalString: (max = 255) =>
    z.string()
      .max(max, `Must be less than ${max} characters`)
      .optional(),

  email: () =>
    z.string()
      .min(1, 'Email is required')
      .email('Invalid email address'),

  uuid: (fieldName = 'ID') =>
    z.string()
      .uuid(`Invalid ${fieldName.toLowerCase()}`),

  // Password with common requirements
  password: () =>
    z.string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),

  // Number patterns
  positiveNumber: (fieldName: string, min = 1, max?: number) => {
    let schema = z.number()
      .min(min, `${fieldName} must be at least ${min}`);
    
    if (max) {
      schema = schema.max(max, `${fieldName} must be less than ${max}`);
    }
    
    return schema;
  },

  // Pagination
  paginationQuery: () => z.object({
    page: z.number().min(1).optional().default(1),
    limit: z.number().min(1).max(100).optional().default(20),
  }),

  // Sort options
  sortQuery: (allowedFields: string[]) => z.object({
    sortBy: z.enum(allowedFields as [string, ...string[]])
      .optional()
      .default(allowedFields[0]),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),

  // Boolean from string (for query params)
  booleanFromString: () =>
    z.string()
      .transform((val) => val === 'true')
      .optional(),

  // File size validation
  fileSize: (maxSizeInMB: number) =>
    z.number()
      .max(maxSizeInMB * 1024 * 1024, `File size must be less than ${maxSizeInMB}MB`),

  // URL validation
  url: (required = false) => {
    const schema = z.string().url('Invalid URL');
    return required ? schema : schema.optional();
  },

  // Date validation
  dateString: () =>
    z.string()
      .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),

  // Confirm password pattern
  confirmPassword: () => z.object({
    password: CommonValidations.password(),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),
};

// Base schemas that can be extended
export const BaseSchemas = {
  // Timestamp fields
  timestamps: z.object({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),

  // User reference
  userRef: z.object({
    userId: CommonValidations.uuid('User ID'),
  }),

  // Metadata
  metadata: z.object({
    metadata: z.record(z.any()).optional(),
  }),
};

// Error handling utilities
export function createValidationError(issues: z.ZodIssue[]) {
  const errors = issues.reduce((acc, issue) => {
    const path = issue.path.join('.');
    acc[path] = issue.message;
    return acc;
  }, {} as Record<string, string>);

  return {
    message: 'Validation failed',
    errors,
  };
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: ReturnType<typeof createValidationError>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: createValidationError(result.error.issues),
  };
}