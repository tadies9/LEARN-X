// Base validation utilities
export * from './base';

// Domain-specific validations
export * from './auth';
export * from './course';
export * from './persona';

// Re-export zod for convenience
export { z } from 'zod';

// Validation middleware factory for Express
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateSchema } from './base';

export function createValidationMiddleware<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateSchema(schema, {
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.message,
        errors: result.error.errors,
      });
    }

    // Attach validated data to request
    req.validatedData = result.data;
    next();
  };
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}