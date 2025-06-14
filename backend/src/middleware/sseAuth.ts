import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export const authenticateSSE = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Get token from query parameter for SSE endpoints
    const token = req.query.token as string;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.error('Invalid SSE authentication token', { error });
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('SSE Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};