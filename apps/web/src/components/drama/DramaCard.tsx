import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';
import { getDramaPosterFallbackImage, getDramaPosterImage } from '../../lib/hero';
import type { Drama } from '../../types/drama';
import MockPoster from './MockPoster';
import TagChip from './TagChip';

type DramaCardProps = {
  drama: Drama;
  compact?: boolean;
  className?: string;
  moduleName?: string;
  position?: number;
  revealIndex?: number;
  onClick?: (drama: Drama, position: number) => void;
};

type RevealStyle = CSSProperties & {
  '--reveal-delay'?: string;
};

export default function DramaCard({
  drama,
  compact = false,
  className = '',
  moduleName = '短剧推荐',
  position = 1,
  revealIndex,
  onClick,
}: DramaCardProps) {
  const revealStyle =
    revealIndex === undefined
      ? undefined
      : ({ '--reveal-delay': `${Math.min(revealIndex, 18) * 64}ms` } as RevealStyle);

  return (
    <Link
      to={`/detail/${drama.id}`}
      aria-label={`查看《${drama.title}》详情`}
      data-track="drama-card"
      data-drama-id={drama.id}
      data-module={moduleName}
      data-position={position}
      onClick={() => {
        track('drama_card_click', {
          dramaId: drama.id,
          dramaTitle: drama.title,
          module: moduleName,
          position,
        });
        onClick?.(drama, position);
      }}
      style={revealStyle}
      className={`group block min-w-0 transition duration-200 hover:-translate-y-1 ${
        revealIndex === undefined ? '' : 'reveal-card'
      } ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-card">
        <MockPoster
          gradient={drama.gradient}
          title={drama.title}
          posterUrl={getDramaPosterImage(drama)}
          fallbackPosterUrl={getDramaPosterFallbackImage(drama)}
          tags={drama.tags}
          className="transition duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium backdrop-blur">
          全 {drama.totalEpisodes} 集
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white/85 backdrop-blur">
          {drama.heat}
        </span>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/30 group-hover:opacity-100">
          <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">立即观看</span>
        </div>
      </div>
      <h3 className={`mt-3 text-clamp-2 font-semibold text-white ${compact ? 'text-sm' : 'text-[15px]'}`}>
        {drama.title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {drama.tags.slice(0, compact ? 2 : 3).map((tag) => (
          <TagChip key={tag} compact>
            {tag}
          </TagChip>
        ))}
      </div>
    </Link>
  );
}
