import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GradientButton from '../components/common/GradientButton';
import { HeartIcon, LockIcon, PlayIcon } from '../components/common/Icons';
import PageContainer from '../components/common/PageContainer';
import ShareButton from '../components/common/ShareButton';
import DramaGrid from '../components/drama/DramaGrid';
import MockPoster from '../components/drama/MockPoster';
import TagChip from '../components/drama/TagChip';
import PaywallModal from '../components/player/PaywallModal';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../lib/analytics';
import { getDramaPosterFallbackImage, getDramaPosterImage, getDramaPosterObjectPosition } from '../lib/hero';
import {
  getEntitlements,
  getFavorites,
  getWatchProgress,
  toggleFavorite,
  type WatchProgressItem,
} from '../services/engagementApi';
import { getDramaById, getDramaEpisodes, getDramaStatus, getRelatedDramas } from '../services/dramaApi';
import type { Drama, DramaEpisode } from '../types/drama';
import NotFoundPage from './NotFoundPage';

function episodeGroups(episodes: DramaEpisode[], size = 30) {
  const groups: DramaEpisode[][] = [];
  for (let index = 0; index < episodes.length; index += size) groups.push(episodes.slice(index, index + size));
  return groups;
}

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drama, setDrama] = useState<Drama>();
  const [related, setRelated] = useState<Drama[]>([]);
  const [progressItems, setProgressItems] = useState<WatchProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [collected, setCollected] = useState(false);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [modalMode, setModalMode] = useState<'login' | 'paywall' | null>(null);
  const [modalEpisode, setModalEpisode] = useState<number>();

  useEffect(() => {
    setCollected(false);
    setLoading(true);
    setLoadFailed(false);
    setDrama(undefined);
    setProgressItems([]);
    let active = true;
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
    if (!drama) {
      setRelated([]);
      return undefined;
    }
    void Promise.all([getRelatedDramas(drama), getWatchProgress(drama.id), getFavorites(), getEntitlements()])
      .then(([relatedItems, progress, favorites, entitlements]) => {
        if (!active) return;
        setRelated(relatedItems);
        setProgressItems(progress);
        setCollected(favorites.some((item) => item.dramaId === drama.id));
        setHasEntitlement(entitlements.hasActiveEntitlement);
      })
      .catch(() => {
        if (active) setRelated([]);
      });
    return () => {
      active = false;
    };
  }, [drama]);

  const episodes = useMemo(() => (drama ? getDramaEpisodes(drama) : []), [drama]);
  const groups = useMemo(() => episodeGroups(episodes), [episodes]);
  const latestProgress = progressItems[0];
  const continueEpisode = latestProgress?.episode ?? 1;
  const continueLabel = latestProgress ? `继续看第 ${latestProgress.episode} 集` : '播放正片';

  useEffect(() => {
    document.title = drama ? `${drama.title} - 橙影短剧` : '橙影短剧';
  }, [drama]);

  const openLockedModal = (episode: DramaEpisode, source: string) => {
    if (!drama) return;
    const mode = user ? 'paywall' : 'login';
    setModalMode(mode);
    setModalEpisode(episode.episode);
    track(source === 'detail-episode-grid' ? 'episode_locked_click' : 'locked_episode_view', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode: episode.episode,
      source,
    });
    track(mode === 'login' ? 'login_required_popup_view' : 'paywall_popup_view', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode: episode.episode,
      source,
    });
  };

  const canPlayEpisode = (episode: DramaEpisode) => episode.isFree !== false || hasEntitlement;

  const startEpisode = (targetEpisode: number, source: string) => {
    if (!drama) return;
    const item = episodes.find((episode) => episode.episode === targetEpisode);
    if (item && !canPlayEpisode(item)) {
      openLockedModal(item, source);
      return;
    }
    track(source === 'detail-continue' ? 'detail_continue_watch_click' : 'episode_click', {
      dramaId: drama.id,
      dramaTitle: drama.title,
      episode: targetEpisode,
      progress: latestProgress?.progress,
      source,
    });
    if (source === 'detail-continue') {
      track('play_button_click', { dramaId: drama.id, dramaTitle: drama.title, episode: targetEpisode, source });
    }
    navigate(`/watch/${drama.id}/${targetEpisode}`);
  };

  if (loading) {
    return (
      <PageContainer className="pt-8">
        <div className="surface h-[420px] animate-pulse bg-white/[0.03]" />
      </PageContainer>
    );
  }

  if (loadFailed) {
    return (
      <PageContainer className="pt-10">
        <div className="surface p-10 text-center text-white/58">内容暂时无法加载，请稍后刷新重试。</div>
      </PageContainer>
    );
  }

  if (!drama) return <NotFoundPage title="没有找到这部短剧" />;

  const activeEpisodes = groups[activeGroup] ?? [];

  return (
    <PageContainer className="pt-6 md:pt-9">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] p-5 md:p-8 lg:p-10">
        <div className="absolute inset-0 scale-110 opacity-35 blur-[72px]" style={{ background: drama.gradient }} />
        <div className="absolute inset-0 bg-[#101014]/80" />
        <div className="relative flex flex-col gap-7 sm:flex-row md:gap-10">
          <MockPoster
            gradient={drama.gradient}
            title={drama.title}
            posterUrl={getDramaPosterImage(drama)}
            fallbackPosterUrl={getDramaPosterFallbackImage(drama)}
            objectPosition={getDramaPosterObjectPosition(drama)}
            tags={drama.tags}
            className="w-full max-w-[230px] shrink-0 rounded-2xl border border-white/10 sm:w-[220px] md:w-[255px]"
          />
          <div className="flex-1 pt-1 md:pt-5">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{drama.title}</h1>
            <p className="mt-3 text-base text-white/58">{drama.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {drama.tags.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/62">
              <span>共 {episodes.length} 集</span>
              <span>热度 {drama.heat}</span>
              <span>{getDramaStatus(drama)}</span>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/62 md:text-[15px]">{drama.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GradientButton
                type="button"
                icon={<PlayIcon className="h-4 w-4" />}
                className="min-w-[146px]"
                onClick={() => startEpisode(continueEpisode, 'detail-continue')}
              >
                {continueLabel}
              </GradientButton>
              <GradientButton
                type="button"
                variant="secondary"
                icon={<HeartIcon className={`h-4 w-4 ${collected ? 'text-accent' : ''}`} filled={collected} />}
                onClick={() => {
                  const nextCollected = !collected;
                  setCollected(nextCollected);
                  void toggleFavorite(drama, nextCollected);
                  track('favorite_toggle', {
                    dramaId: drama.id,
                    dramaTitle: drama.title,
                    collected: nextCollected,
                    source: 'detail-page',
                  });
                }}
              >
                {collected ? '已收藏' : '收藏'}
              </GradientButton>
              <ShareButton drama={drama} />
            </div>
          </div>
        </div>
      </section>

      <section className="surface mt-9 p-5 md:p-8">
        <h2 className="text-xl font-bold md:text-2xl">基本信息</h2>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-white/62">{drama.description}</p>
        <h3 className="mt-7 text-sm font-semibold text-white/45">演员表</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drama.cast.map((actor) => (
            <div key={`${actor.actor}-${actor.role}`} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <span className="font-medium">{actor.actor}</span>
              <span className="ml-3 text-sm text-white/45">饰 {actor.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-11">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold md:text-2xl">剧集</h2>
            <p className="mt-1 text-sm text-white/42">共 {episodes.length} 集</p>
          </div>
          <div className="rail-scroll flex gap-2 overflow-x-auto">
            {groups.map((group, index) => {
              const first = group[0]?.episode ?? 1;
              const last = group[group.length - 1]?.episode ?? first;
              return (
                <button
                  key={`${first}-${last}`}
                  type="button"
                  onClick={() => {
                    setActiveGroup(index);
                    track('episode_group_switch', {
                      dramaId: drama.id,
                      dramaTitle: drama.title,
                      group: `${first}-${last}`,
                      source: 'detail-page',
                    });
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                    activeGroup === index ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/58 hover:text-white'
                  }`}
                >
                  {first}-{last}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {activeEpisodes.map((item) => {
            const locked = !canPlayEpisode(item);
            const className = `relative flex h-11 items-center justify-center rounded-xl border text-sm transition ${
              locked
                ? 'border-white/[0.06] bg-white/[0.025] text-white/35'
                : 'border-white/[0.08] bg-white/[0.04] text-white/65 hover:border-accent/45 hover:text-white'
            }`;
            if (locked) {
              return (
                <button key={item.episode} type="button" onClick={() => openLockedModal(item, 'detail-episode-grid')} className={className}>
                  {item.episode}
                  <LockIcon className="absolute right-1.5 top-1.5 h-3 w-3" />
                  <span className="absolute bottom-1 right-1.5 text-[9px] text-white/35">付</span>
                </button>
              );
            }
            return (
              <Link
                key={item.episode}
                to={`/watch/${drama.id}/${item.episode}`}
                onClick={() => track('episode_click', { dramaId: drama.id, dramaTitle: drama.title, episode: item.episode, source: 'detail-page' })}
                className={className}
              >
                {item.episode}
                <span className={`absolute bottom-1 right-1.5 text-[9px] ${item.isFree === false ? 'text-[#ffb199]' : 'text-white/35'}`}>
                  {item.isFree === false ? '付' : '免'}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-6 text-xl font-bold md:text-2xl">相关短剧</h2>
        <DramaGrid dramas={related} moduleName="相关短剧" />
      </section>

      <PaywallModal
        open={Boolean(modalMode)}
        mode={modalMode ?? 'paywall'}
        drama={drama}
        episode={modalEpisode}
        onClose={() => setModalMode(null)}
      />
    </PageContainer>
  );
}
