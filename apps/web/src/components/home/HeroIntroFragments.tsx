import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { resolveDramaHeroAsset } from '../../lib/hero';
import type { Drama } from '../../types/drama';

type HeroIntroFragmentsProps = {
  drama: Drama;
  active: boolean;
};

type FragmentStyle = CSSProperties & {
  '--fragment-delay': string;
  '--fragment-dx': string;
  '--fragment-dy': string;
  '--fragment-rotate': string;
};

const columns = 6;
const rows = 4;
const fragmentCount = columns * rows;

function fragmentOffset(index: number) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const centerX = (columns - 1) / 2;
  const centerY = (rows - 1) / 2;
  const x = (column - centerX) * 12 + (index % 2 === 0 ? -10 : 10);
  const y = (row - centerY) * 14 + (index % 3 === 0 ? 10 : -8);
  return { x, y };
}

export default function HeroIntroFragments({ drama, active }: HeroIntroFragmentsProps) {
  const [mounted, setMounted] = useState(active);
  const asset = useMemo(() => resolveDramaHeroAsset(drama), [drama]);
  const imageSrc = asset.src;

  useEffect(() => {
    if (active) setMounted(true);
  }, [active]);

  if (!mounted) return null;

  return (
    <div
      className="hero-intro-fragments"
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if ((event.target as HTMLElement).classList.contains('hero-intro-veil')) {
          setMounted(false);
        }
      }}
    >
      <div className="hero-intro-veil" />
      {Array.from({ length: fragmentCount }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const offset = fragmentOffset(index);
        const width = 100 / columns;
        const height = 100 / rows;
        const style: FragmentStyle = {
          left: `${column * width}%`,
          top: `${row * height}%`,
          width: `${width + 0.7}%`,
          height: `${height + 0.9}%`,
          backgroundImage: imageSrc ? `url("${imageSrc}")` : drama.gradient,
          backgroundPosition: `${(column / (columns - 1)) * 100}% ${(row / (rows - 1)) * 100}%`,
          '--fragment-delay': `${80 + index * 16}ms`,
          '--fragment-dx': `${offset.x}px`,
          '--fragment-dy': `${offset.y}px`,
          '--fragment-rotate': `${(index % 5) - 2}deg`,
        };

        return <span key={`${drama.id}-${index}`} className="hero-intro-fragment" style={style} />;
      })}
    </div>
  );
}
