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

/* ---------- Aerial beach backdrop (drone photo with SVG fallback) ---------- */
export function BeachBackdrop({ children, className = "", pos = "relative" }) {
  return (
    <div className={`${pos} overflow-hidden rounded-2xl ${className}`}>
      <img
        src="/beach.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
      {/* fallback gradient sits beneath the image so something is visible if /beach.jpg is missing */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0e6e80] via-[#3cc0cf] to-[#e4d6b4]" />
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
