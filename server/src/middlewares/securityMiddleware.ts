import { Request, Response, NextFunction } from 'express';
import { sanitizeMongoQuery } from '../utils/securityUtils';

export const sanitizeRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body) {
    req.body = sanitizeMongoQuery(req.body);
  }

  if (req.query) {
    req.query = sanitizeMongoQuery(req.query) as any;
  }

  if (req.params) {
    req.params = sanitizeMongoQuery(req.params) as any;
  }

  next();
};

export const rateLimitErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err && err.statusCode === 429) {
    const retryAfter = err.retryAfter || 900; // Default 15 minutes
    const limit = err.limit || 100;

    res.set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(
        Date.now() + retryAfter * 1000
      ).toISOString(),
    });

    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: retryAfter,
      limit: limit,
      resetTime: new Date(Date.now() + retryAfter * 1000).toISOString(),
    });
  } else {
    next(err);
  }
};

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Global error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
