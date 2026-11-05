import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { navigate } from '../router';
import { useSession } from '../lib/session';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  if (!ready) return <p className="py-16 text-center text-sm text-neutral-500">Loading…</p>;
  if (!user) {
    return (
      <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/5 bg-neutral-900/60 p-8 text-center">
        <LockKeyhole className="mx-auto mb-3 h-8 w-8 text-green-400" />
        <h2 className="text-lg font-bold text-white">Sign in to continue</h2>
        <p className="mt-1 text-sm text-neutral-400">You need an account to use this page.</p>
        <button onClick={() => navigate('/account')} className="mt-5 w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400">Sign in</button>
        <button onClick={() => navigate('/register')} className="mt-2 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5">Create account</button>
      </div>
    );
  }
  return <>{children}</>;
}

export const ErrorNote = ({ msg }: { msg: string | null }) =>
  msg ? <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{msg}</p> : null;
