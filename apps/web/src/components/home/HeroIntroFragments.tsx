import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
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
  '--fragment-glow': string;
};

const columns = 4;
const rows = 3;
const fragmentCount = columns * rows;

function fragmentOffset(index: number) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const centerX = (columns - 1) / 2;
  const centerY = (rows - 1) / 2;
  const x = (column - centerX) * 9 + (index % 2 === 0 ? -7 : 7);
  const y = (row - centerY) * 10 + (index % 3 === 0 ? 6 : -6);
  return { x, y };
}

export default function HeroIntroFragments({ drama, active }: HeroIntroFragmentsProps) {
  const [mounted, setMounted] = useState(active);

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
          '--fragment-delay': `${70 + index * 24}ms`,
          '--fragment-dx': `${offset.x}px`,
          '--fragment-dy': `${offset.y}px`,
          '--fragment-rotate': `${(index % 5) - 2}deg`,
          '--fragment-glow':
            index % 2 === 0 ? 'rgba(255, 116, 76, 0.22)' : 'rgba(255, 255, 255, 0.13)',
        };

        return <span key={`${drama.id}-${index}`} className="hero-intro-fragment" style={style} />;
      })}
    </div>
  );
}
