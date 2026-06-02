import { Link } from 'react-router-dom';
import { hotSearches } from '../../lib/search';

type HotSearchesProps = {
  onSelect?: (keyword: string) => void;
  compact?: boolean;
};

export default function HotSearches({ onSelect, compact = false }: HotSearchesProps) {
  return (
    <div>
      <p className={`font-medium text-white/45 ${compact ? 'mb-3 text-xs' : 'mb-4 text-sm'}`}>热门搜索</p>
      <div className="flex flex-wrap gap-2">
        {hotSearches.map((keyword) =>
          onSelect ? (
            <button
              key={keyword}
              type="button"
              onClick={() => onSelect(keyword)}
              className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm text-white/65 transition hover:border-accent/40 hover:text-white"
            >
              {keyword}
            </button>
          ) : (
            <Link
              key={keyword}
              to={`/search?q=${encodeURIComponent(keyword)}`}
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

