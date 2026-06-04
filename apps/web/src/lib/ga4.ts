type Ga4Parameter = string | number | boolean;

type Ga4Payload = Record<string, unknown> | undefined;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
const ga4Enabled = import.meta.env.VITE_GA4_ENABLED !== 'false';
const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_GA4_DEBUG === 'true';
let initialized = false;

const blockedParameterPattern =
  /anonymous|session|email|e_mail|phone|mobile|telephone|address|identity|idcard|id_card|身份证/i;
const blockedHighCardinalityPattern = /^(drama_id|drama_title)$/i;
const allowedParameterKeys = new Set([
  'module',
  'position',
  'source',
  'episode',
  'category',
  'theme',
  'background',
  'audience',
  'result_count',
  'search_term',
  'progress',
  'provider',
  'amount',
  'currency',
  'status',
  'reason',
  'page_path',
  'page_location',
  'debug_mode',
]);

function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();
}

function appendFlatParameters(
  params: Record<string, Ga4Parameter>,
  value: unknown,
  prefix: string,
) {
  const key = toSnakeCase(prefix);
  if (!key || blockedParameterPattern.test(key) || blockedHighCardinalityPattern.test(key)) return;
  if (!allowedParameterKeys.has(key)) return;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    params[key] = typeof value === 'string' ? value.slice(0, 100) : value;
    return;
  }

  if (Array.isArray(value)) {
    params[key] = value
      .filter((item): item is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof item))
      .join(',')
      .slice(0, 100);
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
      appendFlatParameters(params, nestedValue, `${key}_${nestedKey}`);
    });
  }
}

function flattenPayload(payload: Ga4Payload) {
  const params: Record<string, Ga4Parameter> = {};
  Object.entries(payload ?? {}).forEach(([key, value]) => {
    const ga4Key = key === 'keyword' || key === 'query' ? 'search_term' : key;
    appendFlatParameters(params, value, ga4Key);
  });
  return params;
}

export function initializeGa4() {
  if (!ga4Enabled || !measurementId || typeof window === 'undefined') return false;
  if (initialized) return true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag() {
    window.dataLayer?.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.chengyingGa4 = measurementId;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    ...(debugEnabled ? { debug_mode: true } : {}),
  });
  initialized = true;
  return true;
}

export function sendGa4Event(
  eventName: string,
  payload?: Record<string, unknown>,
  path?: string,
) {
  if (!initializeGa4() || !window.gtag) return;
  const params = flattenPayload(payload);

  if (eventName === 'page_view' && path) {
    params.page_path = path;
    params.page_location = `${window.location.origin}${path}`;
  }

  window.gtag('event', eventName, {
    ...params,
    ...(debugEnabled ? { debug_mode: true } : {}),
  });
}
