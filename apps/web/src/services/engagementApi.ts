import { getAnalyticsAnonymousId } from '../lib/analytics';
import { getStoredToken } from '../lib/auth';
import type { Drama } from '../types/drama';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

const progressKey = 'chengying_watch_progress';
const historyKey = 'chengying_watch_history';
const favoritesKey = 'chengying_favorites';

export type WatchProgressItem = {
  id?: string;
  dramaId: string;
  episode: number;
  progress: number;
  currentTime: number;
  duration?: number;
  updatedAt: string;
  createdAt?: string;
  drama?: Drama;
};

export type WatchHistoryItem = {
  id?: string;
  dramaId: string;
  episode: number;
  source?: string;
  updatedAt: string;
  createdAt?: string;
  drama?: Drama;
};

export type FavoriteItem = {
  id?: string;
  dramaId: string;
  createdAt: string;
  drama?: Drama;
};

export type EntitlementsResponse = {
  items: Array<{ id: string; type: string; status: string; startsAt: string; endsAt: string }>;
  hasActiveEntitlement: boolean;
};

type SaveProgressPayload = {
  drama: Drama;
  episode: number;
  progress: number;
  currentTime: number;
  duration?: number;
  source?: string;
};

function readList<T>(key: string): T[] {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) as unknown : [];
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Engagement data is helpful but non-critical.
  }
}

function authHeaders() {
  const headers = new Headers({ Accept: 'application/json', 'x-anonymous-id': getAnalyticsAnonymousId() });
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function requestJson<T>(path: string, options: RequestInit = {}) {
  if (!apiBaseUrl) throw new Error('API base URL is not configured');
  const headers = authHeaders();
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function sortByUpdatedAt<T extends { updatedAt?: string; createdAt?: string }>(items: T[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.updatedAt ?? second.createdAt ?? 0).getTime() -
      new Date(first.updatedAt ?? first.createdAt ?? 0).getTime(),
  );
}

function upsertProgressLocal(payload: SaveProgressPayload) {
  const now = new Date().toISOString();
  const next: WatchProgressItem = {
    dramaId: payload.drama.id,
    episode: payload.episode,
    progress: Math.min(1, Math.max(0, payload.progress)),
    currentTime: Math.max(0, Math.floor(payload.currentTime)),
    duration: payload.duration,
    updatedAt: now,
    drama: payload.drama,
  };
  const items = readList<WatchProgressItem>(progressKey)
    .filter((item) => !(item.dramaId === next.dramaId && item.episode === next.episode));
  writeList(progressKey, sortByUpdatedAt([next, ...items]).slice(0, 100));

  const history: WatchHistoryItem = {
    dramaId: payload.drama.id,
    episode: payload.episode,
    source: payload.source,
    updatedAt: now,
    drama: payload.drama,
  };
  const historyItems = readList<WatchHistoryItem>(historyKey)
    .filter((item) => !(item.dramaId === history.dramaId && item.episode === history.episode));
  writeList(historyKey, sortByUpdatedAt([history, ...historyItems]).slice(0, 100));
  return next;
}

export async function getWatchProgress(dramaId?: string) {
  const localItems = readList<WatchProgressItem>(progressKey)
    .filter((item) => !dramaId || item.dramaId === dramaId);
  try {
    const query = new URLSearchParams({ anonymousId: getAnalyticsAnonymousId() });
    if (dramaId) query.set('dramaId', dramaId);
    const response = await requestJson<{ items: WatchProgressItem[] }>(`/api/me/watch-progress?${query}`);
    return response.items.length ? response.items : sortByUpdatedAt(localItems);
  } catch {
    return sortByUpdatedAt(localItems);
  }
}

export async function saveWatchProgress(payload: SaveProgressPayload) {
  const local = upsertProgressLocal(payload);
  try {
    await requestJson('/api/me/watch-progress', {
      method: 'POST',
      body: JSON.stringify({
        anonymousId: getAnalyticsAnonymousId(),
        dramaId: payload.drama.id,
        episode: payload.episode,
        progress: local.progress,
        currentTime: local.currentTime,
        duration: local.duration,
        source: payload.source,
      }),
    });
  } catch {
    // Local fallback already holds the latest state.
  }
  return local;
}

export async function getHistory() {
  const localItems = readList<WatchHistoryItem>(historyKey);
  try {
    const query = new URLSearchParams({ anonymousId: getAnalyticsAnonymousId() });
    const response = await requestJson<{ items: WatchHistoryItem[] }>(`/api/me/history?${query}`);
    return response.items.length ? response.items : sortByUpdatedAt(localItems);
  } catch {
    return sortByUpdatedAt(localItems);
  }
}

export async function clearHistory() {
  writeList(historyKey, []);
  try {
    const query = new URLSearchParams({ anonymousId: getAnalyticsAnonymousId() });
    await requestJson(`/api/me/history?${query}`, { method: 'DELETE' });
  } catch {
    // Local clear is enough for anonymous fallback.
  }
}

export async function getFavorites() {
  const localItems = readList<FavoriteItem>(favoritesKey);
  try {
    const query = new URLSearchParams({ anonymousId: getAnalyticsAnonymousId() });
    const response = await requestJson<{ items: FavoriteItem[] }>(`/api/me/favorites?${query}`);
    return response.items.length ? response.items : localItems;
  } catch {
    return localItems;
  }
}

export async function toggleFavorite(drama: Drama, collected: boolean) {
  const items = readList<FavoriteItem>(favoritesKey).filter((item) => item.dramaId !== drama.id);
  if (collected) items.unshift({ dramaId: drama.id, drama, createdAt: new Date().toISOString() });
  writeList(favoritesKey, items.slice(0, 100));
  try {
    if (collected) {
      await requestJson('/api/me/favorites', {
        method: 'POST',
        body: JSON.stringify({ anonymousId: getAnalyticsAnonymousId(), dramaId: drama.id }),
      });
    } else {
      const query = new URLSearchParams({ anonymousId: getAnalyticsAnonymousId() });
      await requestJson(`/api/me/favorites/${encodeURIComponent(drama.id)}?${query}`, { method: 'DELETE' });
    }
  } catch {
    // The optimistic local state remains the source of truth for anonymous mode.
  }
  return collected;
}

export async function getEntitlements(): Promise<EntitlementsResponse> {
  try {
    return await requestJson<EntitlementsResponse>('/api/me/entitlements');
  } catch {
    return { items: [], hasActiveEntitlement: false };
  }
}
