import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import GradientButton from '../components/common/GradientButton';
import { HeartIcon, PlayIcon } from '../components/common/Icons';
import PageContainer from '../components/common/PageContainer';
import DramaGrid from '../components/drama/DramaGrid';
import EpisodeGrid from '../components/drama/EpisodeGrid';
import MockPoster from '../components/drama/MockPoster';
import TagChip from '../components/drama/TagChip';
import { getDramaPosterFallbackImage, getDramaPosterImage } from '../lib/hero';
import { track } from '../lib/analytics';
import { getDramaById, getDramaEpisodes, getDramaStatus, getRelatedDramas } from '../services/dramaApi';
import type { Drama } from '../types/drama';
import NotFoundPage from './NotFoundPage';

export default function DetailPage() {
  const { id } = useParams();
  const [drama, setDrama] = useState<Drama>();
  const [related, setRelated] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [collected, setCollected] = useState(false);

  useEffect(() => {
    setCollected(false);
    setLoading(true);
    setLoadFailed(false);
    setDrama(undefined);
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
    void getRelatedDramas(drama)
      .then((items) => {
        if (active) setRelated(items);
      })
      .catch(() => {
        if (active) setRelated([]);
      });
    return () => {
      active = false;
    };
  }, [drama]);

  const episodes = useMemo(() => (drama ? getDramaEpisodes(drama) : []), [drama]);

  useEffect(() => {
    document.title = drama ? `${drama.title} - 橙影短剧` : '橙影短剧';
  }, [drama]);

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

  return (
    <PageContainer className="pt-6 md:pt-9">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] p-5 md:p-8 lg:p-10">
        <div
          className="absolute inset-0 scale-110 opacity-35 blur-[72px]"
          style={{ background: drama.gradient }}
        />
        <div className="absolute inset-0 bg-[#101014]/80" />
        <div className="relative flex flex-col gap-7 sm:flex-row md:gap-10">
          <MockPoster
            gradient={drama.gradient}
            title={drama.title}
            posterUrl={getDramaPosterImage(drama)}
            fallbackPosterUrl={getDramaPosterFallbackImage(drama)}
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
              <span>全 {episodes.length} 集</span>
              <span>热度 {drama.heat}</span>
              <span>{getDramaStatus(drama)}</span>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/62 md:text-[15px]">{drama.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GradientButton
                to={`/watch/${drama.id}/1`}
                icon={<PlayIcon className="h-4 w-4" />}
                className="min-w-[136px]"
                data-track="play-button"
                data-drama-id={drama.id}
                data-source="detail-page"
                onClick={() =>
                  track('play_button_click', {
                    dramaId: drama.id,
                    dramaTitle: drama.title,
                    source: 'detail-page',
                  })
                }
              >
                播放正片
              </GradientButton>
              <GradientButton
                variant="secondary"
                icon={<HeartIcon className={`h-4 w-4 ${collected ? 'text-accent' : ''}`} filled={collected} />}
                onClick={() => {
                  const nextCollected = !collected;
                  setCollected(nextCollected);
                  track('favorite_toggle', {
                    dramaId: drama.id,
                    dramaTitle: drama.title,
                    collected: nextCollected,
                  });
                }}
              >
                {collected ? '已收藏' : '收藏'}
              </GradientButton>
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
            <div key={actor.actor} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <span className="font-medium">{actor.actor}</span>
              <span className="ml-3 text-sm text-white/45">饰 {actor.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-11">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-bold md:text-2xl">剧集</h2>
          <span className="text-sm text-white/45">共 {episodes.length} 集</span>
        </div>
        <EpisodeGrid dramaId={drama.id} totalEpisodes={episodes.length} />
      </section>

      <section className="mt-14">
        <h2 className="mb-6 text-xl font-bold md:text-2xl">相关短剧</h2>
        <DramaGrid dramas={related} moduleName="相关短剧" />
      </section>
    </PageContainer>
  );
}
