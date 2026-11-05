import { PageHeader } from '../Layout';
import { Star } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { MatchList } from '../components/Matches';
import { ErrorNote, RequireAuth } from '../components/RequireAuth';
import type { ApiMatch } from '../lib/types';

export function MyMatchesPage() { return <RequireAuth><MyMatches /></RequireAuth>; }

function MyMatches() {
  const { data, error, loading } = useAsync(() => api<{ matches: ApiMatch[] }>('/me/matches'));
  const list = data?.matches ?? [];
  return (
    <div>
      <PageHeader title="My Matches" subtitle="Matches you have bet on" />
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
        <Star className="h-5 w-5 text-green-400" />
        <p className="text-sm text-neutral-300"><span className="font-semibold text-green-400">{list.length} {list.length === 1 ? 'match' : 'matches'}</span> with your bets.</p>
      </div>
      <div className="mb-3"><ErrorNote msg={error} /></div>
      {loading ? <p className="py-8 text-center text-sm text-neutral-500">Loading…</p> : <MatchList matches={list} empty="You have not bet on any matches yet" />}
    </div>
  );
}
