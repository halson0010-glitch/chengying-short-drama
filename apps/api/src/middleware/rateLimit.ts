import type { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimit({ windowMs, max, message = 'Too many requests', keyPrefix = 'default' }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientIp(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ message });
    }

    return next();
  };
}
