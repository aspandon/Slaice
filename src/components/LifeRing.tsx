/* ---------- Floating life-ring ----------
   A decorative red life-buoy bobbing in the sea band of the customer beach
   backdrop. The whole buoy rises/falls (animate-floaty) and rocks gently
   (sea-tilt) as if riding a swell; expanding ripples + a couple of wavelets
   read as "sea movement" around it. Purely ornamental — aria-hidden and
   non-interactive, and all motion is paused under prefers-reduced-motion. */
export function LifeRing({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      <div className="relative w-full h-full animate-floaty">
        {/* Ripples expanding outward from the buoy */}
        <span className="absolute inset-0 rounded-full border-[3px] border-white/70 animate-ripple" />
        <span className="absolute inset-0 rounded-full border-[3px] border-white/60 animate-ripple [animation-delay:0.9s]" />
        <span className="absolute inset-0 rounded-full border-[3px] border-white/50 animate-ripple [animation-delay:1.8s]" />
        <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ripple [animation-delay:2.7s]" />

        {/* The buoy, rocking on the swell */}
        <svg viewBox="0 0 100 100" className="relative w-full h-full origin-center animate-sea-tilt drop-shadow-[0_10px_14px_rgba(11,37,69,0.35)]">
          <defs>
            <radialGradient id="lr-red" cx="42%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#fb6a4a" />
              <stop offset="55%" stopColor="#e8392b" />
              <stop offset="100%" stopColor="#c01f12" />
            </radialGradient>
          </defs>
          {/* Rope loops at the four cardinal points */}
          <g fill="none" stroke="#eef2f4" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d="M 43 9 Q 50 0 57 9" transform={`rotate(${a} 50 50)`} />
            ))}
          </g>
          {/* Buoy body (torus) */}
          <circle cx="50" cy="50" r="37" fill="none" stroke="url(#lr-red)" strokeWidth="18" />
          {/* Inner + outer edge shading for a little volume */}
          <circle cx="50" cy="50" r="28.5" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="2.2" />
          <circle cx="50" cy="50" r="45.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2.2" />
          {/* Four white reflective patches */}
          <g fill="#f6f7f5">
            {[45, 135, 225, 315].map((a) => (
              <rect key={a} x="45.5" y="5" width="9" height="16" rx="2.5" transform={`rotate(${a} 50 50)`} />
            ))}
          </g>
          {/* Top-left specular highlight */}
          <path d="M 26 33 A 32 32 0 0 1 44 18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
