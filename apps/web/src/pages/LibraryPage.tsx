import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/common/EmptyState';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import DramaCard from '../components/drama/DramaCard';
import ContinueWatchRail from '../components/library/ContinueWatchRail';
import LibraryTabs, { type LibraryTab } from '../components/library/LibraryTabs';
import { track } from '../lib/analytics';
import {
  clearHistory,
  getFavorites,
  getHistory,
  getWatchProgress,
  type FavoriteItem,
  type WatchHistoryItem,
  type WatchProgressItem,
} from '../services/engagementApi';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('continue');
  const [progressItems, setProgressItems] = useState<WatchProgressItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLibrary = () => {
    setLoading(true);
    Promise.all([getWatchProgress(), getFavorites(), getHistory()])
      .then(([progress, favorites, history]) => {
        setProgressItems(progress);
        setFavoriteItems(favorites);
        setHistoryItems(history);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = '追剧 - 橙影短剧';
    track('library_page_view', { source: 'library-page' });
    loadLibrary();
  }, []);

  const counts = useMemo(
    () => ({ continue: progressItems.length, favorites: favoriteItems.length, history: historyItems.length }),
    [favoriteItems.length, historyItems.length, progressItems.length],
  );

  const switchTab = (tab: LibraryTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    track('library_tab_switch', { from: activeTab, to: tab, source: 'library-page' });
  };

  const clearAllHistory = async () => {
    await clearHistory();
    setHistoryItems([]);
    track('history_clear_click', { source: 'library-page' });
  };

  return (
    <PageContainer className="pt-8 md:pt-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#ff7555]">Library</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">我的追剧</h1>
        </div>
        {activeTab === 'history' && historyItems.length ? (
          <button
            type="button"
            onClick={() => void clearAllHistory()}
            className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/55 transition hover:border-accent/40 hover:text-white"
          >
            清空历史
          </button>
        ) : null}
      </div>
      <div className="mt-7">
        <LibraryTabs value={activeTab} onChange={switchTab} counts={counts} />
      </div>

      {loading ? (
        <div className="surface mt-8 h-56 animate-pulse bg-white/[0.03]" />
      ) : activeTab === 'continue' ? (
        progressItems.length ? (
          <div className="mt-8">
            <ContinueWatchRail
              items={progressItems}
              onItemClick={(item, position) =>
                track('continue_watch_click', {
                  dramaId: item.dramaId,
                  dramaTitle: item.drama?.title,
                  episode: item.episode,
                  progress: item.progress,
                  position,
                  source: 'library-page',
                })
              }
            />
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState title="暂无继续观看" description="开始播放短剧后，这里会保留最近进度。" action={<GradientButton to="/">去首页看看</GradientButton>} />
          </div>
        )
      ) : activeTab === 'favorites' ? (
        favoriteItems.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {favoriteItems.filter((item) => item.drama).map((item, index) => (
              <DramaCard
                key={item.dramaId}
                drama={item.drama!}
                moduleName="我的收藏"
                position={index + 1}
                onClick={(drama, position) =>
                  track('favorite_item_click', { dramaId: drama.id, dramaTitle: drama.title, position, source: 'library-page' })
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState title="暂无收藏" description="在详情页点击收藏后，会出现在这里。" action={<GradientButton to="/">去发现短剧</GradientButton>} />
          </div>
        )
      ) : historyItems.length ? (
        <div className="mt-8">
          <ContinueWatchRail
            title="观看历史"
            items={historyItems
              .filter((item) => item.drama)
              .map((item) => ({
                dramaId: item.dramaId,
                episode: item.episode,
                progress: 0,
                currentTime: 0,
                updatedAt: item.updatedAt,
                drama: item.drama,
              }))}
            onItemClick={(item, position) =>
              track('history_item_click', {
                dramaId: item.dramaId,
                dramaTitle: item.drama?.title,
                episode: item.episode,
                position,
                source: 'library-page',
              })
            }
          />
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="暂无观看历史" description="播放页会自动记录最近观看过的剧集。" action={<GradientButton to="/">去首页看看</GradientButton>} />
        </div>
      )}
    </PageContainer>
  );
}
