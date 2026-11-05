import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Trophy } from 'lucide-react';
import { PageHeader } from '../Layout';
import { ApiError, api, errMsg } from '../lib/api';
import { formatMoney, setWallet, useSession } from '../lib/session';
import type { Wallet } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { navigate } from '../router';

interface Draw {
  id: string;
  periodStart: string;
  closesAt: string;
  status: 'open' | 'drawn' | 'void';
  seedHash: string;
  revealedSeed: string | null;
  entryCount: number;
  pool: number;
  prize: number;
  hasWinner: boolean;
  myEntries?: number;
  drawnAt: string | null;
}
interface JackpotState {
  enabled: boolean;
  ticketPrice: number;
  maxEntriesPerUser: number;
  draw: Draw | null;
  latest: Draw[];
}
interface Verification {
  drawId: string;
  status: string;
  seedHash: string;
  revealedSeed: string;
  entryIds: string[];
  selectionCounter: number | null;
  winningEntryIndex: number | null;
  winningEntryId: string | null;
  algorithm: string;
}

export function JackpotPage() {
  const { user } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const { data, error, loading, reload, setData } = useAsync(
    () => api<JackpotState>('/jackpot'),
  );

  useEffect(() => {
    const timer = window.setInterval(() => { void reload(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const enter = async () => {
    setSubmitting(true);
    setActionError('');
    try {
      const result = await api<JackpotState & { wallet: Wallet }>('/jackpot/entries', {
        body: { quantity },
        idempotent: true,
      });
      setWallet(result.wallet);
      setData(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_FUNDS') navigate('/deposit');
      setActionError(errMsg(error));
    } finally {
      setSubmitting(false);
    }
  };
  const verifyDraw = async (id: string) => {
    setActionError('');
    try {
      setVerification(await api<Verification>(`/jackpot/draws/${encodeURIComponent(id)}/verification`, { auth: false }));
    } catch (error) {
      setActionError(errMsg(error));
    }
  };

  const draw = data?.draw;
  const remaining = draw ? Math.max(0, Date.parse(draw.closesAt) - Date.now()) : 0;
  const hoursLeft = Math.floor(remaining / 3_600_000);
  const minutesLeft = Math.floor((remaining % 3_600_000) / 60_000);

  return (
    <div>
      <PageHeader title="Weekly Jackpot" subtitle="One NGN-denominated prize pool, settled transparently each week" />
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/80">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p>Entries use withdrawable wallet cash only. All entry value goes to one randomly selected winner; there is no operator fee. Entry is limited to {data?.maxEntriesPerUser ?? 10} per player each week. Play responsibly.</p>
      </div>

      {loading && !data ? <p className="py-8 text-center text-sm text-neutral-500">Loading jackpot…</p> : error ? (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</p>
      ) : (
        <>
          {!data?.enabled && <div className="mb-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-5 text-sm text-sky-100/80">
            Jackpot entries are currently disabled. An operator must enable them after confirming the applicable licence, terms, and payment controls.
          </div>}
          <section className="mb-8 grid gap-4 rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-neutral-900 to-neutral-900 p-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 flex items-center gap-2 text-yellow-300"><Trophy className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">This week's prize pool</span></div>
              <p className="text-4xl font-black text-white">{formatMoney(draw?.pool ?? 0)}</p>
              <p className="mt-2 text-sm text-neutral-400">{draw?.entryCount ?? 0} entries · {formatMoney(data?.ticketPrice ?? 100)} per entry</p>
              {draw && <p className="mt-3 flex items-center gap-2 text-xs text-neutral-400"><Clock3 className="h-4 w-4" /> Draw closes {new Date(draw.closesAt).toLocaleString()} {draw.status === 'open' && `· ${hoursLeft}h ${minutesLeft}m remaining`}</p>}
              {draw?.myEntries !== undefined && <p className="mt-2 text-xs text-neutral-400">Your entries: {draw.myEntries} / {data?.maxEntriesPerUser}</p>}
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="text-xs text-neutral-400">Number of entries
                <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} disabled={!data?.enabled || submitting} className="mt-1 block w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white">
                  {Array.from({ length: data?.maxEntriesPerUser ?? 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <p className="text-right text-xs text-neutral-400">Total: {formatMoney((data?.ticketPrice ?? 100) * quantity)}</p>
              <button onClick={user ? () => void enter() : () => navigate('/register')} disabled={!data?.enabled || submitting || (draw?.status !== 'open')} className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">
                {!user ? 'Sign in to enter' : submitting ? 'Processing…' : 'Buy entries'}
              </button>
            </div>
          </section>
          {actionError && <p role="alert" className="mb-5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-300">{actionError}</p>}

          <section className="mb-8 rounded-xl border border-white/5 bg-neutral-900/50 p-5">
            <h2 className="mb-3 font-bold text-white">How this jackpot works</h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-400">
              <li>Each entry costs {formatMoney(data?.ticketPrice ?? 100)} and is deducted from withdrawable cash.</li>
              <li>The draw closes weekly at Monday 00:00 UTC. Every entry has an equal chance; the entire pool is paid to one winner.</li>
              <li>A SHA-256 hash of the draw seed is published before the draw. After closing, the seed is revealed so the selection can be independently checked.</li>
              <li>Rounds with no entries are void and have no payout. A winner is selected once and credited automatically when the next jackpot request is processed.</li>
            </ol>
            {draw && <p className="mt-4 break-all text-xs text-neutral-500">Current draw seed commitment: {draw.seedHash}</p>}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Recent draws</h2>
            {data?.latest.length ? <div className="space-y-2">{data.latest.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/5 bg-neutral-900/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{new Date(item.periodStart).toLocaleDateString()} draw</span>
                  <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${item.status === 'drawn' ? 'bg-green-500/15 text-green-300' : 'bg-neutral-700 text-neutral-300'}`}>{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-400">{item.status === 'drawn' ? `Prize: ${formatMoney(item.prize)} · ${item.entryCount} entries` : 'No entries; round void'}</p>
                {item.revealedSeed && <p className="mt-2 break-all text-xs text-neutral-500">Revealed seed: {item.revealedSeed}</p>}
                {item.status === 'drawn' && <button onClick={() => void verifyDraw(item.id)} className="mt-3 text-xs font-semibold text-green-300 hover:text-green-200">Show draw verification</button>}
              </article>
            ))}</div> : <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-6 text-sm text-neutral-500">No completed draws yet.</p>}
          </section>
          {verification && <section className="mt-5 rounded-xl border border-green-500/20 bg-green-500/5 p-5">
            <h3 className="font-bold text-white">Draw verification</h3>
            <p className="mt-2 break-all text-xs text-neutral-400">Winning ticket {verification.winningEntryIndex === null ? '—' : verification.winningEntryIndex + 1} of {verification.entryIds.length}: {verification.winningEntryId ?? 'No winner'}</p>
            <p className="mt-2 text-xs text-neutral-400">Accepted sample counter: {verification.selectionCounter ?? '—'}</p>
            <p className="mt-2 break-all text-xs text-neutral-500">Ticket IDs in draw order: {verification.entryIds.join(', ') || 'None'}</p>
            <p className="mt-2 break-all text-xs text-neutral-500">Seed: {verification.revealedSeed}</p>
            <p className="mt-2 break-words text-xs text-neutral-500">{verification.algorithm}</p>
            <p className="mt-2 text-xs text-neutral-500">Confirm SHA-256(seed) matches the published commitment, then recompute the stated HMAC sample until an accepted counter and compare the selected index and ticket ID.</p>
          </section>}
        </>
      )}
    </div>
  );
}
