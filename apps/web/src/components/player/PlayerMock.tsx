import { useEffect, useRef, useState } from 'react';
import { track } from '../../lib/analytics';
import {
  formatPlaybackRate,
  playbackRates,
  readPlaybackRate,
  writePlaybackRate,
  type PlaybackRate,
} from '../../lib/playerPreferences';
import type { Drama } from '../../types/drama';
import { FullscreenIcon, PauseIcon, PlayIcon, VolumeIcon } from '../common/Icons';

type PlayerMockProps = {
  drama: Drama;
  episode: number;
  onComplete?: () => void;
  onProgress?: (state: { currentTime: number; duration: number; progress: number }) => void;
  autoplayNextEnabled?: boolean;
};

const duration = 156;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function PlayerMock({ drama, episode, onComplete, onProgress }: PlayerMockProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(18);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(() => readPlaybackRate());
  const completedRef = useRef(false);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(18);
    completedRef.current = false;
  }, [drama.id, episode]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        return Math.min(duration, current + playbackRate);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, playbackRate]);

  useEffect(() => {
    if (progress < duration || !isPlaying || completedRef.current) return;
    completedRef.current = true;
    setIsPlaying(false);
    track('play_complete', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode,
      source: 'mock-player',
    });
    onComplete?.();
  }, [drama.id, drama.title, episode, isPlaying, onComplete, progress]);

  useEffect(() => {
    onProgress?.({ currentTime: progress, duration, progress: Math.min(1, progress / duration) });
  }, [onProgress, progress]);

  const togglePlayback = (source: string) => {
    const nextPlaying = !isPlaying;
    track('play_button_click', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode,
      source,
    });
    if (nextPlaying && progress >= duration) {
      setProgress(0);
      completedRef.current = false;
    }
    setIsPlaying(nextPlaying);
    track(nextPlaying ? 'play_start' : 'play_pause', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode,
      source,
    });
  };

  const changePlaybackRate = (rate: PlaybackRate) => {
    if (rate === playbackRate) return;
    setPlaybackRate(rate);
    writePlaybackRate(rate);
    track('play_rate_change', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode,
      rate,
      source: 'mock-player',
    });
  };

  return (
    <div
      className="relative mx-auto aspect-[9/16] w-full max-w-[427px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-card"
      style={{ background: drama.gradient }}
      data-testid="mock-player"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/80" />
      <p className="absolute left-5 top-5 rounded-full bg-black/25 px-3 py-1.5 text-xs text-white/55 backdrop-blur">
        橙影短剧 · 仅供预览
      </p>
      <div className="absolute inset-x-5 top-[32%] text-center">
        <p className="text-2xl font-bold tracking-wide text-white/22">{drama.title}</p>
        <p className="mt-2 text-sm text-white/24">第 {episode} 集</p>
      </div>
      <button
        type="button"
        onClick={() => togglePlayback('player-center')}
        data-track="play-button"
        data-drama-id={drama.id}
        data-source="watch-player"
        aria-label={isPlaying ? '暂停播放' : '播放当前剧集'}
        className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 hover:brightness-110"
      >
        {isPlaying ? (
          <PauseIcon className="h-8 w-8" />
        ) : (
          <PlayIcon className="ml-1 h-8 w-8" />
        )}
      </button>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-14">
        <input
          aria-label="播放进度"
          type="range"
          min={0}
          max={duration}
          value={progress}
          onChange={(event) => setProgress(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-[#ff4d2e]"
        />
        <div className="mt-3 flex items-center justify-between text-xs text-white/75">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => togglePlayback('player-controls')}
              data-track="play-button"
              data-drama-id={drama.id}
              data-source="watch-controls"
              aria-label="切换播放状态"
              className="h-5 w-5"
            >
              {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
            <span>
              {formatTime(Math.floor(progress))} / {formatTime(duration)}
            </span>
            <button type="button" aria-label="音量">
              <VolumeIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label="倍速"
              value={playbackRate}
              onChange={(event) => changePlaybackRate(Number(event.target.value) as PlaybackRate)}
              className="rounded bg-white/10 px-2 py-1 text-xs text-white outline-none"
            >
              {playbackRates.map((rate) => (
                <option key={rate} value={rate} className="bg-[#17171d]">
                  {formatPlaybackRate(rate)}
                </option>
              ))}
            </select>
            <button type="button" className="rounded bg-white/10 px-2 py-1">
              高清
            </button>
            <button type="button" aria-label="全屏">
              <FullscreenIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
