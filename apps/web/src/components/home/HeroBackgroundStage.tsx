import { useEffect, useMemo, useState } from 'react';
import type { Drama } from '../../types/drama';
import { resolveDramaHeroAsset } from '../../lib/hero';

type HeroBackgroundStageProps = {
  current: Drama;
  previous?: Drama;
  revealKey: string;
  introActive: boolean;
};

function HeroImageLayer({
  drama,
  className = '',
}: {
  drama: Drama;
  className?: string;
}) {
  const asset = useMemo(() => resolveDramaHeroAsset(drama), [drama]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const active = asset.candidates[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setFailed(false);
  }, [asset.src, asset.candidates.length]);

  if (!active?.src || failed) {
    return <div className={`hero-bg-gradient ${className}`} style={{ background: drama.gradient }} aria-hidden="true" />;
  }

  return (
    <img
      src={active.src}
      alt=""
      aria-hidden="true"
      data-src-debug={active.src}
      data-source-debug={active.source}
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
}: HeroBackgroundStageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <HeroImageLayer drama={previous ?? current} className="hero-bg-previous" />
      <HeroImageLayer
        key={revealKey}
        drama={current}
        className={introActive ? 'hero-image-focus-in' : 'hero-bg-crossfade'}
      />
      <div className="hero-cinema-mask" />
      <div className="hero-edge-vignette" />
      <div className="hero-warm-flare hero-warm-flare-left" />
      <div className="hero-warm-flare hero-warm-flare-right" />
      <div className="hero-floor-glow" />
      {introActive && (
        <>
          <div className="hero-film-intro" aria-hidden="true" />
          <div className="hero-soft-projector-light" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
