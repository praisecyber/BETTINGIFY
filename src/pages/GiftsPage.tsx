import { useState } from 'react';
import { PageHeader } from '../Layout';
import { Gift as GiftIcon, RotateCcw, Flame, Users, Crown, Check, Clock } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { refreshWallet, formatMoney } from '../lib/session';
import { ErrorNote, RequireAuth } from '../components/RequireAuth';
import type { Gift } from '../lib/types';

const iconMap: Record<string, typeof GiftIcon> = { gift: GiftIcon, rotate: RotateCcw, flame: Flame, users: Users, crown: Crown };

export function GiftsPage() { return <RequireAuth><Gifts /></RequireAuth>; }

function Gifts() {
  const { data, error, loading, reload } = useAsync(() => api<{ gifts: Gift[] }>('/gifts'));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const items = data?.gifts ?? [];
  const streak = items.find((g) => g.id === 'streak');

  const claim = async (id: string) => {
    setMsg(null);
    try {
      const r = await api<{ bonusAdded: number }>(`/gifts/${id}/claim`, { body: {} });
      setMsg({ ok: true, text: `${formatMoney(r.bonusAdded)} added to your bonus balance` });
      void refreshWallet();
    } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
    void reload();
  };

  return (
    <div>
      <PageHeader title="Gifts & Rewards" subtitle="Claim your bonuses and track your rewards" />
      {streak && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-600/15 to-green-600/15 p-6">
          <div className="mb-3 flex items-center gap-2"><Flame className="h-5 w-5 text-green-400" /><h2 className="text-lg font-bold text-white">Deposit Streak</h2></div>
          <p className="mb-4 text-sm text-neutral-400">Deposit 3 days in a row to unlock a {streak.reward}.</p>
          <div className="flex gap-2">
            {[1, 2, 3].map((d) => {
              const done = streak.claimable || streak.progress >= (d / 3) * 100 - 1;
              return <div key={d} className={`flex-1 rounded-lg p-2 text-center ${done ? 'border border-green-500/30 bg-green-500/20' : 'border border-white/5 bg-white/5'}`}><p className="mb-1 text-[10px] text-neutral-500">Day {d}</p>{done ? <Check className="mx-auto h-4 w-4 text-green-400" /> : <GiftIcon className="mx-auto h-4 w-4 text-neutral-400" />}</div>;
            })}
          </div>
        </div>
      )}
      <div className="mb-3 space-y-2"><ErrorNote msg={error} />{msg && (msg.ok ? <p className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">{msg.text}</p> : <ErrorNote msg={msg.text} />)}</div>
      {loading && <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((g) => {
          const Icon = iconMap[g.icon] || GiftIcon;
          const info = g.id === 'vip';
          return (
            <div key={g.id} className={`rounded-2xl border p-5 transition-colors ${g.claimed ? 'border-white/5 bg-neutral-900/30 opacity-60' : 'border-white/5 bg-neutral-900/50 hover:border-white/10'}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/20"><Icon className="h-6 w-6 text-green-400" /></div>
                <div className="flex-1"><h3 className="text-sm font-bold text-white">{g.title}</h3><p className="mt-0.5 text-xs text-neutral-400">{g.desc}</p><p className="mt-2 text-sm font-bold text-green-400">{g.reward}</p></div>
              </div>
              {!g.claimable && !g.claimed && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between"><span className="text-[10px] text-neutral-500">Progress</span><span className="text-[10px] text-neutral-400">{g.progress}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-green-500" style={{ width: `${g.progress}%` }} /></div>
                </div>
              )}
              {!info && (
                <button onClick={() => g.claimable && claim(g.id)} disabled={!g.claimable} className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${g.claimable ? 'bg-green-500 text-black hover:bg-green-400' : 'cursor-not-allowed bg-neutral-800 text-neutral-500'}`}>
                  {g.claimable ? 'Claim Now' : g.claimed ? <span className="flex items-center justify-center gap-1.5"><Check className="h-4 w-4" /> Claimed</span> : <span className="flex items-center justify-center gap-1.5"><Clock className="h-3.5 w-3.5" /> In Progress</span>}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
