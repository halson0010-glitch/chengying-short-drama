import { useEffect } from 'react';
import { resolveDramaHeroAsset, resolveDramaPosterAsset } from '../lib/hero';
import type { Drama } from '../types/drama';

export function usePreloadHeroAssets(dramas: Drama[]) {
  useEffect(() => {
    if (!dramas.length) return undefined;

    const images: HTMLImageElement[] = [];
    const urls = new Set<string>();

    dramas.forEach((drama) => {
      resolveDramaHeroAsset(drama).candidates.forEach((candidate) => urls.add(candidate.src));
      resolveDramaPosterAsset(drama).candidates.forEach((candidate) => urls.add(candidate.src));
    });

    urls.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      images.push(image);
    });

    return () => {
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [dramas]);
}
