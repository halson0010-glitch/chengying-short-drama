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
    <PageContainer className="pb-4 pt-6 md:pt-8">
      {loading ? <div className="surface h-[560px] animate-pulse bg-white/[0.03]" /> : <HeroShowcase dramas={heroDramas} />}
      <RevealSection className="mt-14 md:mt-16" title="热门短剧" subtitle="本周观众正在追的精彩故事">
        <DramaGrid dramas={hotDramas} moduleName="热门短剧" reveal />
      </RevealSection>
      {rails.map((rail) => (
        <SectionRail key={rail.title} {...rail} dramas={rail.dramas} />
      ))}
    </PageContainer>
  );
}
