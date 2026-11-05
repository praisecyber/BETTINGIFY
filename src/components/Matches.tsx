import { useState } from 'react';
import { Layers, Radio, X } from 'lucide-react';
import type { ApiMatch } from '../lib/types';
import { api, ApiError, errMsg } from '../lib/api';
import { refreshWallet, setWallet, useSession, formatMoney } from '../lib/session';
import { navigate } from '../router';
import type { Wallet } from '../lib/types';

type Sel = 'home' | 'draw' | 'away';
const SEL_LABEL: Record<Sel, string> = { home: '1', draw: 'X', away: '2' };

const matchTime = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export function MatchList({ matches, empty = 'No matches found', variant = 'cards' }: {
  matches: ApiMatch[];
  empty?: string;
  variant?: 'cards' | 'live';
}) {
  const [pick, setPick] = useState<{ match: ApiMatch; sel: Sel } | null>(null);
  const [building, setBuilding] = useState(false);
  const [legs, setLegs] = useState<{ match: ApiMatch; sel: Sel }[]>([]);
  const [showAccumulator, setShowAccumulator] = useState(false);
  const canBet = matches.some((m) => m.status === 'scheduled' || m.status === 'live');
  const choose = (match: ApiMatch, sel: Sel) => {
    if (!building) return setPick({ match, sel });
    setLegs((current) => {
      const rest = current.filter((leg) => leg.match.id !== match.id);
      return rest.length >= 20 ? current : [...rest, { match, sel }];
    });
  };
  return (
    <>
      {canBet && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-neutral-900/50 p-3">
        <button onClick={() => { setBuilding(!building); setLegs([]); }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${building ? 'bg-green-500 text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>
          <Layers className="h-4 w-4" /> {building ? 'Accumulator builder on' : 'Build accumulator'}
        </button>
        {building && <><span className="text-xs text-neutral-400">{legs.length} selection{legs.length === 1 ? '' : 's'} selected{legs.length === 20 ? ' (maximum)' : ''}</span>
          {legs.length > 0 && <button onClick={() => setLegs([])} className="text-xs text-neutral-400 hover:text-white">Clear</button>}
          {legs.length >= 2 && <button onClick={() => setShowAccumulator(true)} className="ml-auto rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black">Review accumulator</button>}
        </>}
      </div>}
      {matches.length === 0
        ? <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-12 text-center text-neutral-400">{empty}</div>
        : variant === 'live'
          ? <LiveMarkets matches={matches} onPick={choose} />
          : <div className="space-y-2">{matches.map((m) => <MatchCard key={m.id} match={m} onPick={(sel) => choose(m, sel)} />)}</div>}
      {pick && <BetSlip match={pick.match} sel={pick.sel} onClose={() => setPick(null)} />}
      {showAccumulator && <AccumulatorSlip legs={legs} onClose={() => setShowAccumulator(false)} />}
    </>
  );
}

function LiveMarkets({ matches, onPick }: {
  matches: ApiMatch[];
  onPick: (match: ApiMatch, selection: Sel) => void;
}) {
  const groups = matches.reduce<{ title: string; matches: ApiMatch[] }[]>((current, match) => {
    const title = `${match.sport} · ${match.league}`;
    const group = current.find((item) => item.title === title);
    if (group) group.matches.push(match);
    else current.push({ title, matches: [match] });
    return current;
  }, []);

  return <div className="space-y-4">
    {groups.map((group) => <section key={group.title} className="overflow-hidden rounded-xl border border-white/5 bg-neutral-900/60">
      <div className="flex items-center justify-between border-b border-white/5 bg-neutral-900 px-4 py-3">
        <h2 className="truncate text-sm font-bold text-white">{group.title}</h2>
        <span className="shrink-0 text-[10px] text-neutral-500">{group.matches.length} LIVE</span>
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_repeat(3,76px)] gap-2 border-b border-white/5 px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:grid">
        <span className="text-left">Match</span><span>1</span><span>X</span><span>2</span>
      </div>
      {group.matches.map((match) => <LiveMarketRow key={match.id} match={match} onPick={(selection) => onPick(match, selection)} />)}
    </section>)}
  </div>;
}

function LiveMarketRow({ match, onPick }: { match: ApiMatch; onPick: (selection: Sel) => void }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,58px)] items-center gap-2 border-b border-white/5 px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_repeat(3,76px)] sm:px-4">
    <div className="flex min-w-0 items-center gap-3">
      <div className="w-12 shrink-0 text-center">
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-emerald-400"><Radio className="h-2.5 w-2.5" /> Live</span>
        <span className="mt-1 block text-xs font-bold tabular-nums text-white">{match.score || '—'}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-neutral-100 sm:text-sm">{match.home}</p>
        <p className="mt-1 truncate text-xs font-semibold text-neutral-300 sm:text-sm">{match.away}</p>
      </div>
    </div>
    {(['home', 'draw', 'away'] as Sel[]).map((selection) => {
      const price = match.odds[selection];
      return price > 0
        ? <button
          key={selection}
          type="button"
          onClick={() => onPick(selection)}
          aria-label={`${selection === 'home' ? 'Home' : selection === 'draw' ? 'Draw' : 'Away'} odds ${price.toFixed(2)} for ${match.home} vs ${match.away}`}
          className="rounded-md border border-white/5 bg-neutral-800 px-2 py-2 text-sm font-bold tabular-nums text-white transition-colors hover:border-green-500/40 hover:bg-green-500/15 hover:text-green-300"
        ><span className="block text-[9px] text-neutral-500 sm:hidden">{SEL_LABEL[selection]}</span>{price.toFixed(2)}</button>
        : <span key={selection} className="rounded-md bg-neutral-800/50 px-2 py-2 text-center text-xs text-neutral-600"><span className="block text-[9px] text-neutral-600 sm:hidden">{SEL_LABEL[selection]}</span>—</span>;
    })}
  </div>;
}

export function MatchCard({ match: m, onPick }: { match: ApiMatch; onPick: (s: Sel) => void }) {
  const canBet = m.status === 'scheduled' || m.status === 'live';
  const result = m.result === 'home' ? `${m.home} won` : m.result === 'away' ? `${m.away} won` : m.result === 'draw' ? 'Draw' : null;
  return (
    <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 transition-colors hover:border-white/10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{m.sport} · {m.league}</span>
          {m.isLive && <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400"><Radio className="h-2.5 w-2.5" /> LIVE</span>}
        </div>
        <span className={`text-xs ${m.status === 'finished' ? 'text-neutral-300' : 'text-neutral-500'}`}>{m.isLive && m.score ? m.score : m.status === 'finished' ? `Final${m.score ? ` · ${m.score}` : ''}` : matchTime(m.startsAt)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{m.home}</p>
          <p className="text-sm font-semibold text-white">{m.away}</p>
        </div>
        {canBet ? <div className="flex gap-2">
          {(['home', 'draw', 'away'] as Sel[]).filter((s) => m.odds[s] > 0).map((s) => (
            <button key={s} onClick={() => onPick(s)} className="flex flex-col items-center rounded-lg border border-white/5 bg-white/5 px-3 py-2 transition-colors hover:border-green-500/30 hover:bg-green-500/10">
              <span className="text-[10px] text-neutral-500">{SEL_LABEL[s]}</span>
              <span className="text-sm font-bold text-white">{m.odds[s].toFixed(2)}</span>
            </button>
          ))}
        </div> : <div className="text-right"><p className="text-xs font-semibold text-neutral-300">{result ?? 'Market closed'}</p><p className="text-[10px] text-neutral-500">{m.status === 'finished' ? 'Result' : 'No betting'}</p></div>}
      </div>
    </div>
  );
}

function AccumulatorSlip({ legs, onClose }: { legs: { match: ApiMatch; sel: Sel }[]; onClose: () => void }) {
  const { user, wallet } = useSession();
  const [stake, setStake] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const combinedOdds = legs.reduce(
    (total, leg) => total * BigInt(Math.round(leg.match.odds[leg.sel] * 1000)) / 1000n,
    1000n,
  );
  const odds = Number(combinedOdds) / 1000;
  const potential = Number.isFinite(odds) ? formatMoney(Math.floor(stake * 100 * odds) / 100) : 'Unavailable';
  const place = async () => {
    if (!user) return navigate('/account');
    setBusy(true); setErr(null);
    try {
      const r = await api<{ bet: { potential: number }; wallet: Wallet }>('/bets/accumulator', {
        body: { legs: legs.map(({ match, sel }) => ({ matchId: match.id, selection: sel, expectedOdds: match.odds[sel] })), stake },
        idempotent: true,
      });
      setWallet(r.wallet);
      setDone(`Accumulator placed. Potential return ${formatMoney(r.bet.potential)}`);
    } catch (e) { setErr(errMsg(e)); void refreshWallet(); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between"><div><p className="text-xs text-neutral-500">BET SLIP</p><p className="text-sm font-bold text-white">{legs.length}-selection accumulator</p></div><button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="h-5 w-5" /></button></div>
        <div className="mb-4 max-h-48 space-y-2 overflow-auto">
          {legs.map(({ match, sel }) => <div key={match.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{match.home} vs {match.away}</p><p className="text-neutral-400">{sel === 'home' ? `${match.home} Win` : sel === 'away' ? `${match.away} Win` : 'Draw'}</p></div><span className="font-bold text-green-400">{match.odds[sel].toFixed(2)}</span></div>)}
        </div>
        {done ? <><p className="mb-3 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">{done}</p><button onClick={onClose} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black">Done</button></> : <>
          <div className="mb-2 flex justify-between text-xs text-neutral-500"><span>Stake</span>{wallet && <span>Balance {formatMoney(wallet.balance)}</span>}</div>
          <input type="number" min={1} value={stake} onChange={(e) => setStake(Math.max(0, Number(e.target.value)))} className="mb-3 w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-center text-lg font-bold text-white focus:outline-none" />
          <div className="mb-3 flex justify-between text-sm"><span className="text-neutral-400">Combined odds</span><span className="font-bold text-green-400">{odds.toFixed(2)}</span></div>
          <div className="mb-3 flex justify-between text-sm"><span className="text-neutral-400">Potential return</span><span className="font-bold text-white">{potential}</span></div>
          {err && <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</p>}
          <button onClick={place} disabled={busy || stake < 1} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:bg-neutral-800 disabled:text-neutral-600">{busy ? 'Placing…' : `Place accumulator ${formatMoney(stake)}`}</button>
        </>}
      </div>
    </div>
  );
}

function BetSlip({ match, sel, onClose }: { match: ApiMatch; sel: Sel; onClose: () => void }) {
  const { user, wallet } = useSession();
  const [stake, setStake] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const odds = match.odds[sel];
  const label = sel === 'home' ? `${match.home} Win` : sel === 'away' ? `${match.away} Win` : 'Draw';

  const place = async () => {
    if (!user) return navigate('/account');
    setBusy(true); setErr(null);
    try {
      const r = await api<{ bet: { potential: number }; wallet: Wallet }>('/bets', { body: { matchId: match.id, selection: sel, stake, expectedOdds: odds }, idempotent: true });
      setWallet(r.wallet);
      setDone(`Bet placed. Potential return ${formatMoney(r.bet.potential)}`);
    } catch (e) {
      const d = e instanceof ApiError && e.code === 'ODDS_CHANGED' ? (e.details as { currentOdds?: number } | undefined) : undefined;
      setErr(d ? `Odds changed to ${d.currentOdds?.toFixed(2)}. Close and re-select.` : errMsg(e));
      void refreshWallet();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div><p className="text-xs text-neutral-500">{match.league}</p><p className="text-sm font-bold text-white">{match.home} vs {match.away}</p></div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <span className="text-sm text-neutral-300">{label}</span><span className="text-sm font-bold text-green-400">{odds.toFixed(2)}</span>
        </div>
        {done ? (
          <>
            <p className="mb-3 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">{done}</p>
            <button onClick={onClose} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black">Done</button>
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-500"><span>Stake</span>{wallet && <span>Balance {formatMoney(wallet.balance)}</span>}</div>
            <input type="number" min={1} value={stake} onChange={(e) => setStake(Math.max(0, Number(e.target.value)))} className="mb-2 w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-center text-lg font-bold text-white focus:border-green-500/50 focus:outline-none" />
            <div className="mb-3 flex gap-2">{[5, 10, 50, 100].map((v) => <button key={v} onClick={() => setStake(v)} className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-neutral-300 hover:bg-white/10">{formatMoney(v)}</button>)}</div>
            <div className="mb-3 flex justify-between text-sm"><span className="text-neutral-400">Potential return</span><span className="font-bold text-white">{formatMoney(stake * odds)}</span></div>
            {err && <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</p>}
            <button onClick={place} disabled={busy || stake < 1} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:bg-neutral-800 disabled:text-neutral-600">
              {user ? (busy ? 'Placing…' : `Place bet ${formatMoney(stake)}`) : 'Sign in to bet'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
