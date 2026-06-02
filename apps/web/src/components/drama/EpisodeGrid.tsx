import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';

type EpisodeGridProps = {
  dramaId: string;
  totalEpisodes: number;
  activeEpisode?: number;
};

export default function EpisodeGrid({ dramaId, totalEpisodes, activeEpisode = 1 }: EpisodeGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {Array.from({ length: totalEpisodes }, (_, index) => index + 1).map((episode) => (
        <Link
          key={episode}
          to={`/watch/${dramaId}/${episode}`}
          data-track="episode-button"
          data-drama-id={dramaId}
          data-episode={episode}
          onClick={() => track('episode_click', { dramaId, episode, source: 'detail-page' })}
          className={`flex h-11 items-center justify-center rounded-xl border text-sm transition ${
            episode === activeEpisode
              ? 'border-accent bg-accent text-white'
              : 'border-white/[0.08] bg-white/[0.04] text-white/65 hover:border-accent/45 hover:text-white'
          }`}
        >
          第 {episode} 集
        </Link>
      ))}
    </div>
  );
}
