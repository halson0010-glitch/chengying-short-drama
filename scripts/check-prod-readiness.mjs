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

function readPackageScripts() {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  return packageJson.scripts || {};
}

const env = mergeDefinedEnv(
  readEnvFile('.env'),
  readEnvFile('apps/api/.env'),
  readEnvFile('apps/web/.env'),
  readEnvFile('apps/admin/.env'),
  process.env,
);

const scripts = readPackageScripts();
const unsafeJwt = new Set(['', 'dev-only-change-me', 'change-me-in-production']);
const unsafeAdminPassword = new Set(['', 'admin123']);

const requiredScripts = [
  'build:web',
  'build:admin',
  'build:api',
  'db:generate',
  'db:push',
  'check:prod-readiness',
];

const envChecks = [
  ['DATABASE_URL', Boolean(env.DATABASE_URL)],
  ['JWT_SECRET', Boolean(env.JWT_SECRET) && !unsafeJwt.has(env.JWT_SECRET)],
  ['CORS_ORIGINS', Boolean(env.CORS_ORIGINS)],
  ['ADMIN_PASSWORD', Boolean(env.ADMIN_PASSWORD) && !unsafeAdminPassword.has(env.ADMIN_PASSWORD)],
  ['STRIPE_SECRET_KEY', Boolean(env.STRIPE_SECRET_KEY)],
  ['STRIPE_WEBHOOK_SECRET', Boolean(env.STRIPE_WEBHOOK_SECRET)],
  ['PAYPAL_CLIENT_ID', Boolean(env.PAYPAL_CLIENT_ID)],
  ['PAYPAL_CLIENT_SECRET', Boolean(env.PAYPAL_CLIENT_SECRET)],
  ['ALIYUN_OSS_BUCKET', Boolean(env.ALIYUN_OSS_BUCKET)],
  ['ALIYUN_ACCESS_KEY_SECRET', Boolean(env.ALIYUN_ACCESS_KEY_SECRET)],
  ['VITE_API_BASE_URL', Boolean(env.VITE_API_BASE_URL)],
];

let hasHardFailure = false;

for (const scriptName of requiredScripts) {
  const status = scripts[scriptName] ? 'configured' : 'missing';
  console.log(`[chengying] npm script ${scriptName}: ${status}`);
  if (!scripts[scriptName]) hasHardFailure = true;
}

for (const [key, ok] of envChecks) {
  const status = ok ? 'configured' : key === 'JWT_SECRET' || key === 'ADMIN_PASSWORD' ? 'unsafe_or_missing' : 'missing';
  console.log(`[chengying] ${key}: ${status}`);
  if (key === 'JWT_SECRET' && !ok) hasHardFailure = true;
}

if ((env.NODE_ENV || '') === 'production') {
  const missingProductionKeys = envChecks.filter(([, ok]) => !ok).map(([key]) => key);
  if (missingProductionKeys.length) {
    hasHardFailure = true;
    console.error(`[chengying] Production readiness failed. Missing or unsafe: ${missingProductionKeys.join(', ')}`);
  }
}

if (hasHardFailure) {
  process.exitCode = 1;
} else {
  console.log('[chengying] Production readiness check finished.');
}
