import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';
import { hotSearches } from '../../lib/search';
import { getHotSearchKeywords } from '../../services/searchHotApi';

type HotSearchesProps = {
  onSelect?: (keyword: string) => void;
  compact?: boolean;
};

export default function HotSearches({ onSelect, compact = false }: HotSearchesProps) {
  const [keywords, setKeywords] = useState<string[]>(hotSearches);

  useEffect(() => {
    let active = true;
    void getHotSearchKeywords().then((items) => {
      if (active) setKeywords(items.map((item) => item.keyword).filter(Boolean).slice(0, 12));
    });
    return () => {
      active = false;
    };
  }, []);

  const trackHotKeyword = (keyword: string) => {
    track('search_hot_keyword_click', { keyword, source: compact ? 'suggest-panel' : 'search-page' });
  };

  return (
    <div>
      <p className={`font-medium text-white/45 ${compact ? 'mb-3 text-xs' : 'mb-4 text-sm'}`}>热门搜索</p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) =>
          onSelect ? (
            <button
              key={keyword}
              type="button"
              onClick={() => {
                trackHotKeyword(keyword);
                onSelect(keyword);
              }}
              className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm text-white/65 transition hover:border-accent/40 hover:text-white"
            >
              {keyword}
            </button>
          ) : (
            <Link
              key={keyword}
              to={`/search?q=${encodeURIComponent(keyword)}`}
              onClick={() => trackHotKeyword(keyword)}
              className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm text-white/65 transition hover:border-accent/40 hover:text-white"
            >
              {keyword}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
