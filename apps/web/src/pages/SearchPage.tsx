import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import PageContainer from '../components/common/PageContainer';
import DramaGrid from '../components/drama/DramaGrid';
import HotSearches from '../components/search/HotSearches';
import RecentSearches from '../components/search/RecentSearches';
import SearchBox from '../components/search/SearchBox';
import type { Drama } from '../types/drama';
import { sanitizeSearchKeyword, track } from '../lib/analytics';
import { clearRecentSearches, getRecentSearches, saveRecentSearch } from '../lib/search';
import { searchDramasRemote } from '../services/dramaApi';

export default function SearchPage() {
  const [params] = useSearchParams();
  const keyword = sanitizeSearchKeyword(params.get('q') ?? '');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [results, setResults] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    document.title = keyword ? `搜索 ${keyword} - 橙影短剧` : '搜索 - 橙影短剧';
    if (!keyword) {
      setResults([]);
      setLoading(false);
      setRecentSearches(getRecentSearches());
      return undefined;
    }
    setRecentSearches(saveRecentSearch(keyword));
    track('search_submit', { keyword, source: 'search_page_url' });
    setLoading(true);
    void searchDramasRemote(keyword)
      .then((matches) => {
        if (!active) return;
        setResults(matches);
        if (!matches.length) track('search_no_result', { keyword });
      })
      .catch(() => {
        if (!active) return;
        setResults([]);
        track('search_no_result', { keyword, reason: 'request_failed' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [keyword]);

  const trackResultClick = (drama: Drama, position: number) => {
    track('search_result_click', {
      keyword,
      resultCount: results.length,
      dramaId: drama.id,
      dramaTitle: drama.title,
      position,
    });
  };

  return (
    <PageContainer className="pt-8 md:pt-12">
      <h1 className="text-3xl font-bold md:text-4xl">搜索结果</h1>
      <div className="mt-7">
        <SearchBox variant="page" />
      </div>

      {!keyword ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="surface p-6">
            <HotSearches />
          </div>
          <div className="surface p-6">
            {recentSearches.length ? (
              <RecentSearches
                keywords={recentSearches}
                onClear={() => {
                  clearRecentSearches();
                  setRecentSearches([]);
                }}
              />
            ) : (
              <p className="text-sm text-white/42">还没有最近搜索，试试热门题材吧。</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-7 mt-10 flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-sm text-white/55">
              “<span className="font-semibold text-white">{keyword}</span>” 的相关内容
            </p>
            <span className="text-sm text-white/45">{loading ? '搜索中...' : `共 ${results.length} 部短剧`}</span>
          </div>
          {loading ? (
            <div className="surface h-48 animate-pulse bg-white/[0.03]" />
          ) : results.length ? (
            <DramaGrid dramas={results} moduleName="搜索结果" onCardClick={trackResultClick} />
          ) : (
            <div className="space-y-7">
              <EmptyState
                title="没有找到相关短剧"
                description="换个关键词试试，例如 甜宠、逆袭、悬疑、女性成长"
              />
              <div className="surface p-6">
                <HotSearches />
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
