const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 10));
const durationMs = Math.max(1, Number(process.env.DURATION || 30)) * 1000;
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'api';

const samples = [];
let errors = 0;
let rateLimited = 0;
let requests = 0;
let stop = false;

async function timed(label, fn) {
  const start = performance.now();
  try {
    const response = await fn();
    const elapsed = performance.now() - start;
    requests += 1;
    samples.push(elapsed);
    if (response.status === 429) rateLimited += 1;
    else if (!response.ok && response.status !== 501) errors += 1;
    return response;
  } catch {
    const elapsed = performance.now() - start;
    requests += 1;
    errors += 1;
    samples.push(elapsed);
    return { ok: false, status: 0, label };
  }
}

function jsonRequest(path, body, headers = {}) {
  return fetch(`${apiBaseUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiScenario(workerId) {
  await timed('health', () => jsonRequest('/api/health'));
  await timed('dramas', () => jsonRequest('/api/dramas'));
  void workerId;
}

async function authScenario(workerId) {
  const email = `load-${Date.now()}-${workerId}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'Password123';
  const register = await timed('register', () => jsonRequest('/api/auth/register', { email, password }));
  let token = '';
  try {
    const data = await register.json();
    token = data.token || '';
  } catch {
    // ignore parse failures for load-test summaries
  }
  await timed('login', () => jsonRequest('/api/auth/login', { email, password }));
  if (token) await timed('me', () => jsonRequest('/api/auth/me', undefined, { Authorization: `Bearer ${token}` }));
}

async function worker(workerId) {
  while (!stop) {
    if (mode === 'auth') await authScenario(workerId);
    else await apiScenario(workerId);
  }
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function main() {
  console.log(`[chengying] Load test mode=${mode} base=${apiBaseUrl} concurrency=${concurrency} duration=${durationMs / 1000}s`);
  const startedAt = Date.now();
  setTimeout(() => {
    stop = true;
  }, durationMs);
  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
  const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
  const avg = samples.reduce((sum, item) => sum + item, 0) / Math.max(1, samples.length);
  const p95 = percentile(samples, 0.95);
  console.log(JSON.stringify(
    {
      mode,
      requests,
      errors,
      rateLimited,
      errorRate: Number(((errors / Math.max(1, requests)) * 100).toFixed(2)),
      qps: Number((requests / elapsedSeconds).toFixed(2)),
      avgMs: Number(avg.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
    },
    null,
    2,
  ));
}

main().catch((error) => {
  console.error(`[chengying] Load test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
