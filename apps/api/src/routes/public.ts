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

publicRouter.get('/search/hot', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 30), 1), 30);
  const since = new Date(Date.now() - days * 86_400_000);
  const events = await prisma.analyticsEvent.findMany({
    where: { event: 'search_submit', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  const counts = new Map<string, number>();
  events.forEach((event) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = event.payloadJson ? JSON.parse(event.payloadJson) as Record<string, unknown> : {};
    } catch {
      payload = {};
    }
    const keyword = sanitizeSensitiveText(String(payload.keyword ?? payload.search_term ?? '').trim().replace(/\s+/g, ' ')).slice(0, 60);
    if (!keyword || keyword.includes('[redacted]')) return;
    counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  });
  return res.json({
    items: [...counts.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 12),
  });
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
