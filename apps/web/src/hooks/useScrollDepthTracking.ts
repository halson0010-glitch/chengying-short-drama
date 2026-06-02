import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '../lib/analytics';

const depths = [25, 50, 75, 100];

export default function useScrollDepthTracking() {
  const location = useLocation();

  useEffect(() => {
    const tracked = new Set<number>();
    const reportDepth = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const currentDepth = Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100));
      depths.forEach((depth) => {
        if (currentDepth >= depth && !tracked.has(depth)) {
          tracked.add(depth);
          track('scroll_depth', { depth, route: location.pathname });
        }
      });
    };

    window.addEventListener('scroll', reportDepth, { passive: true });
    return () => window.removeEventListener('scroll', reportDepth);
  }, [location.pathname, location.search]);
}

