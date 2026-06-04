import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { signUserToken, requireUser } from '../lib/userAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

const emailSchema = z.string().trim().email().max(160).transform((value) => value.toLowerCase());

const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(120)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/\d/, 'Password must contain at least one number.'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(120),
});

const authRateLimit = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  keyPrefix: 'auth',
  message: 'Too many auth attempts. Please try again later.',
});

function publicUser(user: { id: string; email: string; createdAt: Date; emailVerifiedAt?: Date | null; lastLoginAt?: Date | null }) {
  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

authRouter.post('/register', authRateLimit, validateBody(registerSchema), async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (existing) return res.status(409).json({ message: 'Email already registered. Please login instead.' });

  const passwordHash = await bcrypt.hash(req.body.password, config.passwordHashRounds);
  const user = await prisma.user.create({
    data: {
      email: req.body.email,
      passwordHash,
    },
  });

  const token = signUserToken({ sub: user.id, email: user.email, role: 'user' });
  return res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post('/login', authRateLimit, validateBody(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    return res.status(423).json({ message: 'Account is temporarily locked. Please try again later.' });
  }

  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) {
    const failedLoginCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockUntil: failedLoginCount >= 10 ? new Date(Date.now() + 15 * 60_000) : null,
      },
    });
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const token = signUserToken({ sub: updatedUser.id, email: updatedUser.email, role: 'user' });
  return res.json({ token, user: publicUser(updatedUser) });
});

authRouter.get('/me', requireUser, async (_req, res) => {
  const payload = res.locals.user as { sub: string };
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({ user: publicUser(user) });
});
