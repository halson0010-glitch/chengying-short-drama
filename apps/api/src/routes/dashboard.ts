import { Router } from 'express';
import {
  getDashboardFilterPreferences,
  getDashboardFunnel,
  getDashboardOverview,
  getDashboardRecentEvents,
  getDashboardSearchKeywords,
  getDashboardTopDramas,
  getDashboardTrends,
  getRawEventsForExport,
  resolveDashboardDateSelection,
  type ExportType,
} from '../lib/dashboardMetrics.js';
import { addUtf8Bom, createCsv, makeCsvFilename } from '../lib/csv.js';
import { requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const adminDashboardRouter = Router();

const exportTypes = new Set<ExportType>([
  'raw_events',
  'overview',
  'trends',
  'funnel',
  'top_dramas',
  'search_keywords',
  'filter_preferences',
]);

function getExportType(input: unknown): ExportType {
  return typeof input === 'string' && exportTypes.has(input as ExportType) ? (input as ExportType) : 'raw_events';
}

function getLimit(input: unknown) {
  const value = Number(input ?? 10_000);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 10_000) : 10_000;
}

function getOffset(input: unknown) {
  const value = Number(input ?? 0);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function getBooleanQuery(input: unknown) {
  return input === 'true' || input === true || input === '1';
}

adminDashboardRouter.use(requireAdmin);

adminDashboardRouter.get('/overview', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  const overview = await getDashboardOverview(selection);
  res.json(overview);
});

adminDashboardRouter.get('/trends', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  res.json({ range: selection.rangeLabel, items: await getDashboardTrends(selection) });
});

adminDashboardRouter.get('/funnel', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  res.json({ range: selection.rangeLabel, steps: await getDashboardFunnel(selection) });
});

adminDashboardRouter.get('/top-dramas', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  res.json({ range: selection.rangeLabel, items: await getDashboardTopDramas(selection) });
});

adminDashboardRouter.get('/search-keywords', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  res.json({ range: selection.rangeLabel, items: await getDashboardSearchKeywords(selection) });
});

adminDashboardRouter.get('/filter-preferences', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  res.json({ range: selection.rangeLabel, items: await getDashboardFilterPreferences(selection) });
});

adminDashboardRouter.get('/recent-events', async (req, res) => {
  const selection = resolveDashboardDateSelection(req.query);
  const result = await getDashboardRecentEvents(
    selection,
    getLimit(req.query.limit),
    getOffset(req.query.offset),
    getBooleanQuery(req.query.includeDebug),
  );
  res.json({ range: selection.rangeLabel, ...result });
});

adminDashboardRouter.get(
  '/export.csv',
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyPrefix: 'dashboard-export',
    message: 'CSV 导出过于频繁，请稍后再试',
  }),
  async (req, res) => {
    const type = getExportType(req.query.type);
    const selection = resolveDashboardDateSelection(req.query);
    const limit = getLimit(req.query.limit);
    const offset = getOffset(req.query.offset);
    const includeDebug = getBooleanQuery(req.query.includeDebug);
    const filename = makeCsvFilename(type, selection.rangeLabel, selection.startDate, selection.endDate);

    const csv =
      type === 'raw_events'
        ? createCsv(await getRawEventsForExport(selection, limit, offset, includeDebug), [
            'createdAt',
            'createdAtUtc',
            'event',
            'path',
            'device',
            'viewportWidth',
            'viewportHeight',
            'anonymousIdHash',
            'sessionIdHash',
            'dramaId',
            'dramaTitle',
            'pageTitle',
            'episode',
            'keyword',
            'resultCount',
            'source',
            'module',
            'position',
            'filterKey',
            'filterValue',
            'progress',
            'payloadJson',
          ])
        : await createAggregatedCsv(type, selection);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(addUtf8Bom(csv));
  },
);

async function createAggregatedCsv(type: Exclude<ExportType, 'raw_events'>, selection: ReturnType<typeof resolveDashboardDateSelection>) {
  if (type === 'overview') {
    const overview = await getDashboardOverview(selection);
    return createCsv(
      Object.entries(overview.metrics).map(([metric, value]) => ({
        metric,
        value: value.value,
        previous: value.previous,
        changePercent: value.changePercent ?? '',
        range: selection.rangeLabel,
        startDate: selection.startDate,
        endDate: selection.endDate,
      })),
      ['metric', 'value', 'previous', 'changePercent', 'range', 'startDate', 'endDate'],
    );
  }

  if (type === 'trends') {
    return createCsv(await getDashboardTrends(selection), ['date', 'page_view', 'play_start', 'search_submit']);
  }

  if (type === 'funnel') {
    return createCsv(
      (await getDashboardFunnel(selection)).map((item) => ({
        stepKey: item.key,
        stepLabel: item.label,
        value: item.value,
        stepRate: item.stepRate,
        totalRate: item.totalRate,
      })),
      ['stepKey', 'stepLabel', 'value', 'stepRate', 'totalRate'],
    );
  }

  if (type === 'top_dramas') {
    return createCsv(
      (await getDashboardTopDramas(selection)).map((item, index) => ({ rank: index + 1, ...item })),
      ['rank', 'dramaId', 'dramaTitle', 'cardClicks', 'playButtonClicks', 'playStarts', 'playCompletes', 'completionRate'],
    );
  }

  if (type === 'search_keywords') {
    return createCsv(
      (await getDashboardSearchKeywords(selection)).map((item, index) => ({ rank: index + 1, ...item })),
      ['rank', 'keyword', 'count', 'avgResultCount', 'noResultCount', 'noResultRate'],
    );
  }

  return createCsv(
    (await getDashboardFilterPreferences(selection)).map((item, index) => ({ rank: index + 1, ...item })),
    ['rank', 'filterKey', 'filterValue', 'count'],
  );
}
