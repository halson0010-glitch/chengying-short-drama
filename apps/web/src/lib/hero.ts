import type { Drama } from '../types/drama';
import {
  getDemoAssetPath,
  getDemoAssetSource,
  getDirectDemoAssetPath,
  isDemoAssetsManifestLoaded,
} from './demoAssets';
import { toPublicPath } from './publicPath';

export type DramaAssetSource =
  | 'manifest'
  | 'direct-png'
  | 'posterUrl'
  | 'coverUrl'
  | 'drama-image'
  | 'direct-svg'
  | 'gradient';

export type DramaAssetCandidate = {
  src: string;
  source: DramaAssetSource | string;
};

export type ResolvedDramaAsset = {
  src?: string;
  source: DramaAssetSource | string;
  candidates: DramaAssetCandidate[];
  manifestLoaded: boolean;
};

function firstDefined<T>(...values: Array<T | undefined>) {
  return values.find((value) => Boolean(value));
}

function directSvgPath(dramaId: string, kind: 'poster' | 'hero') {
  const directory = kind === 'poster' ? 'posters' : 'hero';
  return `/demo-assets/${directory}/${dramaId}.svg`;
}

function addCandidate(
  candidates: DramaAssetCandidate[],
  src: string | undefined,
  source: DramaAssetSource | string | undefined,
) {
  const publicSrc = toPublicPath(src);
  if (!publicSrc || candidates.some((candidate) => candidate.src === publicSrc)) return;
  candidates.push({ src: publicSrc, source: source || 'manifest' });
}

function resolveAsset(drama: Drama, kind: 'poster' | 'hero'): ResolvedDramaAsset {
  const candidates: DramaAssetCandidate[] = [];
  const manifestPath = getDemoAssetPath(drama, kind);
  const manifestSource = getDemoAssetSource(drama, kind);

  addCandidate(candidates, manifestPath, manifestSource || 'manifest');
  addCandidate(candidates, getDirectDemoAssetPath(drama.id, kind), 'direct-png');

  if (kind === 'poster') {
    addCandidate(candidates, drama.posterUrl, 'posterUrl');
    addCandidate(candidates, drama.posterImage, 'drama-image');
  } else {
    addCandidate(candidates, drama.coverUrl, 'coverUrl');
    addCandidate(candidates, drama.heroBackgroundImage, 'drama-image');
  }

  addCandidate(candidates, directSvgPath(drama.id, kind), 'direct-svg');

  const primary = candidates[0];
  return {
    src: primary?.src,
    source: primary?.source || 'gradient',
    candidates,
    manifestLoaded: isDemoAssetsManifestLoaded(),
  };
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

export function resolveDramaPosterAsset(drama: Drama) {
  return resolveAsset(drama, 'poster');
}

export function resolveDramaHeroAsset(drama: Drama) {
  return resolveAsset(drama, 'hero');
}

export function getDramaPosterImage(drama: Drama) {
  return resolveDramaPosterAsset(drama).src;
}

export function getDramaPosterFallbackImage(drama: Drama) {
  return firstDefined(...resolveDramaPosterAsset(drama).candidates.slice(1).map((candidate) => candidate.src));
}

export function getDramaHeroBackground(drama: Drama) {
  return resolveDramaHeroAsset(drama).src;
}

export function getDramaHeroBackgroundFallback(drama: Drama) {
  return firstDefined(...resolveDramaHeroAsset(drama).candidates.slice(1).map((candidate) => candidate.src));
}
