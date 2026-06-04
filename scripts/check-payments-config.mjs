import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readEnvFile() {
  const envPath = path.join(rootDir, 'apps', 'api', '.env');
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
}

function getValue(env, key) {
  return process.env[key] || env[key] || '';
}

function status(label, value) {
  console.log(`[chengying] ${label}: ${value ? 'configured' : 'missing'}`);
}

const env = readEnvFile();
status('STRIPE_SECRET_KEY', getValue(env, 'STRIPE_SECRET_KEY'));
status('STRIPE_WEBHOOK_SECRET', getValue(env, 'STRIPE_WEBHOOK_SECRET'));

const paymentsRoute = path.join(rootDir, 'apps', 'api', 'src', 'routes', 'payments.ts');
const routeExists = existsSync(paymentsRoute);
console.log(`[chengying] payments route: ${routeExists ? 'found' : 'missing'}`);

if (!getValue(env, 'STRIPE_SECRET_KEY')) {
  console.log('[chengying] Stripe checkout will return a clear not_configured response until STRIPE_SECRET_KEY is set.');
}
