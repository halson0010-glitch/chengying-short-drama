export type DramaEpisode = {
  id?: string;
  episode: number;
  title?: string;
  videoUrl?: string;
  hlsUrl?: string;
  duration?: number;
  isFree?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Drama = {
  id: string;
  title: string;
  subtitle?: string;
  totalEpisodes: number;
  category: string;
  background: string;
  theme: string;
  setting: string[];
  audience: '男频' | '女频';
  tags: string[];
  description: string;
  cast: { actor: string; role: string }[];
  heat: string;
  updatedWithinDays: number;
  gradient: string;
  posterImage?: string;
  heroBackgroundImage?: string;
  visualTone?: string;
  featured?: boolean;
  featuredOrder?: number;
  aiPosterPrompt?: string;
  aiHeroPrompt?: string;
  posterUrl?: string;
  coverUrl?: string;
  episodes?: DramaEpisode[];
  status?: 'draft' | 'published' | 'offline';
  sourceType?: 'mock' | 'remote';
};

export type FilterState = {
  background: string;
  theme: string;
  setting: string;
  audience: string;
  time: string;
  recommendation: string;
};
