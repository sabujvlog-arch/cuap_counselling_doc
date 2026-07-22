import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const stores: { [key: string]: { [ip: string]: RateLimitInfo } } = {};

export const createRateLimiter = (options: { windowMs: number; max: number; message: string }) => {
  const { windowMs, max, message } = options;
  const storeKey = `${windowMs}_${max}`;

  if (!stores[storeKey]) {
    stores[storeKey] = {};
  }
  const store = stores[storeKey];

  // Periodic memory leak prevention: sweep expired client IPs
  setInterval(() => {
    const now = Date.now();
    for (const ip in store) {
      if (store[ip].resetTime <= now) {
        delete store[ip];
      }
    }
  }, windowMs * 2);

  return (req: Request, res: Response, next: NextFunction) => {
    // Resolve client IP address
    let ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    const now = Date.now();

    // Client session not found or window expired, initialize fresh rate-limit bucket
    if (!store[ip] || store[ip].resetTime <= now) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil(store[ip].resetTime / 1000));
      return next();
    }

    store[ip].count += 1;
    const remaining = Math.max(0, max - store[ip].count);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[ip].resetTime / 1000));

    if (store[ip].count > max) {
      console.warn(
        `[RATE-LIMIT] Blocked client ${ip} exceeding limit. Current count: ${store[ip].count}/${max}`,
      );
      return res.status(429).json({
        error: message,
      });
    }

    next();
  };
};
