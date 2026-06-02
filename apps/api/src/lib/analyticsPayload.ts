import { sanitizeSensitiveText } from './privacy.js';

const sensitiveKeyPattern = /(password|passwd|token|jwt|secret|database|connection|authorization|cookie)/i;

export function safeParsePayload(payloadJson: string | null | undefined): Record<string, unknown> {
  if (!payloadJson) return {};
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function sanitizeDashboardPayload(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[truncated]';
  if (typeof value === 'string') return sanitizeSensitiveText(value).slice(0, 240);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => sanitizeDashboardPayload(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 24)
        .map(([key, item]) => [
          key.slice(0, 80),
          sensitiveKeyPattern.test(key) ? '[redacted]' : sanitizeDashboardPayload(item, depth + 1),
        ]),
    );
  }
  return undefined;
}

export function payloadText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return sanitizeSensitiveText(String(value)).trim().slice(0, 80);
    }
  }
  return '';
}

export function payloadNumber(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== '') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return 0;
}
