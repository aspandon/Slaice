import { useId } from "react";
import type { ReactNode } from "react";
import { useParallax } from "../lib/motion";
import { useApp } from "../app/store";
import { presetById } from "../data/backgrounds";
import type { BeachPreset } from "../data/backgrounds";
import type { BeachBackground, SunbedState } from "../domain/types";
import { BEDS, CANOPY, CANOPY_WEDGES, FIN, GLYPH_BOX, GLYPH_CONTENT, sunbedPalette } from "./sunbedGlyph";

/* ---------- Single sunbed-set glyph ----------
   A parasol over twin loungers. state: "a" available · "h" on hold · "u"
   unavailable · sel = selected. Geometry + colour come from sunbedGlyph.ts, the
   shared source the Konva grid renders from too, so legend and map always match. */
export function Sunbed({ state = "a", sel = false, onClick, label, price, size = 20, block = false, fill = false }: {
  state?: SunbedState;
  sel?: boolean;
  onClick?: () => void;
  label?: string;
  price?: number;
  size?: number;
  block?: boolean;
  fill?: boolean;
}) {
  const p = sunbedPalette(state, sel);
  const dim = p.dim;
  return (
    <button
      disabled={dim}
      onClick={onClick}
      aria-label={`Sunbed ${label || ""}${dim ? " unavailable" : state === "h" ? " on hold" : ` €${price}`}${sel ? ", selected" : ""}`}
      aria-pressed={sel}
      title={`${label || ""} · ${dim ? "Unavailable" : state === "h" ? "On hold" : "€" + price}`}
      // `fill` lets the glyph scale to its cell (used by the wizard's pick grid so
      // each umbrella grows on desktop yet stays tappable on phones); `block`
      // alone keeps a fixed `size` but a full-cell hit area.
      className={`group relative ${block || fill ? "w-full h-full grid place-items-center" : ""} ${dim ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-1.5 hover:scale-[1.18] hover:z-20"} transition-transform duration-200 ease-spring`}
      style={{ lineHeight: 0, willChange: "transform" }}
    >
      <svg width={fill ? "100%" : size} height={fill ? "100%" : size} viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} className={`${fill ? "w-full h-full " : ""}drop-shadow-sm transition-[filter] duration-200 group-hover:drop-shadow-[0_8px_10px_rgba(11,37,69,0.5)]`}>
        {/* Present the set loungers-up: mirror vertically about the content centre
            (cy 37.5 → translate 2·cy). Canonical geometry is parasol-up. */}
        <g transform={`translate(0 ${2 * GLYPH_CONTENT.cy}) scale(1 -1)`}>
          {/* Twin loungers. */}
          {BEDS.map((bed, i) => (
            <g key={i}>
              <rect x={bed.frame.x} y={bed.frame.y} width={bed.frame.w} height={bed.frame.h} rx={bed.frame.r} fill={p.bed} />
              <rect x={bed.cushion.x} y={bed.cushion.y} width={bed.cushion.w} height={bed.cushion.h} rx={bed.cushion.r} fill={p.cushion} />
              <path d={bed.slats} fill="none" stroke={p.slat} strokeWidth={1} strokeLinecap="round" />
            </g>
          ))}
          {/* Pinwheel parasol — state-hue gores alternating with white. */}
          {CANOPY_WEDGES.map((wdg, i) => (
            <path key={`w${i}`} d={wdg.d} fill={wdg.lite ? p.lite : p.c} />
          ))}
          <circle cx={CANOPY.cx} cy={CANOPY.cy} r={CANOPY.r} fill="none" stroke={p.edge} strokeWidth={1} />
          <circle cx={FIN.cx} cy={FIN.cy} r={FIN.r} fill={p.fin} />
        </g>
      </svg>
      {!dim && label && (
        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 z-30 px-2 py-1 rounded-lg bg-navy-950 text-white text-[10px] whitespace-nowrap shadow-lg">
          <b>{label}</b> · <span className="text-teal-300">●</span> {state === "h" ? "On hold" : "Available"} · €{price}
        </span>
      )}
    </button>
  );
}

/* ---------- Beach backdrop ----------
   Resolves the active tenant background (a preset or an uploaded photo) and
   renders it behind `children`. Pass an explicit `background` to preview a
   specific scene (the picker does this); otherwise it reads the store, so the
   choice flows to the booking map and the customer surface automatically. */
export function BeachBackdrop({ children, className = "", pos = "relative", parallax = false, background, preview = false, shoreline }: {
  children?: ReactNode;
  className?: string;
  pos?: string;
  parallax?: boolean;
  background?: BeachBackground;
  /** Skip the grain filter — used for the many small picker thumbnails. */
  preview?: boolean;
  /** Sand-top fraction (0–1): higher pushes the shoreline down for an ocean-vista
   *  look (thin sand strip). Omit for the default balanced beach. */
  shoreline?: number;
}) {
  const ctx = useApp();
  const bg = background ?? ctx.background;
  const scene =
    bg.kind === "custom" ? (
      <CustomBeach src={bg.src} parallax={parallax} />
    ) : parallax ? (
      <BeachSceneLayered preset={presetById(bg.id)} shoreline={shoreline} />
    ) : (
      <BeachScene preset={presetById(bg.id)} preview={preview} shoreline={shoreline} />
    );
  return (
    <div className={`${pos} overflow-hidden rounded-2xl ${className}`}>
      {scene}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

/* ---- Shared scene geometry (identical across presets) ----
   The shoreline bands are functions of `dy`, a vertical shift (in the 900-tall
   viewBox) of where the sand begins. `shorelineShift(shoreline)` maps a sand-top
   fraction (0–1) to that dy; callers that omit `shoreline` get dy=0 and the
   original geometry exactly, so existing scenes don't move. A larger fraction
   reads as an ocean vista with a thin sand strip (used by the home/customer
   backdrop). At a low shoreline the vegetation belt slides off-canvas, leaving
   clean sand. */
const SAND_TOP = 500;
const shorelineShift = (shoreline?: number) => (shoreline == null ? 0 : Math.round(shoreline * 900 - SAND_TOP));
const sandD = (dy = 0) => `M -20 ${500 + dy} C 220 ${460 + dy} 440 ${555 + dy} 740 ${510 + dy} S 1200 ${450 + dy} 1620 ${510 + dy} L 1620 900 L -20 900 Z`;
const foamD = (dy = 0) => `M -20 ${470 + dy} C 200 ${430 + dy} 420 ${520 + dy} 720 ${480 + dy} S 1180 ${420 + dy} 1620 ${480 + dy} L 1620 ${540 + dy} L -20 ${540 + dy} Z`;
const wetD = (dy = 0) => `M -20 ${510 + dy} C 220 ${470 + dy} 440 ${565 + dy} 740 ${520 + dy} S 1200 ${460 + dy} 1620 ${520 + dy} L 1620 ${575 + dy} L -20 ${575 + dy} Z`;
const vegD = (dy = 0) => `M -20 ${770 + dy} C 200 ${740 + dy} 420 ${800 + dy} 720 ${770 + dy} S 1180 ${730 + dy} 1620 ${770 + dy} L 1620 900 L -20 900 Z`;
const WAVES: { d: string; sw: number; o: number }[] = [
  { d: "M -50 180 Q 400 165 800 180 T 1650 180", sw: 1.2, o: 1 },
  { d: "M -50 240 Q 500 222 900 240 T 1650 240", sw: 1, o: 0.7 },
  { d: "M -50 300 Q 350 285 750 300 T 1650 300", sw: 0.8, o: 0.5 },
  { d: "M -50 360 Q 600 345 1000 360 T 1650 360", sw: 0.8, o: 0.5 },
];

/* Small static wavelets ("~" dashes) scattered across the open-water band, for a
   little surface texture without any motion. A fixed pseudo-random layout keyed
   off the index so it's stable across renders. `dy` shifts them with the
   shoreline so they always sit in the sea, just above the foam line. */
function SeaWavelets({ dy = 0 }: { dy?: number }) {
  const marks = Array.from({ length: 26 }).map((_, i) => {
    const x = 40 + ((i * 311) % 1540);
    const y = 150 + ((i * 173) % 280) + dy;
    const w = 16 + ((i * 7) % 14);
    const o = 0.18 + ((i * 13) % 22) / 100;
    return { x, y, w, o, key: i };
  });
  return (
    <g stroke="white" fill="none" strokeLinecap="round">
      {marks.map(({ x, y, w, o, key }) => (
        <path key={key} d={`M ${x} ${y} q ${w / 2} -${w / 3} ${w} 0 q ${w / 2} ${w / 3} ${w} 0`} strokeWidth="1.1" opacity={o} />
      ))}
    </g>
  );
}

/* Flat beach scene — drives every gradient and decor layer from `preset`. Used
   by the booking map, the auth panel, the map editor canvas and the picker. */
function BeachScene({ preset, preview = false, shoreline }: { preset: BeachPreset; preview?: boolean; shoreline?: number }) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const grain = preset.grain && !preview;
  const dy = shorelineShift(shoreline);
  return (
    <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id("sea")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={preset.sea[0]} />
          <stop offset="35%" stopColor={preset.sea[1]} />
          <stop offset="70%" stopColor={preset.sea[2]} />
          <stop offset="100%" stopColor={preset.sea[3]} />
        </linearGradient>
        <linearGradient id={id("sand")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={preset.sand[0]} />
          <stop offset="55%" stopColor={preset.sand[1]} />
          <stop offset="100%" stopColor={preset.sand[2]} />
        </linearGradient>
        <linearGradient id={id("foam")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={preset.foam} />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {preset.glint && (
          <radialGradient id={id("glint")} cx="50%" cy="0%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        )}
        {preset.veg && (
          <linearGradient id={id("veg")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={preset.veg[0]} />
            <stop offset="100%" stopColor={preset.veg[1]} />
          </linearGradient>
        )}
        {grain && (
          <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.48  0 0 0 0 0.32  0 0 0 0.18 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        )}
        <linearGradient id={id("vignette")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(11, 37, 69, 0.35)" />
          <stop offset="100%" stopColor="rgba(11, 37, 69, 0)" />
        </linearGradient>
      </defs>

      {/* Sea fills the canvas; sand + vegetation are drawn over the lower portion. */}
      <rect width="1600" height="900" fill={`url(#${id("sea")})`} />
      {preset.glint && <rect width="1600" height="900" fill={`url(#${id("glint")})`} />}

      {preset.waves > 0 && (
        <g opacity="0.35" stroke="white" fill="none" strokeLinecap="round">
          {WAVES.slice(0, preset.waves).map((wv, i) => (
            <path key={i} d={wv.d} strokeWidth={wv.sw} opacity={wv.o} />
          ))}
        </g>
      )}

      {/* Static surface texture in the open-water band. */}
      <SeaWavelets dy={dy} />

      {/* Curved shoreline foam band */}
      <path d={foamD(dy)} fill={`url(#${id("foam")})`} />
      {/* Sand + texture overlay */}
      <path d={sandD(dy)} fill={`url(#${id("sand")})`} />
      {grain && <path d={sandD(dy)} filter={`url(#${id("grain")})`} opacity="0.5" />}
      {/* Wet-sand shading just below the foam */}
      <path d={wetD(dy)} fill="rgba(190, 140, 80, 0.18)" />

      {/* Optional decor (sun, palms, sailboat…) above the sand, behind the greenery. */}
      <SceneDecor preset={preset} id={id} />

      {preset.veg && (
        <>
          <path d={vegD(dy)} fill={`url(#${id("veg")})`} opacity="0.92" />
          <g fill="#3f6b2c" opacity="0.85">
            {Array.from({ length: 28 }).map((_, i) => {
              const x = 30 + i * 57 + (i % 3) * 11;
              const y = 790 + dy + ((i * 13) % 70);
              const r = 12 + ((i * 5) % 9);
              return <circle key={i} cx={x} cy={y} r={r} />;
            })}
          </g>
          <g fill="#65a04a" opacity="0.7">
            {Array.from({ length: 22 }).map((_, i) => {
              const x = 60 + i * 71 + (i % 4) * 9;
              const y = 810 + dy + ((i * 17) % 60);
              const r = 8 + ((i * 3) % 6);
              return <circle key={i} cx={x} cy={y} r={r} />;
            })}
          </g>
        </>
      )}

      {/* Soft top vignette so the topbar/chrome reads over the scene. */}
      <rect width="1600" height="160" fill={`url(#${id("vignette")})`} />
    </svg>
  );
}

/* Depth-parallax beach — the same palette split into far (sea), mid (sand +
   decor) and near (vegetation) planes that drift at different rates on scroll, so
   the horizon reads as real depth. Each plane overscans (-12%) and its travel is
   clamped, so a translate never exposes an edge; useParallax no-ops under reduced
   motion, leaving the planes stacked exactly like the flat scene. */
function BeachSceneLayered({ preset, shoreline }: { preset: BeachPreset; shoreline?: number }) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const dy = shorelineShift(shoreline);
  const far = useParallax<HTMLDivElement>(-0.018, 24);
  const mid = useParallax<HTMLDivElement>(-0.04, 44);
  const near = useParallax<HTMLDivElement>(-0.065, 60);
  const plane = "absolute pointer-events-none";
  const overscan = { inset: "-12%", willChange: "transform" } as const;
  return (
    <>
      {/* Far plane — sea, glint, wave bands and the top vignette. */}
      <div ref={far} className={plane} style={overscan}>
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={id("sea")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={preset.sea[0]} />
              <stop offset="35%" stopColor={preset.sea[1]} />
              <stop offset="70%" stopColor={preset.sea[2]} />
              <stop offset="100%" stopColor={preset.sea[3]} />
            </linearGradient>
            {preset.glint && (
              <radialGradient id={id("glint")} cx="50%" cy="0%" r="60%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="60%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            )}
            <linearGradient id={id("vignette")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(11, 37, 69, 0.35)" />
              <stop offset="100%" stopColor="rgba(11, 37, 69, 0)" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${id("sea")})`} />
          {preset.glint && <rect width="1600" height="900" fill={`url(#${id("glint")})`} />}
          {preset.waves > 0 && (
            <g opacity="0.35" stroke="white" fill="none" strokeLinecap="round">
              {WAVES.slice(0, preset.waves).map((wv, i) => (
                <path key={i} d={wv.d} strokeWidth={wv.sw} opacity={wv.o} />
              ))}
            </g>
          )}
          <SeaWavelets dy={dy} />
          <rect width="1600" height="160" fill={`url(#${id("vignette")})`} />
        </svg>
      </div>
      {/* Mid plane — shoreline foam, sand, its grain + wet-sand shading, and decor. */}
      <div ref={mid} className={plane} style={overscan}>
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={id("sand")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={preset.sand[0]} />
              <stop offset="55%" stopColor={preset.sand[1]} />
              <stop offset="100%" stopColor={preset.sand[2]} />
            </linearGradient>
            <linearGradient id={id("foam")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={preset.foam} />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            {preset.grain && (
              <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.48  0 0 0 0 0.32  0 0 0 0.18 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
            )}
          </defs>
          <path d={foamD(dy)} fill={`url(#${id("foam")})`} />
          <path d={sandD(dy)} fill={`url(#${id("sand")})`} />
          {preset.grain && <path d={sandD(dy)} filter={`url(#${id("grain")})`} opacity="0.5" />}
          <path d={wetD(dy)} fill="rgba(190, 140, 80, 0.18)" />
          <SceneDecor preset={preset} id={id} />
        </svg>
      </div>
      {/* Near plane — the vegetation belt and tree dots (moves the most). */}
      {preset.veg && (
        <div ref={near} className={plane} style={overscan}>
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id={id("veg")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={preset.veg[0]} />
                <stop offset="100%" stopColor={preset.veg[1]} />
              </linearGradient>
            </defs>
            <path d={vegD(dy)} fill={`url(#${id("veg")})`} opacity="0.92" />
            <g fill="#3f6b2c" opacity="0.85">
              {Array.from({ length: 28 }).map((_, i) => {
                const x = 30 + i * 57 + (i % 3) * 11;
                const y = 790 + dy + ((i * 13) % 70);
                const r = 12 + ((i * 5) % 9);
                return <circle key={i} cx={x} cy={y} r={r} />;
              })}
            </g>
            <g fill="#65a04a" opacity="0.7">
              {Array.from({ length: 22 }).map((_, i) => {
                const x = 60 + i * 71 + (i % 4) * 9;
                const y = 810 + dy + ((i * 17) % 60);
                const r = 8 + ((i * 3) % 6);
                return <circle key={i} cx={x} cy={y} r={r} />;
              })}
            </g>
          </svg>
        </div>
      )}
    </>
  );
}

/* ---------- Custom (uploaded) beach photo ----------
   A downscaled data-URL cover image with the same top vignette so chrome stays
   legible. Under `parallax` the photo overscans and drifts gently as one plane —
   splitting a real photo into fake depth planes would look broken. */
function CustomBeach({ src, parallax = false }: { src: string; parallax?: boolean }) {
  const ref = useParallax<HTMLDivElement>(parallax ? -0.03 : 0, 40);
  return (
    <>
      <div ref={ref} aria-hidden="true" className="absolute pointer-events-none" style={parallax ? { inset: "-8%", willChange: "transform" } : { inset: 0 }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy-950/35 to-transparent pointer-events-none" />
    </>
  );
}

/* ---------- Scene decor ----------
   Composable, stylized SVG elements layered into a scene per `preset.decor`.
   All coordinates live in the shared 1600×900 viewBox. */
function SceneDecor({ preset, id }: { preset: BeachPreset; id: (k: string) => string }) {
  const d = preset.decor;
  if (d.length === 0) return null;
  return (
    <>
      {d.includes("clouds") && <Clouds />}
      {d.includes("sun") && <SunDisc gradId={id("sun")} />}
      {d.includes("birds") && <Birds />}
      {d.includes("sailboat") && <Sailboat />}
      {d.includes("rocks") && <Rocks />}
      {d.includes("palms") && <Palms />}
    </>
  );
}

function SunDisc({ gradId }: { gradId: string }) {
  return (
    <g>
      <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(255,247,224,0.95)" />
        <stop offset="45%" stopColor="rgba(255,224,150,0.55)" />
        <stop offset="100%" stopColor="rgba(255,224,150,0)" />
      </radialGradient>
      <circle cx="1230" cy="205" r="195" fill={`url(#${gradId})`} />
      <circle cx="1230" cy="205" r="62" fill="#fff3c4" />
      <circle cx="1230" cy="205" r="62" fill="#ffe08a" opacity="0.45" />
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity="0.85">
      <ellipse cx="0" cy="0" rx="70" ry="26" />
      <ellipse cx="48" cy="6" rx="55" ry="22" />
      <ellipse cx="-46" cy="8" rx="48" ry="20" />
      <ellipse cx="6" cy="-16" rx="44" ry="22" />
    </g>
  );
}
function Clouds() {
  return (
    <g fill="#ffffff" opacity="0.7">
      <Cloud x={300} y={120} s={1} />
      <Cloud x={800} y={86} s={0.7} />
      <Cloud x={1070} y={150} s={0.85} />
    </g>
  );
}

function Birds() {
  const pts: [number, number][] = [
    [430, 150], [482, 166], [524, 142], [1170, 116], [1222, 134],
  ];
  return (
    <g stroke="#1f3a4d" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
      {pts.map(([x, y], i) => (
        <path key={i} d={`M ${x} ${y} q 11 -10 22 0 q 11 -10 22 0`} />
      ))}
    </g>
  );
}

function Sailboat() {
  return (
    <g transform="translate(470 300)">
      <path d="M 40 0 L 40 88 L -28 88 Z" fill="#ffffff" opacity="0.95" />
      <path d="M 48 14 L 48 88 L 96 88 Z" fill="#eef2f6" opacity="0.9" />
      <rect x="38" y="-4" width="3" height="92" fill="#5b6b7a" />
      <path d="M -36 88 L 112 88 L 92 112 L -16 112 Z" fill="#324a5e" />
      <path d="M -10 116 L 86 116 L 80 124 L -4 124 Z" fill="#ffffff" opacity="0.18" />
    </g>
  );
}

function Rocks() {
  return (
    <g>
      <path d="M 120 520 q 40 -54 96 -30 q 50 22 38 56 q -70 18 -134 8 Z" fill="#5c6b73" />
      <path d="M 232 540 q 26 -34 64 -20 q 34 16 24 38 q -48 12 -88 6 Z" fill="#6b7a82" />
      <path d="M 150 506 q 30 -10 60 -2" stroke="#7a8890" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M 96 542 q 120 26 232 4" stroke="rgba(255,255,255,0.6)" strokeWidth="6" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* A stylized palm: curved trunk + radiating fronds + coconuts. `flip` mirrors it
   so a pair can frame the scene from both edges. */
const FRONDS = [
  "M 9 -214 C -40 -250 -110 -252 -150 -232 C -104 -242 -44 -232 9 -214 Z",
  "M 9 -214 C -30 -266 -70 -300 -60 -330 C -44 -298 -14 -258 9 -214 Z",
  "M 9 -214 C 6 -270 22 -320 54 -338 C 30 -300 16 -262 9 -214 Z",
  "M 9 -214 C 50 -262 110 -270 156 -250 C 110 -256 50 -240 9 -214 Z",
  "M 9 -214 C 44 -240 104 -232 142 -200 C 96 -224 44 -226 9 -214 Z",
  "M 9 -214 C -34 -232 -96 -222 -136 -190 C -88 -216 -36 -224 9 -214 Z",
];
function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M 0 0 C -6 -60 6 -120 -4 -176 C -8 -198 2 -210 10 -212" fill="none" stroke="#8a5a33" strokeWidth="13" strokeLinecap="round" />
      <path d="M 0 0 C -6 -60 6 -120 -4 -176 C -8 -198 2 -210 10 -212" fill="none" stroke="#a06b3e" strokeWidth="7" strokeLinecap="round" />
      <g fill="#2f7d3a">
        {FRONDS.map((f, i) => <path key={i} d={f} />)}
      </g>
      <g fill="#3f9a47" opacity="0.85" transform="translate(2 -38) scale(0.82)">
        {FRONDS.map((f, i) => <path key={i} d={f} />)}
      </g>
      <circle cx="2" cy="-204" r="6" fill="#5a3a1e" />
      <circle cx="16" cy="-202" r="6" fill="#6b4423" />
    </g>
  );
}
function Palms() {
  return (
    <g>
      <Palm x={150} y={560} s={1.15} />
      <Palm x={1480} y={600} s={1} flip />
    </g>
  );
}

/* ---------- Aerial parking-lot backdrop ----------
   Asphalt, painted lane arrows, dashed centre line and curb strips —
   so the parking grid sits on something that reads as a real lot. */
export function ParkingBackdrop({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full opacity-90" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="pk-asphalt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3f4753" />
            <stop offset="50%" stopColor="#363d48" />
            <stop offset="100%" stopColor="#2c333d" />
          </linearGradient>
          <filter id="pk-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.20  0 0 0 0 0.24  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <rect width="1200" height="800" fill="url(#pk-asphalt)" />
        <rect width="1200" height="800" filter="url(#pk-grain)" opacity="0.55" />
        {/* curb strips */}
        <rect x="0" y="0" width="1200" height="14" fill="#d6b271" />
        <rect x="0" y="786" width="1200" height="14" fill="#d6b271" />
        {/* dashed centre lane line */}
        <line x1="0" y1="400" x2="1200" y2="400" stroke="#f1c84b" strokeWidth="3" strokeDasharray="22 18" opacity="0.85" />
        {/* directional arrows along the lane */}
        <g fill="#f6e7b4" opacity="0.85">
          {[140, 380, 620, 860, 1080].map((x) => (
            <path key={x} d={`M ${x} 388 L ${x + 28} 400 L ${x} 412 Z`} />
          ))}
        </g>
        {/* faded oil patches */}
        <ellipse cx="280" cy="220" rx="60" ry="10" fill="#1f242c" opacity="0.45" />
        <ellipse cx="920" cy="580" rx="80" ry="12" fill="#1f242c" opacity="0.4" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------- Locker-room backdrop ----------
   Uniform wall-tile pattern (no floor/baseboard band) so the backdrop
   reads cleanly even when the grid is several banks tall. */
export function LockerBackdrop({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full opacity-75" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lk-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eaf2f8" />
            <stop offset="100%" stopColor="#d6e2ec" />
          </linearGradient>
          <pattern id="lk-tile" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="url(#lk-wall)" />
            <path d="M 0 80 L 80 80 M 80 0 L 80 80" stroke="rgba(120, 145, 165, 0.35)" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#lk-tile)" />
        {/* ceiling light strips */}
        <g fill="#fffbe6" opacity="0.85">
          <rect x="120" y="20" width="220" height="10" rx="2" />
          <rect x="500" y="20" width="220" height="10" rx="2" />
          <rect x="880" y="20" width="220" height="10" rx="2" />
        </g>
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
