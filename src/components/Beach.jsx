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

/* ---------- Modern illustrated aerial beach backdrop ----------
   Pure SVG — no external image needed. Sea at top, soft curved shoreline,
   warm sand, and a vegetation belt at the bottom. */
export function BeachBackdrop({ children, className = "", pos = "relative" }) {
  return (
    <div className={`${pos} overflow-hidden rounded-2xl ${className}`}>
      <BeachScene />
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

function BeachScene() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Sea — aqua → deep teal */}
        <linearGradient id="bg-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" />
          <stop offset="35%" stopColor="#0e7490" />
          <stop offset="70%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a5f3fc" />
        </linearGradient>
        {/* Sand — warm cream → soft peach */}
        <linearGradient id="bg-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde8c8" />
          <stop offset="55%" stopColor="#f5d3a3" />
          <stop offset="100%" stopColor="#e9bd86" />
        </linearGradient>
        {/* Vegetation belt */}
        <linearGradient id="bg-veg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86b85a" />
          <stop offset="100%" stopColor="#4f7a3a" />
        </linearGradient>
        {/* Foam highlight along shoreline */}
        <linearGradient id="bg-foam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Sun glint on the water */}
        <radialGradient id="bg-glint" cx="50%" cy="0%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Subtle film-grain noise for the sand */}
        <filter id="bg-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.48  0 0 0 0 0.32  0 0 0 0.18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Sea fills the whole canvas; sand + vegetation are drawn over the lower portion. */}
      <rect width="1600" height="900" fill="url(#bg-sea)" />
      <rect width="1600" height="900" fill="url(#bg-glint)" />

      {/* Wave bands — subtle horizontal sweeps */}
      <g opacity="0.35" stroke="white" fill="none" strokeLinecap="round">
        <path d="M -50 180 Q 400 165 800 180 T 1650 180" strokeWidth="1.2" />
        <path d="M -50 240 Q 500 222 900 240 T 1650 240" strokeWidth="1" opacity="0.7" />
        <path d="M -50 300 Q 350 285 750 300 T 1650 300" strokeWidth="0.8" opacity="0.5" />
        <path d="M -50 360 Q 600 345 1000 360 T 1650 360" strokeWidth="0.8" opacity="0.5" />
      </g>

      {/* Curved shoreline foam band */}
      <path
        d="M -20 470 C 200 430 420 520 720 480 S 1180 420 1620 480 L 1620 540 L -20 540 Z"
        fill="url(#bg-foam)"
      />

      {/* Sand */}
      <path
        d="M -20 500 C 220 460 440 555 740 510 S 1200 450 1620 510 L 1620 900 L -20 900 Z"
        fill="url(#bg-sand)"
      />
      {/* Sand texture overlay */}
      <path
        d="M -20 500 C 220 460 440 555 740 510 S 1200 450 1620 510 L 1620 900 L -20 900 Z"
        filter="url(#bg-grain)"
        opacity="0.5"
      />

      {/* Wet-sand shading just below the foam */}
      <path
        d="M -20 510 C 220 470 440 565 740 520 S 1200 460 1620 520 L 1620 575 L -20 575 Z"
        fill="rgba(190, 140, 80, 0.18)"
      />

      {/* Vegetation belt at the bottom */}
      <path
        d="M -20 770 C 200 740 420 800 720 770 S 1180 730 1620 770 L 1620 900 L -20 900 Z"
        fill="url(#bg-veg)"
        opacity="0.92"
      />
      {/* Tree dots */}
      <g fill="#3f6b2c" opacity="0.85">
        {Array.from({ length: 28 }).map((_, i) => {
          const x = 30 + (i * 57) + ((i % 3) * 11);
          const y = 790 + ((i * 13) % 70);
          const r = 12 + ((i * 5) % 9);
          return <circle key={i} cx={x} cy={y} r={r} />;
        })}
      </g>
      <g fill="#65a04a" opacity="0.7">
        {Array.from({ length: 22 }).map((_, i) => {
          const x = 60 + (i * 71) + ((i % 4) * 9);
          const y = 810 + ((i * 17) % 60);
          const r = 8 + ((i * 3) % 6);
          return <circle key={i} cx={x} cy={y} r={r} />;
        })}
      </g>

      {/* Soft top vignette so the topbar reads */}
      <rect width="1600" height="160" fill="url(#bg-vignette)" />
      <linearGradient id="bg-vignette" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(11, 37, 69, 0.35)" />
        <stop offset="100%" stopColor="rgba(11, 37, 69, 0)" />
      </linearGradient>
    </svg>
  );
}
