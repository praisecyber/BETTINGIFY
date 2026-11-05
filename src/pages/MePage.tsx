import { navigate } from '../router';
import { initials, logout, useSession, formatMoney } from '../lib/session';
import { RequireAuth } from '../components/RequireAuth';
import { ChevronRight, CircleHelp, Gift, Headphones, LogOut, Settings, ShieldCheck, Trophy, UserRound, Wallet } from 'lucide-react';

export function MePage() {
  const { user, wallet } = useSession();
  if (!user) return <RequireAuth><div /></RequireAuth>;
  const links = [
    { label: 'My profile', desc: 'Personal details and verification', icon: UserRound, route: '/account' },
    { label: 'Wallet', desc: 'Deposit, withdraw and payment methods', icon: Wallet, route: '/deposit' },
    { label: 'My bets', desc: 'Open bets and betting history', icon: Trophy, route: '/open-bets' },
    { label: 'Rewards & gifts', desc: 'Bonuses, streaks and free bets', icon: Gift, route: '/gifts' },
  ];
  const support = [
    { label: 'Settings', icon: Settings },
    { label: 'Responsible gaming', icon: ShieldCheck },
    { label: 'Help center', icon: CircleHelp },
    { label: 'Contact support', icon: Headphones },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-green-400">BETTINGIFY</p><h1 className="mt-1 text-2xl font-bold text-white">My account</h1></div><button className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white"><Settings className="h-5 w-5" /></button></div>

      <div className="mb-5 rounded-2xl border border-white/5 bg-gradient-to-br from-green-500/15 via-neutral-900 to-neutral-900 p-5">
        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 text-lg font-bold text-black">{initials(user)}</div><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-bold text-white">{user.firstName} {user.lastName}</h2></div><p className="text-xs text-neutral-400">{user.email}</p></div><button onClick={() => navigate('/account')} className="text-neutral-500 hover:text-white"><ChevronRight className="h-5 w-5" /></button></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-neutral-500">Available balance</p><p className="mt-1 text-xl font-bold text-white">{wallet ? formatMoney(wallet.balance) : '—'}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-neutral-500">Bonus funds</p><p className="mt-1 text-xl font-bold text-green-300">{wallet ? formatMoney(wallet.bonus) : '—'}</p></div></div>
        <div className="mt-4 flex gap-2"><button onClick={() => navigate('/deposit')} className="flex-1 rounded-lg bg-green-500 py-2.5 text-sm font-bold text-black hover:bg-green-400">Deposit</button><button onClick={() => navigate('/withdraw')} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/5">Withdraw</button></div>
      </div>

      <div className="mb-5 rounded-2xl border border-white/5 bg-neutral-900/50 p-2">{links.map((item) => <button key={item.label} onClick={() => navigate(item.route)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10"><item.icon className="h-4 w-4 text-green-400" /></div><div className="flex-1"><p className="text-sm font-semibold text-white">{item.label}</p><p className="text-xs text-neutral-500">{item.desc}</p></div><ChevronRight className="h-4 w-4 text-neutral-600" /></button>)}</div>

      <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-2">{support.map((item) => <button key={item.label} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5"><item.icon className="h-4 w-4 text-neutral-500" /><span className="flex-1 text-sm text-neutral-300">{item.label}</span><ChevronRight className="h-4 w-4 text-neutral-600" /></button>)}<button onClick={() => void logout().then(() => navigate('/'))} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-rose-500/5"><LogOut className="h-4 w-4 text-rose-400" /><span className="text-sm text-rose-400">Log out</span></button></div>
      <p className="mt-6 text-center text-[10px] text-neutral-600">Bettingify v2.4.1 · Licensed and secure</p>
    </div>
  );
}
