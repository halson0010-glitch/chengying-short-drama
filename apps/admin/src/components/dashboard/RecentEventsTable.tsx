import type { DashboardRecentEvent } from '../../lib/api';
import EmptyState from './EmptyState';

type RecentEventsTableProps = {
  items: DashboardRecentEvent[];
  total: number;
};

const summaryKeys = [
  'keyword',
  'search_term',
  'resultCount',
  'result_count',
  'dramaTitle',
  'dramaId',
  'filterKey',
  'filterValue',
  'progress',
  'source',
  'module',
  'episode',
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function payloadSummary(payload: Record<string, unknown>) {
  const parts = summaryKeys
    .filter((key) => payload[key] !== undefined && payload[key] !== null && String(payload[key]).trim())
    .slice(0, 4)
    .map((key) => `${key}: ${String(payload[key]).slice(0, 36)}`);
  return parts.length ? parts.join(' · ') : '无关键 payload';
}

export default function RecentEventsTable({ items, total }: RecentEventsTableProps) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-5">
        <div>
          <h2 className="text-xl font-black">最近事件</h2>
          <p className="mt-1 text-sm text-white/42">展示最近 50 条事件，payload 仅显示摘要。</p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/45">共 {total.toLocaleString()} 条</span>
      </div>
      {!items.length ? (
        <div className="p-5">
          <EmptyState title="暂无最近事件" description="前台产生埋点后，这里会按时间倒序展示事件流。" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/45">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">事件名</th>
                <th className="px-4 py-3">页面</th>
                <th className="px-4 py-3">设备</th>
                <th className="px-4 py-3">payload 摘要</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/[0.06] first:border-t-0 align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-white/45">{formatTime(item.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-bold text-[#ff6a3d]">{item.event}</td>
                  <td className="max-w-[260px] truncate px-4 py-4 text-white/62">{item.path || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-white/62">{item.device || '-'}</td>
                  <td className="px-4 py-4 text-white/62">
                    <span>{payloadSummary(item.payload)}</span>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-white/35 hover:text-white/70">查看 JSON</summary>
                      <pre className="mt-2 max-w-[420px] whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-white/45">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
