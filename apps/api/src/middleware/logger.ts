import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`;
    console.log(log);

    if (res.statusCode >= 400) {
      console.error(`Error: ${req.method} ${req.originalUrl} - ${res.statusMessage}`);
    }
  });

  next();
};