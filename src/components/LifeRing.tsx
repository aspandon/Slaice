import { useEffect, useRef, useState } from "react";

/* ---------- Floating life-ring ----------
   The red life-buoy bobbing in the sea band of the customer beach backdrop —
   and the guest's "Need a hand?" button (AENR-781). The whole buoy rises/falls
   (animate-floaty) and rocks gently (sea-tilt) as if riding a swell; expanding
   ripples + a couple of wavelets read as "sea movement" around it. A real
   <button>: the artwork is aria-hidden, the name comes from `label`, and the
   focus ring rides on the bobbing buoy. All motion is off under
   prefers-reduced-motion. The caller positions it (`className`).

   The swell is finite (AENR-867): the buoy bobs for ~15 s when it appears, then floats still, so an
   idle page runs no endless loops. It rides the swell again when it moves (the booking flow lifts the
   shoreline and the caller transitions its position), and when the guest points at it or tabs to it. */
const SWELL = new Set(["floaty", "ripple", "seaTilt"]);

export function LifeRing({ className = "", label, onClick }: { className?: string; label: string; onClick: () => void }) {
  const root = useRef<HTMLButtonElement>(null);
  const [swell, setSwell] = useState(0);
  const ride = () => {
    const el = root.current;
    // Already bobbing → let the current swell run on instead of restarting it. (Only the swell's own
    // animations count: the hover lift is a transition that starts with this very event.)
    const bobbing = (a: Animation) => a instanceof CSSAnimation && SWELL.has(a.animationName) && a.playState === "running";
    if (el && !el.getAnimations({ subtree: true }).some(bobbing)) setSwell((n) => n + 1);
  };
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const moved = (e: TransitionEvent) => e.target === el && ride();
    el.addEventListener("transitionrun", moved);
    return () => el.removeEventListener("transitionrun", moved);
  }, []);
  return (
    <button
      ref={root}
      type="button"
      onClick={onClick}
      onPointerEnter={ride}
      onFocus={ride}
      aria-label={label}
      aria-haspopup="dialog"
      className={`group rounded-full focus-visible:outline-none ${className}`}
    >
      {/* A little lift on hover, a press on tap — outside the bob so the two transforms never fight. */}
      <span aria-hidden="true" className="block w-full h-full transition-transform duration-150 ease-spring group-hover:scale-[1.07] group-active:scale-95">
        {/* Re-keying the swell restarts its CSS animations from the first frame. */}
        <span key={swell} className="relative block w-full h-full rounded-full animate-floaty motion-reduce:animate-none group-focus-visible:ring-[3px] group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-navy-900">
          {/* Ripples expanding outward from the buoy */}
          <span className="absolute inset-0 rounded-full border-[3px] border-white/70 animate-ripple motion-reduce:animate-none" />
          <span className="absolute inset-0 rounded-full border-[3px] border-white/60 animate-ripple motion-reduce:animate-none [animation-delay:0.9s]" />
          <span className="absolute inset-0 rounded-full border-[3px] border-white/50 animate-ripple motion-reduce:animate-none [animation-delay:1.8s]" />
          <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ripple motion-reduce:animate-none [animation-delay:2.7s]" />

          {/* The buoy, rocking on the swell */}
          <svg viewBox="0 0 100 100" className="relative w-full h-full origin-center animate-sea-tilt motion-reduce:animate-none drop-shadow-[0_10px_14px_rgba(11,37,69,0.35)]">
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
        </span>
      </span>
      {/* Its name on hover / keyboard focus — under the buoy, in the same empty slot. */}
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-full mt-2.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy-900/90 px-2.5 py-1 text-guest-caption font-semibold text-white shadow-lift opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}
