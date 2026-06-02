import { useEffect, useState } from 'react';
import type { Drama } from '../../types/drama';
import { getDramaHeroBackground, getDramaHeroBackgroundFallback } from '../../lib/hero';

type HeroBackgroundStageProps = {
  current: Drama;
  previous?: Drama;
  revealKey: string;
};

function HeroImageLayer({
  drama,
  className = '',
}: {
  drama: Drama;
  className?: string;
}) {
  const primary = getDramaHeroBackground(drama);
  const fallback = getDramaHeroBackgroundFallback(drama);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(primary);
    setFailed(false);
  }, [primary, fallback]);

  if (!src || failed) {
    return <div className={`hero-bg-gradient ${className}`} style={{ background: drama.gradient }} aria-hidden="true" />;
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`hero-bg-image ${className}`}
      onError={() => {
        if (fallback && src !== fallback) setSrc(fallback);
        else setFailed(true);
      }}
    />
  );
}

export default function HeroBackgroundStage({ current, previous, revealKey }: HeroBackgroundStageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <HeroImageLayer drama={previous ?? current} className="opacity-60" />
      <HeroImageLayer key={revealKey} drama={current} className="hero-bg-reveal" />
      <div className="hero-cinema-mask" />
      <div className="hero-edge-vignette" />
      <div className="hero-warm-flare hero-warm-flare-left" />
      <div className="hero-warm-flare hero-warm-flare-right" />
      <div className="hero-floor-glow" />
      <div className="hero-intro-dark" aria-hidden="true" />
      <div className="hero-intro-beam" aria-hidden="true" />
      <div className="hero-intro-reveal-line" aria-hidden="true" />
    </div>
  );
}
