export type UserProfile = {
  id: string;
  email: string;
  createdAt?: string;
};

export type AuthResponse = {
  token: string;
  user: UserProfile;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const tokenKey = 'chengying_user_token';
const userKey = 'chengying_user_profile';

export function isAuthApiConfigured() {
  return Boolean(apiBaseUrl);
}

export function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

export function getStoredUser() {
  const value = localStorage.getItem(userKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as UserProfile;
  } catch {
    return null;
  }
}

export function storeAuth(response: AuthResponse) {
  localStorage.setItem(tokenKey, response.token);
  localStorage.setItem(userKey, JSON.stringify(response.user));
}

export function clearStoredAuth() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { message?: string }) : ({} as T & { message?: string });
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

async function authRequest(path: string, body: { email: string; password: string }) {
  if (!apiBaseUrl) {
    const user = {
      id: `local-${body.email}`,
      email: body.email.toLowerCase(),
      createdAt: new Date().toISOString(),
    };
    return { token: `local-demo-token-${Date.now()}`, user };
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readJson<AuthResponse>(response);
}

export function registerWithEmail(email: string, password: string) {
  return authRequest('register', { email: email.trim(), password });
}

export function loginWithEmail(email: string, password: string) {
  return authRequest('login', { email: email.trim(), password });
}

export async function fetchCurrentUser(token: string) {
  if (!apiBaseUrl) return getStoredUser();
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readJson<{ user: UserProfile }>(response);
  return data.user;
}
