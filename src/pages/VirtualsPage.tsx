import { useEffect } from 'react';
import { Radio, RefreshCw, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../Layout';
import { MatchList } from '../components/Matches';
import { ErrorNote } from '../components/RequireAuth';
import { api } from '../lib/api';
import type { ApiMatch } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export function VirtualsPage() {
  const { data, error, loading, reload } = useAsync(
    async () => {
      const [live, scheduled, finished] = await Promise.all(
        ['live', 'scheduled', 'finished'].map((status) =>
          api<{ matches: ApiMatch[] }>(`/matches?sport=Virtual%20Football&status=${status}`, { auth: false }),
        ),
      );
      return [...live.matches, ...scheduled.matches, ...finished.matches];
    },
  );
  useEffect(() => {
    const timer = window.setInterval(() => { void reload(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const matches = data ?? [];
  const live = matches.filter((match) => match.status === 'live');
  const upcoming = matches.filter((match) => match.status === 'scheduled');
  const results = matches.filter((match) => match.status === 'finished');

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Virtual Football" subtitle="Admin-managed virtual fixtures and results" />
        <button onClick={() => void reload()} disabled={loading} className="mb-5 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/80">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p>Virtual matches are displayed only when an administrator has entered them. No fixtures or results are generated here. Connect an approved virtual-sports provider before offering real-money markets.</p>
      </div>
      <ErrorNote msg={error} />
      {loading && !data ? <p className="py-8 text-center text-sm text-neutral-500">Loading virtual football…</p> : (
        <div className="space-y-7">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white"><Radio className="h-5 w-5 text-rose-400" /> Live Virtuals</h2>
            <MatchList matches={live} variant="live" empty="No live virtual fixtures" />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Upcoming Virtuals</h2>
            <MatchList matches={upcoming} empty="No upcoming virtual fixtures" />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Virtual Results</h2>
            <MatchList matches={results} empty="No virtual results yet" />
          </section>
        </div>
      )}
    </div>
  );
}
