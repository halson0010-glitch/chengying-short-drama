import { useState } from 'react';
import { api } from '../lib/api';

export default function UploadsPage() {
  const [posterUrl, setPosterUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const upload = async (kind: 'poster' | 'hero' | 'video', file?: File) => {
    if (!file) return;
    setError('');
    setMessage('上传中...');
    try {
      const result = await api.upload(kind, file);
      if (kind === 'poster') setPosterUrl(result.url);
      else if (kind === 'hero') setHeroUrl(result.url);
      else setVideoUrl(result.url);
      setMessage('上传成功');
    } catch (uploadError) {
      setMessage('');
      setError(uploadError instanceof Error ? uploadError.message : '上传失败');
    }
  };

  return (
    <section>
      <h1 className="text-3xl font-black">上传封面 / Hero 背景 / 视频</h1>
      <p className="mt-2 text-sm text-white/45">
        文件会保存到 API 服务的 apps/api/uploads 目录。正式环境建议替换为对象存储 + CDN。
      </p>
      {message && <p className="mt-5 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white/62">{message}</p>}
      {error && <p className="mt-5 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <UploadCard title="上传竖版封面" accept="image/*" onChange={(file) => upload('poster', file)} url={posterUrl} />
        <UploadCard title="上传首页 Hero 背景" accept="image/*" onChange={(file) => upload('hero', file)} url={heroUrl} />
        <UploadCard title="上传视频" accept="video/*" onChange={(file) => upload('video', file)} url={videoUrl} />
      </div>
    </section>
  );
}

function UploadCard({
  title,
  accept,
  url,
  onChange,
}: {
  title: string;
  accept: string;
  url: string;
  onChange: (file?: File) => void;
}) {
  return (
    <div className="surface p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <input className="field mt-5" type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0])} />
      {url && <p className="mt-4 break-all text-sm text-[#ff9a7d]">{url}</p>}
    </div>
  );
}
