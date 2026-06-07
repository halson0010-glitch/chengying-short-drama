import { Router } from 'express';
import type { AnalyticsEvent } from '@chengying/shared';
import type { AnalyticsEvent as DbAnalyticsEvent } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { sanitizeJsonValue, sanitizeSensitiveText } from '../lib/privacy.js';
import { analyticsCollectSchema } from '../lib/schemas.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';

export const analyticsRouter = Router();
export const adminAnalyticsRouter = Router();

function parsePayload(payloadJson: string | null) {
  if (!payloadJson) return {};
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function limitJsonDepth(value: unknown, maxDepth = 5, depth = 0): unknown {
  if (depth >= maxDepth) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => limitJsonDepth(item, maxDepth, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, nestedValue]) => [key.slice(0, 80), limitJsonDepth(nestedValue, maxDepth, depth + 1)]),
    );
  }
  return value;
}

function safeEventDate(timestamp?: number) {
  const now = Date.now();
  if (!timestamp || !Number.isFinite(timestamp)) return new Date(now);
  if (Math.abs(timestamp - now) > 24 * 60 * 60 * 1000) return new Date(now);
  return new Date(timestamp);
}

function payloadToJson(payload: unknown) {
  const json = JSON.stringify(limitJsonDepth(sanitizeJsonValue(payload ?? {})));
  return json.length > 10 * 1024 ? json.slice(0, 10 * 1024) : json;
}

const debugEvents = new Set(['hero_auto_switch', 'play_progress']);
const searchSubmitDedupeWindowMs = 3_000;
const highFrequencyEvents = new Set(['watch_progress_checkpoint', 'watch_duration_update', 'play_progress']);
const highFrequencyDedupeWindowMs = 15_000;

function sanitizeSearchKeywordValue(value: unknown) {
  const keyword = sanitizeSensitiveText(String(value ?? '').trim().replace(/\s+/g, ' ')).slice(0, 60);
  return keyword.includes('[redacted]') ? '' : keyword;
}

function payloadKeyword(payload: Record<string, unknown>) {
  return sanitizeSearchKeywordValue(payload.keyword ?? payload.search_term ?? payload.searchTerm ?? payload.q);
}

function mergeViewportPayload(event: AnalyticsEvent) {
  const payload = event.payload && typeof event.payload === 'object' ? { ...event.payload } : {};
  const width = Number(event.viewport?.width);
  const height = Number(event.viewport?.height);
  if (Number.isFinite(width) && width > 0) payload.viewportWidth = Math.round(width);
  if (Number.isFinite(height) && height > 0) payload.viewportHeight = Math.round(height);
  return payload;
}

async function hasRecentSearchSubmitDuplicate(event: {
  anonymousId: string | null;
  sessionId: string | null;
  createdAt: Date;
  payloadJson: string | null;
}) {
  const payload = parsePayload(event.payloadJson);
  const keyword = payloadKeyword(payload);
  if (!keyword) return false;
  const identityWhere = event.sessionId
    ? { sessionId: event.sessionId }
    : event.anonymousId
      ? { anonymousId: event.anonymousId }
      : null;
  if (!identityWhere) return false;
  const existing = await prisma.analyticsEvent.findMany({
    where: {
      event: 'search_submit',
      ...identityWhere,
      createdAt: {
        gte: new Date(event.createdAt.getTime() - searchSubmitDedupeWindowMs),
        lte: new Date(event.createdAt.getTime() + searchSubmitDedupeWindowMs),
      },
    },
    select: { payloadJson: true },
    take: 20,
  });
  return existing.some((item) => payloadKeyword(parsePayload(item.payloadJson)) === keyword);
}

async function hasRecentHighFrequencyDuplicate(event: {
  event: string;
  anonymousId: string | null;
  sessionId: string | null;
  createdAt: Date;
  payloadJson: string | null;
}) {
  if (!highFrequencyEvents.has(event.event)) return false;
  const payload = parsePayload(event.payloadJson);
  const identityWhere = event.sessionId
    ? { sessionId: event.sessionId }
    : event.anonymousId
      ? { anonymousId: event.anonymousId }
      : null;
  if (!identityWhere) return false;
  const dramaId = String(payload.dramaId ?? '');
  const episode = String(payload.episode ?? '');
  const checkpoint = String(payload.checkpoint ?? payload.progress ?? '');
  const existing = await prisma.analyticsEvent.findMany({
    where: {
      event: event.event,
      ...identityWhere,
      createdAt: {
        gte: new Date(event.createdAt.getTime() - highFrequencyDedupeWindowMs),
        lte: new Date(event.createdAt.getTime() + highFrequencyDedupeWindowMs),
      },
    },
    select: { payloadJson: true },
    take: 40,
  });
  return existing.some((item) => {
    const itemPayload = parsePayload(item.payloadJson);
    return (
      String(itemPayload.dramaId ?? '') === dramaId &&
      String(itemPayload.episode ?? '') === episode &&
      String(itemPayload.checkpoint ?? itemPayload.progress ?? '') === checkpoint
    );
  });
}

function analyticsEventTime(event: DbAnalyticsEvent) {
  return event.createdAt.getTime();
}

function dedupeAnalyticsEvents(
  events: DbAnalyticsEvent[],
  keyForEvent: (event: DbAnalyticsEvent) => string,
  windowMs = 5_000,
) {
  const latestByKey = new Map<string, number>();
  return [...events]
    .sort((first, second) => analyticsEventTime(first) - analyticsEventTime(second))
    .filter((event) => {
      const key = keyForEvent(event);
      if (!key) return false;
      const timestamp = analyticsEventTime(event);
      const latest = latestByKey.get(key);
      if (latest !== undefined && timestamp - latest <= windowMs) return false;
      latestByKey.set(key, timestamp);
      return true;
    });
}

function getEventIdentity(event: DbAnalyticsEvent) {
  return event.sessionId || event.anonymousId || 'unknown';
}

function getSearchKeyword(event: DbAnalyticsEvent) {
  const payload = parsePayload(event.payloadJson);
  return sanitizeSensitiveText(String(payload.keyword ?? payload.search_term ?? '')).trim().slice(0, 60);
}

function getDedupedSearchSubmitEvents(events: DbAnalyticsEvent[]) {
  return dedupeAnalyticsEvents(events, (event) => {
    const keyword = getSearchKeyword(event);
    if (!keyword || keyword.includes('[redacted]')) return '';
    return `${getEventIdentity(event)}|${keyword}`;
  }, 10_000);
}

function getDramaClickInfo(event: DbAnalyticsEvent) {
  const payload = parsePayload(event.payloadJson);
  const dramaTitle = String(payload.dramaTitle ?? payload.title ?? '未命名短剧').trim();
  const dramaId = payload.dramaId ? String(payload.dramaId) : undefined;
  return { dramaId, dramaTitle };
}

function getDedupedDramaClickEvents(events: DbAnalyticsEvent[]) {
  return dedupeAnalyticsEvents(events, (event) => {
    const { dramaId, dramaTitle } = getDramaClickInfo(event);
    return `${getEventIdentity(event)}|${dramaId || dramaTitle}`;
  }, 5_000);
}

function getDedupedPlayEvents(events: DbAnalyticsEvent[]) {
  return dedupeAnalyticsEvents(events, (event) => {
    const payload = parsePayload(event.payloadJson);
    return [
      getEventIdentity(event),
      event.event,
      payload.dramaId ? String(payload.dramaId) : event.path || '',
      payload.episode ? String(payload.episode) : '',
    ].join('|');
  }, 3_000);
}

analyticsRouter.post(
  '/collect',
  rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: 'analytics-collect', message: '埋点上报过于频繁，请稍后再试' }),
  validateBody(analyticsCollectSchema),
  async (req, res) => {
  const events = Array.isArray(req.body?.events) ? (req.body.events as AnalyticsEvent[]) : [];
  if (!events.length) return res.json({ accepted: 0 });

  const acceptedEvents = [];
  const searchSubmitBatchKeys = new Map<string, number>();
  const highFrequencyBatchKeys = new Map<string, number>();
  for (const event of events.slice(0, 100)) {
    const eventName = sanitizeSensitiveText(String(event.event ?? 'unknown')).slice(0, 80);
    if (debugEvents.has(eventName)) continue;
    const acceptedEvent = {
      event: eventName,
      anonymousId: event.anonymousId ? sanitizeSensitiveText(event.anonymousId).slice(0, 120) : null,
      sessionId: event.sessionId ? sanitizeSensitiveText(event.sessionId).slice(0, 120) : null,
      path: event.path ? sanitizeSensitiveText(event.path).slice(0, 300) : null,
      device: event.device ? sanitizeSensitiveText(String(event.device)).slice(0, 40) : null,
      payloadJson: payloadToJson(mergeViewportPayload(event)),
      createdAt: safeEventDate(event.timestamp),
    };

    if (acceptedEvent.event === 'search_submit') {
      const keyword = payloadKeyword(parsePayload(acceptedEvent.payloadJson));
      const identity = acceptedEvent.sessionId || acceptedEvent.anonymousId || 'unknown';
      const key = keyword ? `${identity}|${keyword}` : '';
      const createdAtMs = acceptedEvent.createdAt.getTime();
      const latest = key ? searchSubmitBatchKeys.get(key) : undefined;
      if (latest !== undefined && Math.abs(createdAtMs - latest) <= searchSubmitDedupeWindowMs) continue;
      if (key && (await hasRecentSearchSubmitDuplicate(acceptedEvent))) continue;
      if (key) searchSubmitBatchKeys.set(key, createdAtMs);
    }

    if (highFrequencyEvents.has(acceptedEvent.event)) {
      const payload = parsePayload(acceptedEvent.payloadJson);
      const identity = acceptedEvent.sessionId || acceptedEvent.anonymousId || 'unknown';
      const key = [
        identity,
        acceptedEvent.event,
        payload.dramaId ? String(payload.dramaId) : '',
        payload.episode ? String(payload.episode) : '',
        payload.checkpoint ? String(payload.checkpoint) : payload.progress ? String(payload.progress) : '',
      ].join('|');
      const createdAtMs = acceptedEvent.createdAt.getTime();
      const latest = highFrequencyBatchKeys.get(key);
      if (latest !== undefined && Math.abs(createdAtMs - latest) <= highFrequencyDedupeWindowMs) continue;
      if (await hasRecentHighFrequencyDuplicate(acceptedEvent)) continue;
      highFrequencyBatchKeys.set(key, createdAtMs);
    }

    acceptedEvents.push(acceptedEvent);
  }

  if (!acceptedEvents.length) return res.json({ accepted: 0 });
  await prisma.analyticsEvent.createMany({ data: acceptedEvents });
  return res.json({ accepted: acceptedEvents.length });
});

adminAnalyticsRouter.use(requireAdmin);

adminAnalyticsRouter.get('/overview', async (_req, res) => {
  const events = await prisma.analyticsEvent.findMany();
  const searchSubmitEvents = events.filter((event) => event.event === 'search_submit');
  const dramaClickEvents = events.filter((event) => event.event === 'drama_card_click' || event.event === 'search_result_click');
  const uniqueVisitors = new Set(events.map((event) => event.anonymousId).filter(Boolean)).size;
  res.json({
    totalEvents: events.length,
    uniqueVisitors,
    pageViews: events.filter((event) => event.event === 'page_view').length,
    searches: getDedupedSearchSubmitEvents(searchSubmitEvents).length,
    dramaClicks: getDedupedDramaClickEvents(dramaClickEvents).length,
    playStarts: getDedupedPlayEvents(events.filter((event) => event.event === 'play_start')).length,
    playCompletes: getDedupedPlayEvents(events.filter((event) => event.event === 'play_complete')).length,
  });
});

adminAnalyticsRouter.get('/events', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);
  const events = await prisma.analyticsEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Number.isFinite(limit) ? limit : 100,
    skip: Number.isFinite(offset) ? offset : 0,
  });
  res.json(
    events.map((event) => ({
      ...event,
      payload: parsePayload(event.payloadJson),
    })),
  );
});

adminAnalyticsRouter.get('/search-keywords', async (_req, res) => {
  const events = await prisma.analyticsEvent.findMany({ where: { event: 'search_submit' } });
  const counts = new Map<string, number>();
  getDedupedSearchSubmitEvents(events).forEach((event) => {
    const keyword = getSearchKeyword(event);
    if (keyword) counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  });
  res.json([...counts.entries()].map(([keyword, count]) => ({ keyword, count })).sort((a, b) => b.count - a.count));
});

adminAnalyticsRouter.get('/drama-clicks', async (_req, res) => {
  const events = await prisma.analyticsEvent.findMany({
    where: { event: { in: ['drama_card_click', 'search_result_click'] } },
  });
  const counts = new Map<string, { dramaId?: string; dramaTitle: string; count: number }>();
  getDedupedDramaClickEvents(events).forEach((event) => {
    const { dramaId, dramaTitle } = getDramaClickInfo(event);
    const key = dramaId || dramaTitle;
    const current = counts.get(key) ?? { dramaId, dramaTitle, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  res.json([...counts.values()].sort((a, b) => b.count - a.count));
});

adminAnalyticsRouter.get('/play-funnel', async (_req, res) => {
  const events = await prisma.analyticsEvent.findMany({
    where: { event: { in: ['play_button_click', 'play_start', 'play_pause', 'play_complete'] } },
  });
  const buttonClicks = getDedupedPlayEvents(events.filter((event) => event.event === 'play_button_click')).length;
  const starts = getDedupedPlayEvents(events.filter((event) => event.event === 'play_start')).length;
  const pauses = getDedupedPlayEvents(events.filter((event) => event.event === 'play_pause')).length;
  const completes = getDedupedPlayEvents(events.filter((event) => event.event === 'play_complete')).length;
  const startRate = buttonClicks ? Math.min(starts / buttonClicks, 1) : 0;
  const completeRate = starts ? Math.min(completes / starts, 1) : 0;
  res.json({
    buttonClicks,
    starts,
    pauses,
    completes,
    startRate,
    completeRate,
  });
});
