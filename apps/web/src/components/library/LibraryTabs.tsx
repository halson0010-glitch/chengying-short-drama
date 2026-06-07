export type LibraryTab = 'continue' | 'favorites' | 'history';

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'continue', label: '继续观看' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'history', label: '观看历史' },
];

type LibraryTabsProps = {
  value: LibraryTab;
  onChange: (tab: LibraryTab) => void;
  counts?: Partial<Record<LibraryTab, number>>;
};

export default function LibraryTabs({ value, onChange, counts = {} }: LibraryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            value === tab.key
              ? 'border-accent bg-accent text-white'
              : 'border-white/[0.08] bg-white/[0.04] text-white/58 hover:border-accent/40 hover:text-white'
          }`}
        >
          {tab.label}
          {counts[tab.key] ? <span className="ml-2 text-xs opacity-70">{counts[tab.key]}</span> : null}
        </button>
      ))}
    </div>
  );
}
