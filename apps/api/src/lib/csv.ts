import { sanitizeSensitiveText } from './privacy.js';

const csvInjectionPattern = /^[=+\-@]/;

export function preventCsvInjection(value: string) {
  return csvInjectionPattern.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: unknown) {
  if (value === undefined || value === null) return '';
  const normalized =
    typeof value === 'object' ? JSON.stringify(value) : typeof value === 'string' ? sanitizeSensitiveText(value) : String(value);
  const protectedValue = preventCsvInjection(normalized);
  return /[",\r\n]/.test(protectedValue) ? `"${protectedValue.replace(/"/g, '""')}"` : protectedValue;
}

export function createCsv<T extends Record<string, unknown>>(rows: T[], headers: Array<keyof T | string>) {
  const headerLine = headers.map((header) => escapeCsvCell(String(header))).join(',');
  const bodyLines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header as keyof T])).join(','));
  return [headerLine, ...bodyLines].join('\r\n');
}

export function addUtf8Bom(csv: string) {
  return `\uFEFF${csv}`;
}

function cleanFilenamePart(value: string | undefined) {
  return (value || '7d').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

export function makeCsvFilename(type: string, range: string, startDate?: string, endDate?: string) {
  const suffix = startDate && endDate && range.includes('_') ? `${cleanFilenamePart(startDate)}-${cleanFilenamePart(endDate)}` : cleanFilenamePart(range);
  return `chengying-${cleanFilenamePart(type)}-${suffix}.csv`;
}
