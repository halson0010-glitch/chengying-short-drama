import { useEffect, useMemo, useState } from 'react';
import { resolveDramaHeroAsset, resolveDramaPosterAsset } from '../lib/hero';
import type { Drama } from '../types/drama';

export function usePreloadHeroAssets(dramas: Drama[]) {
  const urls = useMemo(() => {
    const nextUrls = new Set<string>();
    dramas.forEach((drama) => {
      const hero = resolveDramaHeroAsset(drama).src;
      const poster = resolveDramaPosterAsset(drama).src;
      if (hero) nextUrls.add(hero);
      if (poster) nextUrls.add(poster);
    });
    return [...nextUrls];
  }, [dramas]);

  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    setLoadedCount(0);
    if (!urls.length) return undefined;

    const images: HTMLImageElement[] = [];
    let active = true;
    const markDone = () => {
      if (active) setLoadedCount((count) => Math.min(count + 1, urls.length));
    };

    urls.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = markDone;
      image.onerror = markDone;
      image.src = src;
      images.push(image);
    });

    return () => {
      active = false;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [urls]);

  return {
    ready: urls.length === 0 || loadedCount >= urls.length,
    loadedCount,
    total: urls.length,
  };
}
