import type { DashboardMetric } from '../../lib/api';

type MetricCardProps = {
  label: string;
  metric: DashboardMetric;
  mark: string;
};

function formatChange(metric: DashboardMetric) {
  if (metric.previous <= 0 || metric.changePercent === null) return '--';
  const sign = metric.changePercent > 0 ? '+' : '';
  return `${sign}${metric.changePercent.toFixed(1)}%`;
}

export default function MetricCard({ label, metric, mark }: MetricCardProps) {
  const isUp = metric.changePercent !== null && metric.changePercent >= 0;
  const isFlat = metric.changePercent === null;

  return (
    <article className="surface group p-5 transition duration-200 hover:-translate-y-1 hover:border-[#ff4d2e]/45">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/50">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{metric.value.toLocaleString()}</p>
        </div>
        <span className="rounded-2xl bg-white/[0.06] px-3 py-2 text-sm font-black text-[#ff6a3d]">{mark}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-white/35">上一周期 {metric.previous.toLocaleString()}</span>
        <span className={isFlat ? 'text-white/35' : isUp ? 'text-emerald-300' : 'text-red-300'}>{formatChange(metric)}</span>
      </div>
    </article>
  );
}
