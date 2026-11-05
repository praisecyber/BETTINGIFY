import { useState } from 'react';
import { api, errMsg } from '../lib/api';
import { setWallet, useSession, formatMoney } from '../lib/session';
import { useAsync } from '../lib/useAsync';
import { ErrorNote, RequireAuth } from '../components/RequireAuth';
import type { PayMethod, Wallet as WalletData } from '../lib/types';
import { PageHeader } from '../Layout';
import { CreditCard, Bitcoin, Building2, Wallet, Shield, Clock, AlertCircle, ArrowUpFromLine } from 'lucide-react';

const iconMap: Record<string, typeof CreditCard> = {
  card: CreditCard,
  bitcoin: Bitcoin,
  bank: Building2,
  wallet: Wallet,
};

export function WithdrawPage() { return <RequireAuth><Withdraw /></RequireAuth>; }

function Withdraw() {
  const { wallet } = useSession();
  const { data: mdata, error: loadErr } = useAsync(() => api<{ methods: PayMethod[] }>('/wallet/methods?kind=withdraw'));
  const paymentMethods = mdata?.methods ?? [];
  const [method, setMethod] = useState('bank');
  const [amount, setAmount] = useState(50);
  const [destination, setDestination] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = wallet?.balance ?? 0;
  const withdrawable = wallet?.withdrawable ?? 0;
  const locked = wallet?.bonus ?? 0;

  const selected = paymentMethods.find((m) => m.id === method) ?? { id: method, name: method, min: 10, max: 5000, time: '', icon: 'bank' };
  const canWithdraw = amount >= selected.min && amount <= Math.min(selected.max, withdrawable);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ wallet: WalletData }>('/wallet/withdraw', { body: { method, amount, destination: destination || undefined }, idempotent: true });
      setWallet(r.wallet); setSubmitted(true);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Withdraw" subtitle="Cash out your winnings" />

      {submitted ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <Clock className="h-8 w-8 text-green-300" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Withdrawal Processing</h2>
          <p className="text-neutral-400 mb-1">{formatMoney(amount)} requested via {selected.name}</p>
          <p className="text-green-300 text-sm">Estimated time: {selected.time}</p>
          <p className="text-neutral-500 text-sm mt-4">Remaining balance: {formatMoney(balance)}</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          <ErrorNote msg={loadErr} />
          {/* Balance card */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
            <p className="text-xs text-neutral-400 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-white">{formatMoney(balance)}</p>
            <p className="text-xs text-neutral-500 mt-1">Withdrawable: {formatMoney(withdrawable)}{locked > 0 && ` (bonus locked: ${formatMoney(locked)})`}</p>
          </div>

          {/* Methods */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Withdraw To</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {paymentMethods.map((m) => {
                const Icon = iconMap[m.icon] || CreditCard;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                      active ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-neutral-900/50 hover:border-white/10'
                    }`}
                  >
                    <Icon className={`h-7 w-7 ${active ? 'text-green-400' : 'text-neutral-400'}`} />
                    <span className={`text-xs font-medium ${active ? 'text-white' : 'text-neutral-400'}`}>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method info */}
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="h-4 w-4 text-neutral-500" /> {selected.time}
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span className="text-neutral-500">Min</span> ₦{selected.min.toLocaleString('en-NG')}
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span className="text-neutral-500">Max</span> ₦{selected.max.toLocaleString('en-NG')}
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Shield className="h-4 w-4 text-green-400" /> Secure
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Amount</p>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setAmount((a) => Math.max(selected.min, a - 50))}
                className="h-10 w-10 rounded-lg bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >−</button>
              <div className="flex-1 flex items-center rounded-lg bg-white/5 border border-white/5 px-4 py-2">
                <span className="text-neutral-500 mr-1">₦</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent text-center text-white text-xl font-bold focus:outline-none"
                />
              </div>
              <button
                onClick={() => setAmount((a) => a + 50)}
                className="h-10 w-10 rounded-lg bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >+</button>
            </div>
            <div className="flex gap-2">
              {[100, 250, 500, 1000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(Math.min(v, withdrawable))}
                  className="flex-1 rounded-lg bg-white/5 py-2 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  ₦{v.toLocaleString('en-NG')}
                </button>
              ))}
              <button
                onClick={() => setAmount(withdrawable)}
                className="rounded-lg bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {locked > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <AlertCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-300">{formatMoney(locked)} of your balance is bonus funds. They unlock once you meet the wagering requirement{wallet && wallet.bonusWagerRemaining > 0 ? ` (${formatMoney(wallet.bonusWagerRemaining)} left to wager)` : ''}.</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Account / destination</p>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={method === 'crypto' ? 'Wallet address' : method === 'bank' ? 'Account number' : 'Card / account reference'} className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-green-500/50 focus:outline-none" />
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Withdrawal</span>
              <span className="text-white font-semibold">{formatMoney(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Fee</span>
              <span className="text-green-400 font-semibold">Free</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between">
              <span className="text-white font-semibold">You receive</span>
              <span className="text-green-400 font-bold text-lg">{formatMoney(amount)}</span>
            </div>
          </div>

          <ErrorNote msg={error} />
          <button
            onClick={submit}
            disabled={!canWithdraw || busy}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-colors ${
              canWithdraw ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
            }`}
          >
            <ArrowUpFromLine className="h-4 w-4" /> {busy ? 'Submitting…' : `Withdraw ${formatMoney(amount)}`}
          </button>
        </div>
      )}
    </div>
  );
}
