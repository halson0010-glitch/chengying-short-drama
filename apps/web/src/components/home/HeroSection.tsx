import { useState } from 'react';
import { track } from '../../lib/analytics';
import { getDramaPosterFallbackImage, getDramaPosterImage } from '../../lib/hero';
import type { Drama } from '../../types/drama';
import GradientButton from '../common/GradientButton';
import { ChevronDownIcon, PlayIcon } from '../common/Icons';
import MockPoster from '../drama/MockPoster';
import TagChip from '../drama/TagChip';

type HeroSectionProps = {
  dramas: Drama[];
};

export default function HeroSection({ dramas }: HeroSectionProps) {
  const [selectedId, setSelectedId] = useState(dramas[0]?.id);
  const selectedDrama = dramas.find((drama) => drama.id === selectedId) ?? dramas[0];

  if (!selectedDrama) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-panel px-5 pb-8 pt-7 shadow-card md:px-9 md:pb-10 md:pt-10">
      <div
        className="absolute inset-0 scale-110 opacity-35 blur-[64px] transition duration-500"
        style={{ background: selectedDrama.gradient }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d12]/95 via-[#0d0d12]/78 to-[#0d0d12]/72" />
      <div className="relative grid items-center gap-8 xl:grid-cols-[1fr_490px]">
        <div className="max-w-xl">
          <p className="mb-4 inline-flex rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-[#ff7555]">
            本周精选 · 热门推荐
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-[54px]">
            {selectedDrama.title}
          </h1>
          <p className="mt-3 text-base text-white/62 md:text-lg">{selectedDrama.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {selectedDrama.tags.slice(0, 4).map((tag) => (
              <TagChip key={tag}>{tag}</TagChip>
            ))}
          </div>
          <p className="mt-5 text-clamp-3 max-w-lg text-sm leading-7 text-white/62 md:text-[15px]">
            {selectedDrama.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/62">
            <span>全 {selectedDrama.totalEpisodes} 集</span>
            <span>热度 {selectedDrama.heat}</span>
            <span>近期热播</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <GradientButton
              to={`/watch/${selectedDrama.id}/1`}
              icon={<PlayIcon className="h-4 w-4" />}
              className="min-w-[136px]"
              data-track="play-button"
              data-drama-id={selectedDrama.id}
              data-source="home-hero"
              onClick={() =>
                track('play_button_click', {
                  dramaId: selectedDrama.id,
                  dramaTitle: selectedDrama.title,
                  source: 'home-hero',
                })
              }
            >
              播放正片
            </GradientButton>
            <GradientButton to={`/detail/${selectedDrama.id}`} variant="secondary">
              查看详情
            </GradientButton>
          </div>
        </div>
        <div className="rail-scroll flex gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-5 xl:gap-3 xl:overflow-visible xl:pb-0">
          {dramas.map((drama) => (
            <button
              key={drama.id}
              type="button"
              onClick={() => {
                setSelectedId(drama.id);
                track('hero_switch', {
                  dramaId: drama.id,
                  dramaTitle: drama.title,
                  previousDramaId: selectedDrama.id,
                });
              }}
              aria-label={`切换推荐至 ${drama.title}`}
              className={`group w-[116px] shrink-0 text-left transition hover:-translate-y-1 xl:w-auto ${
                selectedDrama.id === drama.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <MockPoster
                gradient={drama.gradient}
                title={drama.title}
                posterUrl={getDramaPosterImage(drama)}
                fallbackPosterUrl={getDramaPosterFallbackImage(drama)}
                tags={drama.tags}
                showPlay={false}
                className={`rounded-xl border ${
                  selectedDrama.id === drama.id ? 'border-accent shadow-glow' : 'border-white/10'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="relative mt-10 flex animate-float items-center justify-center gap-1 text-xs text-white/38">
        <span>滑动查看更多短剧</span>
        <ChevronDownIcon className="h-4 w-4" />
      </div>
    </section>
  );
}
