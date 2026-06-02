import type { Drama } from '../types/drama';
import { getDemoAssetPath, getDirectDemoAssetPath } from './demoAssets';
import { toPublicPath } from './publicPath';

function generatedPngVariant(url?: string) {
  if (!url || !url.startsWith('/demo-assets/') || !url.endsWith('.svg')) return undefined;
  return url.replace(/\.svg$/i, '.png');
}

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => Boolean(value));
}

export function getHeroDramas(dramas: Drama[], fallbackIds: string[] = []) {
  const featured = dramas
    .filter((drama) => drama.featured && Number.isFinite(drama.featuredOrder))
    .sort((first, second) => Number(first.featuredOrder) - Number(second.featuredOrder));

  if (featured.length >= 5) return featured.slice(0, 5);

  const preferred = fallbackIds
    .map((id) => dramas.find((drama) => drama.id === id))
    .filter((drama): drama is Drama => Boolean(drama));

  const merged = [...featured];
  preferred.forEach((drama) => {
    if (!merged.some((item) => item.id === drama.id)) merged.push(drama);
  });
  dramas.forEach((drama) => {
    if (!merged.some((item) => item.id === drama.id)) merged.push(drama);
  });

  return merged.slice(0, 5);
}

export function getDramaPosterImage(drama: Drama) {
  return toPublicPath(
    firstDefined(
      getDemoAssetPath(drama, 'poster'),
      getDirectDemoAssetPath(drama.id, 'poster'),
      drama.posterUrl,
      generatedPngVariant(drama.posterImage),
      drama.posterImage,
    ),
  );
}

export function getDramaPosterFallbackImage(drama: Drama) {
  return toPublicPath(firstDefined(drama.posterUrl, generatedPngVariant(drama.posterImage), drama.posterImage));
}

export function getDramaHeroBackground(drama: Drama) {
  return toPublicPath(
    firstDefined(
      getDemoAssetPath(drama, 'hero'),
      getDirectDemoAssetPath(drama.id, 'hero'),
      drama.coverUrl,
      generatedPngVariant(drama.heroBackgroundImage),
      drama.heroBackgroundImage,
    ),
  );
}

export function getDramaHeroBackgroundFallback(drama: Drama) {
  return toPublicPath(firstDefined(drama.coverUrl, generatedPngVariant(drama.heroBackgroundImage), drama.heroBackgroundImage));
}
