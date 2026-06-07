import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import PageContainer from '../components/common/PageContainer';
import RevealSection from '../components/common/RevealSection';
import DramaGrid from '../components/drama/DramaGrid';
import SectionRail from '../components/drama/SectionRail';
import HeroShowcase from '../components/home/HeroShowcase';
import ContinueWatchRail from '../components/library/ContinueWatchRail';
import { heroDramaIds } from '../data/mockDramas';
import { track } from '../lib/analytics';
import { getHeroDramas } from '../lib/hero';
import { getWatchProgress, type WatchProgressItem } from '../services/engagementApi';
import { getHomeDramas, heatToNumber } from '../services/dramaApi';
import type { Drama } from '../types/drama';

function byHeat(items: Drama[]) {
  return [...items].sort((first, second) => heatToNumber(second.heat) - heatToNumber(first.heat));
}

function fillRail(source: Drama[], fallback: Drama[], limit = 12) {
  const merged = [...source];
  fallback.forEach((drama) => {
    if (merged.length < limit && !merged.some((item) => item.id === drama.id)) merged.push(drama);
  });
  return merged.slice(0, limit);
}

function PlatformSignalStrip({ dramas }: { dramas: Drama[] }) {
  const publishedCount = dramas.length;
  const totalEpisodes = dramas.reduce((sum, drama) => sum + drama.totalEpisodes, 0);
  const newestCount = dramas.filter((drama) => drama.updatedWithinDays <= 14).length;
  const featuredCount = dramas.filter((drama) => drama.featured).length || Math.min(5, dramas.length);
  const stats = [
    { label: '精选片库', value: `${publishedCount}+`, hint: '短剧模板' },
    { label: '剧集总量', value: `${totalEpisodes}+`, hint: '竖屏播放' },
    { label: '近期上新', value: `${newestCount}`, hint: '持续更新' },
    { label: '开屏推荐', value: `${featuredCount}`, hint: '沉浸切换' },
  ];

  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="group rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:border-accent/35 hover:bg-white/[0.07]"
        >
          <p className="text-xs font-semibold uppercase text-white/38">{item.label}</p>
          <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
          <p className="mt-2 text-sm text-white/48">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [continueItems, setContinueItems] = useState<WatchProgressItem[]>([]);
  const [recommendSeed, setRecommendSeed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '橙影短剧 - 免费短剧精选';
  }, []);

  useEffect(() => {
    let active = true;
    void getHomeDramas()
      .then((items) => {
        if (active) setDramas(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getWatchProgress().then((items) => {
      if (!active) return;
      setContinueItems(items);
      if (items.length) {
        track('continue_watch_module_view', { count: items.length, source: 'home-page' });
        track('home_module_view', { module: 'continue-watch', count: items.length, source: 'home-page' });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const sortedByHeat = useMemo(() => byHeat(dramas), [dramas]);
  const heroDramas = useMemo(() => getHeroDramas(dramas, heroDramaIds), [dramas]);
  const hotDramas = useMemo(() => sortedByHeat.slice(0, 12), [sortedByHeat]);
  const recentlyUpdated = useMemo(
    () => fillRail([...dramas].sort((first, second) => first.updatedWithinDays - second.updatedWithinDays), sortedByHeat),
    [dramas, sortedByHeat],
  );
  const freeDramas = useMemo(
    () =>
      fillRail(
        dramas.filter((drama) => (drama.episodes ?? []).some((episode) => episode.isFree !== false) || !(drama.episodes ?? []).length),
        sortedByHeat,
      ),
    [dramas, sortedByHeat],
  );
  const recommendedDramas = useMemo(() => {
    const rotated = [...sortedByHeat];
    const offset = rotated.length ? recommendSeed % rotated.length : 0;
    return [...rotated.slice(offset), ...rotated.slice(0, offset)].slice(0, 12);
  }, [recommendSeed, sortedByHeat]);

  const rails = useMemo(
    () => [
      {
        title: '女频热播',
        subtitle: '甜宠、成长、古风与悬疑',
        dramas: fillRail(dramas.filter((_, index) => index % 3 !== 1), sortedByHeat),
      },
      {
        title: '男频热播',
        subtitle: '身份反转、系统升级与高能逆袭',
        dramas: fillRail(dramas.filter((_, index) => index % 3 === 1), sortedByHeat),
      },
      {
        title: '高能反转',
        subtitle: '节奏更快的爽感短剧',
        dramas: fillRail(dramas.filter((_, index) => index % 2 === 0), sortedByHeat),
      },
      {
        title: '古风精选',
        subtitle: '长风入卷，命运开场',
        dramas: fillRail(dramas.filter((_, index) => index % 4 === 0), sortedByHeat),
      },
    ],
    [dramas, sortedByHeat],
  );

  if (!loading && !dramas.length) {
    return (
      <PageContainer className="pt-10">
        <EmptyState title="暂无短剧内容" description="请先在后台发布剧目，或检查 mock 数据是否存在。" />
      </PageContainer>
    );
  }

  return (
    <>
      <div className="home-hero-shell">
        {loading ? (
          <div className="surface mx-auto h-[82vh] max-w-7xl animate-pulse bg-white/[0.03]" />
        ) : (
          <HeroShowcase dramas={heroDramas} />
        )}
      </div>
      <PageContainer className="pb-4 pt-8 md:pt-10">
        {!loading && <PlatformSignalStrip dramas={dramas} />}

        {continueItems.length ? (
          <div className="mt-10">
            <ContinueWatchRail
              items={continueItems}
              onItemClick={(item, position) =>
                track('continue_watch_click', {
                  dramaId: item.dramaId,
                  dramaTitle: item.drama?.title,
                  episode: item.episode,
                  progress: item.progress,
                  position,
                  source: 'home-continue-watch',
                })
              }
            />
          </div>
        ) : null}

        {!loading && (
          <section className="mt-10 grid gap-3 md:grid-cols-2">
            {[
              { title: '今日热播', type: 'hot', to: '/ranking?type=hot' },
              { title: '飙升榜', type: 'rising', to: '/ranking?type=rising' },
            ].map((item) => (
              <Link
                key={item.type}
                to={item.to}
                onClick={() => {
                  track('home_module_more_click', { module: item.type, route: item.to, source: 'home-page' });
                  track('home_module_view', { module: item.type, source: 'home-page' });
                }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-accent/35 hover:bg-white/[0.07]"
              >
                <p className="text-sm font-semibold text-[#ff7555]">{item.title}</p>
                <p className="mt-2 text-xs text-white/42">查看更多</p>
              </Link>
            ))}
          </section>
        )}

        <RevealSection className="mt-14 md:mt-16" title="热门短剧" subtitle="本周观众正在追的精彩故事">
          <DramaGrid dramas={hotDramas} moduleName="热门短剧" reveal />
        </RevealSection>

        <SectionRail title="免费专区" subtitle="可直接开看的精选短剧" dramas={freeDramas} />
        <SectionRail title="最近上新" subtitle="近期更新内容" dramas={recentlyUpdated} />

        <section className="mt-14">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">猜你喜欢</h2>
              <p className="mt-2 text-sm text-white/45">按热度与题材混排</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRecommendSeed((value) => value + 5);
                track('recommendation_refresh_click', { module: 'guess-you-like', source: 'home-page' });
              }}
              className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/60 transition hover:border-accent/40 hover:text-white"
            >
              换一批
            </button>
          </div>
          <DramaGrid dramas={recommendedDramas} moduleName="猜你喜欢" />
        </section>

        {rails.map((rail) => (
          <SectionRail key={rail.title} {...rail} dramas={rail.dramas} />
        ))}
      </PageContainer>
    </>
  );
}
