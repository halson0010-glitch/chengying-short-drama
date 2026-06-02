const absoluteUrlPattern = /^(https?:|data:|blob:)/i;

function normalizeBase(base: string) {
  if (!base || base === './') return '/';
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function toPublicPath(value?: string) {
  if (!value) return undefined;
  if (absoluteUrlPattern.test(value)) return value;

  const base = normalizeBase(import.meta.env.BASE_URL || '/');
  if (base === '/') return value.startsWith('/') ? value : `/${value}`;

  if (value.startsWith(base)) return value;
  if (value.startsWith('/')) return `${base.slice(0, -1)}${value}`;
  return `${base}${value}`;
}
