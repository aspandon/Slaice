import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { DUR } from "../lib/fx";
import { MARGIN_X, MARGIN_Y } from "../lib/camera";

/* ---------- The one beach (AENR-784) ----------
   Landmarks that make the backdrop a place the camera can travel along: a pier, a sailboat,
   the lifeguard tower, the beach bar, palms and a flag for every zone. They live inside the
   camera layer, at shares of its width, and stand on the scene's own shoreline: the sand-top
   curve below is the one Beach.tsx draws (viewBox 1600×900, sliced to cover), so the height
   of the waterline under any landmark is computed, not guessed. The boat rides in a deeper
   plane that pans at a third of the camera's speed — a cheap, convincing parallax. */

/* The sand-top curve: M -20 500 C 220 460 440 555 740 510 S 1200 450 1620 510 (+dy). */
const SEGMENTS: [number, number][][] = [
  [
    [-20, 500],
    [220, 460],
    [440, 555],
    [740, 510],
  ],
  [
    [740, 510],
    [1040, 465],
    [1200, 450],
    [1620, 510],
  ],
];
const bez = (p: [number, number][], t: number) => {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((i) => k.reduce((a, w, j) => a + w * p[j][i], 0)) as [number, number];
};
const CURVE = SEGMENTS.flatMap((seg) => Array.from({ length: 41 }, (_, i) => bez(seg, i / 40)));
/** The curve's height (viewBox units) at x, before the shoreline shift. */
function curveY(x: number) {
  for (let i = 1; i < CURVE.length; i++) {
    const [x0, y0] = CURVE[i - 1];
    const [x1, y1] = CURVE[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0);
  }
  return CURVE[CURVE.length - 1][1];
}

/** Maps a share of the layer's width to the waterline's height (a share of its height). */
function useShore(shoreline: number) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const W = size.w * (1 + 2 * MARGIN_X);
  const H = size.h * (1 + 2 * MARGIN_Y);
  const dy = Math.round(shoreline * 900 - 500);
  const tall = W / H < 1600 / 900; // the scene is cut at the sides (phones, tablets)
  const scale = tall ? H / 900 : W / 1600;
  const visW = W / scale;
  const visH = H / scale;
  return {
    /** Waterline height under a point along the beach, as a share of the layer's height. */
    at: (fx: number) => {
      const x = tall ? 800 - visW / 2 + fx * visW : fx * 1600;
      const y = curveY(x) + dy;
      return tall ? y / 900 : (y - (450 - visH / 2)) / visH;
    },
    /** One scene unit in px — landmarks grow and shrink with the beach. */
    unit: Math.max(0.55, Math.min(1.25, scale)),
  };
}

export interface WorldZone {
  id: string;
  name: string;
  color: string;
  /** Share of the layer's width. */
  x: number;
}

export function BeachWorld({
  shoreline,
  zones,
  flags,
  labels,
  pin,
  pan,
  onSand = true,
}: {
  /** Sand-top fraction as drawn in the layer. */
  shoreline: number;
  zones: WorldZone[];
  /** Zone flags on the waterline (off where the wizard draws its own zones on the sand). */
  flags: boolean;
  /** Zone names under the flags (desktop, and on phones where the beach is the subject). */
  labels: boolean;
  /** The guest's zone, glowing on the sand (Pay / Checkout). */
  pin: string | null;
  /** The camera's pan (share of the viewport) — the deep plane follows at a third. */
  pan: number;
  /** Landmarks standing on the sand (bar, palms). Off where the desktop wizard lays sets on it. */
  onSand?: boolean;
}) {
  const shore = useShore(shoreline);
  const deep = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (deep.current)
      gsap.to(deep.current, {
        x: (-pan * window.innerWidth * 2) / 3,
        duration: DUR.camera,
        ease: "power3.inOut",
        overwrite: "auto",
      });
  }, [pan]);
  const u = shore.unit;
  // Stand a landmark on the sand: its foot `down` scene-units below the waterline.
  const stand = (fx: number, down = 0) => ({
    left: `${fx * 100}%`,
    top: `calc(${shore.at(fx) * 100}% + ${down * u}px)`,
  });
  const pinned = zones.find((z) => z.id === pin);
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Deep plane: the sea's far side. */}
      <div ref={deep} className="absolute inset-0">
        <div
          className="absolute -translate-x-1/2 -translate-y-full animate-floaty"
          style={stand(0.37, -95)}
        >
          <Sailboat size={64 * u} />
        </div>
      </div>
      <div className="absolute -translate-x-1/2 -translate-y-full" style={stand(0.24, 6)}>
        <Pier size={88 * u} />
      </div>
      <div
        className="absolute -translate-x-1/2 -translate-y-full"
        style={stand(0.53, onSand ? 58 : 10)}
      >
        <LifeguardTower size={70 * u} />
      </div>
      <div
        className={`absolute inset-0 transition-opacity duration-slow ${onSand ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute -translate-x-1/2 -translate-y-full" style={stand(0.06, 46)}>
          <Palm size={78 * u} />
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-full" style={stand(0.8, 54)}>
          <BeachBar size={104 * u} />
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-full" style={stand(0.94, 40)}>
          <Palm size={70 * u} flip />
        </div>
      </div>
      {/* A flag for every zone, planted at the water's edge. */}
      <div
        className={`absolute inset-0 transition-opacity duration-slow ${flags ? "opacity-100" : "opacity-0"}`}
      >
        {zones.map((z) => (
          <div
            key={z.id}
            className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
            style={stand(z.x, onSand ? 22 : 4)}
          >
            <ZoneFlag color={z.color} size={30 * u} />
            <span
              className={`mt-0.5 rounded-full ${labels ? "" : "hidden"} bg-white/85 px-1.5 text-[10px] font-semibold leading-4 text-navy-900 shadow-sm whitespace-nowrap`}
              style={{ transform: `scale(${Math.max(0.85, u)})` }}
            >
              {z.name}
            </span>
          </div>
        ))}
      </div>
      {/* Your spot, glowing on the sand beside its flag. */}
      {pinned && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={stand(pinned.x, onSand ? 40 : 10)}
        >
          <span className="absolute -inset-5 rounded-full bg-coral-500/25 animate-ping" />
          <span className="relative block w-4 h-4 rounded-full bg-coral-600 ring-4 ring-white/80 shadow-[0_0_24px_6px_rgba(255,120,80,0.55)]" />
        </div>
      )}
    </div>
  );
}

/* ---------- Landmark art (flat, in the beach's palette) ---------- */

function LifeguardTower({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.55} viewBox="0 0 60 93" aria-hidden="true">
      <ellipse cx="30" cy="91" rx="22" ry="2.5" fill="rgba(80,55,25,0.18)" />
      <g stroke="#e9e3d6" strokeWidth="3.2" strokeLinecap="round">
        <path d="M14 90 L20 46 M46 90 L40 46 M17 70 L43 70 M16 80 L44 62" />
      </g>
      <path d="M38 90 L49 52" stroke="#d8cfbd" strokeWidth="2" />
      <rect x="9" y="40" width="42" height="7" rx="1.5" fill="#f4efe5" />
      <rect x="13" y="20" width="34" height="21" rx="2" fill="#ffffff" />
      <rect x="17" y="25" width="11" height="9" rx="1" fill="#7fc4d8" />
      <rect x="32" y="25" width="11" height="9" rx="1" fill="#7fc4d8" />
      <path d="M8 21 L30 9 L52 21 Z" fill="#e8392b" />
      <path d="M19 15 L30 9 L41 15" fill="none" stroke="#ffffff" strokeWidth="2.6" />
      <path d="M30 9 L30 0" stroke="#6b7a8c" strokeWidth="1.4" />
      <path d="M30 0.5 L39 3 L30 5.5 Z" fill="#e8392b" />
    </svg>
  );
}

function BeachBar({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 120 86" aria-hidden="true">
      <ellipse cx="60" cy="84" rx="52" ry="3" fill="rgba(80,55,25,0.16)" />
      <path d="M22 34 L22 82 M98 34 L98 82" stroke="#9a6b3e" strokeWidth="3" />
      <rect x="16" y="56" width="88" height="26" rx="2" fill="#b98352" />
      <path d="M16 62 L104 62 M16 70 L104 70 M16 77 L104 77" stroke="#a06f41" strokeWidth="1.2" />
      <rect x="12" y="52" width="96" height="6" rx="1.5" fill="#8a5a31" />
      <rect x="44" y="40" width="32" height="9" rx="2" fill="#0d9488" />
      <circle cx="51" cy="44.5" r="1.6" fill="#fff" />
      <circle cx="60" cy="44.5" r="1.6" fill="#fff" />
      <circle cx="69" cy="44.5" r="1.6" fill="#fff" />
      <path d="M2 38 L60 6 L118 38 Z" fill="#d9a441" />
      <path d="M2 38 L60 6 L118 38" fill="none" stroke="#b9822b" strokeWidth="2" />
      <path
        d="M10 38 L16 31 L22 38 L28 31 L34 38 L40 31 L46 38 L52 31 L58 38 L64 31 L70 38 L76 31 L82 38 L88 31 L94 38 L100 31 L106 38 L112 31 L118 38"
        fill="none"
        stroke="#c18e33"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function Pier({ size }: { size: number }) {
  // A jetty seen from the beach: a deck narrowing as it runs out to sea, on posts.
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M44 2 L56 2 L86 50 L14 50 Z" fill="#c08b58" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = 6 + i * 5.2;
        const half = 6 + (y / 50) * 30;
        return (
          <path
            key={i}
            d={`M${50 - half} ${y} L${50 + half} ${y}`}
            stroke="#9a6b3e"
            strokeWidth={0.5 + (y / 50) * 0.9}
          />
        );
      })}
      <path d="M44 2 L14 50 M56 2 L86 50" stroke="#8a5a31" strokeWidth="1.4" />
      <path
        d="M18 50 L18 60 M38 50 L38 60 M62 50 L62 60 M82 50 L82 60 M30 30 L30 36 M70 30 L70 36"
        stroke="#6b4a2c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M8 60 Q 30 56 50 60 T 92 60"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function Sailboat({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 70 63" aria-hidden="true">
      <path d="M34 4 L34 48" stroke="#5b6b82" strokeWidth="1.6" />
      <path d="M36 6 L36 46 L60 46 Z" fill="#ffffff" />
      <path d="M32 12 L32 46 L12 46 Z" fill="#f4f1ea" />
      <path d="M34 4 L44 7 L34 10 Z" fill="#e8392b" />
      <path d="M6 48 L64 48 L56 58 L14 58 Z" fill="#0b2545" />
      <path
        d="M2 61 Q 18 57 34 61 T 68 61"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function Palm({ size, flip = false }: { size: number; flip?: boolean }) {
  return (
    <svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 70 112"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <ellipse cx="36" cy="110" rx="18" ry="2.4" fill="rgba(80,55,25,0.16)" />
      <path
        d="M34 110 C 30 80 30 52 40 26"
        fill="none"
        stroke="#8a5a31"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g fill="#2f8f5b">
        <path d="M40 26 C 26 14 10 18 2 30 C 16 24 28 26 40 26 Z" />
        <path d="M40 26 C 50 10 64 10 70 20 C 58 18 48 20 40 26 Z" />
        <path d="M40 26 C 30 30 22 44 22 56 C 30 44 34 36 40 26 Z" />
        <path d="M40 26 C 52 30 60 42 62 54 C 54 44 48 36 40 26 Z" />
        <path d="M40 26 C 38 14 30 4 20 2 C 30 10 36 18 40 26 Z" />
      </g>
      <circle cx="39" cy="28" r="2.6" fill="#6b4a2c" />
      <circle cx="43" cy="27" r="2.2" fill="#6b4a2c" />
    </svg>
  );
}

function ZoneFlag({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size * 0.8} height={size * 1.6} viewBox="0 0 24 48" aria-hidden="true">
      <path d="M4 2 L4 47" stroke="#5b6b82" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 3 L22 8 L5 14 Z" fill={color} />
      <ellipse cx="4" cy="47" rx="4" ry="1.2" fill="rgba(80,55,25,0.2)" />
    </svg>
  );
}
