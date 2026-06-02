import type { DashboardSearchKeyword } from '../../lib/api';
import EmptyState from './EmptyState';

type SearchKeywordsTableProps = {
  items: DashboardSearchKeyword[];
};

export default function SearchKeywordsTable({ items }: SearchKeywordsTableProps) {
  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-white/[0.06] p-5">
        <h2 className="text-xl font-black">搜索词排行</h2>
        <p className="mt-1 text-sm text-white/42">仅展示脱敏后的 keyword / search_term，默认 Top 10。</p>
      </div>
      {!items.length ? (
        <div className="p-5">
          <EmptyState title="暂无搜索词" description="前台搜索后，这里会统计搜索次数、平均结果数和无结果率。" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/45">
              <tr>
                <th className="px-4 py-3">排名</th>
                <th className="px-4 py-3">搜索词</th>
                <th className="px-4 py-3">搜索次数</th>
                <th className="px-4 py-3">结果数平均值</th>
                <th className="px-4 py-3">无结果次数</th>
                <th className="px-4 py-3">无结果率</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.keyword}-${index}`} className="border-t border-white/[0.06] first:border-t-0">
                  <td className="px-4 py-4 text-white/40">#{index + 1}</td>
                  <td className="px-4 py-4 font-bold">{item.keyword}</td>
                  <td className="px-4 py-4">{item.count}</td>
                  <td className="px-4 py-4">{item.avgResultCount.toFixed(1)}</td>
                  <td className="px-4 py-4">{item.noResultCount}</td>
                  <td className="px-4 py-4 text-[#ff6a3d]">{item.noResultRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
