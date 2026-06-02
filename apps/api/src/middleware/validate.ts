import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        message: '参数错误',
        issues: result.error.issues,
      });
    }
    req.body = result.data;
    return next();
  };
}

export function validationError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: '参数错误', issues: error.issues });
  }
  return undefined;
}
