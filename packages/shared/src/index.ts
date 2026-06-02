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

export type DramaCastMember = {
  actor: string;
  role: string;
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
  audience: '男频' | '女频' | string;
  tags: string[];
  description: string;
  cast: DramaCastMember[];
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
  createdAt?: string;
  updatedAt?: string;
};

export type AnalyticsEventName =
  | 'page_view'
  | 'scroll_depth'
  | 'drama_card_click'
  | 'hero_switch'
  | 'hero_auto_switch'
  | 'hero_manual_switch'
  | 'section_reveal'
  | 'play_button_click'
  | 'play_start'
  | 'play_pause'
  | 'play_complete'
  | 'play_progress'
  | 'episode_click'
  | 'filter_change'
  | 'search_focus'
  | 'search_input'
  | 'search_submit'
  | 'search_suggestion_click'
  | 'search_result_click'
  | 'search_no_result'
  | 'favorite_toggle'
  | 'download_popover_open';

export type AnalyticsEvent = {
  event: AnalyticsEventName | string;
  timestamp?: number;
  anonymousId?: string;
  sessionId?: string;
  path?: string;
  referrer?: string;
  viewport?: {
    width: number;
    height: number;
  };
  device?: 'mobile' | 'tablet' | 'desktop' | string;
  payload?: Record<string, unknown>;
};
