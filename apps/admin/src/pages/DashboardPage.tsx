import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/dashboard/EmptyState';
import ExportCsvButton from '../components/dashboard/ExportCsvButton';
import FilterPreferencesTable from '../components/dashboard/FilterPreferencesTable';
import FunnelPanel from '../components/dashboard/FunnelPanel';
import MetricCard from '../components/dashboard/MetricCard';
import RangeTabs from '../components/dashboard/RangeTabs';
import RecentEventsTable from '../components/dashboard/RecentEventsTable';
import SearchKeywordsTable from '../components/dashboard/SearchKeywordsTable';
import TopDramasTable from '../components/dashboard/TopDramasTable';
import TrendChart from '../components/dashboard/TrendChart';
import {
  api,
  type DashboardFilterPreference,
  type DashboardFunnelStep,
  type DashboardMetric,
  type DashboardOverview,
  type DashboardRange,
  type DashboardRecentEvent,
  type DashboardSearchKeyword,
  type DashboardTopDrama,
  type DashboardTrendItem,
} from '../lib/api';

type DashboardState = {
  metrics: Array<{ label: string; mark: string; metric: DashboardMetric }>;
  trends: DashboardTrendItem[];
  funnel: DashboardFunnelStep[];
  topDramas: DashboardTopDrama[];
  searchKeywords: DashboardSearchKeyword[];
  filterPreferences: DashboardFilterPreference[];
  recentEvents: DashboardRecentEvent[];
  recentTotal: number;
};

const emptyMetric: DashboardMetric = { value: 0, previous: 0, changePercent: null };

function buildMetricCards(metrics?: DashboardOverview['metrics']) {
  return [
    { label: '页面浏览量 PV', mark: 'PV', metric: metrics?.pageViews ?? emptyMetric },
    { label: '独立访客 UV', mark: 'UV', metric: metrics?.uniqueVisitors ?? emptyMetric },
    { label: '播放按钮点击次数', mark: 'PLAY', metric: metrics?.playButtonClicks ?? emptyMetric },
    { label: '播放开始次数', mark: 'START', metric: metrics?.playStarts ?? emptyMetric },
    { label: '完播次数', mark: 'DONE', metric: metrics?.playCompletes ?? emptyMetric },
    { label: '搜索次数', mark: 'SEARCH', metric: metrics?.searchSubmits ?? emptyMetric },
    { label: '无结果搜索次数', mark: 'EMPTY', metric: metrics?.searchNoResults ?? emptyMetric },
    { label: '下载 App 弹层打开次数', mark: 'APP', metric: metrics?.downloadPopoverOpens ?? emptyMetric },
    { label: '继续观看点击', mark: 'CONT', metric: metrics?.continueWatchClicks ?? emptyMetric },
    { label: '收藏新增', mark: 'FAV', metric: metrics?.favoriteAdds ?? emptyMetric },
    { label: '锁集点击', mark: 'LOCK', metric: metrics?.lockedEpisodeClicks ?? emptyMetric },
    { label: '付费弹窗曝光', mark: 'PAY', metric: metrics?.paywallViews ?? emptyMetric },
    { label: '付费 CTA 点击', mark: 'CTA', metric: metrics?.paywallCtaClicks ?? emptyMetric },
    { label: '分享点击', mark: 'SHARE', metric: metrics?.shareClicks ?? emptyMetric },
    { label: '排行榜曝光', mark: 'RANK', metric: metrics?.rankingViews ?? emptyMetric },
    { label: '追剧页访问', mark: 'LIB', metric: metrics?.libraryViews ?? emptyMetric },
  ];
}

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('7d');
  const [data, setData] = useState<DashboardState>({
    metrics: buildMetricCards(),
    trends: [],
    funnel: [],
    topDramas: [],
    searchKeywords: [],
    filterPreferences: [],
    recentEvents: [],
    recentTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = '运营仪表盘 - 橙影短剧';
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    Promise.all([
      api.dashboardOverview(range),
      api.dashboardTrends(range),
      api.dashboardFunnel(range),
      api.dashboardTopDramas(range),
      api.dashboardSearchKeywords(range),
      api.dashboardFilterPreferences(range),
      api.dashboardRecentEvents(range, 50, 0),
    ])
      .then(([overview, trends, funnel, topDramas, searchKeywords, filterPreferences, recentEvents]) => {
        if (ignore) return;
        setData({
          metrics: buildMetricCards(overview.metrics),
          trends: trends.items,
          funnel: funnel.steps,
          topDramas: topDramas.items,
          searchKeywords: searchKeywords.items,
          filterPreferences: filterPreferences.items,
          recentEvents: recentEvents.items,
          recentTotal: recentEvents.total,
        });
      })
      .catch((loadError) => {
        if (ignore) return;
        setError(loadError instanceof Error ? loadError.message : '加载仪表盘数据失败');
        setData((current) => ({ ...current, metrics: buildMetricCards() }));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [range]);

  const isCompletelyEmpty = useMemo(
    () =>
      !data.trends.some((item) => item.page_view || item.play_start || item.search_submit) &&
      !data.funnel.some((item) => item.value) &&
      !data.topDramas.length &&
      !data.searchKeywords.length &&
      !data.filterPreferences.length &&
      !data.recentEvents.length,
    [data],
  );

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-bold text-[#ff6a3d]">运营仪表盘</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
            汇总前台访问、搜索、播放和转化数据。没有真实用户访问时，本地数据可能为空，可以在 H5 前台搜索、点击卡片、播放模拟视频来产生测试事件。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeTabs value={range} onChange={setRange} />
          <ExportCsvButton range={range} />
        </div>
      </div>

      {error && <p className="mt-5 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      {loading && <p className="mt-5 text-sm text-white/45">正在加载仪表盘数据...</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((item) => (
          <MetricCard key={item.label} label={item.label} metric={item.metric} mark={item.mark} />
        ))}
      </div>

      {!loading && !error && isCompletelyEmpty && (
        <div className="mt-6">
          <EmptyState title="当前范围暂无运营数据" description="切换时间范围，或在前台完成浏览、搜索、播放等操作后刷新页面。" />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <TrendChart items={data.trends} />
        <FunnelPanel steps={data.funnel} />
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-2">
        <TopDramasTable items={data.topDramas} />
        <SearchKeywordsTable items={data.searchKeywords} />
      </div>

      <div className="mt-6">
        <FilterPreferencesTable items={data.filterPreferences} />
      </div>

      <div className="mt-6">
        <RecentEventsTable items={data.recentEvents} total={data.recentTotal} />
      </div>
    </section>
  );
}
