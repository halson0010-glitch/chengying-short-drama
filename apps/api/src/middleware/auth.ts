import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type AdminJwtPayload = {
  sub: string;
  username: string;
  role: string;
};

export function signAdminToken(payload: AdminJwtPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    res.locals.admin = jwt.verify(token, config.jwtSecret) as AdminJwtPayload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
