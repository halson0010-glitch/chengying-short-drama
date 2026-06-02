import { Router } from 'express';
import { prisma } from '../prisma.js';
import { matchesDrama, serializeDrama } from '../lib/drama.js';
import { sanitizeSensitiveText } from '../lib/privacy.js';

export const publicRouter = Router();

publicRouter.get('/dramas', async (_req, res) => {
  const dramas = await prisma.drama.findMany({
    where: { status: 'published' },
    include: { episodes: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(dramas.map(serializeDrama));
});

publicRouter.get('/dramas/:id', async (req, res) => {
  const drama = await prisma.drama.findFirst({
    where: { id: req.params.id, status: 'published' },
    include: { episodes: true },
  });
  if (!drama) return res.status(404).json({ message: 'Drama not found' });
  return res.json(serializeDrama(drama));
});

publicRouter.get('/search', async (req, res) => {
  const keyword = sanitizeSensitiveText(String(req.query.q ?? '')).slice(0, 60);
  if (!keyword) return res.json([]);
  const dramas = await prisma.drama.findMany({
    where: { status: 'published' },
    include: { episodes: true },
    orderBy: { updatedAt: 'desc' },
  });
  const serialized = dramas.map(serializeDrama).filter((drama) => matchesDrama(drama, keyword));
  return res.json(serialized);
});
