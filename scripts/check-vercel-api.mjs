import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readEnvFile(relativePath) {
  const envPath = path.join(rootDir, relativePath);
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .replace(/\u0000/g, '')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
}

function mergeDefinedEnv(...sources) {
  const output = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') output[key] = value;
    }
  }
  return output;
}

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    if (item.startsWith('--api-base-url=')) args.apiBaseUrl = item.slice('--api-base-url='.length);
    else if (item.startsWith('--base-url=')) args.apiBaseUrl = item.slice('--base-url='.length);
    else if (!item.startsWith('-') && !args.apiBaseUrl) args.apiBaseUrl = item;
  }
  return args;
}

function configured(name, ok) {
  console.log(`[chengying-vercel-api] ${name}: ${ok ? 'configured' : 'missing'}`);
  return ok;
}

const env = mergeDefinedEnv(
  readEnvFile('.env'),
  readEnvFile('.env.local'),
  readEnvFile('apps/api/.env'),
  process.env,
);
const args = parseArgs(process.argv.slice(2));
const apiBaseUrl = String(args.apiBaseUrl || env.API_BASE_URL || env.VERCEL_API_BASE_URL || env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

if (!apiBaseUrl) {
  console.log('[chengying-vercel-api] API_BASE_URL missing.');
  console.log('[chengying-vercel-api] Usage:');
  console.log('  npm run check:vercel-api -- https://你的API域名');
  console.log('  npm run check:vercel-api -- --api-base-url=https://你的API域名');
  console.log('  API_BASE_URL=https://你的API域名 npm run check:vercel-api');
} else {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, { headers: { Accept: 'application/json' } });
    const body = await response.json().catch(() => null);
    const hasJson = Boolean(body && typeof body === 'object');
    console.log(`[chengying-vercel-api] GET ${apiBaseUrl}/api/health: ${hasJson ? `reachable_http_${response.status}` : `non_json_http_${response.status}`}`);
  } catch {
    console.log(`[chengying-vercel-api] GET ${apiBaseUrl}/api/health: unreachable`);
  }
}

configured('DATABASE_URL', Boolean(env.DATABASE_URL));
configured('JWT_SECRET', Boolean(env.JWT_SECRET));
configured('CORS_ORIGINS', Boolean(env.CORS_ORIGINS));

console.log('[chengying-vercel-api] Secret values are intentionally not printed.');
