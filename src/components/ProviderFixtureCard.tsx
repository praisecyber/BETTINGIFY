import { useState } from 'react';
import { useEffect } from 'react';
import { clubFlag, teamBadgeUrl } from '../lib/teamBadges';
import type { SportsFeedEvent } from '../lib/types';

export function ProviderFixtureCard({ event }: { event: SportsFeedEvent }) {
    const score = event.score
        ? event.score.replace(/\s*-\s*/, ' : ')
        : event.status === 'scheduled' ? '0 : 0' : '—';
    const status = event.status === 'live' ? 'LIVE'
        : event.status === 'finished' ? 'FINAL'
            : event.status === 'cancelled' ? 'CANCELLED'
                : new Date(event.startsAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });

    return <article className="rounded-xl border border-white/5 bg-neutral-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-neutral-500">{event.sport} · {event.league}</span>
            <span className={event.status === 'live' ? 'font-bold text-rose-300' : 'text-neutral-500'}>{status}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
                <TeamRow name={event.home} logo={event.homeLogo} />
                <TeamRow name={event.away} logo={event.awayLogo} />
            </div>
            <span className={`shrink-0 text-sm font-bold ${event.status === 'live' ? 'text-white' : 'text-neutral-300'}`}>{score}</span>
        </div>
    </article>;
}

function TeamRow({ name, logo }: { name: string; logo?: string }) {
    const [failed, setFailed] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string>();
    const [countryFlag, setCountryFlag] = useState<{ flag: string; country: string }>();
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
    useEffect(() => {
        let active = true;
        setFailed(false);
        setLogoUrl(undefined);
        void Promise.all([teamBadgeUrl(logo), clubFlag(name)]).then(([url, flag]) => {
            if (!active) return;
            setLogoUrl(url);
            setCountryFlag(flag);
        });
        return () => { active = false; };
    }, [logo, name]);
    return <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-[9px] font-bold text-neutral-300">
            {logoUrl && !failed ? <img src={logoUrl} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain" /> : countryFlag ? <span className="text-lg leading-none" title={countryFlag.country}>{countryFlag.flag}</span> : initials}
        </span>
        <p className="truncate text-sm font-semibold text-white">{name}</p>
    </div>;
}