const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return { response, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`[chengying] Checking auth flow at ${apiBaseUrl}`);

  const health = await request('/api/health').catch((error) => {
    throw new Error(`API is not reachable. Start it with npm run dev:api. ${error.message}`);
  });
  assert(health.response.ok && health.data.ok && health.data.db === 'connected', `Health check failed: ${JSON.stringify(health.data)}`);
  console.log('[chengying] /api/health OK');

  const email = `auth-check-${Date.now()}@example.com`;
  const password = 'Password123';

  const register = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert(register.response.status === 201 && register.data.token && register.data.user?.email === email, 'Register did not return token/user.');
  console.log('[chengying] register OK');

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert(duplicate.response.status === 409, `Duplicate register expected 409, got ${duplicate.response.status}`);
  console.log('[chengying] duplicate register 409 OK');

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert(login.response.ok && login.data.token, 'Login did not return token.');
  console.log('[chengying] login OK');

  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${login.data.token}` },
  });
  assert(me.response.ok && me.data.user?.email === email, '/api/auth/me did not return the current user.');
  console.log('[chengying] /api/auth/me OK');

  const wrongPassword = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'WrongPassword123' }),
  });
  assert(wrongPassword.response.status === 401, `Wrong password expected 401, got ${wrongPassword.response.status}`);
  console.log('[chengying] wrong password 401 OK');

  console.log('[chengying] Auth flow check passed.');
}

main().catch((error) => {
  console.error(`[chengying] Auth flow check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
