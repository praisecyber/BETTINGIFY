import { useState } from 'react';
import { navigate } from '../router';
import { ArrowLeft, Check, ChevronRight, Clock, DollarSign, Receipt, X } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { setWallet, formatMoney } from '../lib/session';
import { ErrorNote, RequireAuth } from '../components/RequireAuth';
import type { ApiBet, Wallet } from '../lib/types';

export function OpenBetPage() { return <RequireAuth><OpenBets /></RequireAuth>; }

function OpenBets() {
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const { data, error, loading, reload } = useAsync(() => api<{ bets: ApiBet[] }>(`/bets?status=${tab}&limit=100`), [tab]);
  const bets = data?.bets ?? [];
  const [actionErr, setActionErr] = useState<string | null>(null);
  const openStake = tab === 'open' ? bets.reduce((s, b) => s + b.stake, 0) : 0;
  const openReturn = tab === 'open' ? bets.reduce((s, b) => s + b.potential, 0) : 0;

  const cashOut = async (b: ApiBet) => {
    setActionErr(null);
    try {
      const r = await api<{ wallet: Wallet }>(`/bets/${b.id}/cashout`, { body: { expectedValue: b.cashoutOffer }, idempotent: true });
      setWallet(r.wallet);
    } catch (e) { setActionErr(errMsg(e)); }
    void reload();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3"><button onClick={() => navigate('/')} className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs text-neutral-500">BETTINGIFY</p><h1 className="mt-1 text-2xl font-bold text-white">My bets</h1></div></div>
      {tab === 'open' && <div className="mb-5 grid grid-cols-3 gap-2"><Stat l="Open stakes" v={formatMoney(openStake)} /><Stat l="Potential return" v={formatMoney(openReturn)} c="text-green-400" /><Stat l="Active bets" v={String(bets.length)} c="text-green-300" /></div>}
      <div className="mb-4 flex gap-1 rounded-xl border border-white/5 bg-neutral-900/60 p-1">
        <button onClick={() => setTab('open')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === 'open' ? 'bg-green-500 text-black' : 'text-neutral-400'}`}>Open</button>
        <button onClick={() => setTab('settled')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === 'settled' ? 'bg-green-500 text-black' : 'text-neutral-400'}`}>Settled</button>
      </div>
      <div className="mb-3 space-y-2"><ErrorNote msg={error} /><ErrorNote msg={actionErr} /></div>
      {loading && <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>}
      <div className="space-y-3">{bets.map((b) => <BetCard key={b.id} bet={b} onCashOut={() => cashOut(b)} />)}</div>
      {!loading && !bets.length && <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-12 text-center"><Receipt className="mx-auto mb-3 h-8 w-8 text-neutral-600" /><p className="text-sm text-neutral-400">No bets in this section</p></div>}
    </div>
  );
}

const Stat = ({ l, v, c = 'text-white' }: { l: string; v: string; c?: string }) => <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-3"><p className="text-xs text-neutral-500">{l}</p><p className={`mt-1 text-lg font-bold ${c}`}>{v}</p></div>;

function BetCard({ bet, onCashOut }: { bet: ApiBet; onCashOut: () => void }) {
  const isOpen = bet.status === 'open';
  const map = {
    won: { label: 'Won', color: 'text-green-400', icon: Check }, lost: { label: 'Lost', color: 'text-rose-400', icon: X },
    open: { label: 'Open', color: 'text-green-300', icon: Clock }, cashed_out: { label: 'Cashed out', color: 'text-green-400', icon: DollarSign },
    void: { label: 'Refunded', color: 'text-neutral-400', icon: Clock },
  } as const;
  const status = map[bet.status];
  const ret = isOpen ? bet.potential : bet.payout;
  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><span className={`flex items-center gap-1 text-xs font-bold ${status.color}`}><status.icon className="h-3.5 w-3.5" /> {status.label}</span><span className="text-xs text-neutral-600">{new Date(bet.date).toLocaleDateString()}</span></div>
        <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{bet.kind === 'aviator' ? 'Aviator' : bet.legs && bet.legs.length > 1 ? 'Accumulator' : 'Single'}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10"><Receipt className="h-5 w-5 text-green-400" /></div>
        <div className="flex-1"><p className="text-sm font-bold text-white">{bet.match}</p><p className="mt-0.5 text-xs text-neutral-400">{bet.selection}</p></div>
        <ChevronRight className="h-4 w-4 text-neutral-600" />
      </div>
      {bet.legs && bet.legs.length > 1 && <div className="mt-3 space-y-1 rounded-lg bg-white/[0.03] p-3">
        {bet.legs.map((leg) => <div key={leg.matchId} className="flex justify-between gap-3 text-xs">
          <span className="truncate text-neutral-400">{leg.match} · {leg.selection}</span>
          <span className="shrink-0 text-neutral-500">{leg.odds.toFixed(2)} · {leg.status}</span>
        </div>)}
      </div>}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-xs">
        <div><p className="text-neutral-500">Odds</p><p className="mt-1 font-bold text-white">{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</p></div>
        <div><p className="text-neutral-500">Stake</p><p className="mt-1 font-bold text-white">{formatMoney(bet.stake)}</p></div>
        <div><p className="text-neutral-500">{isOpen ? 'To win' : 'Return'}</p><p className={`mt-1 font-bold ${bet.status === 'won' || bet.status === 'cashed_out' ? 'text-green-400' : bet.status === 'lost' ? 'text-rose-400' : 'text-white'}`}>{isOpen && bet.kind === 'aviator' ? '—' : formatMoney(ret)}</p></div>
      </div>
      {isOpen && bet.cashoutOffer !== null && <button onClick={onCashOut} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 py-2 text-xs font-bold text-green-400 hover:bg-green-500/20"><DollarSign className="h-3.5 w-3.5" /> Cash out {formatMoney(bet.cashoutOffer)}</button>}
    </div>
  );
}
