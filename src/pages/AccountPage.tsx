import { useState } from 'react';
import { PageHeader } from '../Layout';
import { User, Mail, Phone, Shield, ChevronRight, Key, Gift, LogOut, LockKeyhole, ShieldCheck } from 'lucide-react';
import { initials, initSession, login, logout, useSession, formatMoney } from '../lib/session';
import { api, errMsg } from '../lib/api';
import { navigate } from '../router';
import { ErrorNote } from '../components/RequireAuth';

export function AccountPage() {
  const { user, ready } = useSession();
  if (!ready) return <p className="py-16 text-center text-sm text-neutral-500">Loading…</p>;
  return user ? <Profile /> : <SignIn />;
}

function SignIn() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login(id, pw); navigate('/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const requestReset = async () => {
    setResetError(null); setResetMessage(null);
    try {
      const r = await api<{ message: string; developmentToken?: string }>('/auth/password/forgot', { body: { email: resetEmail }, auth: false });
      if (r.developmentToken) setResetToken(r.developmentToken);
      setResetMessage(r.message);
    } catch (e) { setResetError(errMsg(e)); }
  };
  const finishReset = async () => {
    setResetError(null); setResetMessage(null);
    try {
      await api('/auth/password/reset', { body: { token: resetToken, newPassword: resetPassword }, auth: false });
      setResetMessage('Password reset. You can now sign in with your new password.');
      setResetMode(false); setPw('');
    } catch (e) { setResetError(errMsg(e)); }
  };
  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign in" subtitle="Welcome back" />
      {resetMode ? <div className="space-y-4 rounded-2xl border border-white/5 bg-neutral-900/60 p-6">
        <p className="text-sm text-neutral-400">Request a reset link, then enter the token sent to your email.</p>
        <input type="email" placeholder="Email address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none" />
        <button type="button" onClick={requestReset} disabled={!resetEmail} className="w-full rounded-lg border border-white/10 py-2 text-sm text-white disabled:opacity-50">Send reset link</button>
        {resetMessage && <p className="text-xs text-green-400">{resetMessage}</p>}
        {resetToken && <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-200">Development-only token (email delivery is not configured):</p>
          <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="w-full bg-transparent text-xs text-white" aria-label="Password reset token" />
        </div>}
        <input type="password" placeholder="New password (min 8)" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none" />
        <ErrorNote msg={resetError} />
        <button type="button" onClick={finishReset} disabled={resetToken.length !== 64 || resetPassword.length < 8} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black disabled:bg-neutral-800 disabled:text-neutral-600">Reset password</button>
        <button type="button" onClick={() => setResetMode(false)} className="w-full text-xs text-neutral-400 hover:text-white">Back to sign in</button>
      </div> : <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/5 bg-neutral-900/60 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">Email or phone</label>
          <input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-green-500/50 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">Password</label>
          <div className="relative"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-neutral-500" /><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white focus:border-green-500/50 focus:outline-none" /></div>
        </div>
        <ErrorNote msg={err} />
        {resetMessage && <p className="text-xs text-green-400">{resetMessage}</p>}
        <button disabled={busy || !id || !pw} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:bg-neutral-800 disabled:text-neutral-600">{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" onClick={() => { setResetMode(true); setResetEmail(id.includes('@') ? id : ''); setResetMessage(null); setResetError(null); }} className="w-full text-xs text-neutral-400 hover:text-green-400">Forgot password?</button>
        <p className="text-center text-xs text-neutral-500">New here? <button type="button" onClick={() => navigate('/register')} className="text-green-400 hover:underline">Create an account</button></p>
      </form>}
    </div>
  );
}

function Profile() {
  const { user, wallet } = useSession();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailToken, setEmailToken] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '');
  const [safetyMsg, setSafetyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dailyLimit, setDailyLimit] = useState(user?.depositLimits.daily?.toString() ?? '');
  const [monthlyLimit, setMonthlyLimit] = useState(user?.depositLimits.monthly?.toString() ?? '');
  const [excludeDuration, setExcludeDuration] = useState<'24h' | '7d' | '30d' | '6m' | 'permanent'>('24h');
  if (!user) return null;

  const changePw = async () => {
    try { await api('/me/password', { body: { currentPassword: cur, newPassword: nw } }); setMsg({ ok: true, text: 'Password updated' }); setCur(''); setNw(''); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  };
  const resendVerification = async () => {
    setSafetyMsg(null);
    try {
      const r = await api<{ message: string; developmentToken?: string }>('/auth/email/resend', { body: {} });
      setEmailToken(r.developmentToken ?? '');
      setSafetyMsg({ ok: true, text: r.message });
    } catch (e) { setSafetyMsg({ ok: false, text: errMsg(e) }); }
  };
  const verifyEmail = async () => {
    setSafetyMsg(null);
    try {
      await api('/auth/email/verify', { body: { token: emailToken }, auth: false });
      setEmailToken('');
      await initSession();
      setSafetyMsg({ ok: true, text: 'Email verified' });
    } catch (e) { setSafetyMsg({ ok: false, text: errMsg(e) }); }
  };
  const submitVerification = async () => {
    setSafetyMsg(null);
    try {
      await api('/me/verification', { body: user.dateOfBirth ? {} : { dateOfBirth } });
      await initSession();
      setSafetyMsg({ ok: true, text: 'Verification request submitted for manual review' });
    } catch (e) { setSafetyMsg({ ok: false, text: errMsg(e) }); }
  };
  const updateLimits = async () => {
    setSafetyMsg(null);
    const parseLimit = (value: string) => value.trim() ? Number(value) : null;
    const daily = parseLimit(dailyLimit), monthly = parseLimit(monthlyLimit);
    if ((daily !== null && (!Number.isFinite(daily) || daily <= 0)) || (monthly !== null && (!Number.isFinite(monthly) || monthly <= 0))) {
      setSafetyMsg({ ok: false, text: 'Limits must be positive amounts, or blank to remove a limit' });
      return;
    }
    try {
      await api('/me/deposit-limits', { method: 'PATCH', body: { daily, monthly } });
      await initSession();
      setSafetyMsg({ ok: true, text: 'Deposit limits updated. Limits apply to UTC calendar periods and include pending deposits.' });
    } catch (e) { setSafetyMsg({ ok: false, text: errMsg(e) }); }
  };
  const selfExclude = async () => {
    const confirmed = window.confirm(excludeDuration === 'permanent'
      ? 'Permanently self-exclude this account? This cannot be reversed.'
      : `Start a ${excludeDuration} self-exclusion? It cannot be shortened once started.`);
    if (!confirmed) return;
    setSafetyMsg(null);
    try {
      await api('/me/self-exclude', { body: { duration: excludeDuration } });
      await initSession();
      setSafetyMsg({ ok: true, text: 'Self-exclusion is active. Betting and deposits are blocked.' });
    } catch (e) { setSafetyMsg({ ok: false, text: errMsg(e) }); }
  };

  return (
    <div>
      <PageHeader title="Account" subtitle="Manage your profile and settings" />
      <div className="mb-6 rounded-2xl border border-white/5 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 text-2xl font-bold text-black">{initials(user)}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h2>
            <p className="text-sm text-neutral-400">Member since {new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">{wallet ? formatMoney(wallet.balance) : '—'}</p>
            <p className="text-xs text-neutral-500">Balance</p>
          </div>
        </div>
        {wallet && wallet.bonus > 0 && <p className="mt-4 text-xs text-neutral-400">Includes {formatMoney(wallet.bonus)} bonus funds (unlocked by wagering). Withdrawable: <span className="text-white">{formatMoney(wallet.withdrawable)}</span></p>}
      </div>

      <div className="space-y-4">
        <Section title="Personal Information">
          <Row icon={User} label="Full Name" value={`${user.firstName} ${user.lastName}`} />
          <Row icon={Mail} label="Email" value={user.email} />
          <Row icon={Phone} label="Phone" value={user.phone} />
          <Row icon={Gift} label="Referral code" value={user.referralCode} />
        </Section>
        <Section title="Security">
          <button onClick={() => setOpen(!open)} className="w-full text-left"><Row icon={Key} label="Change Password" value="" /></button>
          {open && (
            <div className="space-y-2 rounded-lg bg-white/5 p-3">
              <input type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:outline-none" />
              <input type="password" placeholder="New password (min 8)" value={nw} onChange={(e) => setNw(e.target.value)} className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:outline-none" />
              {msg && <p className={`text-xs ${msg.ok ? 'text-green-400' : 'text-rose-300'}`}>{msg.text}</p>}
              <button onClick={changePw} disabled={!cur || nw.length < 8} className="w-full rounded-lg bg-green-500 py-2 text-sm font-bold text-black disabled:bg-neutral-800 disabled:text-neutral-600">Update password</button>
            </div>
          )}
        </Section>
        <Section title="Email and identity checks">
          <Row icon={Mail} label="Email verification" value={user.emailVerified ? 'Verified' : 'Not verified'} />
          {!user.emailVerified && <div className="space-y-2 px-2 pb-3">
            <button onClick={resendVerification} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5">Resend verification</button>
            {emailToken && <div className="space-y-2 rounded-lg bg-white/5 p-3">
              <p className="text-xs text-amber-200">Development token (email delivery is not configured)</p>
              <input value={emailToken} onChange={(e) => setEmailToken(e.target.value)} aria-label="Email verification token" className="w-full bg-transparent text-xs text-white" />
              <button onClick={verifyEmail} className="w-full rounded-lg bg-green-500 py-2 text-xs font-bold text-black">Verify email</button>
            </div>}
          </div>}
          <Row icon={ShieldCheck} label="Age check" value={user.ageVerificationStatus} />
          <Row icon={Shield} label="Identity check" value={user.identityVerificationStatus} />
          {(user.ageVerificationStatus !== 'verified' || user.identityVerificationStatus !== 'verified') && <div className="px-2 pb-2">
            <p className="mb-2 text-xs text-neutral-500">Submit your date-of-birth and identity check for manual review. No identity documents are uploaded here; connect a compliant verification provider before production use.</p>
            {!user.dateOfBirth && <label className="mb-2 block text-xs text-neutral-400">Date of birth
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" />
            </label>}
            <button onClick={submitVerification} disabled={!user.dateOfBirth && !dateOfBirth} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5 disabled:opacity-50">Request verification review</button>
          </div>}
          {safetyMsg && <p className={`px-2 text-xs ${safetyMsg.ok ? 'text-green-400' : 'text-rose-300'}`}>{safetyMsg.text}</p>}
        </Section>
        <Section title="Responsible gambling">
          <p className="px-2 pb-2 text-xs text-neutral-500">Set limits in NGN for UTC calendar days and months. Pending deposits count toward your limits.</p>
          <div className="grid gap-3 px-2 sm:grid-cols-2">
            <label className="text-xs text-neutral-400">Daily deposit limit
              <input type="number" min="0.01" step="0.01" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="No limit" className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:outline-none" />
            </label>
            <label className="text-xs text-neutral-400">Monthly deposit limit
              <input type="number" min="0.01" step="0.01" value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} placeholder="No limit" className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:outline-none" />
            </label>
          </div>
          <button onClick={updateLimits} className="mx-2 mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">Save deposit limits</button>
          {safetyMsg && <p className={`px-2 pt-2 text-xs ${safetyMsg.ok ? 'text-green-400' : 'text-rose-300'}`}>{safetyMsg.text}</p>}
          <div className="mt-4 border-t border-white/5 px-2 pt-3">
            <p className="mb-2 text-xs text-neutral-400">Self-exclusion {user.selfExcludedUntil ? (user.selfExcludedUntil === 'permanent' ? 'is permanent' : `active until ${new Date(user.selfExcludedUntil).toLocaleString()}`) : 'is not active'}.</p>
            <div className="flex flex-wrap gap-2">
              <select value={excludeDuration} onChange={(e) => setExcludeDuration(e.target.value as typeof excludeDuration)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white">
                <option value="24h">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="6m">6 months</option><option value="permanent">Permanent</option>
              </select>
              <button onClick={selfExclude} disabled={user.selfExcludedUntil === 'permanent'} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">Start self-exclusion</button>
            </div>
          </div>
        </Section>
        {safetyMsg && <p className={`text-xs ${safetyMsg.ok ? 'text-green-400' : 'text-rose-300'}`}>{safetyMsg.text}</p>}
        <button onClick={() => void logout().then(() => navigate('/'))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/5"><LogOut className="h-4 w-4" /> Log out</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/5">
      <Icon className="h-4 w-4 text-neutral-500" />
      <span className="flex-1 text-sm text-neutral-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
      <ChevronRight className="h-4 w-4 text-neutral-600" />
    </div>
  );
}
