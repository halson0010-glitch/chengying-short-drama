import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import PageContainer from '../common/PageContainer';
import { CloseIcon, SearchIcon } from '../common/Icons';
import SearchBox from '../search/SearchBox';
import DownloadPopover from './DownloadPopover';
import Logo from './Logo';

const navItems = [
  { label: '首页', to: '/', end: true },
  { label: '分类', to: '/category', end: false },
];

export default function Header() {
  const location = useLocation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#08080b]/75 backdrop-blur-xl">
      <PageContainer className="flex h-16 items-center justify-between gap-2 sm:gap-4 md:h-18">
        <Logo compactOnMobile />
        <nav className="ml-auto hidden items-center gap-0.5 sm:ml-8 sm:mr-auto sm:flex sm:gap-3" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition md:px-5 ${
                  isActive ? 'bg-accent/15 text-[#ff6545]' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SearchBox className="hidden md:block" />
        <button
          type="button"
          onClick={() => setMobileSearchOpen((open) => !open)}
          aria-label={mobileSearchOpen ? '关闭搜索' : '打开搜索'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/70 transition hover:border-accent/45 hover:text-white md:hidden"
        >
          {mobileSearchOpen ? <CloseIcon /> : <SearchIcon />}
        </button>
        <div className="hidden sm:block">
          <DownloadPopover />
        </div>
      </PageContainer>
      {mobileSearchOpen && (
        <div className="border-t border-white/[0.06] bg-[#101014]/96 px-4 py-3 md:hidden">
          <SearchBox variant="mobile" autoFocus onClose={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}
