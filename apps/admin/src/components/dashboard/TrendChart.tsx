import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardTrendItem } from '../../lib/api';
import EmptyState from './EmptyState';

type TrendChartProps = {
  items: DashboardTrendItem[];
};

export default function TrendChart({ items }: TrendChartProps) {
  const hasData = items.some((item) => item.page_view || item.play_start || item.search_submit);

  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">访问与播放趋势</h2>
          <p className="mt-1 text-sm text-white/42">page_view / play_start / search_submit</p>
        </div>
      </div>
      {hasData ? (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={items} margin={{ left: -18, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,.45)" tick={{ fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,.45)" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#17171d',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 14,
                  color: '#fff',
                }}
                labelStyle={{ color: 'rgba(255,255,255,.72)' }}
              />
              <Line type="monotone" dataKey="page_view" name="页面访问" stroke="#ff6a3d" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="play_start" name="播放开始" stroke="#ff2d55" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="search_submit" name="搜索提交" stroke="#7dd3fc" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title="暂无趋势数据" description="当前时间范围内还没有访问、播放或搜索事件。" />
      )}
    </section>
  );
}
