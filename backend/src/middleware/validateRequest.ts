import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const validateRequest = (
  schema: AnyZodObject,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dataToValidate =
        source === 'body'
          ? { body: req.body }
          : source === 'query'
            ? { query: req.query }
            : { params: req.params };

      const validated = await schema.parseAsync(dataToValidate);

      // Replace request data with validated data
      if (source === 'body' && validated.body) {
        req.body = validated.body;
      } else if (source === 'query' && validated.query) {
        req.query = validated.query as any;
      } else if (source === 'params' && validated.params) {
        req.params = validated.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages,
        });
      }

      next(new AppError('Validation error', 400));
    }
  };
};
