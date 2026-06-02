import { useEffect, useMemo, useState } from 'react';
import { api, type DemoAssetsStatus } from '../lib/api';

const localCommands = [
  'npm run generate:demo-assets -- --all --force',
  'npm run generate:demo-assets -- --fallback-only --all --force',
];

function formatTime(value?: string) {
  if (!value) return '尚未生成';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN');
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-5 transition hover:-translate-y-0.5 hover:border-[#ff6a3d]/40">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {hint && <p className="mt-2 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export default function DemoAssetsPage() {
  const [status, setStatus] = useState<DemoAssetsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .demoAssets()
      .then(setStatus)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : '加载素材状态失败'))
      .finally(() => setLoading(false));
  }, []);

  const realDramaItems = useMemo(() => status?.items.filter((item) => !item.posterIsExtra) ?? [], [status]);
  const extraItems = useMemo(() => status?.items.filter((item) => item.posterIsExtra) ?? [], [status]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#ff8a65]">Demo Assets</p>
          <h1 className="mt-2 text-3xl font-black">Demo 素材状态</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
            检查前台演示素材库里的横版 Hero 背景和竖版短剧封面。这里读取的是
            <span className="text-white/70"> apps/web/public/demo-assets </span>
            下的生成结果。
          </p>
        </div>
        <a className="btn btn-primary" href="/visual-generator">
          去 AI 生图页
        </a>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      {loading && <div className="surface h-56 animate-pulse bg-white/[0.03]" />}

      {status && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Hero 背景图" value={status.heroFiles} hint="目标至少 5 张" />
            <SummaryCard label="Poster 封面图" value={status.posterFiles} hint="目标至少 30 张" />
            <SummaryCard label="生成时间" value={formatTime(status.generatedAt)} />
            <SummaryCard label="生成模式" value={status.fallbackOnly ? '本地 fallback' : 'OpenAI / 混合'} />
          </div>

          <div className="surface mt-6 p-5">
            <h2 className="text-xl font-bold">一键生成命令</h2>
            <p className="mt-2 text-sm text-white/45">
              未配置 OPENAI_API_KEY 时也可以先用 fallback PNG 撑满演示素材；配置 Key 后去掉
              <span className="text-white/70"> --fallback-only </span>
              即可批量真实生图。
            </p>
            <div className="mt-4 grid gap-3">
              {localCommands.map((command) => (
                <code key={command} className="block overflow-x-auto rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-[#ffb199]">
                  {command}
                </code>
              ))}
            </div>
          </div>

          {(status.missingItems.length > 0 || status.failures.length > 0) && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
              <h2 className="text-xl font-bold text-red-100">缺失或失败提示</h2>
              <p className="mt-2 text-sm text-red-100/70">
                缺失项不会让前台空白，前台会继续回退到 SVG 或渐变；但为了演示完整度，建议重新运行生成命令。
              </p>
              <div className="mt-3 text-sm text-red-100/75">
                缺失项：{status.missingItems.length}，生成失败：{status.failures.length}
              </div>
            </div>
          )}

          <AssetTable title="剧目素材映射" items={realDramaItems} />
          {extraItems.length > 0 && <AssetTable title="备用封面素材" items={extraItems} />}
        </>
      )}
    </section>
  );
}

function AssetTable({ title, items }: { title: string; items: DemoAssetsStatus['items'] }) {
  return (
    <div className="surface mt-6 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-sm text-white/45">{items.length} 项</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-5 py-3">剧目</th>
              <th className="px-5 py-3">Poster</th>
              <th className="px-5 py-3">Hero</th>
              <th className="px-5 py-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-white/[0.06]">
                <td className="px-5 py-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-white/35">{item.id}</p>
                </td>
                <td className="px-5 py-4">
                  {item.poster ? <PathCell path={item.poster} ok={item.hasPoster} /> : <span className="text-white/35">未配置</span>}
                </td>
                <td className="px-5 py-4">
                  {item.hero ? <PathCell path={item.hero} ok={item.hasHero} /> : <span className="text-white/35">非 Hero 剧目</span>}
                </td>
                <td className="px-5 py-4">
                  {item.missing.length ? (
                    <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-100">缺失 {item.missing.join(', ')}</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">完整</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PathCell({ path, ok }: { path: string; ok: boolean }) {
  return (
    <div className="max-w-md">
      <p className={`break-all text-xs ${ok ? 'text-white/65' : 'text-red-100/75'}`}>{path}</p>
      <p className="mt-1 text-[11px] text-white/35">{ok ? '文件存在' : '文件缺失'}</p>
    </div>
  );
}
