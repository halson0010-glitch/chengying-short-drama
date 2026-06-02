import crypto from 'node:crypto';
import type { AnalyticsEvent as DbAnalyticsEvent, Prisma } from '@prisma/client';
import { safeParsePayload, sanitizeDashboardPayload, payloadNumber, payloadText } from './analyticsPayload.js';
import { sanitizeSensitiveText } from './privacy.js';
import { prisma } from '../prisma.js';

export type DashboardRange = 'today' | 'yesterday' | '7d' | '30d';
export type ExportType =
  | 'raw_events'
  | 'overview'
  | 'trends'
  | 'funnel'
  | 'top_dramas'
  | 'search_keywords'
  | 'filter_preferences';

export type DashboardDateSelection = {
  range: DashboardRange;
  rangeLabel: string;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  startDate?: string;
  endDate?: string;
  isCustom: boolean;
};

export type DashboardMetric = {
  value: number;
  previous: number;
  changePercent: number | null;
};

export type DashboardOverview = {
  range: string;
  startDate: string;
  endDate: string;
  metrics: {
    pageViews: DashboardMetric;
    uniqueVisitors: DashboardMetric;
    playButtonClicks: DashboardMetric;
    playStarts: DashboardMetric;
    playCompletes: DashboardMetric;
    searchSubmits: DashboardMetric;
    searchNoResults: DashboardMetric;
    downloadPopoverOpens: DashboardMetric;
  };
};

export type DashboardTrendItem = {
  date: string;
  page_view: number;
  play_start: number;
  search_submit: number;
};

export type DashboardFunnelStep = {
  key: string;
  label: string;
  value: number;
  stepRate: number;
  totalRate: number;
};

export type DashboardTopDrama = {
  dramaId: string;
  dramaTitle: string;
  cardClicks: number;
  playButtonClicks: number;
  playStarts: number;
  playCompletes: number;
  completionRate: number;
};

export type DashboardSearchKeyword = {
  keyword: string;
  count: number;
  avgResultCount: number;
  noResultCount: number;
  noResultRate: number;
};

export type DashboardFilterPreference = {
  filterKey: string;
  filterValue: string;
  count: number;
};

export type DashboardRecentEvent = {
  id: string;
  event: string;
  path: string;
  device: string;
  payload: unknown;
  createdAt: string;
};

export type DashboardRawEvent = {
  createdAt: string;
  event: string;
  path: string;
  device: string;
  viewportWidth: number | '';
  viewportHeight: number | '';
  anonymousIdHash: string;
  sessionIdHash: string;
  dramaId: string;
  dramaTitle: string;
  episode: string | number;
  keyword: string;
  resultCount: string | number;
  source: string;
  module: string;
  position: string | number;
  filterKey: string;
  filterValue: string;
  progress: string | number;
  payloadJson: string;
};

const metricEventMap = {
  pageViews: 'page_view',
  playButtonClicks: 'play_button_click',
  playStarts: 'play_start',
  playCompletes: 'play_complete',
  searchSubmits: 'search_submit',
  searchNoResults: 'search_no_result',
  downloadPopoverOpens: 'download_popover_open',
} as const;

const funnelStepDefs = [
  { key: 'page_view', label: '页面访问' },
  { key: 'drama_card_click', label: '短剧点击' },
  { key: 'play_button_click', label: '播放点击' },
  { key: 'play_start', label: '播放开始' },
  { key: 'play_progress_50', label: '播放 50%' },
  { key: 'play_complete', label: '完播' },
] as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isValidDateString(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function getRange(input: unknown): DashboardRange {
  return input === 'today' || input === 'yesterday' || input === '30d' ? input : '7d';
}

function getRangeBounds(range: DashboardRange) {
  const now = new Date();
  if (range === 'today') {
    const start = startOfDay(now);
    const duration = now.getTime() - start.getTime();
    const previousEnd = start;
    const previousStart = new Date(previousEnd.getTime() - duration);
    return { start, end: now, previousStart, previousEnd };
  }

  if (range === 'yesterday') {
    const end = startOfDay(now);
    const start = addDays(end, -1);
    const previousEnd = start;
    const previousStart = addDays(previousEnd, -1);
    return { start, end, previousStart, previousEnd };
  }

  const days = range === '30d' ? 30 : 7;
  const start = startOfDay(addDays(now, -(days - 1)));
  const duration = now.getTime() - start.getTime();
  const previousEnd = start;
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { start, end: now, previousStart, previousEnd };
}

export function resolveDashboardDateSelection(query: Record<string, unknown>): DashboardDateSelection {
  if (isValidDateString(query.startDate) && isValidDateString(query.endDate)) {
    const startDateValue = String(query.startDate);
    const endDateValue = String(query.endDate);
    const start = parseDateString(startDateValue);
    const end = addDays(parseDateString(endDateValue), 1);
    const orderedStart = start <= end ? start : addDays(parseDateString(endDateValue), 0);
    const orderedEnd = start <= end ? end : addDays(parseDateString(startDateValue), 1);
    const duration = orderedEnd.getTime() - orderedStart.getTime();
    return {
      range: '7d',
      rangeLabel: `${dateKey(orderedStart)}_${dateKey(addDays(orderedEnd, -1))}`,
      start: orderedStart,
      end: orderedEnd,
      previousStart: new Date(orderedStart.getTime() - duration),
      previousEnd: orderedStart,
      startDate: dateKey(orderedStart),
      endDate: dateKey(addDays(orderedEnd, -1)),
      isCustom: true,
    };
  }

  const range = getRange(query.range);
  const bounds = getRangeBounds(range);
  return {
    range,
    rangeLabel: range,
    ...bounds,
    startDate: dateKey(bounds.start),
    endDate: dateKey(bounds.end),
    isCustom: false,
  };
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function roundPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function metric(value: number, previous: number): DashboardMetric {
  return {
    value,
    previous,
    changePercent: previous > 0 ? roundPercent(((value - previous) / previous) * 100) : null,
  };
}

function countEvent(events: Pick<DbAnalyticsEvent, 'event'>[], event: string) {
  return events.filter((item) => item.event === event).length;
}

function uniqueVisitors(events: Pick<DbAnalyticsEvent, 'anonymousId'>[]) {
  return new Set(events.map((item) => item.anonymousId).filter(Boolean)).size;
}

function isProgress50(event: DbAnalyticsEvent) {
  const payload = safeParsePayload(event.payloadJson);
  return event.event === 'play_progress' && Math.round(payloadNumber(payload, ['progress'])) === 50;
}

export function sanitizeSearchKeyword(keyword: unknown) {
  const value = sanitizeSensitiveText(String(keyword ?? '').trim().replace(/\s+/g, ' ')).slice(0, 60);
  return value.includes('[redacted]') ? '[redacted]' : value;
}

function getKeyword(event: DbAnalyticsEvent) {
  const payload = safeParsePayload(event.payloadJson);
  const keyword = sanitizeSearchKeyword(payloadText(payload, ['keyword', 'search_term', 'searchTerm', 'q']));
  if (!keyword || keyword.includes('[redacted]')) return '';
  return keyword;
}

function getDramaInfo(event: DbAnalyticsEvent) {
  const payload = safeParsePayload(event.payloadJson);
  const dramaId = payloadText(payload, ['dramaId', 'drama_id']);
  const dramaTitle = payloadText(payload, ['dramaTitle', 'drama_title', 'title']) || dramaId || '未知短剧';
  return { dramaId, dramaTitle };
}

function getFilterInfo(event: DbAnalyticsEvent) {
  const payload = safeParsePayload(event.payloadJson);
  const filterKey = payloadText(payload, ['filterKey', 'filter_key']);
  const filterValue = payloadText(payload, ['filterValue', 'filter_value']);
  if (!filterKey || !filterValue) return null;
  return { filterKey, filterValue };
}

export async function getEventsInSelection(selection: DashboardDateSelection, events?: string[]) {
  // TODO: 数据量变大后改为数据库 groupBy，或同步到 ClickHouse / BigQuery / 数据仓库做聚合。
  const items = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: selection.start, lt: selection.end },
      ...(events?.length ? { event: { in: events } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return items;
}

export async function getDashboardOverview(selection: DashboardDateSelection): Promise<DashboardOverview> {
  const eventNames = [...Object.values(metricEventMap), 'page_view'];
  const [current, previous] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: selection.start, lt: selection.end }, event: { in: eventNames } },
      select: { event: true, anonymousId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: selection.previousStart, lt: selection.previousEnd }, event: { in: eventNames } },
      select: { event: true, anonymousId: true },
    }),
  ]);

  return {
    range: selection.rangeLabel,
    startDate: selection.startDate ?? dateKey(selection.start),
    endDate: selection.endDate ?? dateKey(selection.end),
    metrics: {
      pageViews: metric(countEvent(current, 'page_view'), countEvent(previous, 'page_view')),
      uniqueVisitors: metric(uniqueVisitors(current), uniqueVisitors(previous)),
      playButtonClicks: metric(countEvent(current, 'play_button_click'), countEvent(previous, 'play_button_click')),
      playStarts: metric(countEvent(current, 'play_start'), countEvent(previous, 'play_start')),
      playCompletes: metric(countEvent(current, 'play_complete'), countEvent(previous, 'play_complete')),
      searchSubmits: metric(countEvent(current, 'search_submit'), countEvent(previous, 'search_submit')),
      searchNoResults: metric(countEvent(current, 'search_no_result'), countEvent(previous, 'search_no_result')),
      downloadPopoverOpens: metric(
        countEvent(current, 'download_popover_open'),
        countEvent(previous, 'download_popover_open'),
      ),
    },
  };
}

export async function getDashboardTrends(selection: DashboardDateSelection): Promise<DashboardTrendItem[]> {
  const items = await getEventsInSelection(selection, ['page_view', 'play_start', 'search_submit']);
  const byDate = new Map<string, DashboardTrendItem>();
  for (let day = startOfDay(selection.start); day < selection.end; day = addDays(day, 1)) {
    const key = dateKey(day);
    byDate.set(key, { date: key, page_view: 0, play_start: 0, search_submit: 0 });
  }
  items.forEach((event) => {
    const key = dateKey(event.createdAt);
    const row = byDate.get(key);
    if (row && (event.event === 'page_view' || event.event === 'play_start' || event.event === 'search_submit')) {
      row[event.event] += 1;
    }
  });
  return [...byDate.values()];
}

export async function getDashboardFunnel(selection: DashboardDateSelection): Promise<DashboardFunnelStep[]> {
  const items = await getEventsInSelection(selection, [
    'page_view',
    'drama_card_click',
    'play_button_click',
    'play_start',
    'play_progress',
    'play_complete',
  ]);
  const values = new Map<string, number>();
  funnelStepDefs.forEach((step) => values.set(step.key, 0));
  items.forEach((event) => {
    if (event.event === 'play_progress') {
      if (isProgress50(event)) values.set('play_progress_50', (values.get('play_progress_50') ?? 0) + 1);
      return;
    }
    if (values.has(event.event)) values.set(event.event, (values.get(event.event) ?? 0) + 1);
  });
  const firstValue = values.get('page_view') ?? 0;
  let previousValue = firstValue;
  return funnelStepDefs.map((step, index) => {
    const value = values.get(step.key) ?? 0;
    const stepRate = index === 0 ? (value ? 100 : 0) : previousValue ? roundPercent(Math.min((value / previousValue) * 100, 100)) : 0;
    const totalRate = firstValue ? roundPercent(Math.min((value / firstValue) * 100, 100)) : 0;
    previousValue = value;
    return { ...step, value, stepRate, totalRate };
  });
}

export async function getDashboardTopDramas(selection: DashboardDateSelection): Promise<DashboardTopDrama[]> {
  const items = await getEventsInSelection(selection, [
    'drama_card_click',
    'play_button_click',
    'play_start',
    'play_complete',
  ]);
  const rows = new Map<string, DashboardTopDrama>();
  items.forEach((event) => {
    const { dramaId, dramaTitle } = getDramaInfo(event);
    const key = dramaId || dramaTitle || 'unknown';
    const row = rows.get(key) ?? {
      dramaId,
      dramaTitle: dramaTitle || dramaId || '未知短剧',
      cardClicks: 0,
      playButtonClicks: 0,
      playStarts: 0,
      playCompletes: 0,
      completionRate: 0,
    };
    if (event.event === 'drama_card_click') row.cardClicks += 1;
    if (event.event === 'play_button_click') row.playButtonClicks += 1;
    if (event.event === 'play_start') row.playStarts += 1;
    if (event.event === 'play_complete') row.playCompletes += 1;
    rows.set(key, row);
  });
  return [...rows.values()]
    .map((row) => ({
      ...row,
      completionRate: row.playStarts ? roundPercent(Math.min((row.playCompletes / row.playStarts) * 100, 100)) : 0,
    }))
    .sort(
      (first, second) =>
        second.playStarts + second.playButtonClicks + second.cardClicks - (first.playStarts + first.playButtonClicks + first.cardClicks),
    )
    .slice(0, 10);
}

export async function getDashboardSearchKeywords(selection: DashboardDateSelection): Promise<DashboardSearchKeyword[]> {
  const items = await getEventsInSelection(selection, ['search_submit', 'search_no_result']);
  const rows = new Map<
    string,
    { keyword: string; count: number; totalResultCount: number; resultCountSamples: number; noResultCount: number }
  >();
  items.forEach((event) => {
    const keyword = getKeyword(event);
    if (!keyword) return;
    const row = rows.get(keyword) ?? {
      keyword,
      count: 0,
      totalResultCount: 0,
      resultCountSamples: 0,
      noResultCount: 0,
    };
    const payload = safeParsePayload(event.payloadJson);
    if (event.event === 'search_submit') {
      row.count += 1;
      if (payload.resultCount !== undefined || payload.result_count !== undefined) {
        row.totalResultCount += payloadNumber(payload, ['resultCount', 'result_count']);
        row.resultCountSamples += 1;
      }
    }
    if (event.event === 'search_no_result') row.noResultCount += 1;
    rows.set(keyword, row);
  });
  return [...rows.values()]
    .map((row) => ({
      keyword: row.keyword,
      count: row.count,
      avgResultCount: row.resultCountSamples ? roundPercent(row.totalResultCount / row.resultCountSamples) : 0,
      noResultCount: row.noResultCount,
      noResultRate: row.count ? roundPercent(Math.min((row.noResultCount / row.count) * 100, 100)) : row.noResultCount ? 100 : 0,
    }))
    .sort((first, second) => second.count + second.noResultCount - (first.count + first.noResultCount))
    .slice(0, 10);
}

export async function getDashboardFilterPreferences(selection: DashboardDateSelection): Promise<DashboardFilterPreference[]> {
  const items = await getEventsInSelection(selection, ['filter_change']);
  const rows = new Map<string, DashboardFilterPreference>();
  items.forEach((event) => {
    const info = getFilterInfo(event);
    if (!info) return;
    const key = `${info.filterKey}|${info.filterValue}`;
    const row = rows.get(key) ?? { ...info, count: 0 };
    row.count += 1;
    rows.set(key, row);
  });
  return [...rows.values()].sort((first, second) => second.count - first.count).slice(0, 20);
}

export async function getDashboardRecentEvents(selection: DashboardDateSelection, limit = 50, offset = 0) {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = Math.max(offset, 0);
  const where = { createdAt: { gte: selection.start, lt: selection.end } };
  const [total, events] = await Promise.all([
    prisma.analyticsEvent.count({ where }),
    prisma.analyticsEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
  ]);
  return {
    items: events.map((event): DashboardRecentEvent => ({
      id: event.id,
      event: sanitizeSensitiveText(event.event).slice(0, 80),
      path: event.path ? sanitizeSensitiveText(event.path).slice(0, 300) : '',
      device: event.device ? sanitizeSensitiveText(event.device).slice(0, 40) : '',
      payload: sanitizeDashboardPayload(safeParsePayload(event.payloadJson)),
      createdAt: event.createdAt.toISOString(),
    })),
    total,
    limit: take,
    offset: skip,
  };
}

function shortHash(value: string | null) {
  if (!value) return '';
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
}

function payloadJsonForExport(payload: Record<string, unknown>) {
  return JSON.stringify(sanitizeDashboardPayload(payload) ?? {});
}

function valueOrEmpty(value: number) {
  return value ? value : '';
}

export async function getRawEventsForExport(selection: DashboardDateSelection, limit = 10_000, offset = 0): Promise<DashboardRawEvent[]> {
  const take = Math.min(Math.max(limit, 1), 10_000);
  const skip = Math.max(offset, 0);
  const where: Prisma.AnalyticsEventWhereInput = { createdAt: { gte: selection.start, lt: selection.end } };
  const events = await prisma.analyticsEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  return events.map((event) => {
    const payload = safeParsePayload(event.payloadJson);
    return {
      createdAt: event.createdAt.toISOString(),
      event: sanitizeSensitiveText(event.event).slice(0, 80),
      path: event.path ? sanitizeSensitiveText(event.path).slice(0, 300) : '',
      device: event.device ? sanitizeSensitiveText(event.device).slice(0, 40) : '',
      viewportWidth: valueOrEmpty(payloadNumber(payload, ['viewportWidth', 'viewport_width', 'width'])),
      viewportHeight: valueOrEmpty(payloadNumber(payload, ['viewportHeight', 'viewport_height', 'height'])),
      anonymousIdHash: shortHash(event.anonymousId),
      sessionIdHash: shortHash(event.sessionId),
      dramaId: payloadText(payload, ['dramaId', 'drama_id']),
      dramaTitle: payloadText(payload, ['dramaTitle', 'drama_title', 'title']),
      episode: valueOrEmpty(payloadNumber(payload, ['episode'])),
      keyword: sanitizeSearchKeyword(payloadText(payload, ['keyword', 'search_term', 'searchTerm', 'q'])),
      resultCount: valueOrEmpty(payloadNumber(payload, ['resultCount', 'result_count'])),
      source: payloadText(payload, ['source']),
      module: payloadText(payload, ['module', 'moduleName', 'module_name']),
      position: valueOrEmpty(payloadNumber(payload, ['position'])),
      filterKey: payloadText(payload, ['filterKey', 'filter_key']),
      filterValue: payloadText(payload, ['filterValue', 'filter_value']),
      progress: valueOrEmpty(payloadNumber(payload, ['progress'])),
      payloadJson: payloadJsonForExport(payload),
    };
  });
}
