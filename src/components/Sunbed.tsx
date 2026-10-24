import { useId, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { EASE, gsap, motionOK } from "../lib/fx";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useMoney, useT } from "../app/store";
import type { SunbedState } from "../domain/types";
import { BEDS, CANOPY, CANOPY_FOLDED, CANOPY_WEDGES, FIN, GLYPH_BOX, GLYPH_CONTENT, SHADOW_INK, sunbedPalette, TOWELS, towelShade } from "./sunbedGlyph";
import { useSunCast } from "../lib/useSeaLight";
gsap.registerPlugin(MorphSVGPlugin);

/* The sunbed-set glyph and its pickable button (AENR-790/808/829/830/832). Split from Beach.tsx
   (AENR-839): only the booking map and the staff beach maps draw sets, so the glyph — and the
   MorphSVG plugin its canopy opens with — load with those lazy screens, not with the guest
   backdrop every page shows. */

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
   (The canopy no longer leans toward the pointer — AENR-832's tilt was removed, AENR-850.) */
export function SunbedMark({ state = "a", sel = false, size = 20, fill = false, className = "", towel }: {
  state?: SunbedState;
  sel?: boolean;
  size?: number;
  fill?: boolean;
  className?: string;
  /** The zone's colour — your set's towels. Omit for no towels (previews, legends). */
  towel?: string;
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
    </svg>
  );
}

/* ---------- A light glyph for the zone overview (AENR-854) ----------
   The same umbrella and loungers, palette, sun-side shadow and wind sway, drawn for the small
   overview clusters (16–40 px): no gradient definitions per glyph, the canopy's gores as one path per
   colour, no towels or opening animation. ~10 elements instead of ~42 — the desktop overview draws
   ~290 of them, which made its first render ~12,000 elements (92 % of the page). */
const GORES_PLAIN = CANOPY_WEDGES.filter((w) => !w.lite).map((w) => w.d).join(" ");
const GORES_LITE = CANOPY_WEDGES.filter((w) => w.lite).map((w) => w.d).join(" ");
export function SunbedMini({ state = "a", sel = false, seed = "" }: { state?: SunbedState; sel?: boolean; seed?: string }) {
  const p = sunbedPalette(state, sel);
  const cast = useSunCast();
  const { cx, cy, r } = CANOPY;
  return (
    <svg aria-hidden="true" width="100%" height="100%" viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} overflow="visible" className="w-full h-full">
      <g transform={`translate(0 ${2 * GLYPH_CONTENT.cy}) scale(1 -1)`}>
        {BEDS.map((bed, i) => (
          <g key={i}>
            <rect x={bed.frame.x} y={bed.frame.y} width={bed.frame.w} height={bed.frame.h} rx={bed.frame.r} fill={p.bed} />
            <rect x={bed.cushion.x} y={bed.cushion.y} width={bed.cushion.w} height={bed.cushion.h} rx={bed.cushion.r} fill={p.cushion} />
          </g>
        ))}
        <ellipse cx={cast.x} cy={cast.y} rx={(r + 0.5) * cast.stretch} ry={r + 0.5} transform={`rotate(${cast.rot.toFixed(1)} ${cast.x.toFixed(2)} ${cast.y.toFixed(2)})`} fill={SHADOW_INK} fillOpacity={cast.alpha * 0.85} />
        <g data-canopy="" style={{ "--gust-delay": `-${(hashOf(seed) % 34) / 10}s` } as CSSProperties}>
          <path d={GORES_PLAIN} fill={p.c} stroke={SEAM} strokeWidth={0.45} strokeLinejoin="round" />
          <path d={GORES_LITE} fill={p.lite} stroke={SEAM} strokeWidth={0.45} strokeLinejoin="round" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.edge} strokeOpacity={0.6} strokeWidth={0.7} />
          <circle cx={FIN.cx} cy={FIN.cy} r={FIN.r} fill={p.fin} />
        </g>
      </g>
    </svg>
  );
}

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
      <SunbedMark state={state} sel={sel} size={size} fill={fill} towel={towel} className="transition-[filter] duration-200 group-hover:drop-shadow-[var(--lift-x)_var(--lift-y)_10px_rgba(60,42,20,0.45)]" />
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
