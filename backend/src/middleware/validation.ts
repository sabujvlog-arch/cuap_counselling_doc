import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const validateRequest = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((issue: any) => ({
            field: issue.path.slice(1).join('.'), // Remove the top-level 'body' / 'query' prefix
            message: issue.message,
          })),
        });
      }
      return res.status(500).json({ error: 'Internal validation error' });
    }
  };
};
