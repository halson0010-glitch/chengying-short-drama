import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import TagChip from '../components/drama/TagChip';
import PlayerMock from '../components/player/PlayerMock';
import VideoPlayer from '../components/player/VideoPlayer';
import WatchEpisodeList from '../components/player/WatchEpisodeList';
import { track } from '../lib/analytics';
import { getDramaById, getDramaEpisodes } from '../services/dramaApi';
import type { Drama } from '../types/drama';
import NotFoundPage from './NotFoundPage';

export default function WatchPage() {
  const { id, episode: rawEpisode } = useParams();
  const [drama, setDrama] = useState<Drama>();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
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

  const episodes = useMemo(() => (drama ? getDramaEpisodes(drama) : []), [drama]);
  const currentEpisode = episodes.find((item) => item.episode === episode);

  useEffect(() => {
    document.title = drama && Number.isInteger(episode)
      ? `${drama.title} 第 ${episode} 集 - 橙影短剧`
      : '橙影短剧';
  }, [drama, episode]);

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
        <EmptyState title="播放内容加载失败" description="请稍后刷新页面重试" />
      </PageContainer>
    );
  }

  if (!drama) return <NotFoundPage title="没有找到播放内容" />;

  if (!Number.isInteger(episode) || !currentEpisode) {
    return (
      <PageContainer className="pt-10">
        <EmptyState
          title="该剧集不存在"
          description={`《${drama.title}》共有 ${episodes.length} 集`}
          action={<GradientButton to={`/watch/${drama.id}/1`}>从第 1 集开始观看</GradientButton>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pt-5 md:pt-8">
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-3xl bg-[#050507] px-3 py-4 md:px-6">
          {currentEpisode.videoUrl || currentEpisode.hlsUrl ? (
            <VideoPlayer drama={drama} episode={currentEpisode} />
          ) : (
            <PlayerMock drama={drama} episode={episode} />
          )}
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
        <div className="mt-7 flex gap-3">
          {episode > 1 ? (
            <Link
              to={`/watch/${drama.id}/${episode - 1}`}
              data-track="episode-button"
              data-drama-id={drama.id}
              data-episode={episode - 1}
              onClick={() =>
                track('episode_click', { dramaId: drama.id, episode: episode - 1, source: 'watch-previous' })
              }
              className="flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.05] px-6 text-sm transition hover:border-accent/40"
            >
              上一集
            </Link>
          ) : (
            <button disabled className="h-11 cursor-not-allowed rounded-xl border border-white/[0.06] px-6 text-sm text-white/25">
              上一集
            </button>
          )}
          {episode < episodes.length ? (
            <Link
              to={`/watch/${drama.id}/${episode + 1}`}
              data-track="episode-button"
              data-drama-id={drama.id}
              data-episode={episode + 1}
              onClick={() => track('episode_click', { dramaId: drama.id, episode: episode + 1, source: 'watch-next' })}
              className="flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-medium transition hover:brightness-110"
            >
              下一集
            </Link>
          ) : (
            <button disabled className="h-11 cursor-not-allowed rounded-xl border border-white/[0.06] px-6 text-sm text-white/25">
              下一集
            </button>
          )}
        </div>
      </section>
    </PageContainer>
  );
}
