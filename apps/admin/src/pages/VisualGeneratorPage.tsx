import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Drama } from '@chengying/shared';
import { api } from '../lib/api';

type GeneratedAsset = {
  kind: 'poster' | 'hero';
  url: string;
  filename: string;
  prompt: string;
};

export default function VisualGeneratorPage() {
  const [searchParams] = useSearchParams();
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('dramaId') || '');
  const [kind, setKind] = useState<'poster' | 'hero' | 'both'>('both');
  const [prompt, setPrompt] = useState('');
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .dramas()
      .then((items) => {
        setDramas(items);
        if (!selectedId && items[0]) setSelectedId(items[0].id);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : '加载剧目失败'));
  }, [selectedId]);

  const selectedDrama = useMemo(() => dramas.find((drama) => drama.id === selectedId), [dramas, selectedId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) {
      setError('请先选择剧目');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await api.generateDramaVisuals({
        dramaId: selectedId,
        kind,
        prompt: prompt || undefined,
      });
      setAssets(result.assets);
      setMessage('生成成功，图片已保存到 API uploads 目录，并已回写到当前剧目。刷新 H5 首页即可看到更新。');
      if (result.drama) {
        setDramas((current) => current.map((item) => (item.id === result.drama?.id ? result.drama : item)));
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'AI 生图失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#ff8a65]">Visual Assets</p>
        <h1 className="mt-2 text-3xl font-black">视觉素材 / AI 生图</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
          在服务端调用 OpenAI 图片生成接口，为剧目生成竖版封面和首页 Hero 背景。OpenAI API Key 只配置在 API 服务端，不会进入前端包。
        </p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      {message && <p className="mb-4 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-[#ff9a7d]">{message}</p>}

      <form onSubmit={submit} className="surface grid gap-5 p-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <label className="block text-sm text-white/55">
            选择剧目
            <select className="field mt-2" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {dramas.map((drama) => (
                <option key={drama.id} value={drama.id}>
                  {drama.title} {drama.featured ? `· 首页推荐 ${drama.featuredOrder || ''}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/55">
            生成类型
            <select className="field mt-2" value={kind} onChange={(event) => setKind(event.target.value as 'poster' | 'hero' | 'both')}>
              <option value="both">同时生成封面 + Hero 背景</option>
              <option value="poster">只生成封面图</option>
              <option value="hero">只生成 Hero 背景图</option>
            </select>
          </label>
          <label className="block text-sm text-white/55">
            自定义提示词（可选）
            <textarea
              className="field mt-2 min-h-32"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="留空时会优先使用剧目 aiPosterPrompt / aiHeroPrompt，再根据剧目信息自动生成提示词。"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '生成中...' : '开始生成'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPrompt(selectedDrama?.aiHeroPrompt || selectedDrama?.aiPosterPrompt || '');
              }}
            >
              使用当前剧目提示词
            </button>
          </div>
          <div className="rounded-2xl border border-[#ff6a3d]/20 bg-[#ff4d2e]/10 p-4 text-xs leading-5 text-white/55">
            <p className="font-semibold text-[#ffb199]">没有配置 OPENAI_API_KEY 时的替代方案</p>
            <p className="mt-2">
              服务端 AI 生图会返回明确提示，但演示站不需要停住。你可以先在项目根目录运行下面任一命令，批量生成本地 PNG 演示素材：
            </p>
            <code className="mt-3 block overflow-x-auto rounded-xl bg-black/30 px-3 py-2 text-[#ffd0c4]">
              npm run generate:demo-assets -- --all --force
            </code>
            <code className="mt-2 block overflow-x-auto rounded-xl bg-black/30 px-3 py-2 text-[#ffd0c4]">
              npm run generate:demo-assets -- --fallback-only --all --force
            </code>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
          <h2 className="font-bold">当前剧目素材</h2>
          <p className="mt-2 text-sm text-white/55">{selectedDrama?.title || '未选择剧目'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <PreviewCard title="封面" url={selectedDrama?.posterUrl} className="aspect-[9/16]" />
            <PreviewCard title="Hero" url={selectedDrama?.coverUrl} className="aspect-[9/16]" />
          </div>
        </div>
      </form>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {assets.map((asset) => (
          <div key={`${asset.kind}-${asset.url}`} className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{asset.kind === 'poster' ? '生成封面' : '生成 Hero 背景'}</h2>
              <a href={asset.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                打开图片
              </a>
            </div>
            <div className={`overflow-hidden rounded-2xl bg-black/30 ${asset.kind === 'poster' ? 'aspect-[9/16] max-w-sm' : 'aspect-video'}`}>
              <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
            </div>
            <p className="mt-4 break-all text-xs leading-5 text-white/45">{asset.url}</p>
            <details className="mt-3 text-xs text-white/45">
              <summary className="cursor-pointer text-white/65">查看使用的 Prompt</summary>
              <p className="mt-2 leading-5">{asset.prompt}</p>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewCard({ title, url, className = '' }: { title: string; url?: string; className?: string }) {
  return (
    <div>
      <p className="mb-2 text-xs text-white/45">{title}</p>
      <div className={`overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] ${className}`}>
        {url ? (
          <img src={url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/35">未配置</div>
        )}
      </div>
    </div>
  );
}
