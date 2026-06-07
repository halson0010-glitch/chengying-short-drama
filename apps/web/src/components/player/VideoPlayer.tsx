import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { track } from '../../lib/analytics';
import { getDramaHeroBackground, getDramaPosterImage } from '../../lib/hero';
import {
  formatPlaybackRate,
  playbackRates,
  readPlaybackRate,
  writePlaybackRate,
  type PlaybackRate,
} from '../../lib/playerPreferences';
import type { Drama, DramaEpisode } from '../../types/drama';
import { FullscreenIcon, PauseIcon, PlayIcon, VolumeIcon } from '../common/Icons';

type VideoPlayerProps = {
  drama: Drama;
  episode: DramaEpisode;
  onComplete?: () => void;
  onProgress?: (state: { currentTime: number; duration: number; progress: number }) => void;
  autoplayNextEnabled?: boolean;
};

function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function VideoPlayer({ drama, episode, onComplete, onProgress }: VideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(episode.duration ?? 0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(() => readPlaybackRate());
  const [loadError, setLoadError] = useState('');
  const source = episode.videoUrl ?? episode.hlsUrl;
  const poster = getDramaPosterImage(drama) ?? getDramaHeroBackground(drama);

  useEffect(() => {
    const video = videoRef.current;
    startedRef.current = false;
    completedRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(episode.duration ?? 0);
    setLoadError('');
    if (!video) return undefined;

    if (episode.videoUrl) {
      video.src = episode.videoUrl;
      video.load();
      return undefined;
    }

    if (episode.hlsUrl) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = episode.hlsUrl;
        video.load();
        return undefined;
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setIsPlaying(false);
            setLoadError('HLS 播放初始化失败，请检查视频地址或分片文件是否可访问。');
            hls.destroy();
          }
        });
        hls.loadSource(episode.hlsUrl);
        hls.attachMedia(video);
        return () => hls.destroy();
      }

      setLoadError('当前浏览器暂不支持 HLS 播放，请换用 Safari 或上传 MP4 文件。');
      return undefined;
    }

    video.removeAttribute('src');
    video.load();
    return undefined;
  }, [drama.id, episode.episode, episode.duration, source]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, source]);

  const playbackSource = episode.videoUrl ? 'html5-video' : 'hls-video';
  const payload = {
    dramaId: drama.id,
    dramaTitle: drama.title,
    episode: episode.episode,
    source: playbackSource,
  };

  const togglePlayback = async (sourceName: string) => {
    const video = videoRef.current;
    if (!video) return;
    track('play_button_click', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode: episode.episode,
      source: sourceName,
    });
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
    }
  };

  const changePlaybackRate = (rate: PlaybackRate) => {
    if (rate === playbackRate) return;
    setPlaybackRate(rate);
    writePlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    track('play_rate_change', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode: episode.episode,
      rate,
      source: playbackSource,
    });
  };

  const requestFullscreen = async () => {
    if (wrapperRef.current?.requestFullscreen) {
      await wrapperRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={wrapperRef}
      data-testid="video-player"
      className="relative mx-auto aspect-[9/16] w-full max-w-[427px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-card"
      style={{ background: drama.gradient }}
    >
      <video
        key={source}
        ref={videoRef}
        poster={poster}
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full bg-black object-contain"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || episode.duration || 0)}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime;
          const nextDuration = event.currentTarget.duration || duration || episode.duration || 0;
          setCurrentTime(nextTime);
          if (nextDuration) setDuration(nextDuration);
          onProgress?.({
            currentTime: nextTime,
            duration: nextDuration,
            progress: nextDuration ? Math.min(1, nextTime / nextDuration) : 0,
          });
        }}
        onError={() => {
          setIsPlaying(false);
          setLoadError('视频加载失败，请确认 API 服务正在运行，且视频地址可以直接访问。');
        }}
        onPlay={() => {
          setIsPlaying(true);
          startedRef.current = true;
          track('play_start', payload);
        }}
        onPause={(event) => {
          setIsPlaying(false);
          if (startedRef.current && !event.currentTarget.ended) track('play_pause', payload);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (completedRef.current) return;
          completedRef.current = true;
          track('play_complete', payload);
          onComplete?.();
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      <p className="absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white/72 backdrop-blur">
        橙影短剧 · 第 {episode.episode} 集
      </p>
      {!episode.videoUrl && episode.hlsUrl && (
        <p className="absolute right-5 top-5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] text-white/60 backdrop-blur">
          HLS
        </p>
      )}
      {loadError && (
        <div className="absolute inset-x-5 top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-white/10 bg-black/70 p-5 text-center backdrop-blur">
          <p className="text-base font-semibold">视频加载失败</p>
          <p className="mt-2 text-xs leading-5 text-white/55">
            {loadError}
            {source ? ` 当前地址：${source}` : ''}
          </p>
        </div>
      )}
      {!isPlaying && !loadError && (
        <button
          type="button"
          onClick={() => void togglePlayback('watch-video-center')}
          data-track="play-button"
          data-drama-id={drama.id}
          data-source="watch-video"
          aria-label="播放当前剧集"
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 hover:brightness-110"
        >
          <PlayIcon className="ml-1 h-8 w-8" />
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-14">
        <input
          aria-label="播放进度"
          type="range"
          min={0}
          max={duration || 1}
          value={Math.min(currentTime, duration || 1)}
          onChange={(event) => {
            const nextTime = Number(event.target.value);
            if (videoRef.current) videoRef.current.currentTime = nextTime;
            setCurrentTime(nextTime);
          }}
          className="h-1.5 w-full cursor-pointer accent-[#ff4d2e]"
        />
        <div className="mt-3 flex items-center justify-between text-xs text-white/75">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void togglePlayback('watch-video-controls')}
              data-track="play-button"
              data-drama-id={drama.id}
              data-source="watch-video-controls"
              aria-label={isPlaying ? '暂停播放' : '播放当前剧集'}
              className="h-5 w-5"
            >
              {isPlaying ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </button>
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              type="button"
              aria-label={volume ? '静音' : '恢复音量'}
              onClick={() => {
                const nextVolume = volume ? 0 : 1;
                setVolume(nextVolume);
                if (videoRef.current) videoRef.current.volume = nextVolume;
              }}
            >
              <VolumeIcon className={`h-[18px] w-[18px] ${volume ? '' : 'opacity-40'}`} />
            </button>
            <input
              aria-label="调节音量"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => {
                const nextVolume = Number(event.target.value);
                setVolume(nextVolume);
                if (videoRef.current) videoRef.current.volume = nextVolume;
              }}
              className="hidden h-1 w-14 cursor-pointer accent-[#ff4d2e] sm:block"
            />
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
            <button type="button" aria-label="全屏" onClick={requestFullscreen}>
              <FullscreenIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
