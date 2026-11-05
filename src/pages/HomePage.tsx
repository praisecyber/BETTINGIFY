import { useEffect } from 'react';
import { navigate } from '../router';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { Game, SportsFeedEvent } from '../lib/types';
import { ProviderFixtureCard } from '../components/ProviderFixtureCard';
import {
  Plane, Trophy, Flame, TrendingUp, Clock,
  ChevronRight, Play, Radio, ArrowRight,
} from 'lucide-react';

export function HomePage() {
  const date = new Date().toISOString().slice(0, 10);
  const { data: feed, error: feedError, loading: feedLoading, reload: reloadFeed } = useAsync(
    () => api<{ provider: string; date: string; fetchedAt: string; events: SportsFeedEvent[] }>(
      `/sports-feed/sportapi/events?date=${date}`,
      { auth: false },
    ),
    [date],
  );
  const { data: gd } = useAsync(() => api<{ games: Game[] }>('/games', { auth: false }));
  useEffect(() => {
    const timer = window.setInterval(() => { void reloadFeed(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [reloadFeed]);
  const casinoGames = (gd?.games ?? []).filter((game) => game.playable);
  const events = feed?.events ?? [];
  const liveMatches = events.filter((event) => event.status === 'live');
  const upcomingMatches = events.filter((event) => event.status === 'scheduled');

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/30 via-green-600/20 to-transparent" />
        <img
          src="https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Sports betting"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative p-6 md:p-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400 mb-4">
            <Flame className="h-3 w-3" /> Welcome Bonus up to ₦500
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-lg">
            Bet smarter. Win bigger.
          </h1>
          <p className="mt-3 text-neutral-300 max-w-md">
            Betting, casino games, and instant payouts for players in Nigeria.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate('/deposit')}
              className="rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-black hover:bg-green-400 transition-colors"
            >
              Claim Bonus
            </button>
            <button
              onClick={() => navigate('/AVIATOR')}
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Play Aviator
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Live Matches', value: liveMatches.length, icon: Radio, color: 'text-red-400' },
          { label: 'Casino Games', value: casinoGames.length || '—', icon: Play, color: 'text-green-300' },
          { label: 'Avg. Payout', value: '< 2 min', icon: TrendingUp, color: 'text-green-400' },
          { label: 'Min Bet', value: '₦1.00', icon: Trophy, color: 'text-green-300' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-neutral-900/50 p-4">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Aviator banner */}
      <button
        onClick={() => navigate('/AVIATOR')}
        className="mb-8 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-600/20 to-red-600/20 p-5 hover:from-green-600/30 hover:to-red-600/30 transition-colors text-left"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/20">
          <Plane className="h-7 w-7 text-green-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">Aviator</h3>
            <span className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">TRENDING</span>
          </div>
          <p className="text-sm text-neutral-400">Crash game with live multipliers and provably fair rounds</p>
        </div>
        <ArrowRight className="h-5 w-5 text-neutral-400" />
      </button>

      {/* Live matches */}
      <Section title="Live Now" icon={Radio} accent="text-red-400" action={() => navigate('/az?tab=feed')}>
        <ProviderMatchList events={liveMatches} loading={feedLoading} error={feedError} empty="No live matches today" />
      </Section>

      {/* Upcoming */}
      <Section title="Upcoming Matches" icon={Clock} action={() => navigate('/az?tab=feed')}>
        <ProviderMatchList events={upcomingMatches.slice(0, 4)} loading={feedLoading} error={feedError} empty="No upcoming matches today" />
      </Section>

      {/* Casino */}
      <Section title="Casino Games" icon={Play} action={() => navigate('/AVIATOR')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {casinoGames.map((g) => (
            <button
              key={g.id}
              onClick={() => g.id === 'roulette' ? navigate('/ROULETTE') : g.id === 'slots' ? navigate('/SLOTS') : g.playable && navigate('/AVIATOR')}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-neutral-900/50 hover:border-white/20 transition-all"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img src={g.image} alt={g.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="absolute top-2 left-2">
                <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-green-400 backdrop-blur-sm">{g.tag}</span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white truncate">{g.name}</h3>
                <p className="text-xs text-neutral-500">RTP {g.rtp}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function ProviderMatchList({ events, loading, error, empty }: {
  events: SportsFeedEvent[];
  loading: boolean;
  error: string | null;
  empty: string;
}) {
  if (loading) return <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-500">Loading today's fixtures…</p>;
  if (error) return <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">Today's fixtures are unavailable. Try again shortly.</p>;
  if (events.length === 0) return <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-400">{empty}</div>;

  return <div className="space-y-2">
    {events.map((event) => <ProviderFixtureCard key={event.id} event={event} />)}
  </div>;
}

function Section({ title, icon: Icon, accent, action, children }: {
  title: string;
  icon: typeof Trophy;
  accent?: string;
  action?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${accent || 'text-neutral-400'}`} />
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {action && (
          <button onClick={action} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
