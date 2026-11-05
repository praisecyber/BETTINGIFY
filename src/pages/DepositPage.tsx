import { useState } from 'react';
import { api, errMsg } from '../lib/api';
import { setWallet, useSession, formatMoney } from '../lib/session';
import { useAsync } from '../lib/useAsync';
import { ErrorNote, RequireAuth } from '../components/RequireAuth';
import type { PayMethod, Wallet as WalletData } from '../lib/types';
import { PageHeader } from '../Layout';
import { CreditCard, Bitcoin, Building2, Wallet, Check, Shield, Clock, ArrowRight } from 'lucide-react';

const iconMap: Record<string, typeof CreditCard> = {
  card: CreditCard,
  bitcoin: Bitcoin,
  bank: Building2,
  wallet: Wallet,
};

export function DepositPage() { return <RequireAuth><Deposit /></RequireAuth>; }

function Deposit() {
  const { wallet } = useSession();
  const { data, error: loadErr } = useAsync(async () => {
    const [m, w] = await Promise.all([api<{ methods: PayMethod[] }>('/wallet/methods?kind=deposit'), api<WalletData & { welcomeBonusAvailable: boolean }>('/wallet')]);
    return { methods: m.methods, bonusAvailable: w.welcomeBonusAvailable };
  });
  const paymentMethods = data?.methods ?? [];
  const bonusAvailable = !!data?.bonusAvailable;
  const [method, setMethod] = useState('visa');
  const [amount, setAmount] = useState(100);
  const [bonusOn, setBonusOn] = useState(true);
  const [submitted, setSubmitted] = useState<{ status: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = paymentMethods.find((m) => m.id === method) ?? { id: method, name: method, min: 10, max: 5000, time: '', icon: 'card' };
  const bonus = bonusAvailable && bonusOn;
  const bonusAmt = bonus ? Math.min(amount, 500) : 0;
  const finalAmount = amount + bonusAmt;
  const valid = amount >= selected.min && amount <= selected.max;

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ payment: { status: string }; wallet: WalletData }>('/wallet/deposit', { body: { method, amount, claimWelcomeBonus: bonus }, idempotent: true });
      setWallet(r.wallet); setSubmitted({ status: r.payment.status });
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Deposit" subtitle="Add funds to your account" />

      {submitted ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{submitted.status === 'completed' ? 'Deposit Successful!' : 'Deposit Pending'}</h2>
          <p className="text-neutral-400 mb-1">{formatMoney(amount)} via {selected.name}</p>
          {submitted.status === 'completed' && bonus && <p className="text-green-400 text-sm">+ {formatMoney(bonusAmt)} welcome bonus added!</p>}
          {submitted.status !== 'completed' && <p className="text-green-300 text-sm">Funds are credited once the payment is confirmed ({selected.time}).</p>}
          <p className="text-neutral-500 text-sm mt-4">Balance: {wallet ? formatMoney(wallet.balance) : '—'}</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          <ErrorNote msg={loadErr} />
          {/* Payment methods */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Select Method</p>
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
                onClick={() => setAmount((a) => Math.max(selected.min, a - 25))}
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
                onClick={() => setAmount((a) => a + 25)}
                className="h-10 w-10 rounded-lg bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >+</button>
            </div>
            <div className="flex gap-2">
              {[50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="flex-1 rounded-lg bg-white/5 py-2 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  ₦{v.toLocaleString('en-NG')}
                </button>
              ))}
            </div>
          </div>

          {/* Welcome bonus */}
          {bonusAvailable && <div className={`rounded-xl border p-4 transition-colors ${bonusOn ? 'border-green-500/30 bg-green-500/10' : 'border-white/5 bg-neutral-900/50'}`}>
            <button onClick={() => setBonusOn(!bonusOn)} className="flex w-full items-center gap-3">
              <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${bonusOn ? 'bg-green-500 border-green-500' : 'border-neutral-600'}`}>
                {bonusOn && <Check className="h-3.5 w-3.5 text-black" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">100% Welcome Bonus</p>
                <p className="text-xs text-neutral-400">Double your deposit up to ₦500</p>
              </div>
              {bonusOn && (
                <span className="rounded-lg bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">
                  +{formatMoney(bonusAmt)}
                </span>
              )}
            </button>
          </div>}

          {/* Summary */}
          <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Deposit</span>
              <span className="text-white font-semibold">{formatMoney(amount)}</span>
            </div>
            {bonus && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Bonus (100%)</span>
                <span className="text-green-400 font-semibold">+{formatMoney(bonusAmt)}</span>
              </div>
            )}
            <div className="border-t border-white/5 pt-2 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-green-400 font-bold text-lg">{formatMoney(finalAmount)}</span>
            </div>
          </div>

          <ErrorNote msg={error} />
          <button
            onClick={submit}
            disabled={busy || !valid}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 text-sm font-bold text-black hover:bg-green-400 transition-colors disabled:bg-neutral-800 disabled:text-neutral-600"
          >
            {busy ? 'Processing…' : `Deposit ${formatMoney(amount)}`} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
