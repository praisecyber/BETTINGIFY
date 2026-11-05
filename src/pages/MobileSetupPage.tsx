import { useState } from 'react';
import { Globe2, ShieldCheck } from 'lucide-react';
import { saveMobileApiConfig } from '../lib/api';

export function MobileSetupPage({ onConfigured }: { onConfigured: () => void }) {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL ?? '');
  const [wsUrl, setWsUrl] = useState(import.meta.env.VITE_WS_URL ?? '');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const api = new URL(apiUrl.trim());
      if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) {
        throw new Error('Use a public HTTPS API address without credentials or query parameters.');
      }
      if (api.pathname === '/' || api.pathname === '') api.pathname = '/api/v1';
      if (!api.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
        throw new Error('The API address must end in /api/v1.');
      }
      api.pathname = api.pathname.replace(/\/+$/, '');

      const ws = wsUrl.trim() ? new URL(wsUrl.trim()) : new URL(api.toString());
      if (!wsUrl.trim()) {
        ws.protocol = 'wss:';
        ws.pathname = `${api.pathname.replace(/\/api\/v1$/, '')}/ws/aviator`;
      }
      if (ws.protocol !== 'wss:' || ws.username || ws.password || ws.search || ws.hash
        || !ws.pathname.replace(/\/+$/, '').endsWith('/ws/aviator')) {
        throw new Error('Use a secure WebSocket address ending in /ws/aviator.');
      }

      saveMobileApiConfig(api.toString(), ws.toString());
      onConfigured();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save server settings.');
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-950 px-5 py-10 text-neutral-200">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
          <Globe2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Connect Bettingify</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Enter your deployed backend so this mobile app can load markets and securely connect your account.
            A backend running on your computer is not reachable by an installed app.
          </p>
        </div>
        <label className="block space-y-2 text-sm font-medium text-neutral-200">
          API address
          <input
            required
            type="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://api.yourdomain.com/api/v1"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-green-500 focus:outline-none"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium text-neutral-200">
          Aviator WebSocket address <span className="font-normal text-neutral-500">(optional)</span>
          <input
            type="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={wsUrl}
            onChange={(event) => setWsUrl(event.target.value)}
            placeholder="Automatically uses the same server"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-green-500 focus:outline-none"
          />
        </label>
        {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400">
          <ShieldCheck className="h-4 w-4" /> Save secure connection
        </button>
        <p className="text-xs leading-5 text-neutral-500">The API and WebSocket addresses are saved only on this device. Use HTTPS and WSS endpoints that you control.</p>
      </form>
    </main>
  );
}
