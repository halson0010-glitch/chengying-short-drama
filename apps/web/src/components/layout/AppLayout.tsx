import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import usePageTracking from '../../hooks/usePageTracking';
import useScrollDepthTracking from '../../hooks/useScrollDepthTracking';
import BottomTabBar from './BottomTabBar';
import Footer from './Footer';
import Header from './Header';

export default function AppLayout() {
  const { pathname, search } = useLocation();

  usePageTracking();
  useScrollDepthTracking();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, search]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-white">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
