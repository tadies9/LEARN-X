import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests. Please try again later.',
        retryAfter: (req as any).rateLimit?.resetTime,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// Specific rate limiters for different endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '100'),
  keyGenerator: (req: Request) => {
    // Use user ID for rate limiting if available, otherwise use IP
    return (req as any).user?.id || req.ip;
  },
  skip: async (req: Request) => {
    // Skip rate limiting for premium users (implement based on your subscription logic)
    const user = (req as any).user;
    if (user?.subscription_tier === 'premium' || user?.subscription_tier === 'team') {
      return true;
    }
    return false;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'AI_RATE_LIMIT_ERROR',
        message: 'AI request limit reached. Please try again later or upgrade your plan.',
        retryAfter: (req as any).rateLimit?.resetTime,
        timestamp: new Date().toISOString(),
      },
    });
  },
});
