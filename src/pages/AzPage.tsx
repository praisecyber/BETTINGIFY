import { useEffect, useState } from 'react';
import { PageHeader } from '../Layout';
import { Radio, Clock, Star, TrendingUp, Trophy, RefreshCw, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useSession } from '../lib/session';
import { MatchList } from '../components/Matches';
import { ProviderFixtureCard } from '../components/ProviderFixtureCard';
import { ErrorNote } from '../components/RequireAuth';
import type { ApiMatch, OddsFeedEvent, OddsSport, SportsFeedEvent } from '../lib/types';

export function AzPage() {
  const { user } = useSession();
  const initialTab = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('tab') === 'feed' ? 'feed' : 'live';
  const [tab, setTab] = useState<'live' | 'upcoming' | 'results' | 'mine' | 'feed'>(initialTab);
  const [sportFilter, setSportFilter] = useState('All');
  const [feedSport, setFeedSport] = useState('Soccer');
  const marketStatus = tab === 'live' ? 'live' : tab === 'upcoming' ? 'scheduled' : 'finished';
  const { data: marketData, error: marketError, loading: marketLoading, reload: reloadMarkets } = useAsync(
    () => tab === 'live' || tab === 'upcoming' || tab === 'results'
      ? api<{ matches: ApiMatch[] }>(`/matches?status=${marketStatus}`, { auth: false })
      : Promise.resolve({ matches: [] as ApiMatch[] }),
    [marketStatus, tab],
  );
  const { data: mineData, error: mineError, loading: mineLoading } = useAsync(
    () => tab === 'mine' && user
      ? api<{ matches: ApiMatch[] }>('/me/matches')
      : Promise.resolve({ matches: [] as ApiMatch[] }),
    [tab, !!user],
  );
  useEffect(() => {
    if (tab !== 'live') return;
    const timer = window.setInterval(() => { void reloadMarkets(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [tab, reloadMarkets]);
  const sourceMatches = tab === 'mine' ? mineData?.matches ?? [] : marketData?.matches ?? [];
  const sports = ['All', ...new Set(sourceMatches.map((match) => match.sport))];
  const filteredMine = (mineData?.matches ?? []).filter((match) => sportFilter === 'All' || match.sport === sportFilter);
  const filteredMarkets = sourceMatches.filter((match) => sportFilter === 'All' || match.sport === sportFilter);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={tab === 'live' ? 'Live Betting' : 'Sports Betting'} subtitle="Choose a market to add it to your bet slip" />
        {tab === 'live' && <div className="flex gap-2 pb-5">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5"><Printer className="h-4 w-4" /> Print</button>
          <button type="button" onClick={() => void reloadMarkets()} disabled={marketLoading} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${marketLoading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>}
      </div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-white/5 bg-neutral-900/50 p-1">
        {[{ key: 'live', label: 'Live Betting', icon: Radio }, { key: 'upcoming', label: 'Upcoming', icon: Clock }, { key: 'results', label: 'Results', icon: Trophy }, { key: 'mine', label: 'My Bets', icon: Star }, { key: 'feed', label: 'Sports data', icon: TrendingUp }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors ${tab === t.key ? 'bg-green-500 font-semibold text-black' : 'text-neutral-400 hover:text-white'}`}><t.icon className="h-4 w-4" /> {t.label}</button>
        ))}
      </div>
      {tab !== 'feed' && <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {sports.map((s) => (
          <button key={s} onClick={() => setSportFilter(s)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${sportFilter === s ? 'border border-white/10 bg-white/10 text-white' : 'border border-transparent bg-neutral-900/50 text-neutral-400 hover:text-white'}`}>{s}</button>
        ))}
      </div>}
      {tab === 'feed' ? <ExternalSportsFeed sport={feedSport} setSport={setFeedSport} /> : <>
        {tab === 'mine' ? <>
          <div className="mb-3"><ErrorNote msg={mineError} /></div>
          {mineLoading ? <p className="py-8 text-center text-sm text-neutral-500">Loading your matches…</p> : <MatchList matches={filteredMine} empty={user ? 'You have not bet on any matches yet' : 'Sign in to see your matches'} />}
        </> : <>
          {tab === 'live' && <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-xs text-green-100/80">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-green-300" />
            <p>The bet slip uses internal markets managed by the operator. Global fixtures and bookmaker prices are shown below from the configured provider, but are read-only and are not submitted as bets.</p>
          </div>}
          <div className="mb-3"><ErrorNote msg={marketError} /></div>
          {marketLoading && !marketData
            ? <p className="py-8 text-center text-sm text-neutral-500">Loading {tab === 'live' ? 'live markets' : tab === 'upcoming' ? 'upcoming matches' : 'results'}…</p>
            : filteredMarkets.length === 0 && (tab === 'live' || tab === 'upcoming')
              ? <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-6 text-center">
                <p className="text-sm font-semibold text-neutral-200">
                  {tab === 'live' ? 'No internal live markets right now' : 'No internal upcoming markets right now'}
                </p>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-neutral-400">Showing international provider fixtures and prices below. Event country is not restricted; bookmaker regions control which quote sources are included.</p>
              </div>
              : <MatchList
                matches={filteredMarkets}
                variant={tab === 'live' ? 'live' : 'cards'}
                empty="No results yet"
              />}
        </>}
        {(tab === 'live' || tab === 'upcoming') && <div className="mt-6"><ExternalOddsFeed /></div>}
      </>}
      {tab === 'mine' && <div className="mt-6 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
        <TrendingUp className="h-5 w-5 text-green-400" />
        <p className="text-sm text-neutral-300"><span className="font-semibold text-green-400">Tip:</span> tap any odds to open your bet slip.</p>
      </div>}
    </div>
  );
}

function ExternalSportsFeed({ sport, setSport }: { sport: string; setSport: (value: string) => void }) {
  const [source, setSource] = useState<'thesportsdb' | 'sportapi' | 'odds'>('sportapi');
  return <section>
    <div className="mb-4 flex flex-wrap gap-2">
      {[
        { key: 'thesportsdb', label: 'TheSportsDB' },
        { key: 'sportapi', label: 'SportAPI' },
        { key: 'odds', label: 'Bookmaker odds' },
      ].map((item) => <button key={item.key} onClick={() => setSource(item.key as typeof source)} className={`rounded-lg px-3 py-2 text-xs font-medium ${source === item.key ? 'bg-green-500 text-black' : 'border border-white/10 text-neutral-400 hover:text-white'}`}>{item.label}</button>)}
    </div>
    {source === 'odds'
      ? <ExternalOddsFeed />
      : <FixtureFeed source={source} sport={sport} setSport={setSport} />}
  </section>;
}

function FixtureFeed({ source, sport, setSport }: {
  source: 'thesportsdb' | 'sportapi';
  sport: string;
  setSport: (value: string) => void;
}) {
  const date = new Date().toISOString().slice(0, 10);
  const path = source === 'sportapi'
    ? `/sports-feed/sportapi/events?date=${date}`
    : `/sports-feed/events?date=${date}&sport=${encodeURIComponent(sport)}`;
  const { data, error, loading, reload } = useAsync(
    () => api<{ provider: string; date: string; fetchedAt: string; events: SportsFeedEvent[] }>(
      path,
      { auth: false },
    ),
    [path],
  );
  useEffect(() => {
    const timer = window.setInterval(() => { void reload(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-900/50 p-4">
      <div><h2 className="font-semibold text-white">{source === 'sportapi' ? 'Football fixtures & results' : 'Fixtures & results'}</h2><p className="mt-1 text-xs text-neutral-500">External information only; events here have no betting odds or bet slips.</p></div>
      <div className="flex items-center gap-2">
        {source === 'thesportsdb' && <select value={sport} onChange={(e) => setSport(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white">
          {['Soccer', 'Basketball', 'American Football', 'Baseball', 'Cricket', 'Tennis', 'Ice Hockey', 'Rugby'].map((name) => <option key={name}>{name}</option>)}
        </select>}
        <button onClick={() => void reload()} disabled={loading} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 disabled:opacity-50">Refresh</button>
      </div>
    </div>
    <div className="mb-3"><ErrorNote msg={error} /></div>
    {loading && <p className="py-6 text-center text-sm text-neutral-500">Loading provider events…</p>}
    {!loading && !error && !data?.events.length && <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-400">No {source === 'sportapi' ? 'football' : sport} events returned for today.</div>}
    <div className="space-y-2">
      {data?.events.map((event) => <ProviderFixtureCard key={event.id} event={event} />)}
    </div>
    {data && <p className="mt-3 text-right text-[10px] text-neutral-600">Source: {data.provider} · Updated {new Date(data.fetchedAt).toLocaleTimeString()}</p>}
  </section>;
}

function ExternalOddsFeed() {
  const [sportKey, setSportKey] = useState('soccer_epl');
  const [region, setRegion] = useState('us,us2,uk,eu,au');
  const [market, setMarket] = useState('h2h');
  const [requested, setRequested] = useState(true);
  const query = `/sports-feed/odds?sportKey=${encodeURIComponent(sportKey)}&regions=${region}&markets=${market}`;
  const { data: sportsData, error: sportsError } = useAsync(
    () => api<{ sports: OddsSport[] }>('/sports-feed/odds/sports', { auth: false }),
  );
  const { data, error, loading, reload } = useAsync(
    () => requested
      ? api<{ provider: string; fetchedAt: string; events: OddsFeedEvent[] }>(query, { auth: false })
      : Promise.resolve(null),
    [query, requested],
  );
  const fallbackSports = [
    { key: 'soccer_epl', title: 'English Premier League', group: 'Soccer' },
    { key: 'soccer_uefa_champs_league', title: 'UEFA Champions League', group: 'Soccer' },
    { key: 'soccer_usa_mls', title: 'Major League Soccer', group: 'Soccer' },
    { key: 'basketball_nba', title: 'NBA', group: 'Basketball' },
    { key: 'basketball_ncaab', title: 'NCAA Basketball', group: 'Basketball' },
  ];
  const availableSports = sportsData?.sports.length
    ? sportsData.sports
    : fallbackSports;

  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-900/50 p-4">
      <div className="min-w-[220px] flex-1"><h2 className="font-semibold text-white">Worldwide fixtures & bookmaker odds</h2><p className="mt-1 text-xs text-neutral-400">Events from any country. “All regions” combines quotes from supported US, UK, Europe and Australia bookmakers. These provider prices are read-only and do not enter bet slips.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Odds sport" value={sportKey} onChange={(e) => setSportKey(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white">
          {availableSports.map((sport) => <option key={sport.key} value={sport.key}>{sport.group} · {sport.title}</option>)}
        </select>
        <select aria-label="Odds region" value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white">
          <option value="us,us2,uk,eu,au">All supported regions</option>
          <option value="uk">United Kingdom</option>
          <option value="eu">Europe</option>
          <option value="us,us2">United States</option>
          <option value="au">Australia</option>
        </select>
        <select aria-label="Odds market" value={market} onChange={(e) => setMarket(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white">
          <option value="h2h">Match winner</option><option value="spreads">Spread</option><option value="totals">Totals</option>
        </select>
        <button onClick={() => requested ? void reload() : setRequested(true)} disabled={loading} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 disabled:opacity-50">{loading ? 'Loading…' : 'Refresh odds'}</button>
      </div>
    </div>
    <div className="mb-3"><ErrorNote msg={error} /></div>
    {!sportsData && <div className="mb-3"><ErrorNote msg={sportsError} /></div>}
    {loading && requested && <p className="py-6 text-center text-sm text-neutral-500">Loading bookmaker odds…</p>}
    {requested && !loading && !error && !data?.events.length && <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-400">No odds returned for this sport and region.</div>}
    <div className="space-y-3">
      {data?.events.map((event) => <article key={event.id} className="rounded-xl border border-white/5 bg-neutral-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{event.home} vs {event.away}</p><p className="mt-1 text-xs text-neutral-500">{event.sport} · {new Date(event.startsAt).toLocaleString()}</p></div>
        </div>
        {event.bookmakers.length === 0 && <p className="text-xs text-neutral-500">No bookmaker quotes available.</p>}
        <BestBookmakerQuotes event={event} />
      </article>)}
    </div>
    {data && <p className="mt-3 text-right text-[10px] text-neutral-600">Source: {data.provider} · Updated {new Date(data.fetchedAt).toLocaleTimeString()}</p>}
  </section>;
}

function BestBookmakerQuotes({ event }: { event: OddsFeedEvent }) {
  interface BestQuote { name: string; point: number | null; price: number; bookmaker: string; updatedAt: string | null }
  const marketQuotes = new Map<string, BestQuote>();
  for (const bookmaker of event.bookmakers) {
    for (const market of bookmaker.markets) {
      for (const outcome of market.outcomes) {
        const key = `${market.key}:${outcome.name}:${outcome.point ?? ''}`;
        const current = marketQuotes.get(key);
        if (!current || outcome.price > current.price) {
          marketQuotes.set(key, {
            name: outcome.description ?? outcome.name,
            point: outcome.point,
            price: outcome.price,
            bookmaker: bookmaker.name,
            updatedAt: market.updatedAt ?? bookmaker.updatedAt,
          });
        }
      }
    }
  }
  if (marketQuotes.size === 0) return null;
  const byMarket = new Map<string, BestQuote[]>();
  for (const [key, quote] of marketQuotes) {
    const market = key.split(':', 1)[0];
    byMarket.set(market, [...(byMarket.get(market) ?? []), quote]);
  }
  return <div className="space-y-3">
    {[...byMarket.entries()].map(([market, quotes]) => <div key={market} className="rounded-lg border border-white/5 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{market} · best available quote</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {quotes.map((quote, index) => <div key={`${quote.name}:${quote.point ?? ''}:${index}`} className="rounded-md bg-neutral-950/70 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-neutral-300">{quote.name}{quote.point === null ? '' : ` ${quote.point > 0 ? '+' : ''}${quote.point}`}</span>
            <strong className="shrink-0 text-sm tabular-nums text-green-300">{quote.price.toFixed(2)}</strong>
          </div>
          <p className="mt-1 truncate text-[10px] text-neutral-500">{quote.bookmaker}{quote.updatedAt ? ` · ${new Date(quote.updatedAt).toLocaleTimeString()}` : ''}</p>
        </div>)}
      </div>
    </div>)}
  </div>;
}
