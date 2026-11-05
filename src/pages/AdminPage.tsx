import { useCallback, useEffect, useState } from 'react';
import {
  Activity, CircleDollarSign, ClipboardList, Mail, Phone, RefreshCw, ShieldCheck,
  Trophy, UserPlus, Users, Wallet,
} from 'lucide-react';
import { PageHeader } from '../Layout';
import { ErrorNote } from '../components/RequireAuth';
import { api, errMsg } from '../lib/api';
import { login, logout, useSession } from '../lib/session';
import type { ApiMatch, User } from '../lib/types';

type Tab = 'overview' | 'users' | 'payments' | 'matches' | 'admins';
interface Stats {
  users: number; deposits: number; withdrawals: number; pendingWithdrawals: number;
  turnover: number; grossGamingRevenue: number; playerLiabilities: number;
}
interface AdminUser {
  id: string; email: string; phone: string; name: string; status: 'active' | 'suspended';
  createdAt: string; dateOfBirth: string | null; emailVerified: boolean;
  ageVerificationStatus: User['ageVerificationStatus']; identityVerificationStatus: User['identityVerificationStatus'];
  dailyDepositLimit: number | null; monthlyDepositLimit: number | null; selfExcludedUntil: string | null;
  cash: number; bonus: number;
}
interface AdminPayment {
  id: string; userId: string; kind: 'deposit' | 'withdraw'; method: string; amount: number; bonus: number;
  status: string; destination: string | null; note: string | null; createdAt: string;
}
interface VerificationEvent { actorId: string; age: string; identity: string; note: string | null; createdAt: string }
interface AdminAccount {
  id: string; email: string; phone: string; name: string; status: 'active' | 'suspended';
  createdAt: string; createdBy: string;
}
type ReviewStatus = Exclude<AdminUser['ageVerificationStatus'], 'unverified'>;

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users & KYC', icon: Users },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'matches', label: 'Matches', icon: Trophy },
  { id: 'admins', label: 'Administrators', icon: ShieldCheck },
];
const money = (value: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);
const date = (value: string) => new Date(value).toLocaleString();
const statusClass = (status: string) => status === 'verified' || status === 'completed' || status === 'active' || status === 'won'
  ? 'text-green-400' : status === 'rejected' || status === 'failed' || status === 'suspended' || status === 'lost'
    ? 'text-rose-300' : 'text-amber-300';

export function AdminPage() {
  const { user, ready } = useSession();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        setStats(await api<Stats>('/admin/stats'));
      } else if (tab === 'users') {
        const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
        setUsers((await api<{ users: AdminUser[] }>(`/admin/users${q}`)).users);
      } else if (tab === 'payments') {
        setPayments((await api<{ payments: AdminPayment[] }>('/admin/payments')).payments);
      } else if (tab === 'admins') {
        setAdmins((await api<{ admins: AdminAccount[] }>('/admin/admins')).admins);
      } else {
        const statuses = ['scheduled', 'live', 'finished', 'cancelled'] as const;
        const lists = await Promise.all(statuses.map((status) =>
          api<{ matches: ApiMatch[] }>(`/matches?status=${status}`, { auth: false }),
        ));
        setMatches(lists.flatMap((list) => list.matches));
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [search, tab, user]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!ready) return <p className="py-16 text-center text-sm text-neutral-500">Loading…</p>;
  if (!user) return <AdminSignIn />;
  if (user.role !== 'admin') return <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/20 bg-neutral-900/60 p-8 text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-rose-300" /><h1 className="text-xl font-bold text-white">Administrator access only</h1><p className="mt-2 text-sm text-neutral-400">This account is not permitted to access administrative tools.</p><button onClick={() => void logout()} className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-200 hover:bg-white/5">Sign out</button></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Admin panel" subtitle="Manage operations, accounts, payments, sports markets, and administrators" />
        <button onClick={() => void load()} disabled={loading} className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/5 bg-neutral-900/50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); setNotice(null); }} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${tab === id ? 'bg-green-500 text-black' : 'text-neutral-400 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>
      <div className="mb-4 space-y-2"><ErrorNote msg={error} />{notice && <p className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-300">{notice}</p>}</div>
      {loading && <p className="mb-3 text-xs text-neutral-500">Refreshing data…</p>}
      {tab === 'overview' && <Overview stats={stats} />}
      {tab === 'users' && <UsersPanel users={users} search={search} setSearch={setSearch} act={act} />}
      {tab === 'payments' && <PaymentsPanel payments={payments} act={act} />}
      {tab === 'matches' && <MatchesPanel matches={matches} act={act} />}
      {tab === 'admins' && <AdminsPanel admins={admins} onCreated={load} />}
    </div>
  );
}

function AdminSignIn() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(identifier, password);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return <div className="mx-auto max-w-md">
    <PageHeader title="Administrator sign in" subtitle="Sign in with an administrator account to continue" />
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900/60 p-6">
      <label className="block text-xs font-medium text-neutral-400">Admin email or phone
        <span className="relative mt-1.5 block"><Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" /><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white focus:border-green-500/50 focus:outline-none" /></span>
      </label>
      <label className="block text-xs font-medium text-neutral-400">Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-green-500/50 focus:outline-none" />
      </label>
      <ErrorNote msg={error} />
      <button disabled={busy || !identifier || !password} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:bg-neutral-800 disabled:text-neutral-600">{busy ? 'Signing in…' : 'Sign in securely'}</button>
      <p className="text-center text-xs text-neutral-500">Administrator accounts are created by an existing administrator.</p>
    </form>
  </div>;
}

function AdminsPanel({ admins, onCreated }: { admins: AdminAccount[]; onCreated: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/admin/admins', { body: { email, phone, firstName, lastName, password } });
      setEmail('');
      setPhone('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setConfirmation('');
      setNotice('Administrator account created.');
      await onCreated();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return <section className="space-y-5">
    <div><h2 className="font-semibold text-white">Create administrator</h2><p className="text-xs text-neutral-500">Only signed-in administrators can provision another admin account.</p></div>
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-white/5 bg-neutral-900/60 p-4 sm:grid-cols-2 sm:p-5">
      <label className="text-xs text-neutral-400">First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required maxLength={60} className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none" /></label>
      <label className="text-xs text-neutral-400">Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required maxLength={60} className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none" /></label>
      <label className="text-xs text-neutral-400">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none" /></label>
      <label className="text-xs text-neutral-400">Phone<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none" /></label>
      <label className="text-xs text-neutral-400">Password (12+ characters, mixed case, number and symbol)<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={12} maxLength={128} className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none" /></label>
      <label className="text-xs text-neutral-400">Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={12} maxLength={128} className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none" /></label>
      <div className="space-y-2 sm:col-span-2"><ErrorNote msg={error} />{notice && <p className="text-xs text-green-300">{notice}</p>}</div>
      <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:opacity-50 sm:col-span-2"><UserPlus className="h-4 w-4" />{busy ? 'Creating…' : 'Create administrator'}</button>
    </form>
    <div className="space-y-3">
      <div><h2 className="font-semibold text-white">Administrator accounts</h2><p className="text-xs text-neutral-500">Creation source is recorded for accounts created in the admin panel.</p></div>
      {!admins.length && <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-6 text-center text-sm text-neutral-500">No administrator accounts found.</p>}
      {admins.map((admin) => <article key={admin.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-900/60 p-4">
        <div><p className="font-semibold text-white">{admin.name}</p><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400"><span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{admin.email}</span><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{admin.phone}</span></p><p className="mt-1 text-[11px] text-neutral-600">Created by {admin.createdBy} · {date(admin.createdAt)}</p></div>
        <span className={`text-xs font-semibold ${statusClass(admin.status)}`}>{admin.status}</span>
      </article>)}
    </div>
  </section>;
}

function Overview({ stats }: { stats: Stats | null }) {
  if (!stats) return <p className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-500">No statistics available.</p>;
  const cards = [
    { label: 'Player accounts', value: stats.users.toLocaleString(), icon: Users, tone: 'text-blue-300' },
    { label: 'Completed deposits', value: money(stats.deposits), icon: CircleDollarSign, tone: 'text-green-300' },
    { label: 'Completed withdrawals', value: money(stats.withdrawals), icon: Wallet, tone: 'text-amber-300' },
    { label: 'Pending withdrawals', value: money(stats.pendingWithdrawals), icon: ClipboardList, tone: 'text-orange-300' },
    { label: 'Bet turnover', value: money(stats.turnover), icon: Trophy, tone: 'text-purple-300' },
    { label: 'Gross gaming revenue', value: money(stats.grossGamingRevenue), icon: Activity, tone: 'text-green-300' },
    { label: 'Player liabilities', value: money(stats.playerLiabilities), icon: ShieldCheck, tone: 'text-rose-300' },
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-white/5 bg-neutral-900/60 p-5"><card.icon className={`mb-4 h-5 w-5 ${card.tone}`} /><p className="text-xs text-neutral-500">{card.label}</p><p className="mt-1 break-words text-2xl font-bold text-white">{card.value}</p></div>)}</div>;
}

function UsersPanel({ users, search, setSearch, act }: {
  users: AdminUser[]; search: string; setSearch: (value: string) => void;
  act: (fn: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Player accounts</h2><p className="text-xs text-neutral-500">Review verification status and account controls</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or phone" className="w-full max-w-sm rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none" /></div>
    {!users.length && <Empty>No matching users.</Empty>}
    {users.map((player) => <UserCard key={player.id} player={player} act={act} />)}
  </section>;
}

function UserCard({ player, act }: { player: AdminUser; act: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [age, setAge] = useState<ReviewStatus>(player.ageVerificationStatus === 'unverified' ? 'pending' : player.ageVerificationStatus);
  const [identity, setIdentity] = useState<ReviewStatus>(player.identityVerificationStatus === 'unverified' ? 'pending' : player.identityVerificationStatus);
  const [note, setNote] = useState('');
  const [events, setEvents] = useState<VerificationEvent[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const review = () => {
    if (!note.trim()) return;
    void act(() => api(`/admin/users/${player.id}/verification`, { method: 'PATCH', body: { age, identity, note: note.trim() } }), `Verification review saved for ${player.email}`);
    setNote('');
  };
  const showHistory = async () => {
    setHistoryError(null);
    try {
      setEvents((await api<{ events: VerificationEvent[] }>(`/admin/users/${player.id}/verification-events`)).events);
    } catch (e) {
      setHistoryError(errMsg(e));
    }
  };
  return <article className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-white">{player.name}</h3><p className="text-sm text-neutral-400">{player.email} · {player.phone}</p><p className="mt-1 text-xs text-neutral-600">DOB: {player.dateOfBirth ?? 'Not provided'} · Joined {date(player.createdAt)}</p></div>
      <div className="text-right text-xs"><p>Balance: <span className="text-white">{money(player.cash + player.bonus)}</span></p><p className="mt-1">Status: <span className={statusClass(player.status)}>{player.status}</span></p></div>
    </div>
    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
      <p>Email: <span className={player.emailVerified ? 'text-green-400' : 'text-amber-300'}>{player.emailVerified ? 'verified' : 'unverified'}</span></p>
      <p>Age check: <span className={statusClass(player.ageVerificationStatus)}>{player.ageVerificationStatus}</span></p>
      <p>Identity: <span className={statusClass(player.identityVerificationStatus)}>{player.identityVerificationStatus}</span></p>
      <p>Daily limit: {player.dailyDepositLimit === null ? 'none' : money(player.dailyDepositLimit)}</p>
      <p>Monthly limit: {player.monthlyDepositLimit === null ? 'none' : money(player.monthlyDepositLimit)}</p>
      <p>Self-exclusion: {player.selfExcludedUntil === 'permanent' ? 'permanent' : player.selfExcludedUntil ? date(player.selfExcludedUntil) : 'none'}</p>
    </div>
    <div className="mt-4 grid gap-2 border-t border-white/5 pt-4 sm:grid-cols-[1fr_1fr_2fr_auto]">
      <select value={age} onChange={(e) => setAge(e.target.value as ReviewStatus)} className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white"><option value="pending">Age: pending</option><option value="verified">Age: verified</option><option value="rejected">Age: rejected</option></select>
      <select value={identity} onChange={(e) => setIdentity(e.target.value as ReviewStatus)} className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white"><option value="pending">ID: pending</option><option value="verified">ID: verified</option><option value="rejected">ID: rejected</option></select>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required audit note" className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none" />
      <button onClick={review} disabled={!note.trim()} className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">Save review</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={() => void act(() => api(`/admin/users/${player.id}/status`, { method: 'PATCH', body: { status: player.status === 'active' ? 'suspended' : 'active' } }), `Account ${player.status === 'active' ? 'suspended' : 'activated'}`)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">{player.status === 'active' ? 'Suspend account' : 'Reactivate account'}</button>
      <button onClick={() => void showHistory()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">Verification history</button>
    </div>
    {historyError && <p className="mt-3 text-xs text-rose-300">{historyError}</p>}
    {events && <div className="mt-3 space-y-1 rounded-lg bg-black/20 p-3 text-xs text-neutral-400">{events.length ? events.map((event, index) => <p key={`${event.createdAt}-${index}`}>{date(event.createdAt)} · age {event.age}, identity {event.identity} · {event.note ?? 'No note'}</p>) : <p>No review history.</p>}</div>}
  </article>;
}

function PaymentsPanel({ payments, act }: { payments: AdminPayment[]; act: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return <section className="space-y-3">
    <div><h2 className="font-semibold text-white">Payment queue</h2><p className="text-xs text-neutral-500">Pending withdrawals and deposits are shown first</p></div>
    {!payments.length && <Empty>No payment records found.</Empty>}
    {payments.map((payment) => <article key={payment.id} className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-semibold text-white">{payment.kind === 'withdraw' ? 'Withdrawal' : 'Deposit'} · {money(payment.amount)}</p><p className="mt-1 text-xs text-neutral-400">{payment.method} · user {payment.userId}</p><p className="mt-1 break-all text-[10px] text-neutral-600">ID {payment.id} · {date(payment.createdAt)}</p>{payment.destination && <p className="mt-1 text-xs text-neutral-500">Destination: {payment.destination}</p>}{payment.note && <p className="mt-1 text-xs text-neutral-500">Note: {payment.note}</p>}</div>
        <span className={`text-xs font-semibold ${statusClass(payment.status)}`}>{payment.status}</span>
      </div>
      {payment.status === 'pending' && <div className="mt-3 flex flex-wrap gap-2">
        {payment.kind === 'withdraw' ? <>
          <button onClick={() => void act(() => api(`/admin/withdrawals/${payment.id}/approve`, { body: {} }), 'Withdrawal approved')} className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black">Approve withdrawal</button>
          <input value={reasons[payment.id] ?? ''} onChange={(e) => setReasons((all) => ({ ...all, [payment.id]: e.target.value }))} placeholder="Rejection reason" className="min-w-40 flex-1 rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white" />
          <button disabled={!reasons[payment.id]?.trim()} onClick={() => void act(() => api(`/admin/withdrawals/${payment.id}/reject`, { body: { reason: reasons[payment.id] } }), 'Withdrawal rejected and funds returned')} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300 disabled:opacity-50">Reject</button>
        </> : <>
          <button onClick={() => void act(() => api(`/admin/deposits/${payment.id}/confirm`, { body: {} }), 'Deposit confirmed')} className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black">Confirm deposit</button>
          <button onClick={() => void act(() => api(`/admin/deposits/${payment.id}/fail`, { body: {} }), 'Deposit marked failed')} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300">Mark failed</button>
        </>}
      </div>}
    </article>)}
  </section>;
}

function MatchesPanel({ matches, act }: { matches: ApiMatch[]; act: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [sport, setSport] = useState('Football');
  const [league, setLeague] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [homeOdds, setHomeOdds] = useState('2.00');
  const [drawOdds, setDrawOdds] = useState('3.20');
  const [awayOdds, setAwayOdds] = useState('2.50');
  const create = (event: React.FormEvent) => {
    event.preventDefault();
    void act(() => api('/admin/matches', { body: {
      sport, league, home, away, startsAt: new Date(startsAt).toISOString(),
      odds: { home: Number(homeOdds), draw: Number(drawOdds), away: Number(awayOdds) },
    } }), 'Match created');
    setHome(''); setAway('');
  };
  const sorted = [...matches].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return <section className="space-y-4">
    <form onSubmit={create} className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
      <h2 className="mb-3 font-semibold text-white">Create a match</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex gap-2">
          <input required value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Sport" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
          <button type="button" onClick={() => setSport('Virtual Football')} className="rounded-lg border border-white/10 px-3 text-xs text-neutral-300 hover:bg-white/5">Virtuals</button>
        </div>
        <input required value={league} onChange={(e) => setLeague(e.target.value)} placeholder="League" className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
        <input required value={home} onChange={(e) => setHome(e.target.value)} placeholder="Home team" className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
        <input required value={away} onChange={(e) => setAway(e.target.value)} placeholder="Away team" className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
        <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
        <div className="grid grid-cols-3 gap-1"><input required type="number" step="0.01" min="1.01" max="1000" value={homeOdds} onChange={(e) => setHomeOdds(e.target.value)} aria-label="Home odds" className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white" /><input required type="number" step="0.01" min="0" max="1000" value={drawOdds} onChange={(e) => setDrawOdds(e.target.value)} aria-label="Draw odds (0 disables)" className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white" /><input required type="number" step="0.01" min="1.01" max="1000" value={awayOdds} onChange={(e) => setAwayOdds(e.target.value)} aria-label="Away odds" className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white" /></div>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Virtual Football fixtures appear in Virtuals when Sport is set to “Virtual Football”. Enter only provider-supplied fixtures and results.</p>
      <button className="mt-3 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-black">Create match</button>
    </form>
    {!sorted.length && <Empty>No matches found.</Empty>}
    {sorted.map((match) => <MatchAdminCard key={match.id} match={match} act={act} />)}
  </section>;
}

function MatchAdminCard({ match, act }: { match: ApiMatch; act: (fn: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [score, setScore] = useState(match.score ?? '');
  const [homeOdds, setHomeOdds] = useState(String(match.odds.home));
  const [drawOdds, setDrawOdds] = useState(String(match.odds.draw));
  const [awayOdds, setAwayOdds] = useState(String(match.odds.away));
  const [status, setStatus] = useState<'scheduled' | 'live'>(match.status === 'live' ? 'live' : 'scheduled');
  const [result, setResult] = useState<'home' | 'draw' | 'away'>('home');
  const active = match.status === 'scheduled' || match.status === 'live';
  const save = () => void act(() => api(`/admin/matches/${match.id}`, { method: 'PATCH', body: {
    status, score: score || undefined,
    odds: { home: Number(homeOdds), draw: Number(drawOdds), away: Number(awayOdds) },
  } }), 'Match odds and status updated');
  return <article className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-neutral-500">{match.sport} · {match.league}</p><h3 className="mt-1 font-semibold text-white">{match.home} vs {match.away}</h3><p className="mt-1 text-xs text-neutral-500">{date(match.startsAt)} · <span className={statusClass(match.status)}>{match.status}</span>{match.result ? ` · Result: ${match.result}` : ''}</p></div>{match.score && <span className="rounded bg-white/5 px-2 py-1 text-sm font-bold text-white">{match.score}</span>}</div>
    {active ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score (e.g. 1 - 0)" className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white" />
      <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white"><option value="scheduled">Scheduled</option><option value="live">Live</option></select>
      <div className="grid grid-cols-3 gap-1"><input type="number" step="0.01" min="1.01" max="1000" value={homeOdds} onChange={(e) => setHomeOdds(e.target.value)} aria-label="Home odds" className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white" /><input type="number" step="0.01" min="0" max="1000" value={drawOdds} onChange={(e) => setDrawOdds(e.target.value)} aria-label="Draw odds" className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white" /><input type="number" step="0.01" min="1.01" max="1000" value={awayOdds} onChange={(e) => setAwayOdds(e.target.value)} aria-label="Away odds" className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white" /></div>
      <button onClick={save} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5">Save changes</button>
      <div className="flex gap-2"><select value={result} onChange={(e) => setResult(e.target.value as typeof result)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white"><option value="home">{match.home} win</option>{match.odds.draw > 0 && <option value="draw">Draw</option>}<option value="away">{match.away} win</option></select><button onClick={() => { if (window.confirm(`Settle ${match.home} vs ${match.away} as ${result}?`)) void act(() => api(`/admin/matches/${match.id}/settle`, { body: { result, score } }), 'Match settled'); }} className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black">Settle</button></div>
      <button onClick={() => { if (window.confirm(`Cancel ${match.home} vs ${match.away} and refund open bets?`)) void act(() => api(`/admin/matches/${match.id}/cancel`, { body: {} }), 'Match cancelled and open bets refunded'); }} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300">Cancel & refund open bets</button>
    </div> : null}
  </article>;
}

function Empty({ children }: { children: string }) {
  return <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-8 text-center text-sm text-neutral-500">{children}</div>;
}
