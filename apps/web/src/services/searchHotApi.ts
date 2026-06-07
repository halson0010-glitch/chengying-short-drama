import { hotSearches } from '../lib/search';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export type HotSearchKeyword = {
  keyword: string;
  count?: number;
};

export async function getHotSearchKeywords() {
  if (!apiBaseUrl) return hotSearches.map((keyword) => ({ keyword }));
  try {
    const response = await fetch(`${apiBaseUrl}/api/search/hot`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Hot search API failed: ${response.status}`);
    const data = await response.json() as { items?: HotSearchKeyword[] };
    return data.items?.length ? data.items : hotSearches.map((keyword) => ({ keyword }));
  } catch {
    return hotSearches.map((keyword) => ({ keyword }));
  }
}
