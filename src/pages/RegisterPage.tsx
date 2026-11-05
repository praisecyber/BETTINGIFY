import { useState } from 'react';
import { navigate } from '../router';
import { LogoMark } from '../components/Logo';
import { Check, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { register } from '../lib/session';
import { errMsg } from '../lib/api';
import { ErrorNote } from '../components/RequireAuth';

export function RegisterPage() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ email: '', phone: '', password: '', firstName: '', lastName: '', dateOfBirth: '', referralCode: '' });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const next = () => {
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError('Enter a valid email address');
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(f.phone)) return setError('Enter a valid phone number');
    if (f.password.length < 8) return setError('Password must be at least 8 characters');
    setError(null); setStep(2);
  };

  const submit = async () => {
    if (!f.firstName.trim() || !f.lastName.trim()) return setError('Enter your first and last name');
    if (!f.dateOfBirth) return setError('Enter your date of birth');
    setBusy(true); setError(null);
    try {
      await register({ ...f, referralCode: f.referralCode || undefined, acceptedTerms: true });
      setSubmitted(true);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-green-500/20 bg-neutral-900/70 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15"><Check className="h-8 w-8 text-green-400" /></div>
          <h1 className="text-2xl font-bold text-white">Account created</h1>
          <p className="mt-2 text-sm text-neutral-400">Verify your email and submit age and identity checks in Account before depositing or betting.</p>
          <button onClick={() => navigate('/account')} className="mt-6 w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400">Continue to account verification</button>
          <button onClick={() => navigate('/')} className="mt-2 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5">Browse matches</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-2">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex justify-center"><LogoMark size={56} /></div>
        <h1 className="text-2xl font-bold text-white">Create your Bettingify account</h1>
        <p className="mt-1 text-sm text-neutral-400">Join thousands of players and get a 100% welcome bonus</p>
      </div>
      <div className="mx-auto mb-6 flex max-w-md items-center justify-center gap-3">
        {[1, 2].map((number) => (
          <div key={number} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step >= number ? 'bg-green-500 text-black' : 'bg-white/10 text-neutral-500'}`}>{step > number ? <Check className="h-4 w-4" /> : number}</div>
            {number === 1 && <div className={`h-px w-16 ${step > 1 ? 'bg-green-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-md rounded-2xl border border-white/5 bg-neutral-900/60 p-5 sm:p-7">
        <div className="space-y-4">
          {step === 1 ? (
            <>
              <Field icon={Mail} label="Email address" placeholder="you@example.com" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
              <Field icon={Phone} label="Phone number" placeholder="+234 801 234 5678" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-400">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <input type={showPassword ? 'text' : 'password'} value={f.password} onChange={(e) => set('password')(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-600 focus:border-green-500/50 focus:outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-neutral-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
              <ErrorNote msg={error} />
              <button onClick={next} className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400">Continue</button>
              <p className="text-center text-xs text-neutral-500">Already have an account? <button onClick={() => navigate('/account')} className="text-green-400 hover:underline">Sign in</button></p>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                <p className="text-sm font-semibold text-green-400">Your welcome reward</p>
                <p className="mt-1 text-xs text-neutral-300">100% deposit match up to ₦500 plus a ₦5 free bet.</p>
              </div>
              <Field icon={UserRound} label="First name" placeholder="John" type="text" value={f.firstName} onChange={set('firstName')} autoComplete="given-name" />
              <Field icon={UserRound} label="Last name" placeholder="Doe" type="text" value={f.lastName} onChange={set('lastName')} autoComplete="family-name" />
              <Field icon={UserRound} label="Date of birth" placeholder="" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} autoComplete="bday" />
              <Field icon={UserRound} label="Referral code (optional)" placeholder="ABC123" type="text" value={f.referralCode} onChange={set('referralCode')} />
              <label className="flex items-start gap-2 text-xs text-neutral-400">
                <button type="button" onClick={() => setAccepted(!accepted)} className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${accepted ? 'border-green-500 bg-green-500' : 'border-neutral-600'}`}>{accepted && <Check className="h-3 w-3 text-black" />}</button>
                I confirm I am of legal gambling age and agree to the Terms, Privacy Policy, and Responsible Gaming policy.
              </label>
              <ErrorNote msg={error} />
              <button onClick={submit} disabled={!accepted || busy} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${accepted && !busy ? 'bg-green-500 text-black hover:bg-green-400' : 'cursor-not-allowed bg-neutral-800 text-neutral-600'}`}>
                <ShieldCheck className="h-4 w-4" /> {busy ? 'Creating…' : 'Create Account'}
              </button>
              <button onClick={() => { setStep(1); setError(null); }} className="w-full text-xs text-neutral-500 hover:text-white">Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, placeholder, type, value, onChange, autoComplete }: { icon: typeof Mail; label: string; placeholder: string; type: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-400">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 text-sm text-white placeholder-neutral-600 focus:border-green-500/50 focus:outline-none" />
      </div>
    </div>
  );
}
