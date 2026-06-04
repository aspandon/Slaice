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
