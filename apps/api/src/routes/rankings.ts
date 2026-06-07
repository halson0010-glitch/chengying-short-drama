import { Router } from 'express';
import { serializeDrama } from '../lib/drama.js';
import { safeParsePayload, payloadText } from '../lib/analyticsPayload.js';
import { prisma } from '../prisma.js';

const db = prisma as any;

export const rankingsRouter = Router();

const rankingTypes = new Set(['hot', 'rising', 'new', 'completion', 'favorite']);

function heatValue(heat: string) {
  return Number.parseFloat(String(heat).replace(/[^\d.]/g, '')) || 0;
}

function dramaKey(payload: Record<string, unknown>) {
  const dramaId = payloadText(payload, ['dramaId', 'drama_id']);
  const dramaTitle = payloadText(payload, ['dramaTitle', 'drama_title', 'title']);
  return { dramaId, dramaTitle };
}

function bumpScore(map: Map<string, number>, key: string, score: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + score);
}

rankingsRouter.get('/', async (req, res) => {
  const type = rankingTypes.has(String(req.query.type)) ? String(req.query.type) : 'hot';
  const limit = Math.min(Math.max(Number(req.query.limit ?? 30), 1), 50);
  const dramas = await prisma.drama.findMany({
    where: { status: 'published' },
    include: { episodes: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  if (type === 'new') {
    return res.json({
      type,
      items: dramas
        .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
        .slice(0, limit)
        .map((drama, index) => ({ rank: index + 1, score: heatValue(drama.heat), drama: serializeDrama(drama) })),
    });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const relevantEvents = await prisma.analyticsEvent.findMany({
    where: {
      ...(type === 'rising' ? { createdAt: { gte: sevenDaysAgo } } : {}),
      event: {
        in: [
          'play_start',
          'drama_card_click',
          'play_button_click',
          'play_complete',
          'favorite_toggle',
          'ranking_item_click',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20_000,
  });

  const scores = new Map<string, number>();
  const starts = new Map<string, number>();
  const completes = new Map<string, number>();
  const titleToId = new Map(dramas.map((drama) => [drama.title, drama.id]));

  for (const event of relevantEvents) {
    const payload = safeParsePayload(event.payloadJson);
    const { dramaId, dramaTitle } = dramaKey(payload);
    const id = dramaId || titleToId.get(dramaTitle) || '';
    if (!id) continue;

    if (type === 'completion') {
      if (event.event === 'play_start') starts.set(id, (starts.get(id) ?? 0) + 1);
      if (event.event === 'play_complete') completes.set(id, (completes.get(id) ?? 0) + 1);
      continue;
    }

    if (type === 'favorite') {
      if (event.event === 'favorite_toggle' && payload.collected !== false) bumpScore(scores, id, 2);
      continue;
    }

    const recencyBoost = type === 'rising' && event.createdAt >= dayAgo ? 2 : 1;
    if (event.event === 'play_start') bumpScore(scores, id, 5 * recencyBoost);
    if (event.event === 'play_button_click') bumpScore(scores, id, 3 * recencyBoost);
    if (event.event === 'drama_card_click' || event.event === 'ranking_item_click') bumpScore(scores, id, 2 * recencyBoost);
  }

  if (type === 'favorite') {
    try {
      const groupedFavorites = await db.userFavorite.groupBy({ by: ['dramaId'], _count: { dramaId: true } });
      groupedFavorites.forEach((row: { dramaId: string; _count: { dramaId: number } }) => {
        bumpScore(scores, row.dramaId, row._count.dramaId * 4);
      });
    } catch {
      // The Vercel temporary API may be deployed before db:push; analytics fallback still works.
    }
  }

  if (type === 'completion') {
    dramas.forEach((drama) => {
      const startCount = starts.get(drama.id) ?? 0;
      const completeCount = completes.get(drama.id) ?? 0;
      const score = startCount ? (completeCount / startCount) * 100 + completeCount : heatValue(drama.heat);
      scores.set(drama.id, score);
    });
  }

  const items = dramas
    .map((drama) => ({
      drama,
      score: scores.get(drama.id) ?? (type === 'hot' || type === 'rising' ? heatValue(drama.heat) : 0),
    }))
    .sort((first, second) => second.score - first.score || heatValue(second.drama.heat) - heatValue(first.drama.heat))
    .slice(0, limit)
    .map((item, index) => ({ rank: index + 1, score: Math.round(item.score * 10) / 10, drama: serializeDrama(item.drama) }));

  return res.json({ type, items });
});
