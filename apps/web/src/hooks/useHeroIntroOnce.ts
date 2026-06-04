import { useEffect, useMemo, useState } from 'react';

const HERO_INTRO_STORAGE_KEY = 'chengying_hero_intro_played';

function shouldReduceMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldPlayIntro() {
  if (typeof window === 'undefined') return false;
  if (shouldReduceMotion()) return false;
  try {
    return sessionStorage.getItem(HERO_INTRO_STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}

function markIntroPlayed() {
  try {
    sessionStorage.setItem(HERO_INTRO_STORAGE_KEY, '1');
  } catch {
    // Ignore storage failures and keep the visual experience non-blocking.
  }
}

export function useHeroIntroOnce(durationMs = 1800) {
  const playIntro = useMemo(shouldPlayIntro, []);
  const [introFinished, setIntroFinished] = useState(!playIntro);

  useEffect(() => {
    if (!playIntro) {
      setIntroFinished(true);
      return undefined;
    }

    markIntroPlayed();
    const timer = window.setTimeout(() => {
      setIntroFinished(true);
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs, playIntro]);

  return {
    introActive: playIntro && !introFinished,
    introFinished,
  };
}
