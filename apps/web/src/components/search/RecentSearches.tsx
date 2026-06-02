import { Link } from 'react-router-dom';

type RecentSearchesProps = {
  keywords: string[];
  onClear: () => void;
};

export default function RecentSearches({ keywords, onClear }: RecentSearchesProps) {
  if (!keywords.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">最近搜索</h2>
        <button type="button" onClick={onClear} className="text-sm text-white/42 transition hover:text-accent">
          清空记录
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <Link
            key={keyword}
            to={`/search?q=${encodeURIComponent(keyword)}`}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/65 transition hover:border-accent/40 hover:text-white"
          >
            {keyword}
          </Link>
        ))}
      </div>
    </section>
  );
}

