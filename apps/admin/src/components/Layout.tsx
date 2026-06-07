import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken } from '../lib/api';

const navItems = [
  { to: '/dashboard', label: '仪表盘' },
  { to: '/dramas', label: '剧目列表' },
  { to: '/dramas/new', label: '新增剧目' },
  { to: '/uploads', label: '上传文件' },
  { to: '/demo-assets', label: 'Demo 素材状态' },
  { to: '/visual-generator', label: '视觉素材 / AI 生图' },
  { to: '/payments', label: '支付流水' },
  { to: '/analytics', label: '埋点概览' },
  { to: '/analytics/search-keywords', label: '搜索词统计' },
  { to: '/analytics/drama-clicks', label: '点击排行' },
  { to: '/analytics/play-funnel', label: '播放漏斗' },
  { to: '/analytics/retention', label: '观看留存' },
  { to: '/analytics/paywall', label: '付费弹窗分析' },
  { to: '/analytics/ranking', label: '排行榜分析' },
];

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/[0.08] bg-[#0d0d12]/95 p-5 lg:block">
        <div className="mb-8">
          <p className="text-xs text-white/42">后台管理</p>
          <h1 className="mt-1 text-2xl font-black">橙影短剧</h1>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm transition ${
                  isActive ? 'bg-accent text-white' : 'text-white/62 hover:bg-white/[0.07] hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            clearToken();
            navigate('/login');
          }}
          className="btn btn-secondary mt-8 w-full"
        >
          退出登录
        </button>
      </aside>
      <main className="min-h-screen px-4 py-5 lg:ml-64 lg:px-8">
        <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="btn btn-secondary shrink-0">
              {item.label}
            </NavLink>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
