import { Request, Response, NextFunction } from 'express';

// In-memory metrics storage for lightweight application performance tracking
export const performanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTimeMs: 0,
  slowRequestsCount: 0, // Requests taking > 500ms
  endpointStats: {} as Record<string, { count: number; totalTimeMs: number; errors: number }>,
};

export const monitorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  performanceMetrics.totalRequests += 1;

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // nanoseconds to milliseconds

    performanceMetrics.totalResponseTimeMs += timeMs;
    if (res.statusCode >= 200 && res.statusCode < 400) {
      performanceMetrics.successfulRequests += 1;
    } else {
      performanceMetrics.failedRequests += 1;
    }

    if (timeMs > 500) {
      performanceMetrics.slowRequestsCount += 1;
      console.warn(
        `[PERF WARNING] Slow API response detected: ${req.method} ${req.originalUrl} took ${timeMs}ms`,
      );
    }

    const routeKey = `${req.method} ${req.baseUrl || ''}${req.path}`;
    if (!performanceMetrics.endpointStats[routeKey]) {
      performanceMetrics.endpointStats[routeKey] = { count: 0, totalTimeMs: 0, errors: 0 };
    }
    const stats = performanceMetrics.endpointStats[routeKey];
    stats.count += 1;
    stats.totalTimeMs += timeMs;
    if (res.statusCode >= 400) {
      stats.errors += 1;
    }
  });

  next();
};
