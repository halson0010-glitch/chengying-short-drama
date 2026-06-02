import type { Drama } from '../types/drama';
import { toPublicPath } from './publicPath';

export type DemoAssetItem = {
  title?: string;
  poster?: string;
  hero?: string;
  posterIsExtra?: boolean;
};

export type DemoAssetsManifest = {
  generatedAt?: string;
  summary?: {
    posters?: number;
    heroes?: number;
    failed?: number;
    fallbackOnly?: boolean;
    usedOpenAI?: boolean;
    fallbackGenerated?: number;
    openaiGenerated?: number;
    existing?: number;
    requestedPosters?: number;
    requestedHeroes?: number;
    mockDramaCount?: number;
  };
  assets?: Record<string, DemoAssetItem>;
  featured?: Array<{ id: string; title?: string; poster?: string; hero?: string }>;
  failures?: Array<{ id: string; kind: string; message: string }>;
};

let manifest: DemoAssetsManifest | null = null;
let manifestPromise: Promise<DemoAssetsManifest | null> | null = null;

export function getDemoAssetsManifest() {
  return manifest;
}

export async function loadDemoAssetsManifest() {
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetch(toPublicPath('/demo-assets/generated-assets.json') ?? '/demo-assets/generated-assets.json', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as DemoAssetsManifest;
      manifest = data;
      return data;
    })
    .catch(() => null);

  return manifestPromise;
}

export function getDirectDemoAssetPath(dramaId: string, kind: 'poster' | 'hero') {
  const directory = kind === 'poster' ? 'posters' : 'hero';
  return `/demo-assets/${directory}/${dramaId}.png`;
}

export function getDemoAssetPath(drama: Pick<Drama, 'id'>, kind: 'poster' | 'hero') {
  const asset = manifest?.assets?.[drama.id];
  return kind === 'poster' ? asset?.poster : asset?.hero;
}

export function getPublicDemoAssetPath(drama: Pick<Drama, 'id'>, kind: 'poster' | 'hero') {
  return toPublicPath(getDemoAssetPath(drama, kind));
}

export function getPublicDirectDemoAssetPath(dramaId: string, kind: 'poster' | 'hero') {
  return toPublicPath(getDirectDemoAssetPath(dramaId, kind));
}
