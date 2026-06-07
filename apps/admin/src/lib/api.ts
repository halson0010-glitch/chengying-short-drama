import type { Drama, DramaEpisode } from '@chengying/shared';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const TOKEN_KEY = 'chengying_admin_token';

export type AnalyticsOverview = {
  totalEvents: number;
  uniqueVisitors: number;
  pageViews: number;
  searches: number;
  dramaClicks: number;
  playStarts: number;
  playCompletes: number;
};

export type DashboardRange = 'today' | 'yesterday' | '7d' | '30d';
export type DashboardExportType =
  | 'raw_events'
  | 'overview'
  | 'trends'
  | 'funnel'
  | 'top_dramas'
  | 'search_keywords'
  | 'filter_preferences';

export type DashboardMetric = {
  value: number;
  previous: number;
  changePercent: number | null;
};

export type DashboardOverview = {
  range: DashboardRange;
  metrics: {
    pageViews: DashboardMetric;
    uniqueVisitors: DashboardMetric;
    playButtonClicks: DashboardMetric;
    playStarts: DashboardMetric;
    playCompletes: DashboardMetric;
    searchSubmits: DashboardMetric;
    searchNoResults: DashboardMetric;
    downloadPopoverOpens: DashboardMetric;
    rankingViews: DashboardMetric;
    bottomNavClicks: DashboardMetric;
    continueWatchClicks: DashboardMetric;
    favoriteAdds: DashboardMetric;
    lockedEpisodeClicks: DashboardMetric;
    paywallViews: DashboardMetric;
    paywallCtaClicks: DashboardMetric;
    shareClicks: DashboardMetric;
    watchProgressCheckpoints: DashboardMetric;
    libraryViews: DashboardMetric;
  };
};

export type DashboardTrendItem = {
  date: string;
  page_view: number;
  play_start: number;
  search_submit: number;
};

export type DashboardFunnelStep = {
  key: string;
  label: string;
  value: number;
  stepRate: number;
  totalRate: number;
};

export type DashboardTopDrama = {
  dramaId?: string;
  dramaTitle: string;
  cardClicks: number;
  playButtonClicks: number;
  playStarts: number;
  playCompletes: number;
  completionRate: number;
};

export type DashboardSearchKeyword = {
  keyword: string;
  count: number;
  avgResultCount: number;
  noResultCount: number;
  noResultRate: number;
};

export type DashboardFilterPreference = {
  filterKey: string;
  filterValue: string;
  count: number;
};

export type DashboardRecentEvent = {
  id: string;
  event: string;
  path: string;
  device: string;
  payload: Record<string, unknown>;
  createdAt: string;
  createdAtUtc?: string;
};

export type AdminPayment = {
  id: string;
  userId?: string;
  userEmail?: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  failedAt?: string;
  canceledAt?: string;
  providerSessionId?: string;
  providerPaymentId?: string;
  providerPaymentStatus?: string;
  providerCustomerEmail?: string;
  providerCustomerId?: string;
  failureCode?: string;
  failureMessage?: string;
  checkoutUrl?: string;
  rawWebhookEventId?: string;
  rawWebhookType?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentEvent = {
  id: string;
  provider: string;
  eventType: string;
  eventId?: string;
  status?: string;
  payloadJson?: string;
  createdAt: string;
};

export type DemoAssetItem = {
  id: string;
  title: string;
  poster?: string;
  hero?: string;
  posterIsExtra: boolean;
  hasPoster: boolean;
  hasHero: boolean;
  missing: string[];
};

export type DemoAssetsStatus = {
  generatedAt?: string;
  summary: Record<string, unknown>;
  fallbackOnly: boolean;
  heroFiles: number;
  posterFiles: number;
  manifestExists: boolean;
  items: DemoAssetItem[];
  missingItems: DemoAssetItem[];
  failures: Array<{ id: string; kind: string; message: string }>;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new Error('登录已过期，请重新登录');
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function getFilenameFromDisposition(value: string | null) {
  if (!value) return '';
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const quotedMatch = value.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = value.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() ?? '';
}

async function downloadFile(path: string, fallbackFilename: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (response.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new Error('登录已过期，请重新登录');
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message || `下载失败：${response.status}`);
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(response.headers.get('Content-Disposition')) || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildQuery(params: Record<string, string | number | undefined>) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)]),
    ),
  );
}

export const api = {
  baseUrl: API_BASE,
  login: (username: string, password: string) =>
    request<{ token: string; user: { username: string; role: string } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  dramas: () => request<Drama[]>('/api/admin/dramas'),
  drama: (id: string) => request<Drama>(`/api/dramas/${id}`),
  createDrama: (payload: Partial<Drama>) =>
    request<Drama>('/api/admin/dramas', { method: 'POST', body: JSON.stringify(payload) }),
  updateDrama: (id: string, payload: Partial<Drama>) =>
    request<Drama>(`/api/admin/dramas/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDrama: (id: string) => request<{ ok: boolean }>(`/api/admin/dramas/${id}`, { method: 'DELETE' }),
  publishDrama: (id: string) => request<Drama>(`/api/admin/dramas/${id}/publish`, { method: 'POST' }),
  offlineDrama: (id: string) => request<Drama>(`/api/admin/dramas/${id}/offline`, { method: 'POST' }),
  episodes: (dramaId: string) => request<DramaEpisode[]>(`/api/admin/dramas/${dramaId}/episodes`),
  createEpisode: (dramaId: string, payload: Partial<DramaEpisode>) =>
    request<DramaEpisode>(`/api/admin/dramas/${dramaId}/episodes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateEpisode: (episodeId: string, payload: Partial<DramaEpisode>) =>
    request<DramaEpisode>(`/api/admin/episodes/${episodeId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEpisode: (episodeId: string) => request<{ ok: boolean }>(`/api/admin/episodes/${episodeId}`, { method: 'DELETE' }),
  upload: (kind: 'poster' | 'hero' | 'cover' | 'video', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string; filename: string; provider: string }>(`/api/admin/upload/${kind}`, {
      method: 'POST',
      body: formData,
    });
  },
  generateDramaVisuals: (payload: {
    dramaId: string;
    kind: 'poster' | 'hero' | 'both';
    prompt?: string;
    posterPrompt?: string;
    heroPrompt?: string;
  }) =>
    request<{
      assets: Array<{ kind: 'poster' | 'hero'; url: string; filename: string; prompt: string }>;
      drama?: Drama;
    }>('/api/admin/ai/generate-drama-visuals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  analyticsOverview: () => request<AnalyticsOverview>('/api/admin/analytics/overview'),
  analyticsEvents: () => request<Array<Record<string, unknown>>>('/api/admin/analytics/events'),
  searchKeywords: () => request<Array<{ keyword: string; count: number }>>('/api/admin/analytics/search-keywords'),
  dramaClicks: () =>
    request<Array<{ dramaId?: string; dramaTitle: string; count: number }>>('/api/admin/analytics/drama-clicks'),
  playFunnel: () =>
    request<{ buttonClicks: number; starts: number; pauses: number; completes: number; startRate: number; completeRate: number }>(
      '/api/admin/analytics/play-funnel',
    ),
  dashboardOverview: (range: DashboardRange) =>
    request<DashboardOverview>(`/api/admin/dashboard/overview?${buildQuery({ range })}`),
  dashboardTrends: (range: DashboardRange) =>
    request<{ range: DashboardRange; items: DashboardTrendItem[] }>(`/api/admin/dashboard/trends?${buildQuery({ range })}`),
  dashboardFunnel: (range: DashboardRange) =>
    request<{ range: DashboardRange; steps: DashboardFunnelStep[] }>(`/api/admin/dashboard/funnel?${buildQuery({ range })}`),
  dashboardTopDramas: (range: DashboardRange) =>
    request<{ range: DashboardRange; items: DashboardTopDrama[] }>(
      `/api/admin/dashboard/top-dramas?${buildQuery({ range })}`,
    ),
  dashboardSearchKeywords: (range: DashboardRange) =>
    request<{ range: DashboardRange; items: DashboardSearchKeyword[] }>(
      `/api/admin/dashboard/search-keywords?${buildQuery({ range })}`,
    ),
  dashboardFilterPreferences: (range: DashboardRange) =>
    request<{ range: DashboardRange; items: DashboardFilterPreference[] }>(
      `/api/admin/dashboard/filter-preferences?${buildQuery({ range })}`,
    ),
  dashboardRecentEvents: (range: DashboardRange, limit = 50, offset = 0) =>
    request<{ range: DashboardRange; items: DashboardRecentEvent[]; total: number; limit: number; offset: number }>(
      `/api/admin/dashboard/recent-events?${buildQuery({ range, limit, offset })}`,
    ),
  downloadDashboardCsv: (type: DashboardExportType, range: DashboardRange) =>
    downloadFile(`/api/admin/dashboard/export.csv?${buildQuery({ type, range })}`, `chengying-${type}-${range}.csv`),
  demoAssets: () => request<DemoAssetsStatus>('/api/admin/demo-assets'),
  payments: (params: { status?: string; provider?: string; email?: string; limit?: number; offset?: number } = {}) =>
    request<{ items: AdminPayment[]; total: number; limit: number; offset: number }>(`/api/admin/payments?${buildQuery(params)}`),
  payment: (id: string) => request<AdminPayment>(`/api/admin/payments/${id}`),
  paymentEvents: (id: string) => request<{ items: AdminPaymentEvent[] }>(`/api/admin/payments/${id}/events`),
};
