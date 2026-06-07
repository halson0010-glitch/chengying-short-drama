import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import TagChip from '../components/drama/TagChip';
import EpisodeDrawer from '../components/player/EpisodeDrawer';
import PaywallModal from '../components/player/PaywallModal';
import PlayerMock from '../components/player/PlayerMock';
import VideoPlayer from '../components/player/VideoPlayer';
import WatchEpisodeList from '../components/player/WatchEpisodeList';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../lib/analytics';
import { readAutoplayNext, writeAutoplayNext } from '../lib/playerPreferences';
import { getEntitlements, saveWatchProgress } from '../services/engagementApi';
import { getDramaById, getDramaEpisodes } from '../services/dramaApi';
import type { Drama, DramaEpisode } from '../types/drama';
import NotFoundPage from './NotFoundPage';

const progressCheckpoints = [0.05, 0.25, 0.5, 0.75, 0.95];

type PlaybackSnapshot = {
  currentTime: number;
  duration: number;
  progress: number;
};

export default function WatchPage() {
  const { id, episode: rawEpisode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drama, setDrama] = useState<Drama>();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [autoplayNextEnabled, setAutoplayNextEnabled] = useState(() => readAutoplayNext());
  const [autoplayNotice, setAutoplayNotice] = useState<{ status: 'idle' | 'pending' | 'last'; toEpisode?: number }>({
    status: 'idle',
  });
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState(false);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'paywall' | 'trial' | null>(null);
  const autoplayTimerRef = useRef<number>();
  const lastSaveAtRef = useRef(0);
  const checkpointRef = useRef<Set<number>>(new Set());
  const playbackRef = useRef<PlaybackSnapshot>({ currentTime: 0, duration: 0, progress: 0 });
  const pageStartRef = useRef(Date.now());
  const lockedViewKeyRef = useRef('');
  const episode = Number(rawEpisode);

  useEffect(() => {
    let active = true;
    setDrama(undefined);
    setLoading(true);
    setLoadFailed(false);
    void getDramaById(id)
      .then((item) => {
        if (active) setDrama(item);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    void getEntitlements().then((entitlements) => {
      if (active) setHasEntitlement(entitlements.hasActiveEntitlement);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const episodes = useMemo(() => (drama ? getDramaEpisodes(drama) : []), [drama]);
  const currentEpisode = episodes.find((item) => item.episode === episode);

  const isEpisodeLocked = useCallback((item: DramaEpisode) => item.isFree === false && !hasEntitlement, [hasEntitlement]);

  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = undefined;
    }
  }, []);

  const cancelAutoplay = useCallback(() => {
    clearAutoplayTimer();
    setAutoplayNotice({ status: 'idle' });
  }, [clearAutoplayTimer]);

  const updateAutoplayNext = (enabled: boolean) => {
    setAutoplayNextEnabled(enabled);
    writeAutoplayNext(enabled);
    if (!enabled) cancelAutoplay();
  };

  const openAccessModal = useCallback(
    (item: DramaEpisode, source: string, eventName: 'episode_locked_click' | 'locked_episode_view' = 'episode_locked_click') => {
      if (!drama) return;
      const mode = user ? 'paywall' : 'login';
      setModalMode(mode);
      track(eventName, {
        dramaId: drama.id,
        dramaTitle: drama.title,
        episode: item.episode,
        source,
      });
      track(mode === 'login' ? 'login_required_popup_view' : 'paywall_popup_view', {
        dramaId: drama.id,
        dramaTitle: drama.title,
        episode: item.episode,
        source,
      });
    },
    [drama, user],
  );

  useEffect(() => {
    const key = drama && currentEpisode && isEpisodeLocked(currentEpisode) ? `${drama.id}-${currentEpisode.episode}` : '';
    if (!key || key === lockedViewKeyRef.current) return;
    lockedViewKeyRef.current = key;
    openAccessModal(currentEpisode!, 'watch-page-load', 'locked_episode_view');
  }, [currentEpisode, drama, isEpisodeLocked, openAccessModal]);

  const persistProgress = useCallback(
    (snapshot: PlaybackSnapshot, source: string) => {
      if (!drama || !currentEpisode) return;
      void saveWatchProgress({
        drama,
        episode: currentEpisode.episode,
        progress: snapshot.progress,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        source,
      });
    },
    [currentEpisode, drama],
  );

  const handleProgress = useCallback(
    (snapshot: PlaybackSnapshot) => {
      playbackRef.current = snapshot;
      if (!drama || !currentEpisode || isEpisodeLocked(currentEpisode)) return;
      const now = Date.now();
      const crossed = progressCheckpoints.find(
        (checkpoint) => snapshot.progress >= checkpoint && !checkpointRef.current.has(checkpoint),
      );
      if (crossed !== undefined) {
        checkpointRef.current.add(crossed);
        persistProgress(snapshot, 'checkpoint');
        track('watch_progress_checkpoint', {
          dramaId: drama.id,
          dramaTitle: drama.title,
          episode: currentEpisode.episode,
          checkpoint: Math.round(crossed * 100),
          progress: snapshot.progress,
          currentTime: Math.round(snapshot.currentTime),
          duration: Math.round(snapshot.duration),
          source: 'watch-page',
        });
        lastSaveAtRef.current = now;
        return;
      }
      if (now - lastSaveAtRef.current >= 15_000) {
        persistProgress(snapshot, 'interval');
        lastSaveAtRef.current = now;
      }
    },
    [currentEpisode, drama, isEpisodeLocked, persistProgress],
  );

  const recordDurationUpdate = useCallback(
    (source: string) => {
      if (!drama || !currentEpisode) return;
      const snapshot = playbackRef.current;
      const durationMs = Date.now() - pageStartRef.current;
      persistProgress(snapshot, source);
      track('watch_duration_update', {
        dramaId: drama.id,
        dramaTitle: drama.title,
        episode: currentEpisode.episode,
        progress: snapshot.progress,
        currentTime: Math.round(snapshot.currentTime),
        duration: Math.round(snapshot.duration),
        durationMs,
        source,
      });
    },
    [currentEpisode, drama, persistProgress],
  );

  const handlePlaybackComplete = useCallback(() => {
    if (!drama || !Number.isInteger(episode)) return;
    clearAutoplayTimer();
    persistProgress({ ...playbackRef.current, progress: 1 }, 'complete');

    if (episode >= episodes.length) {
      setAutoplayNotice({ status: 'last' });
      return;
    }

    if (!autoplayNextEnabled) {
      setAutoplayNotice({ status: 'idle' });
      return;
    }

    const toEpisode = episode + 1;
    const nextEpisode = episodes.find((item) => item.episode === toEpisode);
    if (nextEpisode && isEpisodeLocked(nextEpisode)) {
      openAccessModal(nextEpisode, 'autoplay-next');
      return;
    }
    setAutoplayNotice({ status: 'pending', toEpisode });
    autoplayTimerRef.current = window.setTimeout(() => {
      track('autoplay_next_episode', {
        dramaId: drama.id,
        dramaTitle: drama.title,
        fromEpisode: episode,
        toEpisode,
        source: 'autoplay-next',
      });
      navigate(`/watch/${drama.id}/${toEpisode}`);
    }, 1500);
  }, [
    autoplayNextEnabled,
    clearAutoplayTimer,
    drama,
    episode,
    episodes,
    isEpisodeLocked,
    navigate,
    openAccessModal,
    persistProgress,
  ]);

  useEffect(() => {
    clearAutoplayTimer();
    setAutoplayNotice({ status: 'idle' });
    checkpointRef.current = new Set();
    lastSaveAtRef.current = 0;
    playbackRef.current = { currentTime: 0, duration: 0, progress: 0 };
    pageStartRef.current = Date.now();
    return () => {
      clearAutoplayTimer();
      recordDurationUpdate('watch-page-unload');
    };
  }, [clearAutoplayTimer, drama?.id, episode, recordDurationUpdate]);

  useEffect(() => {
    const onBeforeUnload = () => recordDurationUpdate('beforeunload');
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [recordDurationUpdate]);

  useEffect(() => {
    document.title = drama && Number.isInteger(episode)
      ? `${drama.title} 第 ${episode} 集 - 橙影短剧`
      : '橙影短剧';
  }, [drama, episode]);

  const goEpisode = (targetEpisode: number, source: 'previous' | 'next') => {
    if (!drama) return;
    const target = episodes.find((item) => item.episode === targetEpisode);
    if (!target) return;
    const eventName = source === 'next' ? 'next_episode_click' : 'previous_episode_click';
    track(eventName, {
      dramaId: drama.id,
      dramaTitle: drama.title,
      fromEpisode: episode,
      toEpisode: targetEpisode,
      source: `watch-${source}`,
    });
    if (isEpisodeLocked(target)) {
      openAccessModal(target, `watch-${source}`);
      return;
    }
    track('episode_click', { dramaId: drama.id, dramaTitle: drama.title, episode: targetEpisode, source: `watch-${source}` });
    navigate(`/watch/${drama.id}/${targetEpisode}`);
  };

  if (loading) {
    return (
      <PageContainer className="pt-8">
        <div className="surface h-[70vh] animate-pulse bg-white/[0.03]" />
      </PageContainer>
    );
  }

  if (loadFailed) {
    return (
      <PageContainer className="pt-10">
        <EmptyState title="播放内容加载失败" description="请稍后刷新页面重试。" />
      </PageContainer>
    );
  }

  if (!drama) return <NotFoundPage title="没有找到播放内容" />;

  if (!Number.isInteger(episode) || !currentEpisode) {
    return (
      <PageContainer className="pt-10">
        <EmptyState
          title="该剧集不存在"
          description={`《${drama.title}》共 ${episodes.length} 集`}
          action={<GradientButton to={`/watch/${drama.id}/1`}>从第 1 集开始观看</GradientButton>}
        />
      </PageContainer>
    );
  }

  const locked = isEpisodeLocked(currentEpisode);

  return (
    <PageContainer className="pt-5 md:pt-8">
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-3xl bg-[#050507] px-3 py-4 md:px-6">
          {locked ? (
            <div className="relative mx-auto flex aspect-[9/16] w-full max-w-[427px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black px-6 text-center shadow-card">
              <p className="text-xl font-bold">本集需要解锁</p>
              <p className="mt-3 text-sm leading-6 text-white/48">登录或开通权益后可继续观看第 {currentEpisode.episode} 集。</p>
              <div className="mt-6 flex gap-3">
                <GradientButton type="button" onClick={() => openAccessModal(currentEpisode, 'watch-locked-placeholder')}>
                  查看权益
                </GradientButton>
                <GradientButton to={`/detail/${drama.id}`} variant="secondary">
                  返回详情
                </GradientButton>
              </div>
            </div>
          ) : currentEpisode.videoUrl || currentEpisode.hlsUrl ? (
            <VideoPlayer
              drama={drama}
              episode={currentEpisode}
              onComplete={handlePlaybackComplete}
              onProgress={handleProgress}
              autoplayNextEnabled={autoplayNextEnabled}
            />
          ) : (
            <PlayerMock
              drama={drama}
              episode={episode}
              onComplete={handlePlaybackComplete}
              onProgress={handleProgress}
              autoplayNextEnabled={autoplayNextEnabled}
            />
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={autoplayNextEnabled}
                onChange={(event) => updateAutoplayNext(event.target.checked)}
                className="h-4 w-4 accent-[#ff4d2e]"
              />
              <span className="font-medium text-white">自动连播</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setEpisodeDrawerOpen(true);
                track('episode_panel_open', { dramaId: drama.id, dramaTitle: drama.title, episode, source: 'watch-page' });
              }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white/72 transition hover:border-accent/40 hover:text-white lg:hidden"
            >
              选集
            </button>
            {autoplayNotice.status === 'pending' && autoplayNotice.toEpisode ? (
              <div className="flex items-center gap-3">
                <span>即将播放第 {autoplayNotice.toEpisode} 集</span>
                <button type="button" onClick={cancelAutoplay} className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white">
                  取消
                </button>
              </div>
            ) : null}
            {autoplayNotice.status === 'last' ? <span className="text-white/55">已播放到最后一集</span> : null}
          </div>
        </div>
        <WatchEpisodeList dramaId={drama.id} totalEpisodes={episodes.length} currentEpisode={episode} />
      </div>

      <section className="mt-8 max-w-4xl">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="text-2xl font-bold md:text-3xl">{drama.title}</h1>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-[#ff7555]">第 {episode} 集</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {drama.tags.map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
        </div>
        <p className="mt-5 text-sm leading-7 text-white/60">{drama.description}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {episode > 1 ? (
            <button
              type="button"
              onClick={() => goEpisode(episode - 1, 'previous')}
              className="flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.05] px-6 text-sm transition hover:border-accent/40"
            >
              上一集
            </button>
          ) : (
            <button disabled className="h-11 cursor-not-allowed rounded-xl border border-white/[0.06] px-6 text-sm text-white/25">
              上一集
            </button>
          )}
          {episode < episodes.length ? (
            <button
              type="button"
              onClick={() => goEpisode(episode + 1, 'next')}
              className="flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-medium transition hover:brightness-110"
            >
              下一集
            </button>
          ) : (
            <button disabled className="h-11 cursor-not-allowed rounded-xl border border-white/[0.06] px-6 text-sm text-white/25">
              下一集
            </button>
          )}
          <Link to={`/detail/${drama.id}`} className="flex h-11 items-center rounded-xl border border-white/10 px-6 text-sm text-white/62 hover:text-white">
            详情
          </Link>
        </div>
      </section>

      <EpisodeDrawer
        open={episodeDrawerOpen}
        drama={drama}
        episodes={episodes}
        currentEpisode={episode}
        isEpisodeLocked={isEpisodeLocked}
        onClose={() => {
          setEpisodeDrawerOpen(false);
          track('episode_panel_close', { dramaId: drama.id, dramaTitle: drama.title, episode, source: 'watch-page' });
        }}
        onLockedEpisode={(item) => openAccessModal(item, 'watch-episode-drawer')}
      />
      <PaywallModal
        open={Boolean(modalMode)}
        mode={modalMode ?? 'paywall'}
        drama={drama}
        episode={currentEpisode.episode}
        onClose={() => setModalMode(null)}
      />
    </PageContainer>
  );
}
