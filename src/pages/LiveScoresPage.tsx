import { useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { PageHeader } from '../Layout';
import { ProviderFixtureCard } from '../components/ProviderFixtureCard';
import { ErrorNote } from '../components/RequireAuth';
import { api } from '../lib/api';
import type { SportsFeedEvent } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export function LiveScoresPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, error, loading, reload } = useAsync(
    () => api<{ provider: string; date: string; fetchedAt: string; events: SportsFeedEvent[] }>(
      `/sports-feed/sportapi/events?date=${date}`,
      { auth: false },
    ),
    [date],
  );
  useEffect(() => {
    const timer = window.setInterval(() => { void reload(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const events = data?.events ?? [];
  const live = events.filter((event) => event.status === 'live');
  const other = events.filter((event) => event.status !== 'live');

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Live Scores" subtitle={data?.provider ? `Scores and fixtures from ${data.provider}` : 'Provider-sourced scores and fixtures'} />
        <div className="mb-5 flex items-center gap-2">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white" />
          <button onClick={() => void reload()} disabled={loading} aria-label="Refresh scores" className="rounded-lg border border-white/10 p-2 text-neutral-300 hover:bg-white/5 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="mb-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-100/80">
        Informational scores only; these feed events are not bettable and provider updates may be delayed. Bet only on markets listed on Live Betting.
      </div>
      <ErrorNote msg={error} />
      {loading && !data ? <p className="py-8 text-center text-sm text-neutral-500">Loading scores…</p> : (
        <div className="space-y-7">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white"><Radio className="h-5 w-5 text-rose-400" /> Live Now <span className="text-sm font-normal text-neutral-500">{live.length}</span></h2>
            {live.length ? <div className="grid gap-3 md:grid-cols-2">{live.map((event) => <ProviderFixtureCard key={event.id} event={event} />)}</div> : <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-400">No live scores available for this date.</p>}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Other Fixtures & Results</h2>
            {other.length ? <div className="grid gap-3 md:grid-cols-2">{other.map((event) => <ProviderFixtureCard key={event.id} event={event} />)}</div> : <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-400">No other fixtures or results available.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
