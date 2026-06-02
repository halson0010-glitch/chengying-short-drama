import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { dramaInput, serializeDrama, serializeEpisode } from '../lib/drama.js';
import { dramaCreateSchema, dramaUpdateSchema, episodeCreateSchema, episodeUpdateSchema, loginSchema } from '../lib/schemas.js';
import { requireAdmin, signAdminToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';

export const adminRouter = Router();

adminRouter.post('/login', rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyPrefix: 'admin-login', message: '登录尝试过于频繁，请稍后再试' }), validateBody(loginSchema), async (req, res) => {
  const username = String(req.body?.username ?? '');
  const password = String(req.body?.password ?? '');
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  const token = signAdminToken({ sub: user.id, username: user.username, role: user.role });
  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

adminRouter.use(requireAdmin);

adminRouter.get('/dramas', async (_req, res) => {
  const dramas = await prisma.drama.findMany({
    include: { episodes: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(dramas.map(serializeDrama));
});

adminRouter.post('/dramas', validateBody(dramaCreateSchema), async (req, res) => {
  const data = dramaInput(req.body ?? {});
  if (!data.title) return res.status(400).json({ message: 'title is required' });
  const drama = await prisma.drama.create({
    data: data as never,
    include: { episodes: true },
  });
  return res.status(201).json(serializeDrama(drama));
});

adminRouter.put('/dramas/:id', validateBody(dramaUpdateSchema), async (req, res) => {
  const dramaId = String(req.params.id);
  const data = dramaInput(req.body ?? {}, true);
  const drama = await prisma.drama.update({
    where: { id: dramaId },
    data: data as never,
    include: { episodes: true },
  });
  return res.json(serializeDrama(drama));
});

adminRouter.delete('/dramas/:id', async (req, res) => {
  const dramaId = String(req.params.id);
  await prisma.drama.delete({ where: { id: dramaId } });
  return res.json({ ok: true });
});

adminRouter.post('/dramas/:id/publish', async (req, res) => {
  const dramaId = String(req.params.id);
  const drama = await prisma.drama.update({
    where: { id: dramaId },
    data: { status: 'published' },
    include: { episodes: true },
  });
  return res.json(serializeDrama(drama));
});

adminRouter.post('/dramas/:id/offline', async (req, res) => {
  const dramaId = String(req.params.id);
  const drama = await prisma.drama.update({
    where: { id: dramaId },
    data: { status: 'offline' },
    include: { episodes: true },
  });
  return res.json(serializeDrama(drama));
});

adminRouter.get('/dramas/:id/episodes', async (req, res) => {
  const dramaId = String(req.params.id);
  const episodes = await prisma.episode.findMany({
    where: { dramaId },
    orderBy: { episode: 'asc' },
  });
  return res.json(episodes.map(serializeEpisode));
});

adminRouter.post('/dramas/:id/episodes', validateBody(episodeCreateSchema), async (req, res) => {
  const dramaId = String(req.params.id);
  const episodeNumber = Number(req.body?.episode);
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return res.status(400).json({ message: 'episode must be a positive integer' });
  }

  const data = {
    title: req.body?.title ? String(req.body.title) : null,
    videoUrl: req.body?.videoUrl ? String(req.body.videoUrl) : null,
    hlsUrl: req.body?.hlsUrl ? String(req.body.hlsUrl) : null,
    duration: req.body?.duration ? Number(req.body.duration) : null,
    isFree: req.body?.isFree !== false,
  };

  const episode = await prisma.episode.upsert({
    where: { dramaId_episode: { dramaId, episode: episodeNumber } },
    update: data,
    create: {
      dramaId,
      episode: episodeNumber,
      ...data,
    },
  });
  await prisma.drama.update({ where: { id: dramaId }, data: { updatedAt: new Date() } });
  return res.status(201).json(serializeEpisode(episode));
});

adminRouter.put('/episodes/:episodeId', validateBody(episodeUpdateSchema), async (req, res) => {
  const episodeId = String(req.params.episodeId);
  const existing = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!existing) return res.status(404).json({ message: 'Episode not found' });

  const episode = await prisma.episode.update({
    where: { id: episodeId },
    data: {
      episode: req.body?.episode === undefined ? undefined : Number(req.body.episode),
      title: req.body?.title === undefined ? undefined : String(req.body.title || ''),
      videoUrl: req.body?.videoUrl === undefined ? undefined : String(req.body.videoUrl || ''),
      hlsUrl: req.body?.hlsUrl === undefined ? undefined : String(req.body.hlsUrl || ''),
      duration:
        req.body?.duration === undefined
          ? undefined
          : req.body.duration === null || req.body.duration === ''
            ? null
            : Number(req.body.duration),
      isFree: req.body?.isFree === undefined ? undefined : Boolean(req.body.isFree),
    },
  });
  await prisma.drama.update({ where: { id: existing.dramaId }, data: { updatedAt: new Date() } });
  return res.json(serializeEpisode(episode));
});

adminRouter.delete('/episodes/:episodeId', async (req, res) => {
  const episodeId = String(req.params.episodeId);
  const existing = await prisma.episode.findUnique({ where: { id: episodeId } });
  await prisma.episode.delete({ where: { id: episodeId } });
  if (existing) await prisma.drama.update({ where: { id: existing.dramaId }, data: { updatedAt: new Date() } });
  return res.json({ ok: true });
});
