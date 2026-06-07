import { useEffect, useState } from 'react';
import ExportCsvButton from '../components/dashboard/ExportCsvButton';
import { api, type AnalyticsOverview } from '../lib/api';
import { getEventLabel } from '../lib/eventLabels';

type AnalyticsPageProps = {
  mode: 'overview' | 'search' | 'clicks' | 'funnel' | 'retention' | 'paywall' | 'ranking';
};

function payload(row: Record<string, unknown>) {
  const value = row.payload;
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function aggregateBy(
  events: Array<Record<string, unknown>>,
  eventNames: string[],
  keyForEvent: (event: Record<string, unknown>) => string,
) {
  const rows = new Map<string, Record<string, unknown>>();
  events
    .filter((event) => eventNames.includes(String(event.event)))
    .forEach((event) => {
      const itemPayload = payload(event);
      const key = keyForEvent(event) || '未命名';
      const row = rows.get(key) ?? { name: key, total: 0 };
      row.total = Number(row.total ?? 0) + 1;
      row[String(event.event)] = Number(row[String(event.event)] ?? 0) + 1;
      if (itemPayload.dramaId) row.dramaId = itemPayload.dramaId;
      if (itemPayload.dramaTitle) row.dramaTitle = itemPayload.dramaTitle;
      if (itemPayload.type) row.type = itemPayload.type;
      rows.set(key, row);
    });
  return [...rows.values()].sort((first, second) => Number(second.total ?? 0) - Number(first.total ?? 0)).slice(0, 30);
}

export default function AnalyticsPage({ mode }: AnalyticsPageProps) {
  const [overview, setOverview] = useState<AnalyticsOverview>();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const request =
      mode === 'overview'
        ? api.analyticsOverview().then((item) => {
            setOverview(item);
            setRows([]);
          })
        : mode === 'search'
          ? api.searchKeywords().then((items) => setRows(items as unknown as Array<Record<string, unknown>>))
          : mode === 'clicks'
            ? api.dramaClicks().then((items) => setRows(items as unknown as Array<Record<string, unknown>>))
            : mode === 'funnel'
              ? api.playFunnel().then((item) => setRows([item as unknown as Record<string, unknown>]))
              : api.analyticsEvents().then((events) => {
                  if (mode === 'retention') {
                    setRows(
                      aggregateBy(
                        events,
                        ['library_page_view', 'continue_watch_click', 'watch_progress_checkpoint', 'watch_duration_update'],
                        (event) => String(payload(event).dramaTitle ?? payload(event).dramaId ?? event.event),
                      ),
                    );
                  }
                  if (mode === 'paywall') {
                    setRows(
                      aggregateBy(
                        events,
                        ['episode_locked_click', 'locked_episode_view', 'paywall_popup_view', 'paywall_cta_click', 'payment_checkout_start', 'payment_success_page_view'],
                        (event) => String(payload(event).dramaTitle ?? payload(event).dramaId ?? event.event),
                      ),
                    );
                  }
                  if (mode === 'ranking') {
                    setRows(
                      aggregateBy(
                        events,
                        ['ranking_view', 'ranking_tab_switch', 'ranking_item_click'],
                        (event) => String(payload(event).type ?? payload(event).dramaTitle ?? event.event),
                      ),
                    );
                  }
                });

    void request
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : '加载埋点数据失败'))
      .finally(() => setLoading(false));
  }, [mode]);

  if (mode === 'overview') {
    const cards = overview
      ? [
          ['总事件', overview.totalEvents],
          ['访客数', overview.uniqueVisitors],
          ['页面访问', overview.pageViews],
          ['搜索提交', overview.searches],
          ['剧目点击', overview.dramaClicks],
          ['播放开始', overview.playStarts],
          ['播放完成', overview.playCompletes],
        ]
      : [];
    return (
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl font-black">埋点概览</h1>
            <p className="mt-2 text-sm text-white/45">搜索、点击和播放数据已按短时间窗口去重。</p>
          </div>
          <ExportCsvButton range="7d" types={['raw_events']} label="导出原始事件 CSV" />
        </div>
        {loading && <p className="mt-5 text-sm text-white/45">加载中...</p>}
        {error && <p className="mt-5 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="surface p-5">
              <p className="text-sm text-white/42">{label}</p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const titleMap = {
    search: '搜索词统计',
    clicks: '剧目点击排行',
    funnel: '播放转化漏斗',
    retention: '观看留存 / 继续观看',
    paywall: '锁集与付费弹窗分析',
    ranking: '排行榜分析',
  } as const;

  const renderRows = () => {
    if (!rows.length) {
      return (
        <tr>
          <td className="px-4 py-8 text-white/45">暂无数据</td>
        </tr>
      );
    }

    if (mode === 'search') {
      return rows.map((row, index) => (
        <tr key={`${row.keyword}-${index}`} className="border-t border-white/[0.06] first:border-t-0">
          <td className="px-4 py-4 text-white/35">#{index + 1}</td>
          <td className="px-4 py-4 font-semibold">{String(row.keyword ?? '-')}</td>
          <td className="px-4 py-4 text-white/62">{Number(row.count ?? 0)} 次搜索</td>
        </tr>
      ));
    }

    if (mode === 'clicks') {
      return rows.map((row, index) => (
        <tr key={`${row.dramaId ?? row.dramaTitle}-${index}`} className="border-t border-white/[0.06] first:border-t-0">
          <td className="px-4 py-4 text-white/35">#{index + 1}</td>
          <td className="px-4 py-4 font-semibold">{String(row.dramaTitle ?? '未命名短剧')}</td>
          <td className="px-4 py-4 text-white/62">{Number(row.count ?? 0)} 次点击</td>
        </tr>
      ));
    }

    if (mode === 'funnel') {
      const funnel = rows[0] ?? {};
      const formatPercent = (value: unknown) => `${(Number(value ?? 0) * 100).toFixed(1)}%`;
      const items: Array<[string, string | number | unknown]> = [
        ['播放按钮点击', funnel.buttonClicks],
        ['播放开始', funnel.starts],
        ['播放暂停', funnel.pauses],
        ['播放完成', funnel.completes],
        ['点击后播放率', formatPercent(funnel.startRate)],
        ['播放完成率', formatPercent(funnel.completeRate)],
      ];
      return items.map(([label, value]) => (
        <tr key={String(label)} className="border-t border-white/[0.06] first:border-t-0">
          <td className="px-4 py-4 text-white/45">{label}</td>
          <td className="px-4 py-4 font-semibold">{String(value ?? 0)}</td>
        </tr>
      ));
    }

    const eventKeys = [...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => key.includes('_'))))];
    return rows.map((row, index) => (
      <tr key={`${row.name}-${index}`} className="border-t border-white/[0.06] first:border-t-0">
        <td className="px-4 py-4 text-white/35">#{index + 1}</td>
        <td className="px-4 py-4">
          <p className="font-semibold">{String(row.dramaTitle ?? row.name ?? '-')}</p>
          {row.type ? <p className="mt-1 text-xs text-white/38">类型：{String(row.type)}</p> : null}
        </td>
        <td className="px-4 py-4 text-white/62">合计 {Number(row.total ?? 0)}</td>
        <td className="px-4 py-4 text-xs leading-6 text-white/45">
          {eventKeys
            .filter((key) => row[key])
            .map((key) => `${getEventLabel(key)} ${row[key]}`)
            .join(' · ')}
        </td>
      </tr>
    ));
  };

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-black">{titleMap[mode]}</h1>
          <p className="mt-2 text-sm text-white/45">当前统计会过滤空搜索词，并对短时间重复事件做去重。</p>
        </div>
        <ExportCsvButton range="7d" types={['raw_events']} label="导出原始事件 CSV" />
      </div>
      {loading && <p className="mt-5 text-sm text-white/45">加载中...</p>}
      {error && <p className="mt-5 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      <div className="surface mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
    </section>
  );
}
