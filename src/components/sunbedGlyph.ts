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
    cushion: darken(BED_BASE, 0.8),
    slat: darken(BED_BASE, 0.6),
    dim: state === "u" && !sel,
  };
}
