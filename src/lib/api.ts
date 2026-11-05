const MOBILE_API_KEY = 'bettingify.mobileApiUrl';
const MOBILE_WS_KEY = 'bettingify.mobileWsUrl';
const STORE_KEY = 'bettingify.tokens';

export function getApiBase() {
  return window.bettingifyConfig?.apiUrl
    ?? localStorage.getItem(MOBILE_API_KEY)
    ?? import.meta.env.VITE_API_URL
    ?? '/api/v1';
}

export function hasMobileApiConfig() {
  return !!(window.bettingifyConfig?.apiUrl || localStorage.getItem(MOBILE_API_KEY) || import.meta.env.VITE_API_URL);
}

export function saveMobileApiConfig(apiUrl: string, wsUrl: string) {
  localStorage.setItem(MOBILE_API_KEY, apiUrl);
  localStorage.setItem(MOBILE_WS_KEY, wsUrl);
}

export function getAviatorWsUrl() {
  const configured = window.bettingifyConfig?.wsUrl
    ?? localStorage.getItem(MOBILE_WS_KEY)
    ?? import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  const base = getApiBase();
  if (base.startsWith('/')) return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/aviator`;
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')}/ws/aviator`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function assetUrl(path: string) {
  if (/^https:\/\//i.test(path)) return path;
  const base = getApiBase().replace(/\/+$/, '');
  return new URL(`${base}/${path.replace(/^\/+/, '')}`, window.location.origin).toString();
}

export interface Tokens { accessToken: string }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

let tokens: Tokens | null = null;
let legacyRefreshToken: string | null = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as { refreshToken?: unknown } | null;
    localStorage.removeItem(STORE_KEY);
    return typeof saved?.refreshToken === 'string' ? saved.refreshToken : null;
  } catch {
    return null;
  }
})();
const listeners = new Set<() => void>();
export const onAuthLost = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function setTokens(t: Tokens | null) {
  tokens = t;
  try { localStorage.removeItem(STORE_KEY); } catch { /* storage unavailable */ }
}
export const hasTokens = () => !!tokens;

let refreshing: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  if (!refreshing) {
    const oldToken = legacyRefreshToken;
    legacyRefreshToken = null;
    refreshing = fetch(`${getApiBase()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(oldToken ? { refreshToken: oldToken } : {}),
    }).then(async (r) => {
      if (!r.ok) { setTokens(null); listeners.forEach((l) => l()); return false; }
      const j = await r.json();
      if (typeof j.accessToken !== 'string') throw new Error('Refresh response did not contain an access token');
      setTokens({ accessToken: j.accessToken });
      return true;
    }).catch(() => false).finally(() => { refreshing = null; });
  }
  return refreshing;
}
export const refreshAccessToken = refresh;

/** Access token that is valid for at least 30 more seconds (refreshes if needed). */
export async function getValidAccessToken(): Promise<string | null> {
  if (!tokens) return null;
  try {
    const exp = JSON.parse(atob(tokens.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000;
    if (exp - Date.now() < 30_000 && !(await refresh())) return null;
  } catch { /* fall through */ }
  return tokens?.accessToken ?? null;
}

interface Opts { method?: string; body?: unknown; auth?: boolean; idempotent?: boolean }

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const key = opts.idempotent ? crypto.randomUUID() : undefined; // same key reused on the 401 retry
  const attempt = async (): Promise<Response> => fetch(getApiBase() + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    credentials: 'include',
    headers: {
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.auth !== false && tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let res: Response;
  try { res = await attempt(); } catch { throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection.'); }
  if (res.status === 401 && opts.auth !== false && (await refresh())) res = await attempt();
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? 'ERROR', json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  return json as T;
}

export const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong');
