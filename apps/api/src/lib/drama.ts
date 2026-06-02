import type { Drama as DbDrama, Episode } from '@prisma/client';
import type { Drama, DramaCastMember, DramaEpisode } from '@chengying/shared';

const fallbackGradient = 'linear-gradient(145deg, #ff7043 0%, #a93255 48%, #151320 100%)';

export type DramaWithEpisodes = DbDrama & { episodes?: Episode[] };

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toJsonString(value: unknown, fallback: unknown[] = []) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return JSON.stringify(fallback);
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify(
        trimmed
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
  }
  return JSON.stringify(fallback);
}

export function normalizeCast(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '[]';
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify(
        trimmed
          .split('\n')
          .map((line) => {
            const [actor, role] = line.split(':').map((item) => item.trim());
            return actor ? { actor, role: role || '' } : null;
          })
          .filter(Boolean),
      );
    }
  }
  return '[]';
}

function daysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.max(1, Math.ceil(diff / 86_400_000));
}

export function serializeEpisode(episode: Episode): DramaEpisode {
  return {
    id: episode.id,
    episode: episode.episode,
    title: episode.title ?? undefined,
    videoUrl: episode.videoUrl ?? undefined,
    hlsUrl: episode.hlsUrl ?? undefined,
    duration: episode.duration ?? undefined,
    isFree: episode.isFree,
    createdAt: episode.createdAt.toISOString(),
    updatedAt: episode.updatedAt.toISOString(),
  };
}

export function serializeDrama(drama: DramaWithEpisodes): Drama {
  const episodes = [...(drama.episodes ?? [])].sort((first, second) => first.episode - second.episode);
  const maxEpisode = Math.max(0, ...episodes.map((episode) => episode.episode));
  const totalEpisodes = Math.max(drama.totalEpisodes, maxEpisode, 1);
  return {
    id: drama.id,
    title: drama.title,
    subtitle: drama.subtitle ?? undefined,
    totalEpisodes,
    category: drama.category,
    background: drama.background,
    theme: drama.theme,
    audience: drama.audience,
    tags: parseJson<string[]>(drama.tags, []),
    setting: parseJson<string[]>(drama.setting, []),
    cast: parseJson<DramaCastMember[]>(drama.cast, []),
    description: drama.description,
    posterUrl: drama.posterUrl ?? undefined,
    coverUrl: drama.coverUrl ?? undefined,
    featured: drama.featured,
    featuredOrder: drama.featuredOrder ?? undefined,
    visualTone: drama.visualTone ?? undefined,
    aiPosterPrompt: drama.aiPosterPrompt ?? undefined,
    aiHeroPrompt: drama.aiHeroPrompt ?? undefined,
    heat: drama.heat,
    status: drama.status as Drama['status'],
    gradient: fallbackGradient,
    updatedWithinDays: daysSince(drama.createdAt),
    sourceType: 'remote',
    episodes: episodes.map(serializeEpisode),
    createdAt: drama.createdAt.toISOString(),
    updatedAt: drama.updatedAt.toISOString(),
  };
}

export function matchesDrama(drama: Drama, keyword: string) {
  const normalized = keyword.trim().toLocaleLowerCase();
  if (!normalized) return true;
  const fields = [
    drama.title,
    drama.subtitle,
    drama.description,
    drama.category,
    drama.background,
    drama.theme,
    drama.audience,
    drama.visualTone,
    ...drama.tags,
    ...drama.setting,
    ...drama.cast.flatMap((member) => [member.actor, member.role]),
  ];
  return fields.some((field) => field?.toLocaleLowerCase().includes(normalized));
}

export function dramaInput(body: Record<string, unknown>, partial = false) {
  const data: Record<string, unknown> = {};
  const setString = (key: string, fallback = '') => {
    if (body[key] !== undefined || !partial) data[key] = String(body[key] ?? fallback);
  };
  const setNullableString = (key: string) => {
    if (body[key] !== undefined || !partial) {
      const value = String(body[key] ?? '').trim();
      data[key] = value || null;
    }
  };

  setString('title');
  setString('subtitle');
  setString('description');
  if (body.totalEpisodes !== undefined || !partial) data.totalEpisodes = Math.max(1, Number(body.totalEpisodes ?? 1) || 1);
  setString('category');
  setString('background');
  setString('theme');
  setString('audience', '女频');
  setNullableString('posterUrl');
  setNullableString('coverUrl');
  setNullableString('visualTone');
  setNullableString('aiPosterPrompt');
  setNullableString('aiHeroPrompt');
  setString('heat', '0万');
  setString('status', 'draft');
  if (body.featured !== undefined || !partial) data.featured = Boolean(body.featured);
  if (body.featuredOrder !== undefined || !partial) {
    const order = Number(body.featuredOrder);
    data.featuredOrder = Number.isInteger(order) && order > 0 ? order : null;
  }
  if (body.tags !== undefined || !partial) data.tags = toJsonString(body.tags);
  if (body.setting !== undefined || !partial) data.setting = toJsonString(body.setting);
  if (body.cast !== undefined || !partial) data.cast = normalizeCast(body.cast);
  return data;
}
