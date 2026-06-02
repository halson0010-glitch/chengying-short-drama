import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Drama, DramaCastMember } from '@chengying/shared';
import { api } from '../lib/api';

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  totalEpisodes: string;
  category: string;
  background: string;
  theme: string;
  audience: string;
  tags: string;
  setting: string;
  cast: string;
  posterUrl: string;
  coverUrl: string;
  featured: boolean;
  featuredOrder: string;
  visualTone: string;
  aiPosterPrompt: string;
  aiHeroPrompt: string;
  heat: string;
  status: string;
};

const emptyForm: FormState = {
  title: '',
  subtitle: '',
  description: '',
  totalEpisodes: '1',
  category: '都市',
  background: '现代',
  theme: '现言',
  audience: '女频',
  tags: '都市,甜宠',
  setting: '先婚后爱,甜宠',
  cast: '演员A:角色A',
  posterUrl: '',
  coverUrl: '',
  featured: false,
  featuredOrder: '',
  visualTone: '',
  aiPosterPrompt: '',
  aiHeroPrompt: '',
  heat: '0万',
  status: 'published',
};

function toForm(drama: Drama): FormState {
  return {
    title: drama.title,
    subtitle: drama.subtitle || '',
    description: drama.description,
    totalEpisodes: String(drama.totalEpisodes || 1),
    category: drama.category,
    background: drama.background,
    theme: drama.theme,
    audience: drama.audience,
    tags: drama.tags.join(','),
    setting: drama.setting.join(','),
    cast: drama.cast.map((member) => `${member.actor}:${member.role}`).join('\n'),
    posterUrl: drama.posterUrl || '',
    coverUrl: drama.coverUrl || '',
    featured: Boolean(drama.featured),
    featuredOrder: drama.featuredOrder ? String(drama.featuredOrder) : '',
    visualTone: drama.visualTone || '',
    aiPosterPrompt: drama.aiPosterPrompt || '',
    aiHeroPrompt: drama.aiHeroPrompt || '',
    heat: drama.heat,
    status: drama.status || 'draft',
  };
}

function payload(form: FormState): Partial<Drama> {
  const status = ['draft', 'published', 'offline'].includes(form.status) ? (form.status as Drama['status']) : 'published';
  return {
    title: form.title,
    subtitle: form.subtitle,
    description: form.description,
    totalEpisodes: Math.max(1, Number(form.totalEpisodes) || 1),
    category: form.category,
    background: form.background,
    theme: form.theme,
    audience: form.audience,
    posterUrl: form.posterUrl,
    coverUrl: form.coverUrl,
    featured: form.featured,
    featuredOrder: form.featuredOrder ? Math.max(1, Number(form.featuredOrder) || 1) : undefined,
    visualTone: form.visualTone,
    aiPosterPrompt: form.aiPosterPrompt,
    aiHeroPrompt: form.aiHeroPrompt,
    heat: form.heat,
    status,
    tags: form.tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    setting: form.setting
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    cast: form.cast
      .split('\n')
      .map((line) => {
        const [actor, role] = line.split(':').map((item) => item.trim());
        return actor ? { actor, role: role || '' } : null;
      })
      .filter((member): member is DramaCastMember => Boolean(member)),
  };
}

export default function DramaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .dramas()
      .then((dramas) => dramas.find((drama) => drama.id === id))
      .then((drama) => {
        if (drama) setForm(toForm(drama));
        else setError('没有找到该剧目');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '加载剧目信息失败');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const saved = id ? await api.updateDrama(id, payload(form)) : await api.createDrama(payload(form));
      navigate(`/dramas/${saved.id}/episodes`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存剧目失败');
    }
  };

  const uploadImage = async (kind: 'poster' | 'hero', file?: File) => {
    if (!file) return;
    setError('');
    setMessage(kind === 'poster' ? '封面上传中...' : 'Hero 背景上传中...');
    try {
      const result = await api.upload(kind, file);
      if (kind === 'poster') update('posterUrl', result.url);
      else update('coverUrl', result.url);
      setMessage(`${kind === 'poster' ? '封面' : 'Hero 背景'}已上传：${result.url}`);
    } catch (uploadError) {
      setMessage('');
      setError(uploadError instanceof Error ? uploadError.message : '上传图片失败');
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">{id ? '编辑剧目' : '新增剧目'}</h1>
          <p className="mt-2 text-sm text-white/45">配置基础信息、首页推荐位、封面图、Hero 背景图和 AI 生图提示词。</p>
        </div>
        {id && (
          <Link className="btn btn-secondary" to={`/visual-generator?dramaId=${id}`}>
            AI 生图
          </Link>
        )}
      </div>

      {loading ? (
        <div className="surface p-8 text-white/55">加载中...</div>
      ) : (
        <form onSubmit={submit} className="grid gap-6">
          {error && <p className="rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
          {message && <p className="rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-[#ff9a7d]">{message}</p>}

          <div className="surface grid gap-5 p-6 lg:grid-cols-2">
            <TextField label="标题" value={form.title} onChange={(value) => update('title', value)} />
            <TextField label="副标题" value={form.subtitle} onChange={(value) => update('subtitle', value)} />
            <TextField label="总集数" value={form.totalEpisodes} type="number" onChange={(value) => update('totalEpisodes', value)} />
            <TextField label="分类" value={form.category} onChange={(value) => update('category', value)} />
            <TextField label="背景" value={form.background} onChange={(value) => update('background', value)} />
            <TextField label="主题" value={form.theme} onChange={(value) => update('theme', value)} />
            <TextField label="受众" value={form.audience} onChange={(value) => update('audience', value)} />
            <TextField label="热度" value={form.heat} onChange={(value) => update('heat', value)} />
            <TextField label="标签，逗号分隔" value={form.tags} onChange={(value) => update('tags', value)} />
            <TextField label="设定，逗号分隔" value={form.setting} onChange={(value) => update('setting', value)} />
            <TextField label="状态：published / draft / offline" value={form.status} onChange={(value) => update('status', value)} />
            <TextField label="视觉基调 visualTone" value={form.visualTone} onChange={(value) => update('visualTone', value)} />
            <label className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/72">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => update('featured', event.target.checked)}
                className="h-4 w-4 accent-[#ff4d2e]"
              />
              首页推荐 featured
            </label>
            <TextField
              label="首页推荐顺序 featuredOrder（1-5 优先）"
              value={form.featuredOrder}
              type="number"
              onChange={(value) => update('featuredOrder', value)}
            />
          </div>

          <div className="surface grid gap-5 p-6 lg:grid-cols-2">
            <AssetField
              title="竖版封面 posterUrl"
              value={form.posterUrl}
              onChange={(value) => update('posterUrl', value)}
              onUpload={(file) => uploadImage('poster', file)}
              ratio="aspect-[9/16]"
            />
            <AssetField
              title="首页 Hero 背景 coverUrl"
              value={form.coverUrl}
              onChange={(value) => update('coverUrl', value)}
              onUpload={(file) => uploadImage('hero', file)}
              ratio="aspect-video"
            />
          </div>

          <div className="surface grid gap-5 p-6">
            <label className="block text-sm text-white/55">
              简介
              <textarea className="field mt-2 min-h-28" value={form.description} onChange={(event) => update('description', event.target.value)} />
            </label>
            <label className="block text-sm text-white/55">
              演员表，一行一个：演员:角色
              <textarea className="field mt-2 min-h-24" value={form.cast} onChange={(event) => update('cast', event.target.value)} />
            </label>
            <label className="block text-sm text-white/55">
              AI 封面提示词 aiPosterPrompt
              <textarea
                className="field mt-2 min-h-24"
                value={form.aiPosterPrompt}
                onChange={(event) => update('aiPosterPrompt', event.target.value)}
                placeholder="例如：原创短剧竖版海报，都市夜色，暖橙灯光，人物剪影，不要文字..."
              />
            </label>
            <label className="block text-sm text-white/55">
              AI Hero 背景提示词 aiHeroPrompt
              <textarea
                className="field mt-2 min-h-24"
                value={form.aiHeroPrompt}
                onChange={(event) => update('aiHeroPrompt', event.target.value)}
                placeholder="例如：宽屏电影感 Hero 背景，右侧主体，左侧留白，橙红光影，不要文字..."
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" type="submit">
              保存并管理剧集
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate('/dramas')}>
              返回
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-white/55">
      {label}
      <input className="field mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AssetField({
  title,
  value,
  ratio,
  onChange,
  onUpload,
}: {
  title: string;
  value: string;
  ratio: string;
  onChange: (value: string) => void;
  onUpload: (file?: File) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-white/55">
        {title}
        <input className="field mt-2" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <input className="field mt-3" type="file" accept="image/*" onChange={(event) => onUpload(event.target.files?.[0])} />
      <div className={`mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 ${ratio}`}>
        {value ? (
          <img src={value} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/35">暂无图片</div>
        )}
      </div>
    </div>
  );
}
