import type { DashboardRange } from '../../lib/api';

type RangeTabsProps = {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
};

const ranges: Array<{ value: DashboardRange; label: string }> = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];

export default function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ranges.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            value === item.value
              ? 'bg-gradient-to-r from-[#ff6a3d] to-[#ff2d55] text-white shadow-[0_12px_30px_rgba(255,77,46,.25)]'
              : 'border border-white/[0.1] bg-white/[0.06] text-white/65 hover:border-[#ff4d2e]/50 hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
      <button
        type="button"
        disabled
        className="rounded-full border border-dashed border-white/[0.1] px-4 py-2 text-sm font-bold text-white/30"
      >
        自定义日期范围
      </button>
    </div>
  );
}
