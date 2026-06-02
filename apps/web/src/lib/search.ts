import { heatToNumber, mockDramas } from '../data/mockDramas';
import type { Drama } from '../types/drama';
import { sanitizeSearchKeyword } from './analytics';

export const RECENT_SEARCH_STORAGE_KEY = 'chengying_recent_searches';

export const hotSearches = ['甜宠', '先婚后爱', '女性成长', '逆袭', '悬疑', '重生', '古风', '都市'];

export function normalizeKeyword(keyword: string) {
  return sanitizeSearchKeyword(keyword).toLocaleLowerCase();
}

function includesKeyword(value: string | undefined, keyword: string) {
  return Boolean(value?.toLocaleLowerCase().includes(keyword));
}

function getSearchRank(drama: Drama, keyword: string) {
  if (includesKeyword(drama.title, keyword)) return { tier: 3, hits: 1 };
  const tagHits = drama.tags.filter((tag) => includesKeyword(tag, keyword)).length;
  if (tagHits) return { tier: 2, hits: tagHits };

  const fields = [
    drama.subtitle,
    drama.description,
    drama.category,
    drama.background,
    drama.theme,
    drama.audience,
    ...drama.setting,
    ...drama.cast.flatMap((cast) => [cast.actor, cast.role]),
  ];
  const hits = fields.filter((field) => includesKeyword(field, keyword)).length;
  return hits ? { tier: 1, hits } : null;
}

export function searchDramasInCollection(dramas: Drama[], keyword: string) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return [];

  return dramas
    .map((drama) => ({ drama, rank: getSearchRank(drama, normalized) }))
    .filter((match): match is { drama: Drama; rank: { tier: number; hits: number } } => match.rank !== null)
    .sort(
      (first, second) =>
        second.rank.tier - first.rank.tier ||
        second.rank.hits - first.rank.hits ||
        heatToNumber(second.drama.heat) - heatToNumber(first.drama.heat),
    )
    .map(({ drama }) => drama);
}

export function searchDramas(keyword: string) {
  return searchDramasInCollection(mockDramas, keyword);
}

export function getSearchSuggestions(keyword: string) {
  return searchDramas(keyword).slice(0, 6);
}

export function getRecentSearches() {
  try {
    const values = JSON.parse(window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(keyword: string) {
  const sanitized = sanitizeSearchKeyword(keyword);
  if (!sanitized) return getRecentSearches();
  const values = [sanitized, ...getRecentSearches().filter((value) => value !== sanitized)].slice(0, 8);
  try {
    window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(values));
  } catch {
    return values;
  }
  return values;
}

export function clearRecentSearches() {
  try {
    window.localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
  } catch {
    return;
  }
}
