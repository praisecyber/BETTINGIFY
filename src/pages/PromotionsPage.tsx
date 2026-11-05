import { useState } from 'react';
import type { Promotion } from '../lib/types';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { navigate } from '../router';
import { PageHeader } from '../Layout';
import { Star, ChevronRight, Flame, Tag, Clock, Crown, Users, TrendingUp } from 'lucide-react';

const tagIcons: Record<string, typeof Star> = {
  'New Players': Flame,
  Casino: Star,
  Sports: TrendingUp,
  Weekly: Clock,
  VIP: Crown,
  Refer: Users,
};

export function PromotionsPage() {
  const { data } = useAsync(() => api<{ promotions: Promotion[] }>('/promotions', { auth: false }));
  const promotions = data?.promotions ?? [];
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [filter, setFilter] = useState('All');
  const tags = ['All', 'New Players', 'Sports', 'Casino', 'Weekly', 'VIP'];
  const filtered = filter === 'All' ? promotions : promotions.filter((p) => p.tag === filter);

  if (selected) {
    return (
      <div>
        <PageHeader title={selected.title} subtitle={selected.tag} />
        <div className="max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl mb-4" style={{ height: '220px' }}>
            <img src={selected.image} alt={selected.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
            <div className="absolute bottom-0 p-6">
              <span className="rounded-lg bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">{selected.tag}</span>
              <h2 className="text-2xl font-bold text-white mt-2">{selected.title}</h2>
            </div>
          </div>
          <p className="text-neutral-400 mb-4">{selected.desc}</p>
          <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-5 mb-4">
            <p className="text-xs text-neutral-500 mb-1">Your Reward</p>
            <p className="text-3xl font-bold text-green-400">{selected.reward}</p>
          </div>
          <div className="space-y-2 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Terms</p>
            {[
              'Bonus funds are locked until wagering is completed',
              'Wagering requirement: 3x the bonus amount',
              'Welcome bonus applies to your first deposit only',
              'Withdrawals are made from cash balance, not bonus',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                <span className="text-neutral-600 mt-1">•</span> {t}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelected(null)}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
            >
              Back
            </button>
            <button onClick={() => navigate(selected.tag === 'New Players' ? '/deposit' : selected.tag === 'Casino' ? '/AVIATOR' : selected.tag === 'Sports' ? '/az' : '/gifts')} className="flex-1 rounded-xl bg-green-500 px-5 py-3 text-sm font-bold text-black hover:bg-green-400 transition-colors">
              {selected.tag === 'New Players' ? 'Deposit to claim' : 'Get started'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Promotions" subtitle="Offers for players in Nigeria" />

      {promotions[0] && <button
        onClick={() => setSelected(promotions[0])}
        className="mb-6 block w-full overflow-hidden rounded-2xl border border-green-500/20 text-left"
      >
        <div className="relative" style={{ height: '180px' }}>
          <img src={promotions[0].image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="absolute inset-0 flex items-center p-6">
            <div>
              <span className="rounded bg-green-500/20 px-2 py-1 text-[10px] font-bold text-green-400">FEATURED</span>
              <h2 className="text-2xl font-bold text-white mt-2">{promotions[0].title}</h2>
              <p className="text-sm text-neutral-300 mt-1">{promotions[0].desc}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-green-400">
                Claim {promotions[0].reward} <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </button>}

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === t ? 'bg-white/10 text-white border border-white/10' : 'bg-neutral-900/50 text-neutral-400 border border-transparent hover:text-white'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Promo grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const Icon = tagIcons[p.tag] || Tag;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="group overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 hover:border-white/10 transition-all text-left"
            >
              <div className="relative" style={{ height: '120px' }}>
                <img src={p.image} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
                  <Icon className="h-3 w-3 text-green-400" />
                  <span className="text-[10px] font-semibold text-white">{p.tag}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-white">{p.title}</h3>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{p.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-green-400">{p.reward}</span>
                  <span className="flex items-center gap-1 text-xs text-neutral-500 group-hover:text-white transition-colors">
                    Claim <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
