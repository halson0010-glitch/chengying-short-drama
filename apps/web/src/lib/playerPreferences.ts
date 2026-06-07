export const AUTOPLAY_NEXT_KEY = 'chengying_autoplay_next';
export const PLAYBACK_RATE_KEY = 'chengying_playback_rate';
export const playbackRates = [0.75, 1, 1.25, 1.5, 2] as const;

export type PlaybackRate = (typeof playbackRates)[number];

export function readAutoplayNext() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(AUTOPLAY_NEXT_KEY) !== 'false';
}

export function writeAutoplayNext(enabled: boolean) {
  window.localStorage.setItem(AUTOPLAY_NEXT_KEY, enabled ? 'true' : 'false');
}

export function normalizePlaybackRate(value: unknown): PlaybackRate {
  const numericValue = Number(value);
  return playbackRates.includes(numericValue as PlaybackRate) ? (numericValue as PlaybackRate) : 1;
}

export function readPlaybackRate() {
  if (typeof window === 'undefined') return 1;
  return normalizePlaybackRate(window.localStorage.getItem(PLAYBACK_RATE_KEY));
}

export function writePlaybackRate(rate: PlaybackRate) {
  window.localStorage.setItem(PLAYBACK_RATE_KEY, String(rate));
}

export function formatPlaybackRate(rate: PlaybackRate) {
  return rate === 1 ? '1.0x' : `${rate}x`;
}
