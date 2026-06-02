import { useEffect, useRef, useState } from 'react';

type UseRevealOnScrollOptions = {
  rootMargin?: string;
  threshold?: number;
  resetDelayMs?: number;
};

export function useRevealOnScroll<T extends HTMLElement>({
  rootMargin = '0px 0px -14% 0px',
  threshold = 0.14,
  resetDelayMs = 120,
}: UseRevealOnScrollOptions = {}) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);
  const resetTimerRef = useRef<number | undefined>();

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (!('IntersectionObserver' in window)) {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldReveal = entry.isIntersecting && entry.intersectionRatio >= threshold;
        if (shouldReveal) {
          window.clearTimeout(resetTimerRef.current);
          setRevealed(true);
          return;
        }

        if (!entry.isIntersecting) {
          window.clearTimeout(resetTimerRef.current);
          resetTimerRef.current = window.setTimeout(() => {
            setRevealed(false);
          }, resetDelayMs);
        }
      },
      { rootMargin, threshold: [0, threshold] },
    );

    observer.observe(node);
    return () => {
      window.clearTimeout(resetTimerRef.current);
      observer.disconnect();
    };
  }, [resetDelayMs, rootMargin, threshold]);

  return { ref, revealed };
}
