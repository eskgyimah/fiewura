import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

// Prune expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (now > store[key].resetTime) delete store[key];
  }
}, 5 * 60 * 1000);

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = { count: 1, resetTime: now + windowMs };
    } else {
      store[key].count++;
    }

    if (store[key].count > maxRequests) {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
      return;
    }

    next();
  };
};