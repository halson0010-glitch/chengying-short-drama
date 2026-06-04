import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { Drama } from '../../types/drama';

type HeroIntroFragmentsProps = {
  drama: Drama;
  active: boolean;
};

type FragmentStyle = CSSProperties & {
  '--fragment-delay': string;
  '--fragment-dx': string;
  '--fragment-dy': string;
  '--fragment-mid-dx': string;
  '--fragment-mid-dy': string;
  '--fragment-rotate': string;
  '--fragment-mid-rotate': string;
  '--fragment-alpha': string;
  '--fragment-tint': string;
};

const desktopGrid = { columns: 8, rows: 5 };
const mobileGrid = { columns: 5, rows: 4 };
const fragmentDurationMs = 1840;

function getInitialGrid() {
  if (typeof window === 'undefined') return desktopGrid;
  return window.matchMedia('(max-width: 767px)').matches ? mobileGrid : desktopGrid;
}

function useFragmentGrid() {
  const [grid, setGrid] = useState(getInitialGrid);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(max-width: 767px)');
    const updateGrid = () => setGrid(media.matches ? mobileGrid : desktopGrid);

    updateGrid();
    media.addEventListener?.('change', updateGrid);
    return () => media.removeEventListener?.('change', updateGrid);
  }, []);

  return grid;
}

function fragmentMotion(index: number, columns: number, rows: number) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const centerX = (columns - 1) / 2;
  const centerY = (rows - 1) / 2;
  const rawX = column - centerX;
  const rawY = row - centerY;
  const distance = Math.hypot(rawX / Math.max(centerX, 1), rawY / Math.max(centerY, 1));
  const directionX = rawX === 0 ? (index % 2 === 0 ? -0.35 : 0.35) : rawX / Math.abs(rawX);
  const directionY = rawY === 0 ? (index % 3 === 0 ? -0.28 : 0.28) : rawY / Math.abs(rawY);
  const jitterX = ((index * 17) % 13) - 6;
  const jitterY = ((index * 11) % 11) - 5;
  const x = directionX * (66 + distance * 38) + jitterX;
  const y = directionY * (42 + distance * 30) + jitterY;
  const rotate = (directionX * 4.2 + directionY * 2.4 + ((index % 5) - 2) * 1.1).toFixed(2);
  const delay = 40 + distance * 86 + ((column + row) % 4) * 24;

  return {
    x,
    y,
    midX: x * 0.42,
    midY: y * 0.42,
    rotate,
    midRotate: Number(rotate) * 0.45,
    delay,
    alpha: 0.82 + ((index + row) % 3) * 0.04,
  };
}

function fragmentClipPath(index: number) {
  const topLeft = 2 + (index % 4);
  const topRight = 96 - (index % 3);
  const bottomRight = 97 - (index % 5);
  const bottomLeft = 3 + ((index + 2) % 4);
  return `polygon(${topLeft}% ${2 + (index % 3)}%, ${topRight}% ${index % 2}%, 100% ${bottomRight}%, ${bottomLeft}% 100%)`;
}

export default function HeroIntroFragments({ drama, active }: HeroIntroFragmentsProps) {
  const [mounted, setMounted] = useState(active);
  const { columns, rows } = useFragmentGrid();
  const fragmentCount = columns * rows;
  const fragments = useMemo(() => Array.from({ length: fragmentCount }, (_, index) => index), [fragmentCount]);

  useEffect(() => {
    if (!active) return undefined;
    setMounted(true);
    const timer = window.setTimeout(() => setMounted(false), fragmentDurationMs);
    return () => window.clearTimeout(timer);
  }, [active, drama.id]);

  if (!mounted) return null;

  return (
    <div className="hero-intro-fragments" aria-hidden="true">
      <div className="hero-intro-veil" />
      {fragments.map((index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const motion = fragmentMotion(index, columns, rows);
        const width = 100 / columns;
        const height = 100 / rows;
        const style: FragmentStyle = {
          left: `${column * width}%`,
          top: `${row * height}%`,
          width: `${width + 0.45}%`,
          height: `${height + 0.55}%`,
          clipPath: fragmentClipPath(index),
          '--fragment-delay': `${motion.delay}ms`,
          '--fragment-dx': `${motion.x.toFixed(1)}px`,
          '--fragment-dy': `${motion.y.toFixed(1)}px`,
          '--fragment-mid-dx': `${motion.midX.toFixed(1)}px`,
          '--fragment-mid-dy': `${motion.midY.toFixed(1)}px`,
          '--fragment-rotate': `${motion.rotate}deg`,
          '--fragment-mid-rotate': `${motion.midRotate.toFixed(2)}deg`,
          '--fragment-alpha': String(motion.alpha),
          '--fragment-tint':
            index % 3 === 0 ? 'rgba(255, 93, 58, 0.20)' : 'rgba(255, 255, 255, 0.08)',
        };

        return <span key={`${drama.id}-${index}`} className="hero-intro-fragment" style={style} />;
      })}
    </div>
  );
}
