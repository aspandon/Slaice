import { useMemo } from "react";

/* ---------- Single sunbed glyph ----------
   state: "a" available · "h" on hold · "u" unavailable · sel = selected (coral, from the video) */
export function Sunbed({ state = "a", sel = false, onClick, label, price, size = 20 }) {
  const colA = sel ? "#e2552f" : state === "u" ? "#cbd5e1" : state === "h" ? "#f5b54a" : "#5cc0f0";
  const colB = sel ? "#fb8a63" : state === "u" ? "#e2e8f0" : state === "h" ? "#fcd98a" : "#ffffff";
  const dim = state === "u";
  return (
    <button
      disabled={dim}
      onClick={onClick}
      title={`${label || ""} · ${dim ? "Unavailable" : state === "h" ? "On hold" : "€" + price}`}
      className={`group relative ${dim ? "cursor-not-allowed" : "hover:scale-110 cursor-pointer"} transition`}
      style={{ lineHeight: 0 }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-sm">
        <path d="M12 13 L3 9 A10 10 0 0 1 12 4 Z" fill={colA} />
        <path d="M12 13 L21 9 A10 10 0 0 0 12 4 Z" fill={colB} stroke={sel ? colA : "#e7eef5"} strokeWidth="0.6" />
        <rect x="11.4" y="12" width="1.2" height="7" rx="0.5" fill={dim ? "#cbd5e1" : "#7c8a99"} />
        <rect x="8" y="18" width="8" height="2.4" rx="1.2" fill={sel ? "#e2552f" : dim ? "#cbd5e1" : "#9fb0bf"} />
      </svg>
      {!dim && label && (
        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 z-30 px-2 py-1 rounded-lg bg-navy-950 text-white text-[10px] whitespace-nowrap shadow-lg">
          <b>{label}</b> · <span className="text-teal-300">●</span> {state === "h" ? "On hold" : "Available"} · €{price}
        </span>
      )}
    </button>
  );
}

/* ---------- Aerial beach backdrop (SVG illustration approximating the drone photo) ---------- */
export function BeachBackdrop({ children, className = "", pos = "relative" }) {
  // deterministic scatter: swimmers, boats, foam flecks
  const swimmers = useMemo(() => {
    const a = [];
    let s = 12345;
    const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 40; i++) a.push({ x: r() * 100, y: 2 + r() * 33, o: 0.15 + r() * 0.35, sz: 0.3 + r() * 0.5 });
    return a;
  }, []);
  return (
    <div className={`${pos} overflow-hidden rounded-2xl ${className}`}>
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0e6e80" />
            <stop offset="35%" stopColor="#1f93a6" />
            <stop offset="70%" stopColor="#3cc0cf" />
            <stop offset="100%" stopColor="#9fe3e0" />
          </linearGradient>
          <linearGradient id="sand" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#efe6cf" />
            <stop offset="40%" stopColor="#e4d6b4" />
            <stop offset="100%" stopColor="#d2c099" />
          </linearGradient>
          <radialGradient id="reef" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a5f70" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0a5f70" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* sea */}
        <rect x="0" y="0" width="100" height="40" fill="url(#sea)" />
        {/* darker reef patches */}
        <ellipse cx="22" cy="14" rx="16" ry="7" fill="url(#reef)" />
        <ellipse cx="70" cy="10" rx="20" ry="8" fill="url(#reef)" />
        <ellipse cx="48" cy="20" rx="10" ry="4" fill="url(#reef)" />
        {/* ripples */}
        {[6, 12, 18, 24, 30].map((y, i) => (
          <path key={i} d={`M0 ${y} Q 25 ${y - 1.5} 50 ${y} T 100 ${y}`} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.6" fill="none" />
        ))}
        {/* swimmers / dots */}
        {swimmers.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.sz} fill="#0a4a55" opacity={p.o} />)}

        {/* foam line */}
        <path d="M0 38 Q 25 36.5 50 38 T 100 38 L100 41 L0 41 Z" fill="#ffffff" opacity="0.6" />
        <path d="M0 40 Q 30 39 60 40.5 T 100 40 L100 42 L0 42 Z" fill="#ffffff" opacity="0.35" />

        {/* wet then dry sand */}
        <rect x="0" y="40" width="100" height="16" fill="url(#sand)" />
        {/* sand texture streaks */}
        {[42, 45, 48, 51, 54].map((y, i) => (
          <path key={i} d={`M0 ${y} Q 50 ${y + (i % 2 ? 0.6 : -0.6)} 100 ${y}`} stroke="#c9b78a" strokeOpacity="0.25" strokeWidth="0.4" fill="none" />
        ))}

        {/* water-sports inflatable park (right side, like the video) */}
        <g transform="translate(64,6)" opacity="0.95">
          <rect x="0" y="0" width="9" height="7" rx="1" fill="#1f6f8a" opacity="0.5" />
          <rect x="1" y="1" width="2.4" height="2.4" rx="0.4" fill="#f6c945" />
          <rect x="4" y="1.4" width="2" height="2" rx="0.4" fill="#3aa0d8" />
          <rect x="1.4" y="3.8" width="2" height="2" rx="0.4" fill="#e85d4e" />
          <rect x="4.2" y="3.8" width="2.2" height="2.2" rx="0.4" fill="#f6c945" />
          <circle cx="8" cy="5.5" r="1" fill="#ffffff" opacity="0.8" />
        </g>

        {/* treeline / cabanas band at bottom */}
        <rect x="0" y="52.5" width="100" height="3.5" fill="#7d8a52" opacity="0.55" />
        {Array.from({ length: 30 }).map((_, i) => (
          <circle key={i} cx={i * 3.4 + 1} cy={53.5} r={1.3 + (i % 3) * 0.3} fill={i % 2 ? "#6f7d44" : "#586b39"} opacity="0.7" />
        ))}
      </svg>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
