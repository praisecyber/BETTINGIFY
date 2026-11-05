import { useState } from 'react';
import { ArrowLeft, CircleDollarSign } from 'lucide-react';
import { PageHeader } from '../Layout';
import { api, errMsg } from '../lib/api';
import { setWallet, useSession, formatMoney } from '../lib/session';
import type { Wallet } from '../lib/types';
import { navigate } from '../router';

type GameId = 'roulette' | 'slots';
type BetType = 'red' | 'black' | 'number';
interface GameRound {
    gameId: GameId;
    stake: number;
    payout: number;
    net: number;
    outcome: { number?: number; color?: 'red' | 'black' | 'green'; won?: boolean; multiplier: number; symbols?: string[] };
    wallet: Wallet;
}

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const slotPayouts = [['CHERRY', '12x'], ['LEMON', '16x'], ['BELL', '20x'], ['BAR', '28x'], ['STAR', '44x'], ['SEVEN', '80x']];

export function CasinoGamePage({ gameId }: { gameId: GameId }) {
    const { user, wallet } = useSession();
    const [stake, setStake] = useState(1);
    const [betType, setBetType] = useState<BetType>('red');
    const [number, setNumber] = useState(7);
    const [round, setRound] = useState<GameRound | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const isRoulette = gameId === 'roulette';

    const play = async () => {
        if (!user) return navigate('/account');
        setBusy(true);
        setError(null);
        try {
            const result = await api<GameRound>('/casino/play', {
                body: { gameId, stake, ...(isRoulette ? { betType, ...(betType === 'number' ? { number } : {}) } : {}) },
                idempotent: true,
            });
            setRound(result);
            setWallet(result.wallet);
        } catch (e) {
            setError(errMsg(e));
        } finally {
            setBusy(false);
        }
    };

    return <div>
        <button onClick={() => navigate('/games')} className="mb-4 flex items-center gap-2 text-sm text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Games</button>
        <PageHeader title={isRoulette ? 'European Roulette' : 'Lucky Slots'} subtitle={isRoulette ? 'European wheel, zero to 36' : 'Three reels, server-generated spins'} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-xl border border-white/10 bg-neutral-900/70 p-5 sm:p-7">
                {isRoulette ? <>
                    <div className="mb-5 grid grid-cols-3 gap-2">
                        {(['red', 'black', 'number'] as BetType[]).map((type) => <button key={type} onClick={() => setBetType(type)} className={`rounded-lg border px-3 py-3 text-sm font-semibold capitalize ${betType === type ? 'border-green-400 bg-green-500/15 text-white' : 'border-white/10 bg-neutral-950 text-neutral-400 hover:text-white'}`}>{type === 'number' ? 'Single number · 36x' : `${type} · 2x`}</button>)}
                    </div>
                    {betType === 'number' && <div className="mb-5 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                        {Array.from({ length: 37 }, (_, value) => <button key={value} onClick={() => setNumber(value)} aria-pressed={number === value} className={`aspect-square rounded-md border text-xs font-semibold ${number === value ? 'border-white bg-white text-black' : value === 0 ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : redNumbers.has(value) ? 'border-rose-900 bg-rose-950 text-rose-300' : 'border-white/10 bg-neutral-950 text-neutral-300'}`}>{value}</button>)}
                    </div>}
                    {round?.outcome.number !== undefined && <div className="mb-5 rounded-lg border border-white/10 bg-neutral-950 p-5 text-center">
                        <span className={`inline-flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${round.outcome.color === 'red' ? 'bg-rose-700 text-white' : round.outcome.color === 'green' ? 'bg-emerald-700 text-white' : 'bg-neutral-700 text-white'}`}>{round.outcome.number}</span>
                        <p className="mt-2 text-xs uppercase text-neutral-400">{round.outcome.color}</p>
                        <p className={`mt-2 text-sm font-semibold ${round.outcome.won ? 'text-green-400' : 'text-neutral-300'}`}>{round.outcome.won ? `Won ${formatMoney(round.payout)}` : 'No win this round'} · {round.net >= 0 ? '+' : ''}{formatMoney(round.net)}</p>
                    </div>}
                </> : <>
                    <div className="mb-5 flex min-h-32 items-center justify-center gap-2 rounded-lg border border-white/10 bg-neutral-950 p-5">
                        {(round?.outcome.symbols ?? ['READY', 'READY', 'READY']).map((symbol, index) => <div key={`${symbol}-${index}`} className="flex h-20 min-w-20 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 px-2 text-sm font-bold text-white">{symbol}</div>)}
                    </div>
                    {round && <p className={`mb-5 text-center text-sm font-semibold ${round.payout > 0 ? 'text-green-400' : 'text-neutral-300'}`}>{round.payout > 0 ? `${round.outcome.multiplier}x payout · ${formatMoney(round.payout)}` : 'No matching symbols'} · {round.net >= 0 ? '+' : ''}{formatMoney(round.net)}</p>}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-neutral-400 sm:grid-cols-6">{slotPayouts.map(([symbol, payout]) => <div key={symbol} className="rounded-md border border-white/5 bg-neutral-950 p-2"><p className="font-semibold text-white">{symbol}</p><p className="mt-1">{payout}</p></div>)}</div>
                </>}
            </section>

            <aside className="h-fit rounded-xl border border-white/10 bg-neutral-900/70 p-5">
                <label htmlFor="casino-stake" className="mb-2 block text-sm font-medium text-neutral-300">Stake</label>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950 px-3"><CircleDollarSign className="h-4 w-4 text-neutral-500" /><input id="casino-stake" type="number" min="1" step="0.01" value={stake} onChange={(event) => setStake(Math.max(0, Number(event.target.value)))} className="w-full bg-transparent py-3 text-sm text-white focus:outline-none" /></div>
                <p className="mb-4 text-xs text-neutral-500">Balance: {wallet ? formatMoney(wallet.balance) : 'Sign in to play'}</p>
                {error && <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
                <button onClick={() => void play()} disabled={busy || stake < 1} className="w-full rounded-lg bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400">{busy ? 'Playing…' : user ? (isRoulette ? 'Spin wheel' : 'Spin reels') : 'Sign in to play'}</button>
                <p className="mt-3 text-[11px] leading-5 text-neutral-500">Outcomes are generated by the server. Payouts shown are total returns, including the stake.</p>
            </aside>
        </div>
    </div>;
}