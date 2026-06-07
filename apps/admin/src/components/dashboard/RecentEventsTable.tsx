import type { DashboardRecentEvent } from '../../lib/api';
import { getEventLabel, summarizeEventPayload } from '../../lib/eventLabels';
import EmptyState from './EmptyState';

type RecentEventsTableProps = {
  items: DashboardRecentEvent[];
  total: number;
};

function formatTime(value: string) {
  if (/^\d{4}-\d{2}-\d{2} /.test(value)) return value.slice(5, 16);
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function RecentEventsTable({ items, total }: RecentEventsTableProps) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-5">
        <div>
          <h2 className="text-xl font-black">最近事件</h2>
          <p className="mt-1 text-sm text-white/42">默认隐藏自动轮播等低价值 debug 事件，payload 仅展示摘要。</p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/45">共 {total.toLocaleString()} 条</span>
      </div>
      {!items.length ? (
        <div className="p-5">
          <EmptyState title="暂无最近事件" description="前台产生埋点后，这里会按时间倒序展示事件流。" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/45">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">事件</th>
                <th className="px-4 py-3">页面</th>
                <th className="px-4 py-3">设备</th>
                <th className="px-4 py-3">payload 摘要</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/[0.06] first:border-t-0 align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-white/45" title={item.createdAtUtc || item.createdAt}>
                    {formatTime(item.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <p className="font-bold text-[#ff6a3d]">{getEventLabel(item.event)}</p>
                    <p className="mt-1 text-xs text-white/35">{item.event}</p>
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-4 text-white/62">{item.path || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-white/62">{item.device || '-'}</td>
                  <td className="px-4 py-4 text-white/62">
                    <span>{summarizeEventPayload(item.event, item.payload)}</span>
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
