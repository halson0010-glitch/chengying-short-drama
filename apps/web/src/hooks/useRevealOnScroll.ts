import { useEffect, useRef, useState } from 'react';

type UseRevealOnScrollOptions = {
  rootMargin?: string;
  threshold?: number;
};

export function useRevealOnScroll<T extends HTMLElement>({
  rootMargin = '0px 0px -12% 0px',
  threshold = 0.16,
}: UseRevealOnScrollOptions = {}) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || revealed) return undefined;

    if (!('IntersectionObserver' in window)) {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed, rootMargin, threshold]);

  return { ref, revealed };
}
