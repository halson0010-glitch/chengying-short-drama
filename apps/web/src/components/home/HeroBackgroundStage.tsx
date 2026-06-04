import { useEffect, useMemo, useState } from 'react';
import type { Drama } from '../../types/drama';
import {
  getDramaHeroObjectPosition,
  getDramaPosterObjectPosition,
  resolveDramaHeroAsset,
  resolveDramaPosterAsset,
} from '../../lib/hero';
import HeroIntroFragments from './HeroIntroFragments';

type HeroBackgroundStageProps = {
  current: Drama;
  previous?: Drama;
  revealKey: string;
  introActive: boolean;
  suppressRevealAnimation?: boolean;
};

function HeroImageLayer({
  drama,
  className = '',
  assetKind = 'hero',
}: {
  drama: Drama;
  className?: string;
  assetKind?: 'hero' | 'poster';
}) {
  const asset = useMemo(
    () => (assetKind === 'poster' ? resolveDramaPosterAsset(drama) : resolveDramaHeroAsset(drama)),
    [assetKind, drama],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const active = asset.candidates[activeIndex];
  const objectPosition = assetKind === 'poster' ? getDramaPosterObjectPosition(drama) : getDramaHeroObjectPosition(drama);

  useEffect(() => {
    setActiveIndex(0);
    setFailed(false);
  }, [asset.src, asset.candidates.length, assetKind]);

  if (!active?.src || failed) {
    return (
      <div
        className={`hero-bg-gradient ${className}`}
        style={{ background: drama.gradient }}
        aria-hidden="true"
        data-asset-kind-debug={assetKind}
      />
    );
  }

  return (
    <img
      src={active.src}
      alt=""
      aria-hidden="true"
      data-src-debug={active.src}
      data-source-debug={active.source}
      data-asset-kind-debug={assetKind}
      style={{ objectPosition }}
      className={`hero-bg-image ${className}`}
      onError={() => {
        if (activeIndex < asset.candidates.length - 1) setActiveIndex((index) => index + 1);
        else setFailed(true);
      }}
    />
  );
}

export default function HeroBackgroundStage({
  current,
  previous,
  revealKey,
  introActive,
  suppressRevealAnimation = false,
}: HeroBackgroundStageProps) {
  const showPrevious = Boolean(previous && previous.id !== current.id && !introActive);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {showPrevious && <HeroImageLayer drama={previous ?? current} className="hero-bg-previous" />}
      {showPrevious && (
        <HeroImageLayer
          drama={previous ?? current}
          assetKind="poster"
          className="hero-mobile-poster-layer hero-bg-previous"
        />
      )}
      <HeroImageLayer
        key={revealKey}
        drama={current}
        className={introActive ? 'hero-image-focus-in' : suppressRevealAnimation ? 'hero-bg-stable' : 'hero-bg-crossfade'}
      />
      <HeroImageLayer
        key={`${revealKey}-mobile-poster`}
        drama={current}
        assetKind="poster"
        className={`hero-mobile-poster-layer ${
          introActive ? 'hero-image-focus-in' : suppressRevealAnimation ? 'hero-bg-stable' : 'hero-bg-crossfade'
        }`}
      />
      <HeroImageLayer key={`${revealKey}-blurred-edges`} drama={current} className="hero-blurred-edge-layer" />
      <HeroImageLayer
        key={`${revealKey}-mobile-poster-blurred-edges`}
        drama={current}
        assetKind="poster"
        className="hero-mobile-poster-layer hero-blurred-edge-layer"
      />
      <div className="hero-cinema-mask" />
      <div className="hero-edge-vignette" />
      <div className="hero-corner-fusion" />
      <div className="hero-warm-flare hero-warm-flare-left" />
      <div className="hero-warm-flare hero-warm-flare-right" />
      <div className="hero-floor-glow" />
      {introActive && (
        <>
          <HeroIntroFragments drama={current} active={introActive} />
          <div className="hero-film-intro" aria-hidden="true" />
          <div className="hero-soft-projector-light" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
