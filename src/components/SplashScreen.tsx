import { useEffect, useState } from 'react';
import { LogoMark } from './Logo';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const letters = 'Bettingify'.split('');

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 glow-radial" />
      <div className="relative bf-splash-logo">
        <LogoMark size={120} />
      </div>
      <h1 className="relative mt-6 flex text-4xl font-extrabold tracking-tight">
        {letters.map((ch, i) => (
          <span
            key={i}
            className={`bf-letter ${i >= 7 ? 'text-green-400' : 'text-white'}`}
            style={{ animationDelay: `${0.9 + i * 0.07}s` }}
          >
            {ch}
          </span>
        ))}
      </h1>
      <p className="relative mt-2 text-xs uppercase tracking-[0.3em] text-white/50 bf-tagline">Bet smart. Win big.</p>
      <div className="relative mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="bf-loadbar h-full rounded-full bg-green-400" />
      </div>
    </div>
  );
}
