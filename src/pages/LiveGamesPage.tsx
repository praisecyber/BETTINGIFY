import { Gamepad2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../Layout';

export function LiveGamesPage() {
  return (
    <div>
      <PageHeader title="Live Games" subtitle="Live casino games from an approved provider" />
      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-neutral-900 p-6 md:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300"><Gamepad2 className="h-6 w-6" /></div>
        <h2 className="text-xl font-bold text-white">Provider connection required</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
          No live casino provider is connected to this app yet. Live Games will stay unavailable until a licensed provider, credentials, jurisdiction approval, and server-side wallet/settlement integration have been configured.
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/80">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p>There are no demo tables or simulated live games on this page.</p>
        </div>
      </section>
    </div>
  );
}
