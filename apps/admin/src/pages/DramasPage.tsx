import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Drama } from '@chengying/shared';
import { api } from '../lib/api';

export default function DramasPage() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setDramas(await api.dramas());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载剧目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const action = async (task: () => Promise<unknown>) => {
    setError('');
    try {
      await task();
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失败');
    }
  };

  const deleteDrama = (drama: Drama) => {
    if (!window.confirm(`确认删除《${drama.title}》？删除后不可恢复。`)) return;
    void action(() => api.deleteDrama(drama.id));
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">剧目列表</h1>
          <p className="mt-2 text-sm text-white/45">管理真实剧目、发布状态和剧集入口</p>
        </div>
        <Link to="/dramas/new" className="btn btn-primary">
          新增剧目
        </Link>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      <div className="surface overflow-hidden">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">集数</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">热度</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-white/45" colSpan={6}>
                  加载中...
                </td>
              </tr>
            ) : (
              dramas.map((drama) => (
                <tr key={drama.id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{drama.title}</p>
                    <p className="mt-1 text-xs text-white/38">{drama.subtitle}</p>
                  </td>
                  <td className="px-4 py-4 text-white/62">{drama.category}</td>
                  <td className="px-4 py-4 text-white/62">{drama.totalEpisodes}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        drama.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : drama.status === 'offline'
                            ? 'bg-white/[0.06] text-white/35'
                            : 'bg-amber-500/15 text-amber-100'
                      }`}
                    >
                      {drama.status === 'published' ? '已发布' : drama.status === 'offline' ? '已下架' : '草稿'}
                    </span>
                    {drama.status !== 'published' && (
                      <p className="mt-1 text-xs text-white/35">前台不可见</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-white/62">{drama.heat}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn btn-secondary" to={`/dramas/${drama.id}/edit`}>
                        编辑
                      </Link>
                      <Link className="btn btn-secondary" to={`/dramas/${drama.id}/episodes`}>
                        剧集
                      </Link>
                      <button className="btn btn-secondary" onClick={() => action(() => api.publishDrama(drama.id))}>
                        发布
                      </button>
                      <button className="btn btn-secondary" onClick={() => action(() => api.offlineDrama(drama.id))}>
                        下架
                      </button>
                      <button className="btn btn-secondary" onClick={() => deleteDrama(drama)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
