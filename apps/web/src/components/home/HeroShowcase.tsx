import { useMemo, useRef, useState } from 'react';
import { track } from '../../lib/analytics';
import { useHeroAutoplay } from '../../hooks/useHeroAutoplay';
import type { Drama } from '../../types/drama';
import { ChevronDownIcon } from '../common/Icons';
import HeroBackgroundStage from './HeroBackgroundStage';
import HeroInfoPanel from './HeroInfoPanel';
import HeroPosterRail from './HeroPosterRail';

type HeroShowcaseProps = {
  dramas: Drama[];
};

export default function HeroShowcase({ dramas }: HeroShowcaseProps) {
  const [transitionSeed, setTransitionSeed] = useState(0);
  const previousIndexRef = useRef(0);
  const safeDramas = useMemo(() => dramas.slice(0, 5), [dramas]);

  const { currentIndex, selectIndex, pause, resume } = useHeroAutoplay({
    length: safeDramas.length,
    intervalMs: 5400,
    onAutoSwitch: (nextIndex, previousIndex) => {
      previousIndexRef.current = previousIndex;
      setTransitionSeed((value) => value + 1);
      const nextDrama = safeDramas[nextIndex];
      if (nextDrama) {
        track('hero_auto_switch', {
          dramaId: nextDrama.id,
          dramaTitle: nextDrama.title,
          position: nextIndex + 1,
          previousPosition: previousIndex + 1,
        });
      }
    },
  });

  const selectedDrama = safeDramas[currentIndex] ?? safeDramas[0];
  const previousDrama = safeDramas[previousIndexRef.current] ?? selectedDrama;

  if (!selectedDrama) return null;

  const handleSelect = (index: number) => {
    if (index === currentIndex) return;
    previousIndexRef.current = currentIndex;
    setTransitionSeed((value) => value + 1);
    selectIndex(index);
    const drama = safeDramas[index];
    if (drama) {
      track('hero_manual_switch', {
        dramaId: drama.id,
        dramaTitle: drama.title,
        position: index + 1,
        previousPosition: currentIndex + 1,
      });
      track('hero_switch', {
        dramaId: drama.id,
        dramaTitle: drama.title,
        previousDramaId: selectedDrama.id,
      });
    }
  };

  return (
    <section className="hero-showcase relative min-h-[620px] overflow-hidden rounded-[32px] border border-white/[0.08] bg-panel shadow-card md:min-h-[680px]">
      <HeroBackgroundStage
        current={selectedDrama}
        previous={previousDrama}
        revealKey={`${selectedDrama.id}-${transitionSeed}`}
      />
      <div className="relative z-10 flex min-h-[620px] flex-col justify-between px-5 pb-7 pt-8 sm:px-8 md:min-h-[680px] md:px-10 md:py-12 lg:px-14">
        <div className="pt-4 md:pt-10">
          <HeroInfoPanel
            drama={selectedDrama}
            sequence={currentIndex + 1}
            revealKey={`${selectedDrama.id}-info-${transitionSeed}`}
          />
        </div>
        <div className="hero-queue-panel mt-10 w-full max-w-[700px] self-end">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-white/42">Featured Queue</p>
          <HeroPosterRail
            dramas={safeDramas}
            selectedIndex={currentIndex}
            onSelect={handleSelect}
            onPause={pause}
            onResume={resume}
          />
        </div>
      </div>
      <div className="pointer-events-none relative z-10 -mt-6 flex animate-float items-center justify-center gap-1 pb-5 text-xs text-white/45">
        <span>滑动查看更多短剧</span>
        <ChevronDownIcon className="h-4 w-4" />
      </div>
    </section>
  );
}
