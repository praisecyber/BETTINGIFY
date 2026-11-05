import type { ReactNode } from 'react';
import { useState } from 'react';
import { navigate, useHashRoute } from './router';
import { initials, useSession, formatMoney } from './lib/session';
import { Logo } from './components/Logo';
import {
  Home, Trophy, ArrowDownToLine, ArrowUpFromLine,
  Receipt, Gift, User, Calendar, Star, Plane, Menu, X,
  Bell, Search, ChevronRight, Plus, Gamepad2, ShieldCheck, Radio, CircleDollarSign,
} from 'lucide-react';

const navItems = [
  { route: '/', label: 'Home', icon: Home },
  { route: '/az', label: 'Live Betting', icon: Trophy },
  { route: '/live-scores', label: 'Live Scores', icon: Radio },
  { route: '/virtuals', label: 'Virtuals', icon: Gamepad2 },
  { route: '/jackpot', label: 'Jackpot', icon: CircleDollarSign },
  { route: '/live-games', label: 'Live Games', icon: Gamepad2 },
  { route: '/AVIATOR', label: 'Aviator', icon: Plane },
  { route: '/games', label: 'Games', icon: Gamepad2 },
  { route: '/promotions', label: 'Promotions', icon: Star },
  { route: '/gifts', label: 'Gifts', icon: Gift },
  { route: '/my-matches', label: 'My Matches', icon: Calendar },
  { route: '/open-bets', label: 'Open Bets', icon: Receipt },
  { route: '/transactions', label: 'Transactions', icon: Receipt },
];

const accountItems = [
  { route: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  { route: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { route: '/account', label: 'Account', icon: User },
  { route: '/me', label: 'Me', icon: User },
];

export function Layout({ children }: { children: ReactNode }) {
  const route = useHashRoute();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, wallet } = useSession();
  const balanceText = wallet ? formatMoney(wallet.balance) : '—';

  const go = (r: string) => {
    navigate(r);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5">
        <Logo size={38} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Menu</p>
        {navItems.map((item) => {
          const active = route === item.route || (item.route === '/az' && route.startsWith('/az'));
          return (
            <button
              key={item.route}
              onClick={() => go(item.route)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? 'bg-green-500/15 text-green-400 font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              {item.label}
              {item.route === '/AVIATOR' && (
                <span className="ml-auto rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">HOT</span>
              )}
            </button>
          );
        })}

        <div className="mt-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Account</p>
          {accountItems.map((item) => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                onClick={() => go(item.route)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active ? 'bg-green-500/15 text-green-400 font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon style={{ width: 18, height: 18 }} />
                {item.label}
              </button>
            );
          })}
        </div>

        {user?.role === 'admin' && <div className="mt-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Administration</p>
          <button
            onClick={() => go('/admin')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              route === '/admin' ? 'bg-green-500/15 text-green-400 font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShieldCheck style={{ width: 18, height: 18 }} /> Admin panel
          </button>
        </div>}
      </div>

      <div className="shrink-0 p-4">
        <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/10 border border-green-500/20 p-4">
          <p className="text-xs text-neutral-300 mb-1">Balance</p>
          <p className="text-2xl font-bold text-white">{balanceText}</p>
          <button
            onClick={() => go('/deposit')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Deposit
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/5 bg-neutral-900 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-white/5 bg-neutral-900 lg:hidden">
            <div className="flex justify-end p-4">
              <button onClick={() => setMobileOpen(false)} className="text-neutral-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl px-4 py-3 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="text-neutral-300 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex w-full items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search games, sports, matches..."
                className="bg-transparent text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none w-full"
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-400" />
            </button>
            {!user && <button onClick={() => go('/register')} className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:border-green-500/30 hover:text-white sm:block">Register</button>}
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5">
              <span className="text-xs text-neutral-400">Balance</span>
              <span className="text-sm font-bold text-white">{balanceText}</span>
            </div>
            <button
              onClick={() => go('/account')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 text-black font-bold text-sm"
            >
              {initials(user)}
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-6 lg:py-6 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/5 bg-neutral-900 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
          {navItems.slice(0, 5).map((item) => {
            const active = route === item.route;
            const label = item.route === '/az' ? 'Betting' : item.route === '/live-scores' ? 'Scores' : item.label;
            return (
              <button
                key={item.route}
                onClick={() => go(item.route)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 ${active ? 'text-green-400' : 'text-neutral-500'}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
        <span>BETTINGIFY</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-400">{title}</span>
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
    </div>
  );
}
