import { NavLink } from 'react-router-dom';
import { track } from '../../lib/analytics';
import { GridIcon, HomeIcon, LibraryIcon, RankingIcon, UserIcon } from '../common/Icons';

const tabs = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/category', label: '分类', icon: GridIcon },
  { to: '/ranking', label: '排行', icon: RankingIcon },
  { to: '/library', label: '追剧', icon: LibraryIcon },
  { to: '/account', label: '我的', icon: UserIcon },
];

export default function BottomTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#0d0d12]/92 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-18px_44px_rgba(0,0,0,0.42)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              onClick={() => track('bottom_nav_click', { label: tab.label, route: tab.to, source: 'mobile-bottom-tab' })}
              className={({ isActive }) =>
                `flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition ${
                  isActive ? 'bg-accent/16 text-[#ff815f]' : 'text-white/48 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
