import { useEffect, useRef, useState } from 'react';
import { api, type DashboardExportType, type DashboardRange } from '../../lib/api';

type ExportCsvButtonProps = {
  range: DashboardRange;
  types?: DashboardExportType[];
  label?: string;
};

const exportOptions: Array<{ type: DashboardExportType; label: string }> = [
  { type: 'raw_events', label: '导出原始事件' },
  { type: 'overview', label: '导出核心指标' },
  { type: 'trends', label: '导出趋势数据' },
  { type: 'funnel', label: '导出播放漏斗' },
  { type: 'top_dramas', label: '导出热门短剧' },
  { type: 'search_keywords', label: '导出搜索词' },
  { type: 'filter_preferences', label: '导出筛选偏好' },
];

export default function ExportCsvButton({ range, types, label = '导出 CSV' }: ExportCsvButtonProps) {
  const [open, setOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<DashboardExportType | ''>('');
  const [message, setMessage] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleOptions = types ? exportOptions.filter((item) => types.includes(item.type)) : exportOptions;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const download = async (type: DashboardExportType) => {
    setLoadingType(type);
    setMessage('');
    try {
      await api.downloadDashboardCsv(type, range);
      setMessage('导出成功');
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出失败，请稍后重试');
    } finally {
      setLoadingType('');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn btn-secondary min-w-[116px] border-[#ff4d2e]/35 text-[#ff8a65] hover:border-[#ff4d2e] hover:text-white"
      >
        {loadingType ? '导出中...' : label}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#17171d] p-2 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
          {visibleOptions.map((item) => (
            <button
              key={item.type}
              type="button"
              disabled={Boolean(loadingType)}
              onClick={() => void download(item.type)}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/72 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingType === item.type ? '正在导出...' : item.label}
            </button>
          ))}
        </div>
      )}
      {message && <p className="absolute right-0 mt-2 w-56 text-right text-xs text-white/45">{message}</p>}
    </div>
  );
}
