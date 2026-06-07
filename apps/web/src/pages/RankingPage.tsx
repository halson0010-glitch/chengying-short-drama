import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import PageContainer from '../components/common/PageContainer';
import DramaCard from '../components/drama/DramaCard';
import RankingTabs, { rankingTabs } from '../components/ranking/RankingTabs';
import { track } from '../lib/analytics';
import { getRankings, type RankingItem, type RankingType } from '../services/rankingApi';

export default function RankingPage() {
  const [searchParams] = useSearchParams();
  const initialType = rankingTabs.some((tab) => tab.key === searchParams.get('type'))
    ? searchParams.get('type') as RankingType
    : 'hot';
  const [activeType, setActiveType] = useState<RankingType>(initialType);
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '排行榜 - 橙影短剧';
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getRankings(activeType)
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        track('ranking_view', {
          type: activeType,
          label: rankingTabs.find((tab) => tab.key === activeType)?.label,
          count: nextItems.length,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeType]);

  const switchRanking = (type: RankingType) => {
    if (type === activeType) return;
    setActiveType(type);
    track('ranking_tab_switch', {
      from: activeType,
      to: type,
      source: 'ranking-page',
    });
  };

  return (
    <PageContainer className="pt-8 md:pt-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-[#ff7555]">Ranking</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">短剧排行榜</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            按播放、点击、收藏与完播行为聚合，数据不足时使用当前剧库热度兜底。
          </p>
        </div>
      </div>
      <div className="mt-7">
        <RankingTabs value={activeType} onChange={switchRanking} />
      </div>
      {loading ? (
        <div className="surface mt-8 h-64 animate-pulse bg-white/[0.03]" />
      ) : items.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <div key={item.drama.id} className="relative">
              <span className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-black text-white backdrop-blur">
                #{item.rank}
              </span>
              <DramaCard
                drama={item.drama}
                moduleName={`排行榜-${activeType}`}
                position={item.rank}
                onClick={(drama, position) =>
                  track('ranking_item_click', {
                    type: activeType,
                    rank: item.rank,
                    score: item.score,
                    dramaId: drama.id,
                    dramaTitle: drama.title,
                    position,
                  })
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="暂无榜单数据" description="榜单会在有播放、点击或收藏行为后自动生成。" />
        </div>
      )}
    </PageContainer>
  );
}
