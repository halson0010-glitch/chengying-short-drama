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
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        output[key] = value;
      }
    }
  }
  return output;
}

const env = mergeDefinedEnv(
  readEnvFile('.env'),
  readEnvFile('apps/api/.env'),
  readEnvFile('apps/web/.env'),
  process.env,
);

const unsafeJwt = new Set(['', 'dev-only-change-me', 'change-me-in-production']);
const checks = [
  ['DATABASE_URL', env.DATABASE_URL ? 'configured' : 'missing'],
  ['JWT_SECRET', env.JWT_SECRET && !unsafeJwt.has(env.JWT_SECRET) ? 'configured' : 'unsafe'],
  ['CORS_ORIGINS', env.CORS_ORIGINS ? 'configured' : 'missing'],
  ['VITE_API_BASE_URL', env.VITE_API_BASE_URL ? 'configured' : 'missing'],
  ['STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY ? 'configured' : 'missing'],
  ['STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'missing'],
  ['ALIYUN_OSS_BUCKET', env.ALIYUN_OSS_BUCKET ? 'configured' : 'missing'],
  ['STORAGE_PROVIDER', env.STORAGE_PROVIDER || 'missing'],
  ['ADMIN_PASSWORD', env.ADMIN_PASSWORD && env.ADMIN_PASSWORD !== 'admin123' ? 'configured' : 'unsafe'],
  ['DEMO_AUTH_FALLBACK', env.VITE_API_BASE_URL ? 'disabled_by_api_base' : 'enabled_missing_api_base'],
];

let hasHardFailure = false;
for (const [key, status] of checks) {
  console.log(`[chengying] ${key}: ${status}`);
  if (key === 'JWT_SECRET' && status === 'unsafe') hasHardFailure = true;
}

if (hasHardFailure) {
  console.error('[chengying] Production readiness failed: JWT_SECRET is unsafe.');
  process.exitCode = 1;
} else {
  console.log('[chengying] Production readiness check finished.');
}
