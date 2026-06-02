import type { Drama } from '../../types/drama';
import HotSearches from './HotSearches';

type SearchSuggestPanelProps = {
  keyword: string;
  suggestions: Drama[];
  recentSearches?: string[];
  loading?: boolean;
  onSelect: (drama: Drama, position: number) => void;
  onHotSelect: (keyword: string) => void;
  onRecentSelect?: (keyword: string) => void;
  onClearRecent?: () => void;
};

export default function SearchSuggestPanel({
  keyword,
  suggestions,
  recentSearches = [],
  loading = false,
  onSelect,
  onHotSelect,
  onRecentSelect,
  onClearRecent,
}: SearchSuggestPanelProps) {
  return (
    <div className="absolute inset-x-0 top-[calc(100%+10px)] z-50 animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-[#17171d] p-3 shadow-card">
      {!keyword ? (
        <div className="space-y-5 p-2">
          {recentSearches.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-white/45">最近搜索</p>
                <button
                  type="button"
                  onClick={onClearRecent}
                  className="text-xs text-white/35 transition hover:text-accent"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((recentKeyword) => (
                  <button
                    key={recentKeyword}
                    type="button"
                    onClick={() => onRecentSelect?.(recentKeyword)}
                    className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm text-white/65 transition hover:border-accent/40 hover:text-white"
                  >
                    {recentKeyword}
                  </button>
                ))}
              </div>
            </div>
          )}
          <HotSearches onSelect={onHotSelect} compact />
        </div>
      ) : loading ? (
        <p className="px-3 py-8 text-center text-sm text-white/42">正在搜索...</p>
      ) : suggestions.length ? (
        <div className="space-y-1">
          {suggestions.map((drama, index) => (
            <button
              key={drama.id}
              type="button"
              onClick={() => onSelect(drama, index + 1)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.07]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{drama.title}</p>
                <p className="mt-1 truncate text-xs text-white/44">{drama.tags.slice(0, 3).join(' · ')}</p>
              </div>
              <span className="shrink-0 text-xs text-white/42">{drama.heat}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-3 py-8 text-center text-sm text-white/42">暂无匹配建议</p>
      )}
    </div>
  );
}
