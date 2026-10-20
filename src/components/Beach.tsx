import { lazy, Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { liteScene, prefersReducedMotion, useParallax } from "../lib/motion";
import { DUR, EASE, FINE_POINTER, gsap, motionOK } from "../lib/fx";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useApp, useMoney, useT } from "../app/store";
import { presetById } from "../data/backgrounds";
import type { BeachPreset } from "../data/backgrounds";
import type { BeachBackground, SunbedState } from "../domain/types";
import type { SeaStyle } from "../domain/features";
import { SeaLightGroup, useSceneView } from "./sea/SeaLightSvg";
import { SeaLayer } from "./sea/SeaLayer";
import { BEDS, CANOPY, CANOPY_FOLDED, CANOPY_WEDGES, FIN, GLYPH_BOX, GLYPH_CONTENT, SHADOW_INK, sunbedPalette, TOWELS, towelShade } from "./sunbedGlyph";
import { useSunCast } from "../lib/useSeaLight";
gsap.registerPlugin(MorphSVGPlugin);
// Type-only: erased at build time, so three.js stays in the lazy sea chunk.
import type { SeaEnv } from "./LiveSeaCanvas";

const hashOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ---------- Sunbed-set mark (presentational) ----------
   Just the SVG glyph — a parasol over twin loungers — with no button wrapper, so
   it can render inside other clickable surfaces (the zone-cluster previews on the
   booking beach) without nesting buttons. Geometry + colour come from
   sunbedGlyph.ts, the shared source the Konva grid renders from too.

   The canopy is lit by the scene's sun (AENR-829, `sunCast`): a soft dome — lighter on the
   sun side, shading off toward the far rim — with hairline seams between the gores, a fine rim
   highlight and a small pole cap; its shadow lies on the sand away from the sun, longer and
   softer toward sunrise and sunset, faint under cloud and at night.

   `towel` (AENR-830): when the set is yours, a towel in the zone's colour lies on each lounger —
   it unrolls from under the canopy to the foot as you pick it, and rolls back up when let go.

   `tilt` (AENR-832): on a mouse or trackpad, the canopy leans a few degrees toward the pointer
   while it hovers the set and settles back on leave. */
export function SunbedMark({ state = "a", sel = false, size = 20, fill = false, className = "", towel, tilt = false }: {
  state?: SunbedState;
  sel?: boolean;
  size?: number;
  fill?: boolean;
  className?: string;
  /** The zone's colour — your set's towels. Omit for no towels (previews, legends). */
  towel?: string;
  /** Lean toward the pointer on hover — free sets on the pick map only. */
  tilt?: boolean;
}) {
  const p = sunbedPalette(state, sel);
  const cast = useSunCast();
  // The umbrella opens when the set becomes yours and folds when it stops being yours (AENR-790):
  // each gore changes shape (MorphSVG, AENR-808) from a folded spike by the pole out to its full
  // wedge, one after another round the canopy as it turns, while its shadow spreads on the sand.
  // Let go, it half-folds and springs open again in the plain colour. Not on mount.
  const canopy = useRef<SVGGElement>(null);
  const skin = useRef<SVGGElement>(null);
  const shade = useRef<SVGGElement>(null);
  const towels = useRef<SVGGElement>(null);
  const lean = useRef<SVGGElement>(null);
  const was = useRef(sel);
  const rawId = useId();
  const uid = `sb${rawId.replace(/[^\w-]/g, "")}`;
  // Each umbrella catches the gust a moment apart, so a row never sways in lockstep.
  const gustDelay = `-${(hashOf(rawId) % 34) / 10}s`;
  // The shadow's centre is read when the pick runs, so a moving sun never leaves a stale origin.
  const castRef = useRef(cast);
  castRef.current = cast;
  useLayoutEffect(() => {
    if (was.current === sel) return;
    was.current = sel;
    if (!motionOK() || !canopy.current || !shade.current || !skin.current) return;
    const cn = canopy.current;
    const sk = skin.current;
    const sh = shade.current;
    const at = `${castRef.current.x} ${castRef.current.y}`;
    const gores = Array.from(cn.querySelectorAll<SVGPathElement>("[data-gore]"));
    const tw = towels.current;
    const clips = tw ? Array.from(tw.querySelectorAll<SVGRectElement>("[data-towel-clip]")) : [];
    const rolls = tw ? Array.from(tw.querySelectorAll<SVGRectElement>("[data-towel-roll]")) : [];
    // Settle back to the plain glyph: no transform left on the canopy or its shadow, every gore whole.
    // (AENR-817: a box-relative origin measured mid-morph left the canopy off its pole.)
    const settle = () => {
      gsap.set([cn, sh], { clearProps: "transform" });
      gsap.set([sk, sh], { clearProps: "opacity" });
      gores.forEach((g, i) => g.setAttribute("d", CANOPY_WEDGES[i].d));
      if (tw) gsap.set([...clips, ...rolls, tw], { clearProps: "all" });
    };
    const tl = gsap.timeline({ defaults: { overwrite: "auto" }, onComplete: settle });
    if (sel) {
      // Turned about the pole, in the glyph's own units — never about a box that changes as it morphs.
      tl.fromTo(cn, { rotation: -70, svgOrigin: `${CANOPY.cx} ${CANOPY.cy}` }, { rotation: 0, duration: 0.55, ease: EASE.out }, 0)
        .fromTo(sh, { scale: 0.2, opacity: 0, svgOrigin: at }, { scale: 1, opacity: 1, duration: 0.45, ease: EASE.out }, 0.05)
        // The dome's shading and rim only make sense on the open canopy — they fade in as it fills out.
        .fromTo(sk, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: EASE.out }, 0.2);
      gores.forEach((g, i) => tl.fromTo(g, { morphSVG: CANOPY_FOLDED[i] }, { morphSVG: CANOPY_WEDGES[i].d, duration: 0.42, ease: "back.out(1.5)" }, i * 0.014));
      // The towels unroll from the head end, under the canopy, to the foot — the second a beat later.
      TOWELS.forEach((t, i) => {
        if (!clips[i] || !rolls[i]) return;
        const at0 = 0.16 + i * 0.07;
        tl.fromTo(clips[i], { scaleY: 0, svgOrigin: `${t.x} ${t.y}` }, { scaleY: 1, duration: 0.35, ease: "power2.out" }, at0)
          .to(rolls[i], { opacity: 1, duration: 0.04 }, at0)
          .fromTo(rolls[i], { y: 0 }, { y: t.h - t.roll, duration: 0.35, ease: "power2.out" }, at0)
          .to(rolls[i], { opacity: 0, duration: 0.08 }, at0 + 0.3);
      });
    } else {
      tl.to(sk, { opacity: 0, duration: 0.12, ease: EASE.in }, 0)
        .to(sk, { opacity: 1, duration: 0.24, ease: EASE.out }, 0.16)
        .fromTo(sh, { scale: 0.82, svgOrigin: at }, { scale: 1, duration: 0.4, ease: "back.out(1.3)" }, 0.1);
      gores.forEach((g, i) =>
        tl.to(g, { morphSVG: CANOPY_FOLDED[i], duration: 0.14, ease: EASE.in }, 0).to(g, { morphSVG: CANOPY_WEDGES[i].d, duration: 0.3, ease: "back.out(1.3)" }, 0.14),
      );
      // Let go: the towels roll back up to the head end (shown for the roll, then hidden again).
      if (tw) {
        gsap.set(tw, { visibility: "visible" });
        TOWELS.forEach((t, i) => {
          if (!clips[i] || !rolls[i]) return;
          const at0 = i * 0.06;
          tl.fromTo(clips[i], { scaleY: 1, svgOrigin: `${t.x} ${t.y}` }, { scaleY: 0, duration: 0.3, ease: "power2.in" }, at0)
            .fromTo(rolls[i], { y: t.h - t.roll }, { y: 0, duration: 0.3, ease: "power2.in" }, at0)
            .to(rolls[i], { opacity: 1, duration: 0.04 }, at0)
            .to(rolls[i], { opacity: 0, duration: 0.06 }, at0 + 0.28);
        });
      }
    }
    return () => {
      tl.kill();
      settle();
    };
  }, [sel]);
  // Tilt toward the pointer (AENR-832): a 2D stand-in for a few degrees of rotateX/Y — the canopy
  // drifts toward the pointer and foreshortens along that line. Its own wrapper group, so it never
  // fights the wind sway outside it or the pick turn inside it. Fine pointers only, never on touch,
  // taps or focus, nothing under reduced motion; quickTo keeps it on the compositor's beat.
  useEffect(() => {
    const g = lean.current;
    const svg = g?.ownerSVGElement;
    if (!tilt || !g || !svg || !motionOK() || !window.matchMedia(FINE_POINTER).matches) return;
    // Foreshorten about the canopy's own centre (the pole): measured once, on the open canopy.
    gsap.set(g, { transformOrigin: "50% 50%" });
    const to = (prop: "x" | "y" | "scaleX" | "scaleY") => gsap.quickTo(g, prop, { duration: 0.35, ease: "power3.out" });
    const qx = to("x");
    const qy = to("y");
    const sx = to("scaleX");
    const sy = to("scaleY");
    const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
    // Where the pole stands on screen: the glyph is drawn loungers-up, so the canopy sits low in the box.
    const poleY = (2 * GLYPH_CONTENT.cy - CANOPY.cy) / GLYPH_BOX;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const b = svg.getBoundingClientRect();
      const nx = clamp1((e.clientX - (b.left + b.width / 2)) / (b.width / 2));
      const ny = clamp1((e.clientY - (b.top + b.height * poleY)) / (b.height / 2));
      // Canonical units are mirrored vertically, so screen-down is −y here.
      qx(nx * TILT.shift);
      qy(-ny * TILT.shift);
      sx(1 - Math.abs(nx) * TILT.squash);
      sy(1 - Math.abs(ny) * TILT.squash);
    };
    const settle = () => {
      qx(0);
      qy(0);
      sx(1);
      sy(1);
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerleave", settle);
    return () => {
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerleave", settle);
      gsap.killTweensOf(g);
      gsap.to(g, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.25, ease: EASE.out, onComplete: () => { gsap.set(g, { clearProps: "transform" }); } });
    };
  }, [tilt]);
  const { cx, cy, r } = CANOPY;
  // Light on the dome: the highlight sits toward the sun, the far rim shades off.
  const hx = cx + cast.lx * 5;
  const hy = cy + cast.ly * 5;
  return (
    <svg aria-hidden="true" width={fill ? "100%" : size} height={fill ? "100%" : size} viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} overflow="visible" className={`${fill ? "w-full h-full " : ""}${className}`}>
      <defs>
        <radialGradient id={`${uid}-sh`}>
          <stop offset={0} stopColor={SHADOW_INK} stopOpacity={cast.alpha} />
          <stop offset={1 - cast.soft} stopColor={SHADOW_INK} stopOpacity={cast.alpha * 0.8} />
          <stop offset={1} stopColor={SHADOW_INK} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-dome`} gradientUnits="userSpaceOnUse" cx={hx} cy={hy} fx={hx} fy={hy} r={r + 5}>
          <stop offset={0} stopColor="#ffffff" stopOpacity={0.5 * cast.lit} />
          <stop offset={0.4} stopColor="#ffffff" stopOpacity={0} />
          <stop offset={0.7} stopColor={DOME_INK} stopOpacity={0} />
          <stop offset={1} stopColor={DOME_INK} stopOpacity={0.26 + 0.16 * cast.night} />
        </radialGradient>
        <linearGradient id={`${uid}-rim`} gradientUnits="userSpaceOnUse" x1={cx + cast.lx * r} y1={cy + cast.ly * r} x2={cx - cast.lx * r} y2={cy - cast.ly * r}>
          <stop offset={0} stopColor="#ffffff" stopOpacity={0.25 + 0.65 * cast.lit} />
          <stop offset={0.5} stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>
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
        {/* Your towels (AENR-830): each clipped by a rect that GSAP scales open from the head end,
            with the rolled-up end riding the edge. Hidden unless the set is yours. */}
        {towel && (
          <g ref={towels} visibility={sel ? "visible" : "hidden"}>
            {TOWELS.map((t, i) => (
              <g key={i}>
                <clipPath id={`${uid}-tw${i}`}>
                  <rect data-towel-clip="" x={t.x - 1} y={t.y} width={t.w + 2} height={t.h} />
                </clipPath>
                <g clipPath={`url(#${uid}-tw${i})`}>
                  <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={t.r} fill={towel} />
                  <path d={t.bands} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.9} />
                </g>
                <rect data-towel-roll="" x={t.x - 0.5} y={t.y} width={t.w + 1} height={t.roll} rx={t.roll / 2} fill={towelShade(towel)} opacity={0} />
              </g>
            ))}
          </g>
        )}
        {/* The canopy's shadow on the sand — and on the loungers under it (AENR-829). */}
        <g ref={shade}>
          <ellipse cx={cast.x} cy={cast.y} rx={(r + 0.5) * cast.stretch} ry={r + 0.5} transform={`rotate(${cast.rot.toFixed(1)} ${cast.x.toFixed(2)} ${cast.y.toFixed(2)})`} fill={`url(#${uid}-sh)`} />
        </g>
        {/* Pinwheel parasol — state-hue gores alternating with white. The outer group sways in the
            wind (AENR-807, CSS), the inner one opens on pick (GSAP) — two transforms that never fight. */}
        <g data-canopy="" style={{ "--gust-delay": gustDelay } as CSSProperties}>
        <g ref={lean} data-tilt="">
        <g ref={canopy}>
          {CANOPY_WEDGES.map((wdg, i) => (
            <path key={`w${i}`} data-gore="" d={wdg.d} fill={wdg.lite ? p.lite : p.c} stroke={SEAM} strokeWidth={0.45} strokeLinejoin="round" />
          ))}
          {/* The dome's light, its rim and a fine highlight along the sun side of the hem. */}
          <g ref={skin}>
            <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-dome)`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.edge} strokeOpacity={0.6} strokeWidth={0.7} />
            <circle cx={cx} cy={cy} r={r - 0.9} fill="none" stroke={`url(#${uid}-rim)`} strokeWidth={0.7} />
          </g>
          {/* Pole cap: a small knob in the state hue, lit from the sun side. */}
          <circle cx={FIN.cx} cy={FIN.cy} r={FIN.r} fill={p.fin} stroke={p.edge} strokeWidth={0.5} />
          <circle cx={FIN.cx + cast.lx * 0.7} cy={FIN.cy + cast.ly * 0.7} r={0.75} fill="#ffffff" fillOpacity={0.35 + 0.5 * cast.lit} />
        </g>
        </g>
        </g>
      </g>
    </svg>
  );
}

/** How far the canopy leans toward the pointer (AENR-832): drift in glyph units, foreshortening. */
const TILT = { shift: 3.2, squash: 0.07 } as const;

/** Hairline seams between the gores, and the deepest shade the dome takes on its far side. */
const SEAM = "rgba(11,37,69,0.2)";
const DOME_INK = "#0b2545";

/* ---------- Single sunbed-set glyph ----------
   A parasol over twin loungers. state: "a" available · "h" on hold · "u"
   unavailable · sel = selected. The interactive button wrapper around SunbedMark
   used by the legend + the booking grid. */
export function Sunbed({ state = "a", sel = false, onClick, label, price, size = 20, block = false, fill = false, readOnly = false, towel }: {
  state?: SunbedState;
  sel?: boolean;
  onClick?: () => void;
  label?: string;
  price?: number;
  size?: number;
  block?: boolean;
  fill?: boolean;
  /** Lock the glyph for display only — no hover lift, no click (used by the
   *  later booking steps, where the chosen beach is shown but not editable). */
  readOnly?: boolean;
  /** The zone's colour, for your set's towels (AENR-830). */
  towel?: string;
}) {
  const t = useT();
  const money = useMoney();
  const p = sunbedPalette(state, sel);
  const dim = p.dim;
  // On-hold sets are shown (amber) but can't be picked — someone else is
  // mid-purchase (AENR-520 / UX N1).
  const held = state === "h" && !sel;
  const interactive = !dim && !held && !readOnly;
  // Lifted on hover, the set's shadow drops along the sun's line (AENR-829), not straight down.
  const cast = useSunCast();
  const sx = cast.x - CANOPY.cx;
  const sy = CANOPY.cy - cast.y;
  const sm = Math.hypot(sx, sy);
  const lift = {
    "--lift-x": `${(sm > 0.5 ? (sx / sm) * 6 : 0).toFixed(1)}px`,
    "--lift-y": `${(sm > 0.5 ? (sy / sm) * 6 + 2 : 8).toFixed(1)}px`,
  } as CSSProperties;
  return (
    <button
      disabled={dim || held || readOnly}
      onClick={onClick}
      aria-label={`${t("Sunbed")} ${label || ""}${dim ? ` ${t("unavailable")}` : state === "h" ? ` ${t("on hold")}` : ` ${money(price ?? 0)}`}${sel ? `, ${t("selected")}` : ""}`}
      aria-pressed={sel}
      // `fill` lets the glyph scale to its cell (used by the wizard's pick grid so
      // each umbrella grows on desktop yet stays tappable on phones); `block`
      // alone keeps a fixed `size` but a full-cell hit area.
      className={`group relative ${block || fill ? "w-full h-full grid place-items-center" : ""} ${interactive ? "cursor-pointer hover:-translate-y-1.5 hover:scale-[1.18] hover:z-20" : (dim || held) && !readOnly ? "cursor-not-allowed" : "cursor-default"} transition-transform duration-200 ease-spring`}
      style={{ lineHeight: 0, willChange: "transform", ...lift }}
    >
      <SunbedMark state={state} sel={sel} size={size} fill={fill} towel={towel} tilt={interactive && state === "a" && !sel} className="transition-[filter] duration-200 group-hover:drop-shadow-[var(--lift-x)_var(--lift-y)_10px_rgba(60,42,20,0.45)]" />
      {!dim && label && (
        <span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 px-3 py-2 rounded-xl bg-navy-900/95 text-white whitespace-nowrap shadow-float ring-1 ring-white/10 transition-opacity duration-150">
          <span className="block font-bold text-[12.5px] leading-none tnum">{label}</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] leading-none">
            <span className={`w-1.5 h-1.5 rounded-full ${state === "h" ? "bg-amber-400" : "bg-teal-400"}`} />
            <span className="text-white/80">{state === "h" ? t("On hold") : t("Available")}</span>
            <span className="text-white/30">·</span>
            <span className="font-semibold">{money(price ?? 0)}</span>
          </span>
          {/* caret */}
          <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 w-2.5 h-2.5 rotate-45 bg-navy-900/95" />
        </span>
      )}
    </button>
  );
}

/* ---------- Beach backdrop ----------
   Resolves the active tenant background (a preset or an uploaded photo) and
   renders it behind `children`. Pass an explicit `background` to preview a
   specific scene (the picker does this); otherwise it reads the zone, so the
   choice flows to the booking map and the customer surface automatically. */
/** The sea's effects a tenant can switch (AENR-810): the live WebGL water, the depth planes + birds,
 *  and the wave lines. Omitted = all on (admin previews, the guest pass). */
export interface SeaFx {
  live: boolean;
  depth: boolean;
  detail: boolean;
}
const ALL_SEA: SeaFx = { live: true, depth: true, detail: true };

export function BeachBackdrop({ children, className = "", pos = "relative", parallax = false, background, preview = false, shoreline, noVeg = false, seaEnv, sea = ALL_SEA, seaStyle = "classic" }: {
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
  /** Drop the green vegetation belt so the lower scene reads as pure sand —
   *  used inside the booking wizard where guests tap sunbeds on the sand. */
  noVeg?: boolean;
  /** Weather / daylight targets for the live water + ambient decor (layered
   *  scene only). Omitted = calm sunny noon. */
  seaEnv?: SeaEnv;
  sea?: SeaFx;
  /** Which sea this device shows (AENR-813): Classic, Coastal or Video. */
  seaStyle?: SeaStyle;
}) {
  const ctx = useApp();
  const bg = background ?? ctx.background;
  const scene =
    bg.kind === "custom" ? (
      <CustomBeach src={bg.src} parallax={parallax} />
    ) : parallax ? (
      <BeachSceneLayered preset={presetById(bg.id)} shoreline={shoreline} noVeg={noVeg} seaEnv={seaEnv} sea={sea} seaStyle={seaStyle} />
    ) : (
      <BeachScene preset={presetById(bg.id)} preview={preview} shoreline={shoreline} noVeg={noVeg} noSky={!preview && shoreline !== undefined && !seaEnv?.clouds} detail={sea.detail} seaStyle={seaStyle} seaEnv={seaEnv} />
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
export const shorelineShift = (shoreline?: number) => (shoreline == null ? 0 : Math.round(shoreline * 900 - SAND_TOP));
const sandD = (dy = 0) => `M -20 ${500 + dy} C 220 ${460 + dy} 440 ${555 + dy} 740 ${510 + dy} S 1200 ${450 + dy} 1620 ${510 + dy} L 1620 900 L -20 900 Z`;
const foamD = (dy = 0) => `M -20 ${470 + dy} C 200 ${430 + dy} 420 ${520 + dy} 720 ${480 + dy} S 1180 ${420 + dy} 1620 ${480 + dy} L 1620 ${540 + dy} L -20 ${540 + dy} Z`;
/* Open parallel of the sand-top curve, `off` px further down the beach. The
   curve is shallow, so a plain vertical shift is a faithful offset. */
const sandTopD = (dy = 0, off = 0) =>
  `M -20 ${500 + off + dy} C 220 ${460 + off + dy} 440 ${555 + off + dy} 740 ${510 + off + dy} S 1200 ${450 + off + dy} 1620 ${510 + off + dy}`;
/* Closed band between two parallels of the sand-top curve (o1 above o2). */
const sandBandD = (dy = 0, o1 = 0, o2 = 0) =>
  `${sandTopD(dy, o1)} L 1620 ${510 + o2 + dy} C 1200 ${450 + o2 + dy} 1040 ${465 + o2 + dy} 740 ${510 + o2 + dy} C 440 ${555 + o2 + dy} 220 ${460 + o2 + dy} -20 ${500 + o2 + dy} Z`;

/* Darken a hex colour (f < 1) → 0–1 floats for feColorMatrix. */
const shadeRgb = (hex: string, f: number): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(((n >> 16) & 255) / 255) * f, (((n >> 8) & 255) / 255) * f, ((n & 255) / 255) * f];
};

/* ---------- Sand detail ----------
   Subtle realism layered over the flat sand fill — and deliberately free of
   hard horizontal edges, which read as stripes across the beach. The wet zone
   under the foam is a gradient band that dissolves into dry sand, topped by a
   soft reflective sheen; grainy presets add large-scale mottling that reads as
   damp patches. Tints derive from the preset's own sand palette. */
function SandDetail({ preset, dy = 0, mottle, idp }: { preset: BeachPreset; dy?: number; mottle: boolean; idp: (k: string) => string }) {
  const dark = shadeRgb(preset.sand[2], 0.55);
  return (
    <>
      {mottle && (
        <>
          <filter id={idp("mottle")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.02" numOctaves="2" seed="11" />
            <feColorMatrix values={`0 0 0 0 ${dark[0].toFixed(3)}  0 0 0 0 ${dark[1].toFixed(3)}  0 0 0 0 ${dark[2].toFixed(3)}  0 0 0 0.12 0`} />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <path d={sandD(dy)} filter={`url(#${idp("mottle")})`} opacity="0.5" />
        </>
      )}
      <linearGradient id={idp("wet")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(190, 140, 80, 0.26)" />
        <stop offset="100%" stopColor="rgba(190, 140, 80, 0)" />
      </linearGradient>
      <path d={sandBandD(dy, 8, 92)} fill={`url(#${idp("wet")})`} />
      <linearGradient id={idp("sheen")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
      <path d={sandBandD(dy, 2, 56)} fill={`url(#${idp("sheen")})`} />
    </>
  );
}
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
   by the booking map, the auth panel, the map editor canvas and the picker, and
   as the still guest backdrop on phones.

   Drawn as stacked layers of one 1600×900 scene: the sea (and its light, AENR-815),
   the sea a tenant may swap in (Coastal / Video, AENR-813), the land (wavelets,
   foam, sand), the decor, the greenery and the top vignette. The land and the
   greenery slide when the shoreline moves (Home ↔ Plan) — a transform, not a
   redraw (AENR-823) — so their paths run below the scene (a skirt) to never
   show a gap while they travel. */
function BeachScene({ preset, preview = false, shoreline, noVeg = false, noSky = false, detail = true, seaStyle = "classic", seaEnv }: {
  preset: BeachPreset;
  preview?: boolean;
  shoreline?: number;
  noVeg?: boolean;
  /** Drop clouds and birds — the still phone backdrop (AENR-730), where the shoreline moves and they'd sit on the sand. */
  noSky?: boolean;
  /** Wave lines on the water (AENR-810). */
  detail?: boolean;
  /** The tenant's sea for this device (AENR-813). */
  seaStyle?: SeaStyle;
  /** Weather + light for the sea (AENR-815); omitted = a clear noon. */
  seaEnv?: SeaEnv;
}) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const grain = preset.grain && !preview;
  const dy = shorelineShift(shoreline);
  const land = useRef<HTMLDivElement>(null);
  const green = useRef<HTMLDivElement>(null);
  useShoreSlide(dy, [land, green]);
  const [failed, setFailed] = useState(false);
  const style = failed ? "classic" : seaStyle;
  // The video sea plays in its own screen-sized layer behind the scene (CustomerBackdrop, AENR-835):
  // here the water is left open, so it shows through.
  const open = style === "video";
  const light = seaEnv?.light;
  const seaSvg = useRef<SVGSVGElement>(null);
  const view = useSceneView(seaSvg);
  const svg = "absolute inset-0 w-full h-full";
  return (
    <>
      {/* The sea — always painted: the Classic look, and the loading state under a swapped-in sea. */}
      <svg ref={seaSvg} aria-hidden="true" className={svg} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
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
        </defs>
        {!open && <rect width="1600" height="900" fill={`url(#${id("sea")})`} />}
        {/* The noon sheen fades with the light: no white glare at night or under cloud. */}
        {!open && preset.glint && <rect width="1600" height="900" fill={`url(#${id("glint")})`} opacity={light ? (1 - light.night) * (1 - 0.8 * light.cloud) * (1 - 0.6 * light.warm) : 1} />}
        {!open && detail && preset.waves > 0 && (
          <g opacity="0.35" stroke="white" fill="none" strokeLinecap="round">
            {WAVES.slice(0, preset.waves).map((wv, i) => (
              <path key={i} d={wv.d} strokeWidth={wv.sw} opacity={wv.o} />
            ))}
          </g>
        )}
        {light && style === "classic" && <SeaLightGroup light={light} dy={dy} view={view} wind={seaEnv?.wind} />}
      </svg>
      {style !== "classic" && !open && seaEnv && (
        <SeaLayer style={style} preset={preset} dy={dy} env={seaEnv} tier={liteScene() ? "mobile" : "desktop"} onFail={() => setFailed(true)} />
      )}

      {/* The land: surface texture by the shore, the foam band, the sand and its detail. */}
      <div ref={land} className="absolute inset-0">
        <svg aria-hidden="true" className={svg} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" overflow="visible">
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
            {grain && (
              <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.48  0 0 0 0 0.32  0 0 0 0.18 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
            )}
          </defs>
          {/* Static surface texture in the open-water band. */}
          {detail && style === "classic" && <SeaWavelets dy={dy} />}
          {/* Curved shoreline foam band */}
          <path d={foamD(dy)} fill={`url(#${id("foam")})`} />
          {/* Sand + texture overlay, and the skirt below the scene that a slide may show. */}
          <path d={sandD(dy)} fill={`url(#${id("sand")})`} />
          <rect x="-20" y="899" width="1640" height={SKIRT} fill={preset.sand[2]} />
          {grain && <path d={sandD(dy)} filter={`url(#${id("grain")})`} opacity="0.5" />}
          {/* Wet shading + sheen (both gradient bands — no hard seams), mottling. */}
          <SandDetail preset={preset} dy={dy} mottle={grain} idp={id} />
        </svg>
      </div>

      {/* Optional decor (sun, palms, clouds…) above the sand, behind the greenery. */}
      <svg aria-hidden="true" className={svg} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        {/* Cartoon clouds and birds only over the painted sea — over real water they read as blobs (AENR-814). */}
        <SceneDecor preset={preset} id={id} noSky={noSky || style !== "classic"} />
      </svg>

      {preset.veg && !noVeg && (
        <div ref={green} className="absolute inset-0">
          <svg aria-hidden="true" className={svg} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" overflow="visible">
            <defs>
              <linearGradient id={id("veg")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={preset.veg[0]} />
                <stop offset="100%" stopColor={preset.veg[1]} />
              </linearGradient>
            </defs>
            <Greenery preset={preset} dy={dy} fill={`url(#${id("veg")})`} />
          </svg>
        </div>
      )}

      {/* Soft top vignette so the topbar/chrome reads over the scene. */}
      <svg aria-hidden="true" className={svg} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={id("vignette")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(11, 37, 69, 0.35)" />
            <stop offset="100%" stopColor="rgba(11, 37, 69, 0)" />
          </linearGradient>
        </defs>
        <rect width="1600" height="160" fill={`url(#${id("vignette")})`} />
      </svg>
    </>
  );
}

/** How far below the scene (scene units) the land runs, so sliding it up never shows a gap. */
const SKIRT = 700;

/* The vegetation belt and its tree dots, on its own skirt. */
function Greenery({ preset, dy, fill }: { preset: BeachPreset; dy: number; fill: string }) {
  return (
    <>
      <path d={vegD(dy)} fill={fill} opacity="0.92" />
      <rect x="-20" y="899" width="1640" height={SKIRT} fill={preset.veg?.[1] ?? "#3f6b2c"} opacity="0.92" />
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
  );
}

/* The shoreline moving (Home ↔ Plan, AENR-823): the scene is drawn once at the new shoreline
   and its land layers slide there from the old one — a GSAP transform the compositor runs,
   instead of re-rendering and repainting the whole scene on each of ~45 frames. Interrupted
   mid-slide, the next slide starts from where the land is. Reduced motion: it simply jumps. */
function useShoreSlide(dy: number, refs: ReadonlyArray<RefObject<HTMLElement>>) {
  const prev = useRef(dy);
  const rest = useRef(0); // scene units still to travel when a slide was cut short
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = dy;
    const els = refs.map((r) => r.current).filter((e): e is HTMLElement => !!e);
    if (from === dy || !els.length || prefersReducedMotion()) return;
    const w = els[0].offsetWidth;
    const h = els[0].offsetHeight;
    const k = Math.max(w / 1600, h / 900) || 1; // px per scene unit (the SVG's "slice" fit)
    const start = from - dy + rest.current;
    rest.current = 0;
    const tw = gsap.fromTo(els, { y: start * k }, { y: 0, duration: DUR.shore, ease: "power3.out", force3D: true, overwrite: true, clearProps: "transform" });
    return () => {
      rest.current = Number(gsap.getProperty(els[0], "y")) / k;
      tw.kill();
      gsap.set(els, { clearProps: "transform" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
  }, [dy]);
}

/* The animated WebGL water (three.js) is lazy-loaded so its chunk is only
   fetched on WebGL2-capable devices (desktop and modern phones alike) —
   reduced-motion users and old engines render the layered scene's static SVG
   sea and never download three. */
const LiveSeaCanvas = lazy(() => import("./LiveSeaCanvas"));

/* Quick capability gate before paying for the three.js chunk. three r163+ is
   WebGL2-only; the real context check (incl. rejecting software GL) happens
   inside LiveSeaCanvas, which falls back here via onFail. */
const liveSeaOK = () =>
  typeof window !== "undefined" &&
  typeof WebGL2RenderingContext !== "undefined" &&
  !prefersReducedMotion() &&
  !liteScene(); // phones / small tablets keep the still sea (AENR-730)

/* Depth-parallax beach — the same palette split into far (sea), mid (sand +
   decor) and near (vegetation) planes that drift at different rates on scroll, so
   the horizon reads as real depth. Each plane overscans (-12%) and its travel is
   clamped, so a translate never exposes an edge; useParallax no-ops under reduced
   motion, leaving the planes stacked exactly like the flat scene.

   On WebGL2-capable desktops the far plane's static sea is overlaid by the live
   animated water (LiveSeaCanvas). The SVG sea stays rendered beneath it as the
   loading state and the fallback: if WebGL is missing, software-rendered or the
   context dies, the canvas reverts to it without a flash. */
function BeachSceneLayered({ preset, shoreline, noVeg = false, seaEnv, sea, seaStyle = "classic" }: { preset: BeachPreset; shoreline?: number; noVeg?: boolean; seaEnv?: SeaEnv; sea: SeaFx; seaStyle?: SeaStyle }) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const dy = shorelineShift(shoreline);
  const cloudVis = seaEnv?.clouds ?? 0;
  const cloudSpeed = seaEnv?.cloudSpeed ?? 0;
  const [liveOK, setLiveSea] = useState(liveSeaOK);
  // A swapped-in sea (Coastal / Video, AENR-813) replaces the Classic live water; if it fails, Classic returns.
  const [altFailed, setAltFailed] = useState(false);
  const style = altFailed ? "classic" : seaStyle;
  const open = style === "video"; // played behind the scene by CustomerBackdrop (AENR-835)
  const liveSea = liveOK && sea.live && style === "classic";
  const land = useRef<HTMLDivElement>(null);
  const green = useRef<HTMLDivElement>(null);
  useShoreSlide(dy, [land, green]);
  const seaSvg = useRef<SVGSVGElement>(null);
  const view = useSceneView(seaSvg);
  // Depth off (AENR-810): the planes stay stacked and still, and no birds fly.
  const k = sea.depth ? 1 : 0;
  const far = useParallax<HTMLDivElement>(-0.018 * k, 24);
  const mid = useParallax<HTMLDivElement>(-0.04 * k, 44);
  const near = useParallax<HTMLDivElement>(-0.065 * k, 60);
  const plane = "absolute pointer-events-none";
  const overscan = { inset: "-12%", willChange: "transform" } as const;
  // First ambient run snaps cloud visibility instead of fading it in, so a
  // sunny first paint never flashes clouds.
  const ambFirst = useRef(true);

  // Ambient life (desktop layered scene only): clouds belong to the weather —
  // hidden when sunny, otherwise drifting right-to-left (wrap-around) at the
  // weather's own pace — and a flock of birds crosses every so often. The
  // recursive bird timeline outlives gsap.context capture, so tweens are
  // tracked and killed by hand. Re-inits on scene or weather changes.
  useEffect(() => {
    const root = mid.current;
    if (!root || !motionOK()) return;
    const anims: gsap.core.Animation[] = [];
    const snap = ambFirst.current;
    ambFirst.current = false;
    root.querySelectorAll('[data-amb="cloud"]').forEach((c, i) => {
      if (snap) gsap.set(c, { opacity: cloudVis * 0.85 });
      else anims.push(gsap.to(c, { opacity: cloudVis * 0.85, duration: 1.2, ease: "power1.inOut", overwrite: "auto" }));
      if (cloudVis > 0 && cloudSpeed > 0) {
        anims.push(gsap.to(c, {
          x: "-=2600",
          duration: 2600 / (cloudSpeed + i * 3),
          ease: "none",
          repeat: -1,
          modifiers: { x: gsap.utils.unitize(gsap.utils.wrap(-500, 2100)) },
        }));
      }
    });
    const birds = sea.depth ? root.querySelector('[data-amb="birds"]') : null;
    let flight: gsap.core.Timeline | null = null;
    let alive = true;
    if (birds) {
      gsap.set(birds, { opacity: 0 });
      const cross = () => {
        if (!alive) return;
        flight = gsap.timeline({ delay: 7 + Math.random() * 16, onComplete: cross });
        flight
          .fromTo(birds, { x: -700, y: -30 + Math.random() * 90 }, { x: 1320, duration: 36, ease: "none" }, 0)
          .fromTo(birds, { opacity: 0 }, { opacity: 0.5, duration: 2.2, ease: "none" }, 0)
          .to(birds, { opacity: 0, duration: 2.2, ease: "none" }, 33.8)
          .to(birds, { y: "+=16", duration: 3.6, yoyo: true, repeat: 9, ease: "sine.inOut" }, 0);
      };
      cross();
    }
    return () => {
      alive = false;
      flight?.kill();
      anims.forEach((a) => a.kill());
      if (birds) gsap.set(birds, { clearProps: "all" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mid is a stable ref
  }, [preset.id, cloudVis, cloudSpeed, sea.depth]);
  return (
    <>
      {/* Far plane — sea, glint, wave bands and the top vignette. */}
      <div ref={far} className={plane} style={overscan}>
        <svg ref={seaSvg} aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
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
          {!open && <rect width="1600" height="900" fill={`url(#${id("sea")})`} />}
          {!open && preset.glint && <rect width="1600" height="900" fill={`url(#${id("glint")})`} />}
          {!open && sea.detail && preset.waves > 0 && (
            <g opacity="0.35" stroke="white" fill="none" strokeLinecap="round">
              {WAVES.slice(0, preset.waves).map((wv, i) => (
                <path key={i} d={wv.d} strokeWidth={wv.sw} opacity={wv.o} />
              ))}
            </g>
          )}
          {sea.detail && style === "classic" && <SeaWavelets dy={dy} />}
          {/* Sunrise, sunset and night on the still sea; the live water draws its own light. */}
          {seaEnv && style === "classic" && !liveSea && <SeaLightGroup light={seaEnv.light} dy={dy} view={view} wind={seaEnv.wind} />}
          <rect width="1600" height="160" fill={`url(#${id("vignette")})`} />
        </svg>
        {style !== "classic" && !open && seaEnv && (
          <SeaLayer style={style} preset={preset} dy={dy} env={seaEnv} tier="desktop" onFail={() => setAltFailed(true)} />
        )}
        {liveSea && (
          <Suspense fallback={null}>
            <LiveSeaCanvas preset={preset} dy={dy} env={seaEnv} onFail={() => setLiveSea(false)} />
          </Suspense>
        )}
        {/* The opaque canvas covers the SVG's vignette, so re-draw it on top —
            same viewBox + slice fitting keeps it pixel-identical. */}
        {(liveSea || style !== "classic") && (
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id={id("vignette-live")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(11, 37, 69, 0.35)" />
                <stop offset="100%" stopColor="rgba(11, 37, 69, 0)" />
              </linearGradient>
            </defs>
            <rect width="1600" height="160" fill={`url(#${id("vignette-live")})`} />
          </svg>
        )}
      </div>
      {/* Mid plane — shoreline foam, sand, its grain + wet-sand shading, and decor. */}
      <div ref={mid} className={plane} style={overscan}>
        {/* The land slides with the shoreline (AENR-823); the decor above it stays put. */}
        <div ref={land} className="absolute inset-0">
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" overflow="visible">
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
          <rect x="-20" y="899" width="1640" height={SKIRT} fill={preset.sand[2]} />
          {preset.grain && <path d={sandD(dy)} filter={`url(#${id("grain")})`} opacity="0.5" />}
          <SandDetail preset={preset} dy={dy} mottle={preset.grain} idp={id} />
        </svg>
        </div>
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <SceneDecor preset={preset} id={id} liveClouds noSky={style !== "classic"} />
        </svg>
      </div>
      {/* Near plane — the vegetation belt and tree dots (moves the most). */}
      {preset.veg && !noVeg && (
        <div ref={near} className={plane} style={overscan}>
          <div ref={green} className="absolute inset-0">
            <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" overflow="visible">
              <defs>
                <linearGradient id={id("veg")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={preset.veg[0]} />
                  <stop offset="100%" stopColor={preset.veg[1]} />
                </linearGradient>
              </defs>
              <Greenery preset={preset} dy={dy} fill={`url(#${id("veg")})`} />
            </svg>
          </div>
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
   All coordinates live in the shared 1600×900 viewBox. On the live (layered)
   backdrop the clouds start hidden — the ambient driver owns their visibility
   per demo weather, so a sunny sky can never show a stray cloud. Static
   scenes (previews, phones) keep them as part of the illustration. */
function SceneDecor({ preset, id, liveClouds = false, noSky = false }: { preset: BeachPreset; id: (k: string) => string; liveClouds?: boolean; noSky?: boolean }) {
  const d = preset.decor;
  if (d.length === 0) return null;
  return (
    <>
      {d.includes("clouds") && !noSky && <Clouds hidden={liveClouds} />}
      {d.includes("sun") && <SunDisc gradId={id("sun")} />}
      {d.includes("birds") && !noSky && <Birds />}
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

function Cloud({ x, y, s, hidden = false }: { x: number; y: number; s: number; hidden?: boolean }) {
  // `hidden` = live backdrop: the ambient driver owns opacity (per weather),
  // so each cloud starts invisible via an inline style GSAP then overwrites.
  return (
    <g data-amb="cloud" transform={`translate(${x} ${y}) scale(${s})`} opacity="0.85" style={hidden ? { opacity: 0 } : undefined}>
      <ellipse cx="0" cy="0" rx="70" ry="26" />
      <ellipse cx="48" cy="6" rx="55" ry="22" />
      <ellipse cx="-46" cy="8" rx="48" ry="20" />
      <ellipse cx="6" cy="-16" rx="44" ry="22" />
    </g>
  );
}
function Clouds({ hidden = false }: { hidden?: boolean }) {
  return (
    <g fill="#ffffff" opacity="0.7">
      <Cloud x={140} y={150} s={0.9} hidden={hidden} />
      <Cloud x={520} y={95} s={0.65} hidden={hidden} />
      <Cloud x={800} y={185} s={1.05} hidden={hidden} />
      <Cloud x={1120} y={120} s={0.75} hidden={hidden} />
      <Cloud x={1430} y={205} s={0.95} hidden={hidden} />
      <Cloud x={310} y={255} s={0.55} hidden={hidden} />
    </g>
  );
}

/* A compact flock — static scenes show it resting mid-sky; the ambient driver
   (desktop layered backdrop) flies it across the bay every so often. */
function Birds() {
  const pts: [number, number][] = [
    [0, 0], [46, 15], [92, -7], [38, -24], [128, 6],
  ];
  return (
    <g data-amb="birds" transform="translate(430 130)" stroke="#1f3a4d" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
      {pts.map(([x, y], i) => (
        <path key={i} d={`M ${x} ${y} q 11 -10 22 0 q 11 -10 22 0`} />
      ))}
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
