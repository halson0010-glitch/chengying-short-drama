import { useCallback, useEffect, useRef, useState } from 'react';

type UseHeroAutoplayOptions = {
  length: number;
  intervalMs?: number;
  enabled?: boolean;
  onAutoSwitch?: (nextIndex: number, previousIndex: number) => void;
};

export function useHeroAutoplay({ length, intervalMs = 5200, enabled = true, onAutoSwitch }: UseHeroAutoplayOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerKeyRef = useRef(0);
  const latestIndexRef = useRef(0);
  const onAutoSwitchRef = useRef(onAutoSwitch);

  useEffect(() => {
    onAutoSwitchRef.current = onAutoSwitch;
  }, [onAutoSwitch]);

  useEffect(() => {
    latestIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex >= length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, length]);

  const resetTimer = useCallback(() => {
    timerKeyRef.current += 1;
  }, []);

  const selectIndex = useCallback(
    (index: number) => {
      if (!length) return;
      const nextIndex = Math.max(0, Math.min(index, length - 1));
      setCurrentIndex(nextIndex);
      resetTimer();
    },
    [length, resetTimer],
  );

  useEffect(() => {
    if (!enabled || paused || length <= 1) return undefined;
    const key = timerKeyRef.current;
    const timer = window.setTimeout(() => {
      if (key !== timerKeyRef.current) return;
      setCurrentIndex((previousIndex) => {
        const nextIndex = (previousIndex + 1) % length;
        onAutoSwitchRef.current?.(nextIndex, previousIndex);
        return nextIndex;
      });
      timerKeyRef.current += 1;
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [currentIndex, enabled, intervalMs, length, paused]);

  return {
    currentIndex,
    selectIndex,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    resetTimer,
    isPaused: paused,
    latestIndexRef,
  };
}
