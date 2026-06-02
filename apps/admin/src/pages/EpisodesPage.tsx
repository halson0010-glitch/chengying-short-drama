import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { DramaEpisode } from '@chengying/shared';
import { api } from '../lib/api';

type EpisodeForm = {
  episode: string;
  title: string;
  videoUrl: string;
  hlsUrl: string;
  duration: string;
  isFree: boolean;
};

const emptyEpisode: EpisodeForm = {
  episode: '1',
  title: '',
  videoUrl: '',
  hlsUrl: '',
  duration: '',
  isFree: true,
};

export default function EpisodesPage() {
  const { id = '' } = useParams();
  const [episodes, setEpisodes] = useState<DramaEpisode[]>([]);
  const [form, setForm] = useState<EpisodeForm>(emptyEpisode);
  const [editingId, setEditingId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setEpisodes(await api.episodes(id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载剧集失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const episodeNumber = Number(form.episode);
  const existingEpisode = episodes.find((episode) => episode.episode === episodeNumber);

  const buildPayload = (videoUrl = form.videoUrl) => ({
    episode: episodeNumber,
    title: form.title,
    videoUrl,
    hlsUrl: form.hlsUrl,
    duration: form.duration ? Number(form.duration) : undefined,
    isFree: form.isFree,
  });

  const validateEpisodeNumber = () => {
    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      throw new Error('集数必须是大于 0 的整数');
    }
  };

  const saveEpisode = async (videoUrl = form.videoUrl) => {
    validateEpisodeNumber();

    const body = buildPayload(videoUrl);
    if (editingId) {
      return api.updateEpisode(editingId, body);
    }
    if (existingEpisode?.id) {
      return api.updateEpisode(existingEpisode.id, body);
    }
    return api.createEpisode(id, body);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const body = {
      episode: Number(form.episode),
      title: form.title,
      videoUrl: form.videoUrl,
      hlsUrl: form.hlsUrl,
      duration: form.duration ? Number(form.duration) : undefined,
      isFree: form.isFree,
    };
    try {
      validateEpisodeNumber();
      if (editingId) {
        await api.updateEpisode(editingId, body);
      } else if (existingEpisode?.id) {
        await api.updateEpisode(existingEpisode.id, body);
      } else {
        await api.createEpisode(id, body);
      }
      setMessage(`第 ${body.episode} 集已保存`);
      setEditingId('');
      setForm(emptyEpisode);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存剧集失败');
    }
  };

  const edit = (episode: DramaEpisode) => {
    setEditingId(episode.id || '');
    setForm({
      episode: String(episode.episode),
      title: episode.title || '',
      videoUrl: episode.videoUrl || '',
      hlsUrl: episode.hlsUrl || '',
      duration: episode.duration ? String(episode.duration) : '',
      isFree: episode.isFree !== false,
    });
  };

  const uploadVideo = async (file?: File) => {
    if (!file) return;
    try {
      validateEpisodeNumber();
    } catch (validateError) {
      setError(validateError instanceof Error ? validateError.message : '集数不合法');
      return;
    }

    setMessage('视频上传中...');
    setError('');
    let uploadedUrl = '';
    try {
      const result = await api.upload('video', file);
      uploadedUrl = result.url;
      setForm((current) => ({ ...current, videoUrl: result.url }));
      const saved = await saveEpisode(result.url);
      setEditingId(saved.id || '');
      setMessage(`视频已上传并绑定到第 ${saved.episode} 集：${result.url}`);
      await load();
    } catch (error) {
      setError(
        uploadedUrl
          ? `文件已上传但绑定失败：${uploadedUrl}。${error instanceof Error ? error.message : ''}`
          : error instanceof Error
            ? error.message
            : '视频上传或绑定失败',
      );
    }
  };

  const deleteEpisode = (episode: DramaEpisode) => {
    if (!episode.id) return;
    if (!window.confirm(`确认删除第 ${episode.episode} 集？删除后不可恢复。`)) return;
    void api
      .deleteEpisode(episode.id)
      .then(load)
      .catch((deleteError) => setError(deleteError instanceof Error ? deleteError.message : '删除剧集失败'));
  };

  return (
    <section>
      <h1 className="text-3xl font-black">剧集管理</h1>
      {error && <p className="mt-5 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      <form onSubmit={submit} className="surface mt-6 grid gap-4 p-6 md:grid-cols-3">
        <label className="text-sm text-white/55">
          集数
          <input className="field mt-2" value={form.episode} onChange={(event) => setForm({ ...form, episode: event.target.value })} />
        </label>
        <label className="text-sm text-white/55">
          标题
          <input className="field mt-2" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label className="text-sm text-white/55">
          时长秒
          <input className="field mt-2" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
        </label>
        <label className="text-sm text-white/55 md:col-span-3">
          videoUrl
          <input className="field mt-2" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} />
        </label>
        <label className="text-sm text-white/55 md:col-span-3">
          hlsUrl
          <input className="field mt-2" value={form.hlsUrl} onChange={(event) => setForm({ ...form, hlsUrl: event.target.value })} />
        </label>
        <label className="text-sm text-white/55 md:col-span-3">
          上传视频
          <input className="field mt-2" type="file" accept="video/*" onChange={(event) => uploadVideo(event.target.files?.[0])} />
        </label>
        <label className="flex items-center gap-2 text-sm text-white/55">
          <input type="checkbox" checked={form.isFree} onChange={(event) => setForm({ ...form, isFree: event.target.checked })} />
          免费
        </label>
        {message && <p className="text-sm text-[#ff9a7d] md:col-span-3">{message}</p>}
        <div className="flex gap-3 md:col-span-3">
          <button className="btn btn-primary" type="submit">
            {editingId || existingEpisode ? '保存剧集' : '新增剧集'}
          </button>
          {editingId && (
            <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(''); setForm(emptyEpisode); }}>
              取消编辑
            </button>
          )}
        </div>
      </form>
      <div className="surface mt-6 overflow-hidden">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-4 py-3">集数</th>
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">视频</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-white/45" colSpan={4}>
                  加载中...
                </td>
              </tr>
            ) : episodes.map((episode) => (
              <tr key={episode.id} className="border-t border-white/[0.06]">
                <td className="px-4 py-4">第 {episode.episode} 集</td>
                <td className="px-4 py-4 text-white/62">{episode.title || '-'}</td>
                <td className="max-w-[360px] truncate px-4 py-4 text-white/45">{episode.videoUrl || episode.hlsUrl || '未上传'}</td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => edit(episode)}>
                      编辑
                    </button>
                    <button className="btn btn-secondary" onClick={() => deleteEpisode(episode)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
