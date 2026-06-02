import type { DashboardFilterPreference } from '../../lib/api';
import EmptyState from './EmptyState';

type FilterPreferencesTableProps = {
  items: DashboardFilterPreference[];
};

export default function FilterPreferencesTable({ items }: FilterPreferencesTableProps) {
  const grouped = items.reduce<Record<string, DashboardFilterPreference[]>>((result, item) => {
    result[item.filterKey] = [...(result[item.filterKey] ?? []), item];
    return result;
  }, {});

  return (
    <section className="surface p-5">
      <h2 className="text-xl font-black">分类筛选偏好</h2>
      <p className="mt-1 text-sm text-white/42">按 filterKey 分组展示筛选项使用次数，默认 Top 20。</p>
      {!items.length ? (
        <div className="mt-5">
          <EmptyState title="暂无筛选偏好" description="用户在分类页切换筛选项后，这里会显示偏好分布。" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(grouped).map(([filterKey, rows]) => (
            <div key={filterKey} className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
              <p className="mb-3 text-sm font-black text-[#ff6a3d]">{filterKey}</p>
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={`${row.filterKey}-${row.filterValue}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-white/75">{row.filterValue}</span>
                    <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-white/45">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
