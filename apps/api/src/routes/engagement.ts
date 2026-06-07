import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { serializeDrama } from '../lib/drama.js';
import { sanitizeSensitiveText } from '../lib/privacy.js';
import { prisma } from '../prisma.js';

type UserToken = {
  sub: string;
  email?: string;
  role?: string;
};

const db = prisma as any;

export const engagementRouter = Router();

function optionalUserId(req: { header: (name: string) => string | undefined }) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return '';
  try {
    const payload = jwt.verify(token, config.jwtSecret) as UserToken;
    return payload.role === 'user' && payload.sub ? sanitizeSensitiveText(payload.sub).slice(0, 120) : '';
  } catch {
    return '';
  }
}

function anonymousId(req: { header: (name: string) => string | undefined; query?: Record<string, unknown>; body?: Record<string, unknown> }) {
  const value = req.header('x-anonymous-id') || req.body?.anonymousId || req.query?.anonymousId || '';
  return sanitizeSensitiveText(String(value)).slice(0, 120);
}

function resolveIdentity(req: Parameters<typeof anonymousId>[0]) {
  const userId = optionalUserId(req);
  const anonId = anonymousId(req);
  if (userId) return { userId, anonymousId: anonId || null, identityKey: `user:${userId}` };
  if (anonId) return { userId: null, anonymousId: anonId, identityKey: `anon:${anonId}` };
  return null;
}

function numeric(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function episodeNumber(value: unknown) {
  return Math.max(1, Math.floor(numeric(value, 1)));
}

function clampProgress(value: unknown) {
  return Math.min(1, Math.max(0, numeric(value, 0)));
}

function serializeProgress(row: any) {
  return {
    id: row.id,
    dramaId: row.dramaId,
    episode: row.episode,
    progress: row.progress,
    currentTime: row.currentTime,
    duration: row.duration,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    drama: row.drama ? serializeDrama(row.drama) : undefined,
  };
}

function serializeFavorite(row: any) {
  return {
    id: row.id,
    dramaId: row.dramaId,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    drama: row.drama ? serializeDrama(row.drama) : undefined,
  };
}

function serializeHistory(row: any) {
  return {
    id: row.id,
    dramaId: row.dramaId,
    episode: row.episode,
    source: row.source,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    drama: row.drama ? serializeDrama(row.drama) : undefined,
  };
}

function includeDrama() {
  return { drama: { include: { episodes: true } } };
}

engagementRouter.get('/watch-progress', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.json({ items: [] });
  try {
    const where: Record<string, unknown> = { identityKey: identity.identityKey };
    if (req.query.dramaId) where.dramaId = sanitizeSensitiveText(String(req.query.dramaId)).slice(0, 120);
    const items = await db.watchProgress.findMany({
      where,
      include: includeDrama(),
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100),
    });
    return res.json({ items: items.map(serializeProgress) });
  } catch {
    return res.json({ items: [] });
  }
});

engagementRouter.post('/watch-progress', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.status(400).json({ message: 'anonymousId or user token is required' });
  const dramaId = sanitizeSensitiveText(String(req.body?.dramaId ?? '')).slice(0, 120);
  if (!dramaId) return res.status(400).json({ message: 'dramaId is required' });
  const episode = episodeNumber(req.body?.episode);
  const source = sanitizeSensitiveText(String(req.body?.source ?? '')).slice(0, 80) || null;

  try {
    const progress = await db.watchProgress.upsert({
      where: { identityKey_dramaId_episode: { identityKey: identity.identityKey, dramaId, episode } },
      update: {
        progress: clampProgress(req.body?.progress),
        currentTime: Math.max(0, Math.floor(numeric(req.body?.currentTime))),
        duration: req.body?.duration === undefined ? undefined : Math.max(0, Math.floor(numeric(req.body.duration))),
        userId: identity.userId,
        anonymousId: identity.anonymousId,
      },
      create: {
        identityKey: identity.identityKey,
        userId: identity.userId,
        anonymousId: identity.anonymousId,
        dramaId,
        episode,
        progress: clampProgress(req.body?.progress),
        currentTime: Math.max(0, Math.floor(numeric(req.body?.currentTime))),
        duration: req.body?.duration === undefined ? null : Math.max(0, Math.floor(numeric(req.body.duration))),
      },
      include: includeDrama(),
    });

    await db.watchHistory.upsert({
      where: { identityKey_dramaId_episode: { identityKey: identity.identityKey, dramaId, episode } },
      update: { source, userId: identity.userId, anonymousId: identity.anonymousId },
      create: {
        identityKey: identity.identityKey,
        userId: identity.userId,
        anonymousId: identity.anonymousId,
        dramaId,
        episode,
        source,
      },
    });

    return res.json({ ok: true, item: serializeProgress(progress) });
  } catch {
    return res.status(202).json({ ok: false, message: 'Engagement storage is not ready' });
  }
});

engagementRouter.get('/history', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.json({ items: [] });
  try {
    const items = await db.watchHistory.findMany({
      where: { identityKey: identity.identityKey },
      include: includeDrama(),
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100),
    });
    return res.json({ items: items.map(serializeHistory) });
  } catch {
    return res.json({ items: [] });
  }
});

engagementRouter.delete('/history', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.json({ ok: true, deleted: 0 });
  try {
    const result = await db.watchHistory.deleteMany({ where: { identityKey: identity.identityKey } });
    return res.json({ ok: true, deleted: result.count });
  } catch {
    return res.json({ ok: true, deleted: 0 });
  }
});

engagementRouter.get('/favorites', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.json({ items: [] });
  try {
    const items = await db.userFavorite.findMany({
      where: { identityKey: identity.identityKey },
      include: includeDrama(),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100),
    });
    return res.json({ items: items.map(serializeFavorite) });
  } catch {
    return res.json({ items: [] });
  }
});

engagementRouter.post('/favorites', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.status(400).json({ message: 'anonymousId or user token is required' });
  const dramaId = sanitizeSensitiveText(String(req.body?.dramaId ?? '')).slice(0, 120);
  if (!dramaId) return res.status(400).json({ message: 'dramaId is required' });
  try {
    const item = await db.userFavorite.upsert({
      where: { identityKey_dramaId: { identityKey: identity.identityKey, dramaId } },
      update: { userId: identity.userId, anonymousId: identity.anonymousId },
      create: { identityKey: identity.identityKey, userId: identity.userId, anonymousId: identity.anonymousId, dramaId },
      include: includeDrama(),
    });
    return res.json({ ok: true, item: serializeFavorite(item) });
  } catch {
    return res.status(202).json({ ok: false, message: 'Engagement storage is not ready' });
  }
});

engagementRouter.delete('/favorites/:dramaId', async (req, res) => {
  const identity = resolveIdentity(req);
  if (!identity) return res.json({ ok: true, deleted: 0 });
  const dramaId = sanitizeSensitiveText(String(req.params.dramaId ?? '')).slice(0, 120);
  try {
    const result = await db.userFavorite.deleteMany({ where: { identityKey: identity.identityKey, dramaId } });
    return res.json({ ok: true, deleted: result.count });
  } catch {
    return res.json({ ok: true, deleted: 0 });
  }
});

engagementRouter.get('/entitlements', async (req, res) => {
  const userId = optionalUserId(req);
  if (!userId) return res.json({ items: [], hasActiveEntitlement: false });
  const now = new Date();
  const items = await prisma.userEntitlement.findMany({
    where: { userId, status: 'active', startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: 'desc' },
  });
  return res.json({
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      startsAt: item.startsAt.toISOString(),
      endsAt: item.endsAt.toISOString(),
    })),
    hasActiveEntitlement: items.length > 0,
  });
});
