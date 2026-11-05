import { useState } from 'react';
import { PageHeader } from '../Layout';
import { ArrowDownLeft, ArrowUpRight, Minus, Plus, Clock, Check, X, Filter } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatMoney } from '../lib/session';
import { ErrorNote, RequireAuth } from '../components/RequireAuth';
import type { Txn } from '../lib/types';

const typeConfig = {
  deposit: { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/10', sign: '+' },
  withdraw: { icon: ArrowUpRight, color: 'text-green-300', bg: 'bg-green-500/10', sign: '-' },
  bet: { icon: Minus, color: 'text-rose-400', bg: 'bg-rose-500/10', sign: '-' },
  win: { icon: Plus, color: 'text-green-400', bg: 'bg-green-500/10', sign: '+' },
  refund: { icon: Plus, color: 'text-green-300', bg: 'bg-green-500/10', sign: '+' },
};
const statusConfig = {
  completed: { icon: Check, label: 'Completed', color: 'text-green-400' },
  pending: { icon: Clock, label: 'Pending', color: 'text-green-300' },
  failed: { icon: X, label: 'Failed', color: 'text-rose-400' },
};

export function TransactionsPage() { return <RequireAuth><Transactions /></RequireAuth>; }

function Transactions() {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw' | 'bet' | 'win'>('all');
  const { data, error, loading } = useAsync(() => api<{ transactions: Txn[] }>(`/wallet/transactions?limit=100${filter === 'all' ? '' : `&type=${filter}`}`), [filter]);
  const items = data?.transactions ?? [];
  const sum = (t: Txn['type'], status?: Txn['status']) => items.filter((x) => x.type === t && (!status || x.status === status)).reduce((s, x) => s + x.amount, 0);

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Your deposit, withdrawal, and betting history" />
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 flex-shrink-0 text-neutral-500" />
        {(['all', 'deposit', 'withdraw', 'bet', 'win'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter === f ? 'border border-white/10 bg-white/10 text-white' : 'border border-transparent bg-neutral-900/50 text-neutral-400 hover:text-white'}`}>{f === 'all' ? 'All' : f + 's'}</button>
        ))}
      </div>
      <ErrorNote msg={error} />
      {loading && <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>}
      {!loading && !error && items.length === 0 && <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-12 text-center text-sm text-neutral-400">No transactions yet</p>}
      <div className="space-y-2">
        {items.map((t) => {
          const cfg = typeConfig[t.type] ?? typeConfig.bet;
          const st = statusConfig[t.status];
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-900/50 p-4 transition-colors hover:border-white/10">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.bg}`}><cfg.icon className={`h-5 w-5 ${cfg.color}`} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize text-white">{t.type} · {t.method}</p>
                <p className="text-xs text-neutral-500">{new Date(t.date).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${cfg.color}`}>{cfg.sign}{formatMoney(t.amount)}</p>
                <div className={`flex items-center justify-end gap-1 ${st.color}`}><st.icon className="h-3 w-3" /><span className="text-[10px] font-medium">{st.label}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {filter === 'all' && items.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4"><p className="text-xs text-neutral-500">Deposits</p><p className="mt-1 text-lg font-bold text-green-400">{formatMoney(sum('deposit', 'completed'))}</p></div>
          <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4"><p className="text-xs text-neutral-500">Withdrawals</p><p className="mt-1 text-lg font-bold text-green-300">{formatMoney(sum('withdraw', 'completed'))}</p></div>
          <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4"><p className="text-xs text-neutral-500">Wins − bets</p><p className="mt-1 text-lg font-bold text-green-400">{formatMoney(sum('win') - sum('bet'))}</p></div>
        </div>
      )}
    </div>
  );
}
