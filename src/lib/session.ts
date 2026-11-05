import { useSyncExternalStore } from 'react';
import { api, hasTokens, onAuthLost, setTokens } from './api';
import type { User, Wallet } from './types';

interface State { user: User | null; wallet: Wallet | null; ready: boolean }
let state: State = { user: null, wallet: null, ready: !hasTokens() };
const subs = new Set<() => void>();
const set = (s: Partial<State>) => { state = { ...state, ...s }; subs.forEach((f) => f()); };

export const useSession = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state);
export const setWallet = (wallet: Wallet) => set({ wallet });

export async function initSession() {
  if (!hasTokens()) return set({ ready: true });
  try {
    const me = await api<User & { wallet: Wallet }>('/me');
    const { wallet, ...user } = me;
    set({ user, wallet, ready: true });
  } catch { set({ user: null, wallet: null, ready: true }); }
}
onAuthLost(() => set({ user: null, wallet: null }));

export async function refreshWallet() {
  if (!state.user) return;
  try { set({ wallet: await api<Wallet>('/wallet') }); } catch { /* ignore */ }
}

interface AuthResponse { user: User; accessToken: string; refreshToken: string }
async function finish(r: AuthResponse) {
  setTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
  set({ user: r.user, ready: true });
  await refreshWallet();
}
export async function login(identifier: string, password: string) {
  await finish(await api<AuthResponse>('/auth/login', { body: { identifier, password }, auth: false }));
}
export async function register(body: Record<string, unknown>) {
  await finish(await api<AuthResponse>('/auth/register', { body, auth: false }));
}
export async function logout() {
  try { await api('/auth/logout', { body: {} }); } catch { /* already out */ }
  setTokens(null);
  set({ user: null, wallet: null });
}

export const formatMoney = (n: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(n);
export const initials = (u: User | null) => (u ? `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase() : '?');
