import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../../lib/analytics';
import { resolveDramaHeroAsset, resolveDramaPosterAsset } from '../../lib/hero';
import { useHeroAutoplay } from '../../hooks/useHeroAutoplay';
import { usePreloadHeroAssets } from '../../hooks/usePreloadHeroAssets';
import type { Drama } from '../../types/drama';
import { ChevronDownIcon } from '../common/Icons';
import HeroBackgroundStage from './HeroBackgroundStage';
import HeroInfoPanel from './HeroInfoPanel';
import HeroPosterRail from './HeroPosterRail';

type HeroShowcaseProps = {
  dramas: Drama[];
};

let heroIntroPlayed = false;
let heroIntroStarted = false;

function AssetDebugOverlay({ drama }: { drama: Drama }) {
  const hero = resolveDramaHeroAsset(drama);
  const poster = resolveDramaPosterAsset(drama);

  return (
    <div className="absolute right-4 top-4 z-20 max-w-[320px] rounded-2xl border border-white/10 bg-black/70 p-3 text-[11px] leading-5 text-white/72 shadow-card backdrop-blur">
      <p className="font-semibold text-white">Asset Debug</p>
      <p>drama: {drama.id}</p>
      <p>manifest loaded: {hero.manifestLoaded ? 'yes' : 'no'}</p>
      <p>hero source: {String(hero.source)}</p>
      <p className="truncate">hero src: {hero.src || 'gradient'}</p>
      <p>poster source: {String(poster.source)}</p>
      <p className="truncate">poster src: {poster.src || 'gradient'}</p>
    </div>
  );
}

export default function HeroShowcase({ dramas }: HeroShowcaseProps) {
  const [transitionSeed, setTransitionSeed] = useState(0);
  const [introFinished, setIntroFinished] = useState(() => heroIntroPlayed || heroIntroStarted);
  const previousIndexRef = useRef(0);
  const safeDramas = useMemo(() => dramas.slice(0, 5), [dramas]);
  const debugAssets = import.meta.env.VITE_DEBUG_ASSETS === 'true';

  const preloadedAssets = usePreloadHeroAssets(safeDramas);

  useEffect(() => {
    if (heroIntroPlayed || heroIntroStarted) {
      setIntroFinished(true);
      return undefined;
    }
    heroIntroStarted = true;
    const timer = window.setTimeout(() => {
      heroIntroPlayed = true;
      setIntroFinished(true);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, []);

  const { currentIndex, selectIndex, pause, resume } = useHeroAutoplay({
    length: safeDramas.length,
    intervalMs: 5400,
    enabled: introFinished && preloadedAssets.ready,
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
  const introActive = !introFinished;

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
    <section
      className={`hero-showcase relative min-h-[620px] overflow-hidden rounded-[32px] border border-white/[0.08] bg-panel shadow-card md:min-h-[680px] ${
        introActive ? 'is-intro' : 'is-ready'
      }`}
    >
      <HeroBackgroundStage
        current={selectedDrama}
        previous={previousDrama}
        revealKey={`${selectedDrama.id}-${transitionSeed}`}
        introActive={introActive}
      />
      {debugAssets && <AssetDebugOverlay drama={selectedDrama} />}
      <div className="relative z-10 flex min-h-[620px] flex-col justify-between px-5 pb-7 pt-8 sm:px-8 md:min-h-[680px] md:px-10 md:py-12 lg:px-14">
        <div className="pt-4 md:pt-10">
          <HeroInfoPanel
            drama={selectedDrama}
            sequence={currentIndex + 1}
            revealKey={`${selectedDrama.id}-info-${transitionSeed}`}
            introActive={introActive}
          />
        </div>
        <div className="hero-queue-panel mt-10 w-full max-w-[720px] self-end">
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
      <div className="hero-scroll-cue pointer-events-none relative z-10 -mt-7 flex animate-float items-center justify-center pb-5 text-xs font-medium">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-[#ffe0d5]/85 shadow-[0_12px_36px_rgba(0,0,0,0.38)] backdrop-blur">
          滑动查看更多短剧
          <ChevronDownIcon className="h-4 w-4 text-[#ff8a65]" />
        </span>
      </div>
    </section>
  );
}
