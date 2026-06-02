import { mockDramas } from '../data/mockDramas';
import type { Drama, DramaEpisode } from '../types/drama';
import { sanitizeSearchKeyword } from '../lib/analytics';
import { loadDemoAssetsManifest } from '../lib/demoAssets';
import { searchDramasInCollection } from '../lib/search';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const enableMockFallback = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';
const enableDemoAssets = import.meta.env.VITE_ENABLE_DEMO_ASSETS !== 'false';
const fallbackGradient = 'linear-gradient(145deg, #ff7043 0%, #a93255 48%, #151320 100%)';

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeEpisodes(value: unknown): DramaEpisode[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((episode) => episode as Partial<DramaEpisode>)
    .filter((episode) => Number.isInteger(Number(episode.episode)) && Number(episode.episode) > 0)
    .map((episode) => ({
      ...episode,
      episode: Number(episode.episode),
      title: episode.title || `第 ${episode.episode} 集`,
      videoUrl: episode.videoUrl || undefined,
      hlsUrl: episode.hlsUrl || undefined,
      duration: episode.duration ? Number(episode.duration) : undefined,
      isFree: episode.isFree !== false,
    }));
}

function normalizeCast(value: unknown): Drama['cast'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((member) => member as Partial<Drama['cast'][number]>)
    .filter((member) => member.actor || member.role)
    .map((member) => ({ actor: String(member.actor || ''), role: String(member.role || '') }));
}

function normalizeDrama(rawDrama: Drama, sourceType: Drama['sourceType']): Drama {
  const drama = rawDrama as Drama & Record<string, unknown>;
  const episodes = normalizeEpisodes(drama.episodes);
  const maximumEpisode = Math.max(0, ...episodes.map((episode) => episode.episode));
  const totalEpisodes = Math.max(1, Number(drama.totalEpisodes) || 0, maximumEpisode);
  const tags = normalizeStringArray(drama.tags);

  return {
    ...drama,
    title: typeof drama.title === 'string' && drama.title ? drama.title : '未命名短剧',
    subtitle: typeof drama.subtitle === 'string' ? drama.subtitle : '',
    totalEpisodes,
    category: typeof drama.category === 'string' && drama.category ? drama.category : '都市',
    background: typeof drama.background === 'string' && drama.background ? drama.background : '现代',
    theme: typeof drama.theme === 'string' && drama.theme ? drama.theme : '现言',
    setting: normalizeStringArray(drama.setting),
    audience: drama.audience === '男频' ? '男频' : '女频',
    tags: tags.length ? tags : ['短剧', typeof drama.theme === 'string' ? drama.theme : '热播'],
    description:
      typeof drama.description === 'string' && drama.description
        ? drama.description
        : '这是一部正在完善资料的短剧，更多剧情信息会在后台补充后展示。',
    cast: normalizeCast(drama.cast),
    heat: typeof drama.heat === 'string' && drama.heat ? drama.heat : '0万',
    updatedWithinDays: Math.max(1, Number(drama.updatedWithinDays) || 1),
    gradient: typeof drama.gradient === 'string' && drama.gradient ? drama.gradient : fallbackGradient,
    posterImage: enableDemoAssets && typeof drama.posterImage === 'string' ? drama.posterImage : undefined,
    heroBackgroundImage:
      enableDemoAssets && typeof drama.heroBackgroundImage === 'string' ? drama.heroBackgroundImage : undefined,
    visualTone: typeof drama.visualTone === 'string' ? drama.visualTone : undefined,
    featured: Boolean(drama.featured),
    featuredOrder: Number.isFinite(Number(drama.featuredOrder)) ? Number(drama.featuredOrder) : undefined,
    aiPosterPrompt: typeof drama.aiPosterPrompt === 'string' ? drama.aiPosterPrompt : undefined,
    aiHeroPrompt: typeof drama.aiHeroPrompt === 'string' ? drama.aiHeroPrompt : undefined,
    posterUrl: typeof drama.posterUrl === 'string' && drama.posterUrl ? drama.posterUrl : undefined,
    coverUrl: typeof drama.coverUrl === 'string' && drama.coverUrl ? drama.coverUrl : undefined,
    episodes,
    sourceType: drama.sourceType ?? sourceType,
  } as Drama;
}

function parseDramaList(value: unknown, sourceType: Drama['sourceType']) {
  const data =
    Array.isArray(value) ? value : value && typeof value === 'object' && 'data' in value ? (value as { data: unknown }).data : [];
  if (!Array.isArray(data)) return [];
  return data.map((drama) => normalizeDrama(drama as Drama, sourceType));
}

async function prepareDramas(dramas: Drama[]) {
  if (enableDemoAssets) await loadDemoAssetsManifest();
  return dramas;
}

async function prepareDrama(drama?: Drama) {
  if (enableDemoAssets) await loadDemoAssetsManifest();
  return drama;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Drama API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function isRemoteDramaMode() {
  return Boolean(apiBaseUrl);
}

export function heatToNumber(heat: string) {
  return Number.parseFloat(heat.replace('万', '')) || 0;
}

export function getDramaStatus(drama: Drama) {
  if (drama.status === 'offline') return '已下线';
  if (drama.status === 'draft') return '待发布';
  return drama.updatedWithinDays <= 14 ? `近期上新 · 全 ${drama.totalEpisodes} 集` : '全集已完结';
}

export function getDramaEpisodes(drama: Drama): DramaEpisode[] {
  const suppliedEpisodes = new Map((drama.episodes ?? []).map((episode) => [episode.episode, episode]));
  const maximumSuppliedEpisode = Math.max(0, ...suppliedEpisodes.keys());
  const count = Math.max(drama.totalEpisodes, maximumSuppliedEpisode);

  return Array.from({ length: count }, (_, index) => {
    const episode = index + 1;
    return suppliedEpisodes.get(episode) ?? { episode, title: `第 ${episode} 集`, isFree: true };
  });
}

export async function getDramas() {
  if (!apiBaseUrl) {
    return prepareDramas(mockDramas.map((drama) => normalizeDrama(drama, 'mock')));
  }
  try {
    const response = await fetchJson<unknown>('/api/dramas');
    return prepareDramas(parseDramaList(response, 'remote'));
  } catch (error) {
    if (!enableMockFallback) throw error;
    console.warn('[chengying] API unavailable, using mock drama list.', error);
    return prepareDramas(mockDramas.map((drama) => normalizeDrama(drama, 'mock')));
  }
}

export async function getHomeDramas() {
  const mockTemplates = mockDramas.map((drama) => normalizeDrama(drama, 'mock'));
  if (!apiBaseUrl) return prepareDramas(mockTemplates);

  try {
    const response = await fetchJson<unknown>('/api/dramas');
    const remoteDramas = parseDramaList(response, 'remote');
    if (!enableMockFallback) return prepareDramas(remoteDramas);
    const remoteIds = new Set(remoteDramas.map((drama) => drama.id));
    return prepareDramas([...remoteDramas, ...mockTemplates.filter((drama) => !remoteIds.has(drama.id))]);
  } catch (error) {
    if (!enableMockFallback) throw error;
    console.warn('[chengying] API unavailable, using mock home templates.', error);
    return prepareDramas(mockTemplates);
  }
}

export async function getDramaById(id?: string) {
  if (!id) return undefined;
  const mockDrama = mockDramas.find((item) => item.id === id);
  if (!apiBaseUrl) {
    return prepareDrama(mockDrama ? normalizeDrama(mockDrama, 'mock') : undefined);
  }
  try {
    const response = await fetchJson<Drama | { data: Drama }>(`/api/dramas/${encodeURIComponent(id)}`);
    const drama = 'data' in response ? response.data : response;
    return prepareDrama(normalizeDrama(drama, 'remote'));
  } catch (error) {
    if (enableMockFallback && mockDrama) return prepareDrama(normalizeDrama(mockDrama, 'mock'));
    if (error instanceof Error && error.message.includes('404')) return undefined;
    throw error;
  }
}

export async function searchDramasRemote(keyword: string) {
  const normalized = sanitizeSearchKeyword(keyword);
  if (!normalized) return [];
  if (!apiBaseUrl) {
    return prepareDramas(searchDramasInCollection(
      mockDramas.map((drama) => normalizeDrama(drama, 'mock')),
      normalized,
    ));
  }
  try {
    const response = await fetchJson<unknown>(`/api/search?q=${encodeURIComponent(normalized)}`);
    const remoteResults = parseDramaList(response, 'remote');
    if (!enableMockFallback) return prepareDramas(remoteResults);
    const remoteIds = new Set(remoteResults.map((drama) => drama.id));
    const localResults = searchDramasInCollection(
      mockDramas.map((drama) => normalizeDrama(drama, 'mock')),
      normalized,
    ).filter((drama) => !remoteIds.has(drama.id));
    return prepareDramas([...remoteResults, ...localResults]);
  } catch (error) {
    if (!enableMockFallback) throw error;
    console.warn('[chengying] Search API unavailable, using mock search.', error);
    return prepareDramas(searchDramasInCollection(
      mockDramas.map((drama) => normalizeDrama(drama, 'mock')),
      normalized,
    ));
  }
}

export async function getRelatedDramas(drama: Drama) {
  const dramas = await getHomeDramas();
  return dramas
    .filter((item) => item.id !== drama.id)
    .map((item) => {
      const sharedTags = item.tags.filter((tag) => drama.tags.includes(tag)).length;
      const score = sharedTags * 3 + Number(item.theme === drama.theme) * 2 + Number(item.category === drama.category);
      return { item, score };
    })
    .sort(
      (first, second) =>
        second.score - first.score || heatToNumber(second.item.heat) - heatToNumber(first.item.heat),
    )
    .slice(0, 6)
    .map(({ item }) => item);
}
