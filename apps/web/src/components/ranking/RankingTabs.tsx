import type { RankingType } from '../../services/rankingApi';

export const rankingTabs: Array<{ key: RankingType; label: string; hint: string }> = [
  { key: 'hot', label: '热播榜', hint: '播放与点击综合' },
  { key: 'rising', label: '飙升榜', hint: '近期增长更高' },
  { key: 'new', label: '新剧榜', hint: '最新发布优先' },
  { key: 'completion', label: '完播榜', hint: '完播率参考' },
  { key: 'favorite', label: '收藏榜', hint: '追剧收藏热度' },
];

type RankingTabsProps = {
  value: RankingType;
  onChange: (type: RankingType) => void;
};

export default function RankingTabs({ value, onChange }: RankingTabsProps) {
  return (
    <div className="rail-scroll flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2">
      {rankingTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`shrink-0 rounded-xl px-4 py-2 text-left transition ${
            value === tab.key ? 'bg-accent text-white shadow-glow' : 'text-white/58 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <span className="block text-sm font-semibold">{tab.label}</span>
          <span className="mt-0.5 block text-[11px] opacity-70">{tab.hint}</span>
        </button>
      ))}
    </div>
  );
}
