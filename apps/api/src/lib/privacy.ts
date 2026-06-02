const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?:\+?86[-\s]?)?1[3-9]\d{9}/g;
const idCardPattern = /\b\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g;

export function sanitizeSensitiveText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(emailPattern, '[redacted]')
    .replace(phonePattern, '[redacted]')
    .replace(idCardPattern, '[redacted]')
    .slice(0, 500);
}

export function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeSensitiveText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeJsonValue(item)]),
    );
  }
  return undefined;
}
