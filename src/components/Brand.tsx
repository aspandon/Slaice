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
  const cx = 96;
  const cy = 96; // sun base / horizon line
  const sunR = 34;
  // Tapered sun rays fanning across the upper hemisphere (≈12°–168°).
  const rays = Array.from({ length: 11 }, (_, i) => {
    const a = ((12 + i * 15.6) * Math.PI) / 180;
    const rb = sunR + 4;
    const rt = rb + (i % 2 === 0 ? 24 : 19);
    const w = 3.2; // half base-width → triangular taper
    const px = -Math.sin(a);
    const py = -Math.cos(a);
    const bx = cx + rb * Math.cos(a);
    const by = cy - rb * Math.sin(a);
    const tx = cx + rt * Math.cos(a);
    const ty = cy - rt * Math.sin(a);
    return `${bx + w * px},${by + w * py} ${bx - w * px},${by - w * py} ${tx},${ty}`;
  });
  return (
    <svg viewBox="0 0 192 140" height={height} className={className} role="img" aria-label="Ακτή του Ηλίου — Άλιμος">
      {/* Sun rays */}
      <g fill="#e0992f">
        {rays.map((pts, i) => (
          <polygon key={i} points={pts} />
        ))}
      </g>
      {/* Sun body — a warm half-disc rising over the sea */}
      <path d={`M ${cx - sunR} ${cy} a ${sunR} ${sunR} 0 0 1 ${sunR * 2} 0 Z`} fill="#e8a33d" />

      {/* Sea wave — a pale ribbon under the sun */}
      <path d={`M 14 ${cy + 9} q 20 -13 42 -3 t 44 1 q 22 5 40 -6`} fill="none" stroke="#a7c8ec" strokeWidth="9" strokeLinecap="round" />

      {/* Swimmer, arms raised, standing in the sea */}
      <g fill="none" stroke="#20406e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={cx} cy={cy - 40} r={7} fill="#20406e" stroke="none" />
        <path d={`M ${cx} ${cy - 33} V ${cy - 13}`} />
        <path d={`M ${cx} ${cy - 29} L ${cx - 15} ${cy - 43} M ${cx} ${cy - 29} L ${cx + 15} ${cy - 43}`} />
        <path d={`M ${cx} ${cy - 13} L ${cx - 12} ${cy + 4} M ${cx} ${cy - 13} L ${cx + 12} ${cy + 4}`} />
      </g>
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
