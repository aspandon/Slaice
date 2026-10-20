/* ---------- Sunbed-set glyph — shared geometry + palette ----------
   The umbrella-over-twin-loungers mark, drawn by two renderers that must agree:
   the SVG <Sunbed> (booking legend, Beach.tsx) and the Konva <BeachCanvas> (the
   selectable booking grid + admin map editor). Both consume this one module so
   the canvas and the DOM can never drift.

   Colour follows a single base hue per state — exactly the "one --c variable"
   model the glyph was designed around — but the derived shades (canopy rim, bed
   cushion + slats) are resolved here in JS rather than via CSS color-mix(): Konva
   has no CSS, and color-mix() isn't in the project's Safari/iOS 14 · Edge 88
   targets. The maths is identical, so the output matches the CSS pixel-for-pixel.

   Geometry lives in a 72×72 box: a parasol centred at (36, 31), r=18, over two
   loungers spanning y 20→62. */

import type { SunbedState } from "../domain/types";
import type { SeaLight } from "../lib/seaLight";

export const GLYPH_BOX = 72;
/** Content bounding box (parasol top → lounger foot) — used to centre and fit
 *  the glyph inside its host (the SVG viewBox, the Konva tap-pad).
 *  Canonical geometry is parasol-up; both renderers mirror it vertically about
 *  `cy` to present the set loungers-up. */
export const GLYPH_CONTENT = { cx: 36, cy: 37.5, w: 34.24, h: 49 } as const;

/* ----- Parasol: ten gores, clockwise from 12 o'clock, alternating the state
   hue ("canopy") with a white gore ("lite"). ----- */
export const CANOPY_WEDGES: ReadonlyArray<{ lite: boolean; d: string }> = [
  { lite: false, d: "M36 31 L36.00 13.00 A 18 18 0 0 1 46.58 16.44 Z" },
  { lite: true, d: "M36 31 L46.58 16.44 A 18 18 0 0 1 53.12 25.44 Z" },
  { lite: false, d: "M36 31 L53.12 25.44 A 18 18 0 0 1 53.12 36.56 Z" },
  { lite: true, d: "M36 31 L53.12 36.56 A 18 18 0 0 1 46.58 45.56 Z" },
  { lite: false, d: "M36 31 L46.58 45.56 A 18 18 0 0 1 36.00 49.00 Z" },
  { lite: true, d: "M36 31 L36.00 49.00 A 18 18 0 0 1 25.42 45.56 Z" },
  { lite: false, d: "M36 31 L25.42 45.56 A 18 18 0 0 1 18.88 36.56 Z" },
  { lite: true, d: "M36 31 L18.88 36.56 A 18 18 0 0 1 18.88 25.44 Z" },
  { lite: false, d: "M36 31 L18.88 25.44 A 18 18 0 0 1 25.42 16.44 Z" },
  { lite: true, d: "M36 31 L25.42 16.44 A 18 18 0 0 1 36.00 13.00 Z" },
];
/* Each gore folded shut (AENR-808): a closed parasol seen from above is a tight star — every gore a
   thin spike along its own middle, close to the pole. The open gore above is what it morphs to. */
const goreAt = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(36 + r * Math.cos(a)).toFixed(2)} ${(31 + r * Math.sin(a)).toFixed(2)}`;
};
export const CANOPY_FOLDED: ReadonlyArray<string> = CANOPY_WEDGES.map((_, i) => {
  const mid = i * 36 + 18;
  return `M36 31 L${goreAt(mid - 9, 3.2)} L${goreAt(mid, 10)} L${goreAt(mid + 9, 3.2)} Z`;
});
/** The gores pre-merged by colour into one path each — handy for Konva, where a
 *  single <Path> per fill is far lighter than ten across a full grid of sets. */
export const CANOPY_PATH = CANOPY_WEDGES.filter((w) => !w.lite).map((w) => w.d).join(" ");
export const LITE_PATH = CANOPY_WEDGES.filter((w) => w.lite).map((w) => w.d).join(" ");

export const CANOPY = { cx: 36, cy: 31, r: 18 } as const;
export const FIN = { cx: 36, cy: 31, r: 2.2 } as const;

/* ----- Loungers: a rounded frame, a head cushion and three slats. The pair is
   the same shape mirrored across the pole — left at dx=0, right at dx=20. ----- */
export interface BedShape {
  frame: { x: number; y: number; w: number; h: number; r: number };
  cushion: { x: number; y: number; w: number; h: number; r: number };
  /** Three horizontal slat strokes as one path. */
  slats: string;
}
const bedAt = (dx: number): BedShape => ({
  frame: { x: 19 + dx, y: 20, w: 14, h: 42, r: 5.5 },
  cushion: { x: 21 + dx, y: 22, w: 10, h: 12, r: 4 },
  slats: `M${21.5 + dx} 45 H${30.5 + dx} M${21.5 + dx} 51 H${30.5 + dx} M${21.5 + dx} 57 H${30.5 + dx}`,
});
export const BEDS: ReadonlyArray<BedShape> = [bedAt(0), bedAt(20)];

/* ----- Palette ----- */
const BED_BASE = "#cdd4dc";
/** One base hue per state; a selected bed ("sel") overrides its underlying state. */
const HUE = { a: "#2f9ad4", h: "#e8a23a", u: "#9aa6b2", sel: "#ef6a4f" } as const;

/** color-mix(in srgb, hex W%, #000) — darken toward black by mixing in (1-W) black. */
function darken(hex: string, w: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 0xff) * w);
  const v = (1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return `#${v.toString(16).slice(1)}`;
}

export interface SunbedPalette {
  /** Canopy gore + fin: the state hue. */
  c: string;
  /** Alternating gore. */
  lite: string;
  /** Canopy rim. */
  edge: string;
  /** Centre boss. */
  fin: string;
  bed: string;
  cushion: string;
  slat: string;
  /** Unavailable (taken) and not picked → not selectable. */
  dim: boolean;
}

export function sunbedPalette(state: SunbedState, sel = false): SunbedPalette {
  const c = sel ? HUE.sel : state === "h" ? HUE.h : state === "u" ? HUE.u : HUE.a;
  return {
    c,
    lite: "#ffffff",
    edge: darken(c, 0.56),
    fin: c,
    bed: BED_BASE,
    cushion: darken(BED_BASE, 0.86),
    slat: darken(BED_BASE, 0.7),
    dim: state === "u" && !sel,
  };
}

/* ----- Light on the set (AENR-829) -----
   Where the canopy is lit from and where its shadow falls, from the scene's one light model
   (seaLight). The scene looks out to sea, so the sun stands "up" the screen — east (left) after
   sunrise, west (right) before sunset — and the shadow falls away from it, toward the promenade:
   to the right in the morning, to the left in the evening, short at noon and longer and softer
   as the sun gets low. Cloud diffuses it to a faint blob under the canopy; at night only a faint
   moon shadow is left. Everything is in canonical (parasol-up) glyph units, so the SVG and the
   Konva renderers draw it inside their mirrored glyph group unchanged. */

/** The shadow's ink — a warm brown, so it reads as shade on sand rather than grey dirt. */
export const SHADOW_INK = "#3c2a14";
/** Midday sun height in degrees (Athens in July ≈ 73°). */
const SUN_ALT = 75;
/** How high the canopy stands over the sand, in glyph units — sets the shadow's length. */
const POLE = 12;
/** The longest a shadow gets (glyph units), however low the sun. */
const REACH = 13;

export interface SunCast {
  /** Shadow centre, canonical glyph units. */
  x: number;
  y: number;
  /** Long-axis rotation (degrees) and stretch (1 = round). */
  rot: number;
  stretch: number;
  /** Shadow opacity at its core, and how much of its radius is penumbra (0…1). */
  alpha: number;
  soft: number;
  /** Unit vector toward the light, canonical — the canopy's lit side. */
  lx: number;
  ly: number;
  /** 0…1 direct light on the canopy (drives the highlight and rim). */
  lit: number;
  /** 0…1 night — the canopy's shade deepens. */
  night: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const RAD = Math.PI / 180;

export function sunCast(l: SeaLight): SunCast {
  // Direct sun from just before it clears the horizon; the moon takes over as it gets dark.
  const day = smooth(-0.04, 0.1, l.sunElev);
  const moon = l.moon.strength * (1 - day);
  const bySun = day >= moon;
  // Azimuth from straight out to sea: ±75° at the ends of the day, the moon right of centre.
  const az = (((bySun ? l.sunX : l.moon.x) - 0.5) / 0.4) * 75 * RAD;
  const alt = (bySun ? Math.max(0.05, l.sunElev) * SUN_ALT : 38) * RAD;
  const len = REACH * Math.tanh(POLE / Math.tan(alt) / REACH) * (1 - 0.7 * l.cloud);
  const reach = len / REACH;
  // Direct shade: deep at noon, thinner when spread long at sunrise/sunset, muted by cloud.
  const direct = bySun ? 0.4 * day * (1 - 0.75 * l.cloud) * (1 - 0.25 * reach) : 0.13 * moon;
  // A contact shade stays under the canopy in any light — what grounds it on overcast days.
  const ambient = 0.07 - 0.025 * l.night;
  const alpha = Math.max(ambient, direct);
  const w = alpha > 0 ? direct / alpha : 0;
  // Away from the light: toward the promenade (down the screen = −y canonical).
  const dx = -Math.sin(az) * len * w;
  const dy = -Math.cos(az) * len * w;
  return {
    x: CANOPY.cx + dx,
    y: CANOPY.cy + dy,
    rot: Math.atan2(dy, dx) / RAD,
    stretch: 1 + 0.5 * reach * w,
    alpha,
    soft: clamp01(0.22 + 0.36 * reach + 0.35 * l.cloud),
    lx: Math.sin(az),
    ly: Math.cos(az),
    lit: clamp01(day * (1 - 0.65 * l.cloud) + 0.35 * moon),
    night: l.night,
  };
}
