import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type UserJwtPayload = {
  sub: string;
  email: string;
  role: 'user';
};

export function signUserToken(payload: UserJwtPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, config.jwtSecret) as UserJwtPayload;
    if (payload.role !== 'user') return res.status(401).json({ message: 'Unauthorized' });
    res.locals.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
