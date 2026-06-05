// SLAiCE platform logo — gold wave swoosh in a circle ("Live Through Digital").
export function SlaiceLogo({ size = 36, withText = false, light = false }: { size?: number; withText?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#f2b705" />
        <path d="M8 30c4-5 8 1 12-2s8-5 14-2" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M9 24c4-4 8 1 11-1.5s7-4 12-2" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
      {withText && (
        <div className="leading-none">
          <div className={`font-display font-bold tracking-tight ${light ? "text-white" : "text-slaice-700"}`} style={{ fontSize: size * 0.5 }}>
            SLA<span className="text-gold-500">i</span>CE
          </div>
          <div className={`text-[10px] ${light ? "text-white/60" : "text-slate-400"}`}>Live Through Digital</div>
        </div>
      )}
    </div>
  );
}

// Tenant wordmark — "Ακτή του Ηλίου · Άλιμος": brush wordmark over a rising sun
// with a swimmer and a sea wave. Recreated as an inline SVG so it stays crisp at
// any size and inherits no external asset. Shown centered above the top bar on
// the customer surface.
export function TenantWordmark({ className = "", height = 96 }: { className?: string; height?: number }) {
  const cx = 120;
  const cy = 162;
  // Sun rays fanning across the upper hemisphere (≈12°–168°).
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = ((12 + i * 14.2) * Math.PI) / 180;
    const r1 = 25;
    const r2 = i % 2 === 0 ? 53 : 46;
    return {
      x1: cx + r1 * Math.cos(a),
      y1: cy - r1 * Math.sin(a),
      x2: cx + r2 * Math.cos(a),
      y2: cy - r2 * Math.sin(a),
    };
  });
  return (
    <svg viewBox="0 0 240 210" height={height} className={className} role="img" aria-label="Ακτή του Ηλίου — Άλιμος">
      {/* Brush wordmark */}
      <text x={120} y={36} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight="700" fontSize="34" fill="#2f5aa6" transform="skewX(-6) translate(13 0)">
        ΑΚΤΗ <tspan fontSize="22">του</tspan> ΗΛΙΟΥ
      </text>
      <text x={120} y={58} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="600" fontSize="13" letterSpacing="6" fill="#3a6bc4">ΑΛΙΜΟΣ</text>

      {/* Sun rays */}
      <g stroke="#f39200" strokeWidth="6" strokeLinecap="round">
        {rays.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      {/* Sun body — a warm half-disc the swimmer stands on */}
      <path d={`M ${cx - 32} ${cy} a 32 32 0 0 1 64 0 Z`} fill="#f5a623" />

      {/* Swimmer, arms raised */}
      <g fill="none" stroke="#1c3d6e" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={cx} cy={119} r={7.5} fill="#1c3d6e" stroke="none" />
        <path d={`M ${cx} 130 V 152`} />
        <path d={`M ${cx} 135 L ${cx - 15} 121 M ${cx} 135 L ${cx + 15} 121`} />
        <path d={`M ${cx} 152 L ${cx - 13} 170 M ${cx} 152 L ${cx + 13} 170`} />
      </g>

      {/* Sea wave */}
      <path d={`M 64 184 q 14 -12 28 0 t 28 0 t 28 0 t 28 0`} fill="none" stroke="#2f7fc4" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// Tenant logo — Akti tou Iliou (sun over sea), as in the video sidebar.
export function TenantLogo({ size = 34 }: { size?: number }) {
  return (
    <span className="rounded-xl grid place-items-center shrink-0" style={{ width: size, height: size, background: "linear-gradient(160deg,#0B2545,#13315c)" }}>
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24">
        <circle cx="12" cy="9.5" r="4.5" fill="#fcd34d" />
        <circle cx="12" cy="9.5" r="6.4" fill="none" stroke="#fcd34d" strokeOpacity="0.4" strokeWidth="0.8" />
        <path d="M3 17c3-2.4 5 1.2 9-1s5-2.4 9 0" stroke="#5EEAD4" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M3 20c3-2 6 1 9-1s6-2 9 0" stroke="#2dd4bf" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}
