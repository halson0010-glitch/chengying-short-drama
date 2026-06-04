import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/common/EmptyState';
import PageContainer from '../components/common/PageContainer';
import RevealSection from '../components/common/RevealSection';
import DramaGrid from '../components/drama/DramaGrid';
import SectionRail from '../components/drama/SectionRail';
import HeroShowcase from '../components/home/HeroShowcase';
import { heroDramaIds } from '../data/mockDramas';
import { getHeroDramas } from '../lib/hero';
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
    { label: '精选片库', value: `${publishedCount}+`, hint: '短剧模板可预览' },
    { label: '剧集总量', value: `${totalEpisodes}+`, hint: '覆盖竖屏播放链路' },
    { label: '近期上新', value: `${newestCount}`, hint: '后台发布后优先展示' },
    { label: '开屏推荐', value: `${featuredCount}`, hint: '五部沉浸式切换' },
  ];

  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="group rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:border-accent/35 hover:bg-white/[0.07]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/38">{item.label}</p>
          <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
          <p className="mt-2 text-sm text-white/48">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [dramas, setDramas] = useState<Drama[]>([]);
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

  const sortedByHeat = useMemo(() => byHeat(dramas), [dramas]);

  const heroDramas = useMemo(() => {
    return getHeroDramas(dramas, heroDramaIds);
  }, [dramas]);

  const hotDramas = useMemo(() => sortedByHeat.slice(0, 12), [sortedByHeat]);

  const rails = useMemo(
    () => [
      {
        title: '最新上架',
        subtitle: '近期入库的短剧模板，适合快速预览真实内容流',
        dramas: fillRail(
          dramas.filter((drama) => drama.updatedWithinDays <= 14),
          sortedByHeat,
        ),
      },
      {
        title: '女频热播',
        subtitle: '甜宠、成长、古言与悬疑，情绪浓度拉满',
        dramas: fillRail(
          dramas.filter((drama) => drama.audience === '女频'),
          sortedByHeat,
        ),
      },
      {
        title: '男频热播',
        subtitle: '身份反转、系统升级与高能逆袭',
        dramas: fillRail(
          dramas.filter((drama) => drama.audience === '男频'),
          sortedByHeat,
        ),
      },
      {
        title: '甜宠热榜',
        subtitle: '合约、重逢、暗恋与双向奔赴',
        dramas: fillRail(
          dramas.filter((drama) => drama.category === '甜宠' || drama.setting.includes('甜宠')),
          sortedByHeat,
        ),
      },
      {
        title: '逆袭爽剧',
        subtitle: '高能反转，一路破局',
        dramas: fillRail(
          dramas.filter((drama) => drama.category === '逆袭' || drama.setting.includes('打脸虐渣')),
          sortedByHeat,
        ),
      },
      {
        title: '古风精选',
        subtitle: '长风入卷，命运与权谋正开场',
        dramas: fillRail(
          dramas.filter((drama) => drama.category === '古风' || drama.background === '宫廷' || drama.background === '古代'),
          sortedByHeat,
        ),
      },
      {
        title: '悬疑脑洞',
        subtitle: '时间裂缝、旧案重启和记忆迷局',
        dramas: fillRail(
          dramas.filter((drama) => drama.category === '悬疑' || drama.theme === '脑洞' || drama.theme === '科幻'),
          sortedByHeat,
        ),
      },
      {
        title: '猜你喜欢',
        subtitle: '按热度与题材混排，展示更多封面素材',
        dramas: fillRail(
          dramas.filter((_, index) => index % 2 === 0),
          sortedByHeat,
        ),
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
        <RevealSection className="mt-14 md:mt-16" title="热门短剧" subtitle="本周观众正在追的精彩故事">
          <DramaGrid dramas={hotDramas} moduleName="热门短剧" reveal />
        </RevealSection>
        {rails.map((rail) => (
          <SectionRail key={rail.title} {...rail} dramas={rail.dramas} />
        ))}
      </PageContainer>
    </>
  );
}
