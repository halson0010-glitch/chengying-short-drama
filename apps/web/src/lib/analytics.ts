import { sendGa4Event } from './ga4';

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
  | 'play_rate_change'
  | 'episode_click'
  | 'autoplay_next_episode'
  | 'filter_change'
  | 'search_focus'
  | 'search_input'
  | 'search_submit'
  | 'search_result_view'
  | 'search_suggestion_click'
  | 'search_result_click'
  | 'search_no_result'
  | 'home_hero_dwell'
  | 'favorite_toggle'
  | 'download_button_click'
  | 'download_popover_open'
  | 'payment_checkout_start'
  | 'payment_checkout_created'
  | 'payment_checkout_redirect'
  | 'payment_success_page_view'
  | 'payment_cancel_page_view'
  | 'payment_failed'
  | 'payment_not_configured'
  | 'bottom_nav_click'
  | 'home_module_view'
  | 'home_module_more_click'
  | 'recommendation_refresh_click'
  | 'continue_watch_module_view'
  | 'ranking_view'
  | 'ranking_tab_switch'
  | 'ranking_item_click'
  | 'library_page_view'
  | 'library_tab_switch'
  | 'continue_watch_click'
  | 'favorite_item_click'
  | 'history_item_click'
  | 'history_clear_click'
  | 'detail_continue_watch_click'
  | 'episode_group_switch'
  | 'episode_locked_click'
  | 'episode_panel_open'
  | 'episode_panel_close'
  | 'watch_progress_checkpoint'
  | 'watch_duration_update'
  | 'next_episode_click'
  | 'previous_episode_click'
  | 'locked_episode_view'
  | 'trial_end_popup_view'
  | 'paywall_popup_view'
  | 'paywall_cta_click'
  | 'login_required_popup_view'
  | 'search_hot_keyword_click'
  | 'search_recent_keyword_click'
  | 'search_suggest_view'
  | 'search_suggest_click'
  | 'account_module_click'
  | 'recharge_entry_click'
  | 'payment_history_view'
  | 'entitlement_view'
  | 'share_click'
  | 'share_success';

export type AnalyticsEvent = {
  event: AnalyticsEventName;
  timestamp: number;
  anonymousId: string;
  sessionId: string;
  path: string;
  referrer?: string;
  viewport: {
    width: number;
    height: number;
  };
  device: 'mobile' | 'tablet' | 'desktop';
  payload?: Record<string, unknown>;
};

const ANONYMOUS_ID_KEY = 'chengying_anonymous_id';
const SESSION_ID_KEY = 'chengying_session_id';
const ANALYTICS_QUEUE_KEY = 'chengying_analytics_queue';
const MAX_QUEUE_LENGTH = 100;
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false' && import.meta.env.VITE_ENABLE_ANALYTICS !== 'false';
let latestFingerprint = '';
let latestTimestamp = 0;

function createId(prefix: string) {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

function getOrCreateStorageId(storage: Storage, key: string, prefix: string) {
  const stored = storage.getItem(key);
  if (stored) return stored;
  const id = createId(prefix);
  storage.setItem(key, id);
  return id;
}

function getAnonymousId() {
  try {
    return getOrCreateStorageId(window.localStorage, ANONYMOUS_ID_KEY, 'anon');
  } catch {
    return createId('anon');
  }
}

export function getAnalyticsAnonymousId() {
  return getAnonymousId();
}

function getSessionId() {
  try {
    return getOrCreateStorageId(window.sessionStorage, SESSION_ID_KEY, 'session');
  } catch {
    return createId('session');
  }
}

function getDevice(): AnalyticsEvent['device'] {
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1200) return 'tablet';
  return 'desktop';
}

export function sanitizeSearchKeyword(keyword: string) {
  const compact = keyword.trim().replace(/\s+/g, ' ');
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const phonePattern = /(?:\+?86[-\s]?)?1[3-9]\d{9}/g;
  return compact.replace(emailPattern, '[redacted]').replace(phonePattern, '[redacted]').slice(0, 60);
}

function getSanitizedCurrentPath() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('q')) params.set('q', sanitizeSearchKeyword(params.get('q') ?? ''));
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ''}`;
}

function getReferrerOrigin() {
  if (!document.referrer) return undefined;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return undefined;
  }
}

function sanitizePayloadValue(key: string, value: unknown): unknown {
  if (typeof value === 'string' && /keyword|query/i.test(key)) {
    return sanitizeSearchKeyword(value);
  }
  if (key === 'search' && typeof value === 'string') {
    const params = new URLSearchParams(value);
    if (params.has('q')) params.set('q', sanitizeSearchKeyword(params.get('q') ?? ''));
    const sanitized = params.toString();
    return sanitized ? `?${sanitized}` : '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadValue(key, item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizePayloadValue(nestedKey, nestedValue),
      ]),
    );
  }
  return value;
}

function sanitizePayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, sanitizePayloadValue(key, value)]),
  );
}

function readQueue(): AnalyticsEvent[] {
  try {
    const queue = window.localStorage.getItem(ANALYTICS_QUEUE_KEY);
    return queue ? (JSON.parse(queue) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: AnalyticsEvent[]) {
  try {
    window.localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_LENGTH)));
  } catch {
    // Storage may be unavailable in private contexts; tracking remains non-blocking.
  }
}

function removeFlushedEvents(count: number) {
  writeQueue(readQueue().slice(count));
}

export async function flushAnalyticsQueue() {
  if (typeof window === 'undefined' || !analyticsEndpoint) return false;
  const events = readQueue();
  if (!events.length) return true;
  const body = JSON.stringify({ events });

  if (navigator.sendBeacon) {
    const accepted = navigator.sendBeacon(analyticsEndpoint, new Blob([body], { type: 'application/json' }));
    if (accepted) {
      removeFlushedEvents(events.length);
      return true;
    }
  }

  try {
    const response = await fetch(analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
    if (response.ok) {
      removeFlushedEvents(events.length);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function track(eventName: AnalyticsEventName, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const sanitizedPayload = sanitizePayload(payload);
  const timestamp = Date.now();
  const currentPath = getSanitizedCurrentPath();
  const fingerprint = `${eventName}|${currentPath}|${JSON.stringify(sanitizedPayload)}`;
  if (fingerprint === latestFingerprint && timestamp - latestTimestamp < 120) return;
  latestFingerprint = fingerprint;
  latestTimestamp = timestamp;

  const event: AnalyticsEvent = {
    event: eventName,
    timestamp,
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    path: currentPath,
    referrer: getReferrerOrigin(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    device: getDevice(),
    payload: sanitizedPayload,
  };

  sendGa4Event(eventName, sanitizedPayload, currentPath);
  if (!analyticsEnabled) return;

  writeQueue([...readQueue(), event]);

  if (!analyticsEndpoint) {
    if (import.meta.env.DEV) console.log('[chengying analytics]', eventName, JSON.stringify(event));
    return;
  }
  void flushAnalyticsQueue();
}
