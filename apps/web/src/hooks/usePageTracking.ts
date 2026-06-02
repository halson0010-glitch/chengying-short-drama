import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '../lib/analytics';

export default function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    track('page_view', {
      title: document.title,
      route: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);
}

