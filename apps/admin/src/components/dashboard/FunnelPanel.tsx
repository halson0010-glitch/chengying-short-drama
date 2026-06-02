import type { DashboardFunnelStep } from '../../lib/api';
import EmptyState from './EmptyState';

type FunnelPanelProps = {
  steps: DashboardFunnelStep[];
};

export default function FunnelPanel({ steps }: FunnelPanelProps) {
  const hasData = steps.some((step) => step.value > 0);

  return (
    <section className="surface p-5">
      <h2 className="text-xl font-black">播放转化漏斗</h2>
      <p className="mt-1 text-sm text-white/42">从访问到完播的关键路径，播放 50% 依赖 play_progress 事件。</p>
      {!hasData ? (
        <div className="mt-5">
          <EmptyState title="暂无漏斗数据" description="前台产生播放、点击或完播事件后，这里会自动出现转化链路。" />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {steps.map((step) => (
            <div key={step.key}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-bold">{step.label}</span>
                <span className="text-white/50">
                  {step.value.toLocaleString()} · 上一环节 {step.stepRate.toFixed(1)}% · 总转化 {step.totalRate.toFixed(1)}%
                  {step.key === 'play_progress_50' && step.value === 0 ? ' · 待接入' : ''}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff6a3d] to-[#ff2d55]"
                  style={{ width: `${Math.max(step.totalRate, step.value ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
