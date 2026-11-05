import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { Game } from '../lib/types';
import { navigate } from '../router';
import { PageHeader } from '../Layout';
import { Heart, Search, Sparkles } from 'lucide-react';

const categories = ['All Games', 'Favorites'];

export function GamesPage() {
  const [category, setCategory] = useState('All Games');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const { data } = useAsync(() => api<{ games: Game[] }>('/games', { auth: false }));
  const games = (data?.games ?? []).filter((game) => game.playable);
  const visible = games.filter((game) => {
    if (category === 'Favorites' && !favorites.includes(game.id)) return false;
    if (query && !game.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const toggleFavorite = (id: string) => setFavorites((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

  return (
    <div>
      <PageHeader title="Games" subtitle="Playable games" />
      <div className="mb-5 grid gap-4 overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-600/20 via-green-600/15 to-transparent p-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-green-400"><Sparkles className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-widest">Featured game</span></div>
          <h2 className="text-2xl font-bold text-white">Take off with Aviator</h2>
          <p className="mt-1 text-sm text-neutral-400">Live multipliers, instant cash-outs, and big wins.</p>
        </div>
        <button onClick={() => navigate('/AVIATOR')} className="self-end rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-400">Play now</button>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${category === item ? 'bg-green-500 text-black' : 'bg-neutral-900/70 text-neutral-400 hover:text-white'}`}>{item}</button>)}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-neutral-900/70 px-3 py-2 md:w-52">
          <Search className="h-4 w-4 text-neutral-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search games" className="w-full bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((game) => (
          <div key={game.id} className="group relative overflow-hidden rounded-xl border border-white/5 bg-neutral-900/50 hover:border-green-500/30 transition-all">
            <button onClick={() => toggleFavorite(game.id)} className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/80"><Heart className={`h-3.5 w-3.5 ${favorites.includes(game.id) ? 'fill-rose-400 text-rose-400' : ''}`} /></button>
            <button onClick={() => navigate(game.id === 'roulette' ? '/ROULETTE' : game.id === 'slots' ? '/SLOTS' : '/AVIATOR')} className="block w-full text-left">
              <div className="aspect-[4/3] overflow-hidden"><img src={game.image} alt={game.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>
              <div className="p-3"><div className="mb-1 flex items-center justify-between"><h3 className="truncate text-sm font-semibold text-white">{game.name}</h3><span className="ml-2 text-[10px] text-green-400">{game.rtp}</span></div><p className="text-xs text-neutral-500">{game.tag}</p></div>
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
