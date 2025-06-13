import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Invalid authentication token', 401);
    }

    // Ensure user exists in our database
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      logger.error('Error checking user existence:', userError);
      throw new AppError('Database error', 500);
    }

    // Create user if doesn't exist
    if (!existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        logger.error('Error creating user:', createError);
        throw new AppError('Failed to create user profile', 500);
      }

      req.user = {
        id: newUser.id,
        email: newUser.email,
        role: 'user',
      };
    } else {
      req.user = {
        id: existingUser.id,
        email: existingUser.email,
        role: 'user',
      };
    }

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
