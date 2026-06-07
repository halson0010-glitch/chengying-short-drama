import type { DashboardTopDrama } from '../../lib/api';
import EmptyState from './EmptyState';

type TopDramasTableProps = {
  items: DashboardTopDrama[];
};

export default function TopDramasTable({ items }: TopDramasTableProps) {
  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-white/[0.06] p-5">
        <h2 className="text-xl font-black">热门短剧排行</h2>
        <p className="mt-1 text-sm text-white/42">
          仅统计真实短剧的卡片点击、播放点击、播放开始和完播数据；自动轮播和测试样本不纳入排行。
        </p>
      </div>
      {!items.length ? (
        <div className="p-5">
          <EmptyState title="暂无短剧排行" description="有真实短剧点击或播放事件后，这里会自动生成排行榜。" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/45">
              <tr>
                <th className="px-4 py-3">排名</th>
                <th className="px-4 py-3">短剧标题</th>
                <th className="px-4 py-3">卡片点击</th>
                <th className="px-4 py-3">播放点击</th>
                <th className="px-4 py-3">播放开始</th>
                <th className="px-4 py-3">完播</th>
                <th className="px-4 py-3">完播率</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.dramaId || item.dramaTitle}-${index}`} className="border-t border-white/[0.06] first:border-t-0">
                  <td className="px-4 py-4 text-white/40">#{index + 1}</td>
                  <td className="px-4 py-4 font-bold">{item.dramaTitle || item.dramaId || '未知短剧'}</td>
                  <td className="px-4 py-4">{item.cardClicks}</td>
                  <td className="px-4 py-4">{item.playButtonClicks}</td>
                  <td className="px-4 py-4">{item.playStarts}</td>
                  <td className="px-4 py-4">{item.playCompletes}</td>
                  <td className="px-4 py-4 text-[#ff6a3d]">{item.completionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
