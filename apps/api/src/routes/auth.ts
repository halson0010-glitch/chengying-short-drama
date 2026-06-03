import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { signUserToken, requireUser } from '../lib/userAuth.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

const emailSchema = z.string().trim().email().max(160).transform((value) => value.toLowerCase());

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(120),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(120),
});

function publicUser(user: { id: string; email: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: req.body.email,
      passwordHash,
    },
  });

  const token = signUserToken({ sub: user.id, email: user.email, role: 'user' });
  return res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

  const token = signUserToken({ sub: user.id, email: user.email, role: 'user' });
  return res.json({ token, user: publicUser(user) });
});

authRouter.get('/me', requireUser, async (_req, res) => {
  const payload = res.locals.user as { sub: string };
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({ user: publicUser(user) });
});
