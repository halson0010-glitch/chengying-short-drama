import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';

type WatchEpisodeListProps = {
  dramaId: string;
  totalEpisodes: number;
  currentEpisode: number;
};

export default function WatchEpisodeList({ dramaId, totalEpisodes, currentEpisode }: WatchEpisodeListProps) {
  return (
    <aside className="surface flex min-h-0 flex-col p-4 lg:h-[72vh] lg:max-h-[760px] lg:w-[320px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">选集</h2>
        <span className="text-xs text-white/42">全 {totalEpisodes} 集</span>
      </div>
      <div className="rail-scroll flex gap-2 overflow-x-auto lg:grid lg:grid-cols-3 lg:content-start lg:overflow-y-auto lg:pr-1">
        {Array.from({ length: totalEpisodes }, (_, index) => index + 1).map((episode) => (
          <Link
            key={episode}
            to={`/watch/${dramaId}/${episode}`}
            aria-current={episode === currentEpisode ? 'page' : undefined}
            data-track="episode-button"
            data-drama-id={dramaId}
            data-episode={episode}
            onClick={() => track('episode_click', { dramaId, episode, source: 'watch-list' })}
            className={`flex h-11 w-[74px] shrink-0 items-center justify-center rounded-lg border text-sm transition lg:w-auto ${
              episode === currentEpisode
                ? 'border-accent bg-accent text-white'
                : 'border-white/[0.08] bg-white/[0.04] text-white/60 hover:border-accent/40 hover:text-white'
            }`}
          >
            {episode}
          </Link>
        ))}
      </div>
    </aside>
  );
}
