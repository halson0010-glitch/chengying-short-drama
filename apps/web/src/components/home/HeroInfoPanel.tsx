import { track } from '../../lib/analytics';
import type { Drama } from '../../types/drama';
import GradientButton from '../common/GradientButton';
import { PlayIcon } from '../common/Icons';
import TagChip from '../drama/TagChip';

type HeroInfoPanelProps = {
  drama: Drama;
  sequence: number;
  revealKey: string;
  introActive: boolean;
};

export default function HeroInfoPanel({ drama, sequence, revealKey, introActive }: HeroInfoPanelProps) {
  return (
    <div
      key={revealKey}
      className={`hero-info-panel max-w-[560px] lg:max-w-[640px] ${introActive ? 'is-intro-copy' : 'is-switch-copy'}`}
    >
      <p className="mb-5 inline-flex rounded-full border border-accent/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-[#ff8a65] backdrop-blur">
        开屏推荐 0{sequence} · 沉浸精选
      </p>
      <h1 className="text-[42px] font-black leading-[0.98] tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-[80px] xl:text-[88px]">
        {drama.title}
      </h1>
      <p className="mt-4 text-lg text-white/78 md:text-xl lg:text-2xl">{drama.subtitle}</p>
      <div className="mt-7 flex flex-wrap gap-2">
        {drama.tags.slice(0, 4).map((tag) => (
          <TagChip key={tag}>{tag}</TagChip>
        ))}
      </div>
      <p className="mt-6 text-clamp-3 max-w-xl text-sm leading-7 text-white/72 md:text-[15px] lg:text-base">
        {drama.description}
      </p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
        <span>全 {drama.totalEpisodes} 集</span>
        <span>热度 {drama.heat}</span>
        <span>{drama.visualTone || '沉浸短剧感'}</span>
      </div>
      <div className="hero-play-actions mt-9 flex flex-wrap gap-3">
        <GradientButton
          to={`/watch/${drama.id}/1`}
          icon={<PlayIcon className="h-4 w-4" />}
          className="min-w-[148px]"
          data-track="play-button"
          data-drama-id={drama.id}
          data-source="home-hero"
          onClick={() =>
            track('play_button_click', {
              dramaId: drama.id,
              dramaTitle: drama.title,
              source: 'home-hero',
            })
          }
        >
          播放正片
        </GradientButton>
        <GradientButton to={`/detail/${drama.id}`} variant="secondary">
          查看详情
        </GradientButton>
      </div>
    </div>
  );
}
