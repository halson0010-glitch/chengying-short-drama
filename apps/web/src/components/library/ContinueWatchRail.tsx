import { Link } from 'react-router-dom';
import MockPoster from '../drama/MockPoster';
import { getDramaPosterFallbackImage, getDramaPosterImage, getDramaPosterObjectPosition } from '../../lib/hero';
import type { WatchProgressItem } from '../../services/engagementApi';

type ContinueWatchRailProps = {
  items: WatchProgressItem[];
  title?: string;
  onItemClick?: (item: WatchProgressItem, position: number) => void;
};

function progressPercent(item: WatchProgressItem) {
  return Math.min(100, Math.max(0, Math.round((item.progress || 0) * 100)));
}

export default function ContinueWatchRail({ items, title = '继续观看', onItemClick }: ContinueWatchRailProps) {
  const visibleItems = items.filter((item) => item.drama).slice(0, 10);
  if (!visibleItems.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
        <Link to="/library" className="text-sm font-semibold text-[#ff7555] transition hover:text-white">
          全部
        </Link>
      </div>
      <div className="rail-scroll flex gap-4 overflow-x-auto pb-2">
        {visibleItems.map((item, index) => {
          const drama = item.drama;
          if (!drama) return null;
          return (
            <Link
              key={`${item.dramaId}-${item.episode}`}
              to={`/watch/${item.dramaId}/${item.episode}`}
              onClick={() => onItemClick?.(item, index + 1)}
              className="group w-[132px] shrink-0"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-card">
                <MockPoster
                  gradient={drama.gradient}
                  title={drama.title}
                  posterUrl={getDramaPosterImage(drama)}
                  fallbackPosterUrl={getDramaPosterFallbackImage(drama)}
                  objectPosition={getDramaPosterObjectPosition(drama)}
                  tags={drama.tags}
                  className="transition duration-300 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-2 bottom-2 overflow-hidden rounded-full bg-black/55">
                  <span className="block h-1.5 bg-accent" style={{ width: `${progressPercent(item)}%` }} />
                </div>
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-white">{drama.title}</p>
              <p className="mt-1 text-xs text-white/45">
                第 {item.episode} 集 · {progressPercent(item)}%
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
