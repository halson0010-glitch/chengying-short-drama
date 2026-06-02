import { useEffect, useMemo, useState } from 'react';
import CategoryFilters, { initialFilters } from '../components/category/CategoryFilters';
import EmptyState from '../components/common/EmptyState';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import DramaGrid from '../components/drama/DramaGrid';
import { track } from '../lib/analytics';
import { getDramas, heatToNumber } from '../services/dramaApi';
import type { Drama, FilterState } from '../types/drama';

const timeLimits: Record<string, number> = {
  '7天内上新': 7,
  '14天内上新': 14,
  '30天内上新': 30,
  '90天内上新': 90,
};

export default function CategoryPage() {
  const [channel, setChannel] = useState<'短剧' | '漫画'>('短剧');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [allDramas, setAllDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    document.title = '分类浏览 - 橙影短剧';
  }, []);

  useEffect(() => {
    let active = true;
    void getDramas()
      .then((items) => {
        if (active) setAllDramas(items);
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
  }, []);

  const dramas = useMemo(() => {
    const matched = allDramas.filter((drama) => {
      if (filters.background !== '全部' && drama.background !== filters.background) return false;
      if (filters.theme !== '全部' && drama.theme !== filters.theme) return false;
      if (filters.setting !== '全部' && !drama.setting.includes(filters.setting)) return false;
      if (filters.audience !== '全部' && drama.audience !== filters.audience) return false;
      if (filters.time !== '全部' && drama.updatedWithinDays > timeLimits[filters.time]) return false;
      return true;
    });

    if (filters.recommendation === '最新') {
      return [...matched].sort((first, second) => first.updatedWithinDays - second.updatedWithinDays);
    }
    if (filters.recommendation === '最热') {
      return [...matched].sort((first, second) => heatToNumber(second.heat) - heatToNumber(first.heat));
    }
    return matched;
  }, [allDramas, filters]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    track('filter_change', { filterKey: key, filterValue: value, currentFilters: nextFilters });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    track('filter_change', { filterKey: 'all', filterValue: 'reset', currentFilters: initialFilters });
  };

  return (
    <PageContainer className="pt-8 md:pt-12">
      <h1 className="text-3xl font-bold md:text-4xl">分类浏览</h1>
      <p className="mt-3 text-sm text-white/52">发现适合你的下一部短剧</p>
      <div className="mt-9 flex gap-8 border-b border-white/[0.08]">
        {(['短剧', '漫画'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setChannel(tab)}
            className={`relative pb-4 text-lg font-semibold transition ${
              channel === tab ? 'text-white' : 'text-white/45 hover:text-white/70'
            }`}
          >
            {tab}
            {channel === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {channel === '漫画' ? (
        <div className="mt-8">
          <EmptyState title="漫画频道正在筹备中" description="更多原创内容即将上线，敬请期待" />
        </div>
      ) : (
        <>
          <CategoryFilters filters={filters} onChange={updateFilter} />
          <div className="mb-7 mt-10 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">筛选结果</h2>
            <span className="text-sm text-white/45">{loading ? '加载中...' : `共 ${dramas.length} 部短剧`}</span>
          </div>
          {loading ? (
            <div className="surface h-48 animate-pulse bg-white/[0.03]" />
          ) : loadFailed ? (
            <EmptyState title="内容加载失败" description="请稍后刷新页面重试" />
          ) : dramas.length ? (
            <DramaGrid dramas={dramas} moduleName="分类筛选结果" />
          ) : (
            <EmptyState
              title="暂无对应内容，请清除筛选项后重试"
              action={<GradientButton onClick={resetFilters}>清除筛选</GradientButton>}
            />
          )}
        </>
      )}
    </PageContainer>
  );
}
