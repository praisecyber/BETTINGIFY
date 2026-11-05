type LogoProps = {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
};

/** Animated Bettingify mark: ring + "B" draw themselves, a dot orbits, the ring pulses. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Bettingify logo"
      className="bf-logo-mark"
    >
      <circle cx="20" cy="20" r="19" fill="#000" />
      {/* soft pulsing glow */}
      <circle className="bf-pulse" cx="20" cy="20" r="18" stroke="#22c55e" strokeWidth="1" opacity="0.5" />
      {/* ring draws itself */}
      <circle
        className="bf-draw-ring"
        cx="20" cy="20" r="18"
        stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round"
        pathLength={1}
        transform="rotate(-90 20 20)"
      />
      {/* "B" draws itself */}
      <path
        className="bf-draw-b"
        d="M15 9.5 V30.5 M15 9.5 H22.5 A5.5 5.5 0 0 1 22.5 20.5 H15 M22.5 20.5 A5.5 5.5 0 0 1 22.5 30.5 H15"
        stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        pathLength={1}
      />
      {/* rising spark */}
      <path
        className="bf-spark"
        d="M27 14 L31 10 M31 10 H27.6 M31 10 V13.4"
        stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* orbiting dot */}
      <g>
        <circle cx="20" cy="2" r="2.2" fill="#4ade80" />
        <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="4s" repeatCount="indefinite" />
      </g>
    </svg>
  );
}

export function Logo({ size = 36, showText = true, textClassName = 'text-xl', className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className={`bf-wordmark font-extrabold tracking-tight text-white ${textClassName}`}>
          Betting<span className="text-green-400">ify</span>
        </span>
      )}
    </div>
  );
}
