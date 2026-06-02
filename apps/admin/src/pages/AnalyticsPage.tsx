import { useEffect, useState } from 'react';
import ExportCsvButton from '../components/dashboard/ExportCsvButton';
import { api, type AnalyticsOverview } from '../lib/api';

type AnalyticsPageProps = {
  mode: 'overview' | 'search' | 'clicks' | 'funnel';
};

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
            : api.playFunnel().then((item) => setRows([item as unknown as Record<string, unknown>]));

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
            <p className="mt-2 text-sm text-white/45">搜索、点击和播放数据已按短时间窗口去重，减少一次操作重复上报造成的偏差。</p>
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
  };

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-black">{titleMap[mode]}</h1>
          <p className="mt-2 text-sm text-white/45">当前统计会过滤空关键词，并对短时间重复事件做去重。</p>
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
