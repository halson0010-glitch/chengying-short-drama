import { mockDramas } from '../data/mockDramas';
import { getDramas, heatToNumber } from './dramaApi';
import type { Drama } from '../types/drama';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export type RankingType = 'hot' | 'rising' | 'new' | 'completion' | 'favorite';

export type RankingItem = {
  rank: number;
  score: number;
  drama: Drama;
};

function fallbackRankings(type: RankingType, dramas: Drama[]) {
  const sorted = [...dramas].sort((first, second) => {
    if (type === 'new') return first.updatedWithinDays - second.updatedWithinDays;
    if (type === 'rising') return first.updatedWithinDays - second.updatedWithinDays || heatToNumber(second.heat) - heatToNumber(first.heat);
    return heatToNumber(second.heat) - heatToNumber(first.heat);
  });
  return sorted.slice(0, 30).map((drama, index) => ({ rank: index + 1, score: heatToNumber(drama.heat), drama }));
}

export async function getRankings(type: RankingType) {
  if (!apiBaseUrl) return fallbackRankings(type, await getDramas());
  try {
    const response = await fetch(`${apiBaseUrl}/api/rankings?type=${encodeURIComponent(type)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Ranking API failed: ${response.status}`);
    const data = await response.json() as { items?: RankingItem[] };
    if (data.items?.length) return data.items;
  } catch {
    // Fall back below.
  }
  return fallbackRankings(type, await getDramas().catch(() => mockDramas));
}
