import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function read(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[analytics-check] ${message}`);
  }
}

async function main() {
  const searchPage = await read('apps/web/src/pages/SearchPage.tsx');
  const heroShowcase = await read('apps/web/src/components/home/HeroShowcase.tsx');
  const analyticsRoute = await read('apps/api/src/routes/analytics.ts');
  const dashboardRoute = await read('apps/api/src/routes/dashboard.ts');
  const dashboardMetrics = await read('apps/api/src/lib/dashboardMetrics.ts');
  const recentEventsTable = await read('apps/admin/src/components/dashboard/RecentEventsTable.tsx');
  const eventLabels = await read('apps/admin/src/lib/eventLabels.ts');

  assert(!searchPage.includes("track('search_submit'"), 'SearchPage must not emit a second search_submit from URL params.');
  assert(searchPage.includes("track('search_result_view'"), 'SearchPage should emit search_result_view when results load.');

  assert(!heroShowcase.includes("track('hero_auto_switch'"), 'Hero autoplay should not emit hero_auto_switch.');
  assert(heroShowcase.includes("track('home_hero_dwell'"), 'Hero should emit one dwell event when leaving home.');

  assert(analyticsRoute.includes('searchSubmitDedupeWindowMs = 3_000'), 'collect route should dedupe search_submit for 3 seconds.');
  assert(analyticsRoute.includes('mergeViewportPayload'), 'collect route should merge viewport into payloadJson.');
  assert(analyticsRoute.includes("debugEvents.has(eventName)"), 'collect route should drop debug events by default.');

  assert(dashboardRoute.includes('includeDebug'), 'dashboard export/recent-events should support includeDebug.');
  assert(dashboardRoute.includes("'createdAtUtc'"), 'raw CSV headers should include createdAtUtc.');
  assert(dashboardRoute.includes("'pageTitle'"), 'raw CSV headers should include pageTitle.');

  assert(dashboardMetrics.includes('formatDashboardDateTime'), 'CSV/recent events should use local dashboard time.');
  assert(dashboardMetrics.includes('DASHBOARD_TIMEZONE'), 'Dashboard timezone should be configurable.');
  assert(dashboardMetrics.includes('isSuspiciousDramaTitle'), 'Top dramas should filter test/injection titles.');
  assert(dashboardMetrics.includes('getStrictDramaInfo'), 'Top dramas and CSV should avoid title as dramaTitle fallback.');
  assert(dashboardMetrics.includes("notIn: [...DEBUG_EVENTS]"), 'Raw export/recent events should hide debug events by default.');

  assert(eventLabels.includes('页面浏览'), 'Recent events should show Chinese event labels.');
  assert(eventLabels.includes('首页停留'), 'Recent events should summarize home dwell events.');
  assert(eventLabels.includes('页面滚动深度'), 'Recent events should label scroll_depth in Chinese.');
  assert(dashboardMetrics.includes("'play_progress'"), 'Dashboard debug events should include play_progress.');

  console.log('[analytics-check] OK: analytics cleanup guards passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
