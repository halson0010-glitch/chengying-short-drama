import type { CSSProperties } from 'react';
import { getDramaPosterObjectPosition, resolveDramaPosterAsset } from '../../lib/hero';
import type { Drama } from '../../types/drama';
import MockPoster from '../drama/MockPoster';

type HeroPosterRailProps = {
  dramas: Drama[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
};

type ThumbStyle = CSSProperties & {
  '--thumb-opacity'?: string;
};

export default function HeroPosterRail({
  dramas,
  selectedIndex,
  onSelect,
  onPause,
  onResume,
}: HeroPosterRailProps) {
  return (
    <div
      className="hero-poster-rail rail-scroll flex snap-x gap-3 overflow-x-auto pb-2 lg:justify-end lg:gap-4"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
    >
      {dramas.map((drama, index) => {
        const selected = selectedIndex === index;
        const posterAsset = resolveDramaPosterAsset(drama);
        return (
          <button
            key={drama.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`切换推荐至 ${drama.title}`}
            aria-pressed={selected}
            className={`hero-thumb group w-[104px] shrink-0 snap-start text-left transition duration-300 sm:w-[116px] lg:w-[132px] xl:w-[142px] ${
              selected ? 'is-active opacity-100' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              animationDelay: `${1120 + index * 80}ms`,
              '--thumb-opacity': selected ? '1' : '0.6',
            } as ThumbStyle}
          >
            <MockPoster
              gradient={drama.gradient}
              title={drama.title}
              posterUrl={posterAsset.src}
              posterCandidates={posterAsset.candidates.map((candidate) => candidate.src)}
              assetSource={String(posterAsset.source)}
              objectPosition={getDramaPosterObjectPosition(drama)}
              tags={drama.tags}
              showPlay={false}
              className={`rounded-2xl border transition duration-300 ${
                selected ? 'border-accent shadow-glow' : 'border-white/10 group-hover:border-white/25'
              }`}
            />
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-1.5 flex-1 rounded-full ${selected ? 'bg-accent' : 'bg-white/15'}`} />
              <span className="text-[11px] font-semibold text-white/52">{index + 1}/5</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
