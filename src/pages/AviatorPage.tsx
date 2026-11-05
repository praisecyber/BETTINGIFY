import { useState, useEffect, useRef, useCallback } from 'react';
import { navigate } from '../router';
import { Plane, TrendingUp, Users, Clock, Radio, Trophy, HelpCircle, ShieldCheck } from 'lucide-react';
import { getAviatorWsUrl, getValidAccessToken } from '../lib/api';
import { refreshWallet, setWallet, useSession, formatMoney } from '../lib/session';
import type { Wallet } from '../lib/types';

type Phase = 'betting' | 'flying' | 'crashed';
interface ServerPlayer { name: string; stake: number; cashedOutAt: number | null; win: number }
interface PlayerBet { id: string; name: string; avatar: string; bet: number; cashedOut: number | null; win: number; status: 'betting' | 'cashed' | 'lost' }
interface MyBet { stake: number; autoCashout: number | null; cashedOutAt: number | null; payout: number }

const initialsOf = (n: string) => n.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
const SKY_STARS = [
  ['11%', '18%', '0s'], ['23%', '71%', '1.2s'], ['34%', '32%', '2.1s'], ['46%', '83%', '0.6s'],
  ['58%', '14%', '1.8s'], ['69%', '61%', '0.3s'], ['79%', '27%', '2.6s'], ['91%', '76%', '1.5s'],
  ['17%', '46%', '2.2s'], ['40%', '9%', '0.9s'], ['64%', '39%', '1.1s'], ['86%', '49%', '2.4s'],
] as const;

export function AviatorPage() {
  const { user, wallet } = useSession();
  const [phase, setPhase] = useState<Phase>('betting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [serverPlayers, setServerPlayers] = useState<ServerPlayer[]>([]);
  const [myBet, setMyBet] = useState<MyBet | null>(null);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'cashed' | 'lost'>('all');
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashOut, setAutoCashOut] = useState(2.0);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endsAtRef = useRef(0);
  const betRef = useRef({ betAmount, autoEnabled, autoCashOut });
  betRef.current = { betAmount, autoEnabled, autoCashOut };
  const curveRef = useRef<SVGPathElement>(null);

  const isFlying = phase === 'flying';
  const crashed = phase === 'crashed';
  const cashedOut = !!myBet?.cashedOutAt;
  const cashOutAt = myBet?.cashedOutAt ?? 0;
  const balance = wallet?.balance ?? 0;
  const phaseLabel = crashed ? 'ROUND CRASHED' : isFlying ? 'IN FLIGHT' : 'BETTING OPEN';

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      const token = user ? await getValidAccessToken() : null;
      if (closed) return;
      const wsUrl = getAviatorWsUrl();
      const ws = new WebSocket(token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); if (!closed) timer = setTimeout(connect, 2000); };
      ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        switch (m.type) {
          case 'state':
            setPhase(m.phase); setMultiplier(m.multiplier); setRound(m.roundId); setHistory(m.history);
            setServerPlayers(m.players); setMyBet(m.myBet); if (m.phase === 'crashed') setCrashPoint(m.multiplier);
            endsAtRef.current = Date.now() + m.bettingEndsInMs;
            if (m.wallet) setWallet(m.wallet as Wallet);
            break;
          case 'betting':
            setPhase('betting'); setRound(m.roundId); setMultiplier(1); setCrashPoint(0); setServerPlayers([]); setMyBet(null);
            setNotice(null); endsAtRef.current = Date.now() + m.bettingEndsInMs;
            break;
          case 'flying': setPhase('flying'); break;
          case 'tick': setMultiplier(m.multiplier); break;
          case 'players': setServerPlayers(m.players); break;
          case 'crashed':
            setPhase('crashed'); setCrashPoint(m.crashPoint); setMultiplier(m.crashPoint);
            setHistory((h) => [m.crashPoint, ...h].slice(0, 20)); setServerPlayers(m.players);
            void refreshWallet();
            break;
          case 'bet_placed':
            setMyBet({ stake: betRef.current.betAmount, autoCashout: betRef.current.autoEnabled ? betRef.current.autoCashOut : null, cashedOutAt: null, payout: 0 });
            if (m.wallet) setWallet(m.wallet);
            break;
          case 'bet_cancelled': setMyBet(null); if (m.wallet) setWallet(m.wallet); break;
          case 'cashout_ok':
          case 'cashed_out':
            setMyBet((b) => (b ? { ...b, cashedOutAt: m.multiplier, payout: m.payout } : b));
            if (m.wallet) setWallet(m.wallet); else void refreshWallet();
            break;
          case 'error': setNotice(m.message); break;
        }
      };
    };
    void connect();
    return () => { closed = true; clearTimeout(timer); wsRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // betting-phase countdown
  useEffect(() => {
    if (phase !== 'betting') { setCountdown(0); return; }
    const t = setInterval(() => setCountdown(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))), 200);
    return () => clearInterval(t);
  }, [phase, round]);

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
    else setNotice('Not connected, retrying…');
  }, []);

  const handleBet = () => {
    if (!user) return navigate('/account');
    setNotice(null);
    send({ type: 'bet', amount: betAmount, ...(autoEnabled ? { autoCashout: autoCashOut } : {}) });
  };
  const handleCancel = () => send({ type: 'cancel' });
  const handleCashOut = () => send({ type: 'cashout' });

  const players: PlayerBet[] = serverPlayers.map((p, i) => ({
    id: `${i}-${p.name}`, name: p.name, avatar: initialsOf(p.name), bet: p.stake, cashedOut: p.cashedOutAt, win: p.win,
    status: p.cashedOutAt ? 'cashed' : crashed ? 'lost' : 'betting',
  }));
  const visiblePlayers = players.filter((player) => feedFilter === 'all' || player.status === feedFilter);

  // Curve geometry: map multiplier to x/y percentages
  const maxM = Math.max(multiplier, 2);
  const toX = (m: number) => Math.min(((m - 1) / (maxM - 1)) * 88 + 4, 92);
  const toY = (m: number) => Math.max(95 - ((m - 1) / (maxM - 1)) * 75, 15);
  const px = crashed ? toX(crashPoint) : toX(multiplier);
  const py = crashed ? toY(crashPoint) : toY(multiplier);

  // Build a smooth curve path
  const buildPath = () => {
    const steps = 14;
    let path = `M ${toX(1)},${toY(1)}`;
    let previousX = toX(1);
    let previousY = toY(1);
    for (let step = 1; step <= steps; step++) {
      const stepMultiplier = 1 + (multiplier - 1) * (step / steps);
      const x = toX(stepMultiplier);
      const y = toY(stepMultiplier);
      const controlX = previousX + (x - previousX) * 0.55;
      const controlY = previousY + (y - previousY) * 0.2;
      path += ` Q ${controlX},${controlY} ${x},${y}`;
      previousX = x;
      previousY = y;
    }
    return path;
  };

  const totalWin = players.filter((p) => p.status === 'cashed').reduce((s, p) => s + p.win, 0);
  const cashedCount = players.filter((p) => p.status === 'cashed').length;
  const playingCount = players.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
            <button onClick={() => navigate('/')} className="transition-colors hover:text-white">BETTINGIFY</button>
            <span>/</span><span className="text-neutral-400">Aviator</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Aviator</h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            <span>Bettingify server-run game · Not connected to Spribe</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHowToPlay((value) => !value)}
            aria-expanded={showHowToPlay}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:border-green-500/30 hover:text-white"
          >
            <HelpCircle className="h-4 w-4 text-green-400" /> How to play
          </button>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]' : 'bg-rose-500'}`} />
          <span className="text-[10px] font-semibold uppercase text-neutral-400">{connected ? 'Connected' : 'Reconnecting'}</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-xs text-neutral-500">Round</span>
          <span className="text-sm font-bold tabular-nums text-white">#{round}</span>
          </div>
        </div>
      </div>

      {showHowToPlay && <section className="mb-3 rounded-xl border border-green-500/15 bg-green-500/5 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white">How to play Aviator</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-200/70">18+ · Play responsibly</span>
        </div>
        <div className="grid gap-3 text-xs text-neutral-300 sm:grid-cols-3">
          <p><strong className="text-green-300">1. Place your bet.</strong> Choose your stake before the countdown ends.</p>
          <p><strong className="text-green-300">2. Watch the flight.</strong> The multiplier rises while the round is live.</p>
          <p><strong className="text-green-300">3. Cash out in time.</strong> Your return is your stake multiplied by your cash-out multiplier. If the round crashes first, the bet is lost.</p>
        </div>
        <p className="mt-3 border-t border-white/5 pt-3 text-[10px] text-neutral-500">Each round is generated by the server. The round seed is revealed after the crash so its result can be checked.</p>
      </section>}

      {/* History bar */}
      <div className="mb-3 flex min-h-11 items-center gap-2 overflow-x-auto rounded-lg border border-white/5 bg-neutral-900/60 px-3 py-2">
        <span className="shrink-0 pr-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Recent rounds</span>
        {history.map((h, i) => (
          <span
            key={i}
            title={`Round result ${h.toFixed(2)}x`}
            className={`shrink-0 rounded px-2 py-1 text-[11px] font-bold tabular-nums ${h < 1.5 ? 'bg-rose-500/15 text-rose-300' : h < 2 ? 'bg-green-500/10 text-green-200' : 'bg-green-500/15 text-green-300'
              }`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
        {history.length === 0 && <span className="text-[10px] text-neutral-600">Waiting for results</span>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Game area */}
        <div className={`relative h-[min(58vh,520px)] min-h-[360px] overflow-hidden rounded-2xl border bg-[#060807] sm:min-h-[420px] ${crashed ? 'border-rose-500/40' : 'border-green-500/25'}`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 72% 18%, rgba(22,101,52,0.24), transparent 46%), radial-gradient(ellipse at 26% 82%, rgba(20,83,45,0.2), transparent 55%), linear-gradient(160deg, #090b09 0%, #0e1511 58%, #060807 100%)' }} />
          <div className="absolute inset-0 opacity-60" aria-hidden="true">
            {SKY_STARS.map(([left, top, delay], index) => <span
              key={index}
              className="absolute h-1 w-1 rounded-full bg-green-100 animate-pulse"
              style={{ left, top, animationDelay: delay, opacity: index % 3 === 0 ? 0.9 : 0.45 }}
            />)}
          </div>
          <div className="absolute -bottom-28 left-[18%] h-56 w-[72%] rounded-full border border-green-100/5" aria-hidden="true" />
          <div className="absolute -bottom-36 left-[10%] h-64 w-[88%] rounded-full border border-white/5" aria-hidden="true" />
          {/* Radial glow */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background: crashed
                ? 'radial-gradient(circle at 60% 50%, rgba(239,68,68,0.15), transparent 50%)'
                : 'radial-gradient(circle at 50% 80%, rgba(34,197,94,0.12), transparent 58%)',
            }}
          />

          {/* Grid lines + axis labels */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {[0.2, 0.4, 0.6, 0.8].map((y) => (
              <line key={y} x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {[0.25, 0.5, 0.75].map((x) => (
              <line key={x} x1={`${x * 100}%`} y1="0" x2={`${x * 100}%`} y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
          </svg>
          {/* Y-axis multiplier labels */}
          <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-3 text-[10px] text-neutral-600 font-mono">
            <span>{(maxM).toFixed(1)}x</span>
            <span>{(1 + (maxM - 1) * 0.75).toFixed(1)}x</span>
            <span>{(1 + (maxM - 1) * 0.5).toFixed(1)}x</span>
            <span>{(1 + (maxM - 1) * 0.25).toFixed(1)}x</span>
            <span>1.0x</span>
          </div>

          {/* Filled area under curve */}
          {(isFlying || crashed) && (
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="curveGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#166534" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#86efac" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                d={`${buildPath()} L ${px},${95} L ${toX(1)},${95} Z`}
                fill="url(#areaGrad)"
              />
              <path
                ref={curveRef}
                d={buildPath()}
                fill="none"
                stroke={crashed ? '#ef4444' : 'url(#curveGrad)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {/* Crash explosion */}
          {crashed && (
            <svg className="absolute inset-0 h-full w-full pointer-events-none">
              <circle cx={`${px}%`} cy={`${py}%`} r="0" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.6">
                <animate attributeName="r" from="0" to="60" dur="0.5s" fill="freeze" />
                <animate attributeName="opacity" from="0.6" to="0" dur="0.5s" fill="freeze" />
              </circle>
              <circle cx={`${px}%`} cy={`${py}%`} r="0" fill="none" stroke="#f87171" strokeWidth="2" opacity="0.4">
                <animate attributeName="r" from="0" to="40" dur="0.4s" fill="freeze" />
                <animate attributeName="opacity" from="0.4" to="0" dur="0.4s" fill="freeze" />
              </circle>
            </svg>
          )}

          {/* Plane */}
          <div
            className="absolute transition-all duration-75 ease-linear"
            style={{
              left: `${px}%`,
              top: `${py}%`,
              transform: crashed ? 'translate(-50%, -50%) rotate(45deg) scale(0.8)' : 'translate(-50%, -50%) rotate(0deg)',
              opacity: crashed ? 0.2 : 1,
            }}
          >
            <div className={`relative ${crashed ? 'text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.7)]' : 'text-green-300 drop-shadow-[0_0_16px_rgba(74,222,128,0.7)]'}`}>
              <Plane className="h-9 w-9" fill="currentColor" />
              {!crashed && (
                <div className="absolute -top-2 -right-2 h-3 w-3">
                  <span className="absolute inset-0 rounded-full bg-green-300/40 animate-ping" />
                  <span className="absolute inset-0 rounded-full bg-green-200" />
                </div>
              )}
            </div>
          </div>

          {/* Multiplier display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {crashed ? (
              <>
                <p className="text-5xl md:text-7xl font-bold text-red-500 tracking-tight" style={{ textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>
                  {crashPoint.toFixed(2)}x
                </p>
                <p className="mt-2 text-sm font-bold text-red-400 uppercase tracking-[0.2em]">Flew Away!</p>
              </>
            ) : isFlying ? (
              <>
                <p
                  className="text-5xl md:text-7xl font-bold tracking-tight transition-colors"
                  style={{
                    color: cashedOut ? '#4ade80' : '#ffffff',
                    textShadow: cashedOut ? '0 0 30px rgba(52,211,153,0.4)' : '0 0 20px rgba(255,255,255,0.1)',
                  }}
                >
                  {multiplier.toFixed(2)}x
                </p>
                {myBet && !cashedOut && <p className="mt-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-neutral-300">
                  Your stake {formatMoney(myBet.stake)} · Return now {formatMoney(myBet.stake * multiplier)}
                </p>}
                {cashedOut && (
                  <div className="mt-3 rounded-lg bg-green-500/20 border border-green-500/30 px-4 py-1.5">
                    <p className="text-sm font-bold text-green-400">
                      Cashed out at {cashOutAt.toFixed(2)}x
                    </p>
                    <p className="text-xs text-green-300/70 text-center">
                      +{formatMoney(myBet?.payout ?? 0)}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-500 mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">Place your bets — take-off in</span>
                </div>
                <p className="text-4xl font-bold text-white">{countdown}</p>
              </div>
            )}
          </div>

          {/* Live indicator */}
          {isFlying && !crashed && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-green-500/20 px-2 py-1">
              <Radio className="h-3 w-3 text-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-400">LIVE</span>
            </div>
          )}

          {/* Players online counter */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-xs font-medium text-neutral-300">{playingCount} in this round</span>
          </div>
          <div className="absolute left-3 top-3 rounded-lg border border-white/5 bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-semibold uppercase text-neutral-300">{phaseLabel}</span>
          </div>
          <div className="absolute bottom-3 right-3 rounded-lg border border-green-100/10 bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-semibold text-green-100/80">ROUND #{round}</span>
          </div>
        </div>

        {/* Live player betting feed */}
        <div className="flex min-h-[300px] flex-col rounded-2xl border border-white/5 bg-neutral-900/50 lg:max-h-[440px]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-400" />
              <span className="text-sm font-bold text-white">Round activity</span>
            </div>
            <span className="text-xs text-neutral-500">{playingCount} bets</span>
          </div>
          <div className="flex gap-1 border-b border-white/5 px-3 py-2">
            {([
              ['all', 'All bets'],
              ['cashed', 'Cashed out'],
              ['lost', 'Missed cash-out'],
            ] as const).map(([key, label]) => <button
              key={key}
              type="button"
              onClick={() => setFeedFilter(key)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition-colors ${feedFilter === key ? 'bg-green-500/15 text-green-200' : 'text-neutral-500 hover:text-neutral-200'}`}
            >{label}</button>)}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {visiblePlayers.length === 0 && (
              <p className="py-8 text-center text-xs text-neutral-600">{players.length === 0 ? 'Waiting for bets…' : 'No bets in this category yet'}</p>
            )}
            {visiblePlayers.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${p.status === 'cashed'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : p.status === 'lost'
                    ? 'bg-rose-500/5 border border-rose-500/10 opacity-60'
                    : 'bg-white/5 border border-white/5'
                  }`}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-600 to-neutral-700 text-[10px] font-bold text-white">
                  {p.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-300 truncate">{p.name}</p>
                  <p className="text-[10px] text-neutral-500">{formatMoney(p.bet)}</p>
                </div>
                <div className="text-right">
                  {p.status === 'cashed' ? (
                    <>
                      <p className="text-xs font-bold text-green-400">{(p.cashedOut ?? 0).toFixed(2)}x</p>
                      <p className="text-[10px] text-green-400/70">+{formatMoney(p.win)}</p>
                    </>
                  ) : p.status === 'lost' ? (
                    <>
                      <p className="text-xs font-bold text-rose-400">—</p>
                      <p className="text-[10px] text-rose-400/70">-{formatMoney(p.bet)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-neutral-400">betting</p>
                      <p className="text-[10px] text-neutral-600">{formatMoney(p.bet)}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 px-4 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">{cashedCount} cashed out</span>
              <span className="font-bold text-green-400">{formatMoney(totalWin)} total returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bet panel */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Bet Amount</span>
            <span className="text-xs text-neutral-500">Balance: {formatMoney(balance)}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setBetAmount((b) => Math.max(1, b - 5))}
              className="h-9 w-9 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg font-bold"
            >−</button>
            <input
              aria-label="Bet amount"
              min="1"
              max="1000"
              step="0.01"
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.min(1000, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-center text-white text-lg font-bold focus:outline-none focus:border-green-500/50"
            />
            <button
              onClick={() => setBetAmount((b) => b + 5)}
              className="h-9 w-9 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg font-bold"
            >+</button>
          </div>
          <div className="flex gap-2 mb-3">
            {[10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setBetAmount(v)}
                className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
              >
                {formatMoney(v)}
              </button>
            ))}
          </div>
          {(() => {
            const canCash = isFlying && !!myBet && !cashedOut;
            const canCancel = phase === 'betting' && !!myBet;
            const canBet = phase === 'betting' && !myBet;
            const label = canCash ? `Cash out ${formatMoney((myBet?.stake ?? 0) * multiplier)}`
              : canCancel ? `Cancel bet (${formatMoney(myBet!.stake)})`
                : canBet ? (user ? `Bet ${formatMoney(betAmount)}` : 'Sign in to play')
                  : cashedOut ? 'Cashed Out'
                    : crashed ? 'Next round starting…' : 'Waiting for next round';
            const active = canCash || canBet || canCancel;
            return (
              <button
                onClick={canCash ? handleCashOut : canCancel ? handleCancel : handleBet}
                disabled={!active}
                className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${active ? 'bg-green-500 text-black hover:bg-green-400 shadow-lg shadow-green-500/20' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}`}
              >
                {label}
              </button>
            );
          })()}
          {notice && <p className="mt-2 text-xs text-rose-300">{notice}</p>}
        </div>

        <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Auto Cash Out</span>
            <button
              type="button"
              role="switch"
              aria-label="Auto cash out"
              aria-checked={autoEnabled}
              onClick={() => setAutoEnabled(!autoEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${autoEnabled ? 'bg-green-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              step="0.1"
              value={autoCashOut}
              onChange={(e) => setAutoCashOut(Math.max(1.01, Number(e.target.value)))}
              disabled={!autoEnabled}
              className="w-full rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-center text-white text-lg font-bold focus:outline-none focus:border-green-500/50 disabled:opacity-50"
            />
            <span className="text-lg font-bold text-neutral-400">x</span>
          </div>
          <div className="flex gap-2 mb-3">
            {[1.5, 2, 3, 5].map((v) => (
              <button
                key={v}
                onClick={() => { setAutoCashOut(v); setAutoEnabled(true); }}
                className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
              >
                {v}x
              </button>
            ))}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Cash-out target</span>
              <span className="text-neutral-300">{autoEnabled ? `${autoCashOut.toFixed(2)}x` : 'Manual'}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Total return</span>
              <span className="text-green-400 font-semibold">
                {autoEnabled ? formatMoney(betAmount * autoCashOut) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Estimated profit</span>
              <span className="text-neutral-300">{autoEnabled ? formatMoney(betAmount * (autoCashOut - 1)) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 p-4">
        <TrendingUp className="h-5 w-5 text-green-400 flex-shrink-0" />
        <p className="text-xs text-neutral-400">
          The multiplier grows from 1.00x and can crash at any time. Cash out before the plane flies away to win your bet × current multiplier.
        </p>
      </div>
    </div>
  );
}
