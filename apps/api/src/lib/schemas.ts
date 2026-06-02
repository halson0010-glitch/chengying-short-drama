import { z } from 'zod';

const stringListSchema = z.union([z.array(z.string()), z.string()]).optional();
const optionalTextSchema = (max: number, fallback = '') =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value ?? fallback);

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export const dramaCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: optionalTextSchema(180),
  description: z.string().trim().min(1).max(3000),
  totalEpisodes: z.coerce.number().int().positive().max(10_000).optional().default(1),
  category: z.string().trim().min(1).max(80),
  background: z.string().trim().min(1).max(80),
  theme: z.string().trim().min(1).max(80),
  audience: z.string().trim().min(1).max(20).default('女频'),
  tags: stringListSchema.default([]),
  setting: stringListSchema.default([]),
  cast: z.unknown().optional().default([]),
  posterUrl: optionalTextSchema(1000),
  coverUrl: optionalTextSchema(1000),
  featured: z.boolean().optional().default(false),
  featuredOrder: z.coerce.number().int().min(1).max(100).nullish(),
  visualTone: optionalTextSchema(300),
  aiPosterPrompt: optionalTextSchema(2000),
  aiHeroPrompt: optionalTextSchema(2000),
  heat: optionalTextSchema(40, '0万'),
  status: z.enum(['draft', 'published', 'offline']).optional().default('published'),
});

export const dramaUpdateSchema = dramaCreateSchema.partial();

export const episodeCreateSchema = z.object({
  episode: z.coerce.number().int().positive().max(10_000),
  title: optionalTextSchema(180),
  videoUrl: optionalTextSchema(2000),
  hlsUrl: optionalTextSchema(2000),
  duration: z.coerce.number().int().positive().max(86_400).nullish(),
  isFree: z
    .boolean()
    .nullish()
    .transform((value) => value ?? true),
});

export const episodeUpdateSchema = episodeCreateSchema.partial();

export const analyticsCollectSchema = z.object({
  events: z
    .array(
      z
        .object({
          event: z.string().trim().min(1).max(80),
          timestamp: z.number().optional(),
          anonymousId: z.string().trim().max(120).optional(),
          sessionId: z.string().trim().max(120).optional(),
          path: z.string().trim().max(300).optional(),
          referrer: z.string().trim().max(300).optional(),
          device: z.string().trim().max(40).optional(),
          payload: z.record(z.string(), z.unknown()).optional(),
        })
        .passthrough(),
    )
    .max(100)
    .default([]),
});

export const aiGenerateDramaVisualsSchema = z.object({
  dramaId: z.string().trim().min(1).max(120),
  kind: z.enum(['poster', 'hero', 'both']).default('both'),
  prompt: z.string().trim().max(3000).optional(),
  posterPrompt: z.string().trim().max(3000).optional(),
  heroPrompt: z.string().trim().max(3000).optional(),
});
