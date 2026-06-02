type EmptyStateProps = {
  title?: string;
  description?: string;
};

export default function EmptyState({ title = '暂无数据', description = '当前时间范围内还没有可展示的数据。' }: EmptyStateProps) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-black/10 px-4 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl text-white/42">∅</div>
      <p className="font-bold text-white/82">{title}</p>
      <p className="mt-1 max-w-md text-sm text-white/45">{description}</p>
    </div>
  );
}
