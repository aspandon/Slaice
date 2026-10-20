import type { WeatherDemo } from "../data/beach";

/* ============ The sea's light (AENR-815) ============
   One pure model of the light on the water, shared by every sea — Classic (SVG +
   WebGL), Coastal (shader) and Video — so the three always agree with each other
   and with the rest of the scene. From the hour and the weather it gives the sun's
   height and place, the moon, the colour the water takes and the reflection path
   (glitter) under the sun or the moon.

   Geometry: the guest scene looks out to sea with the horizon at the top edge.
   Alimos faces south-west, so the sun rises on the left (east) and sets on the
   right over the water; the moon stands right of centre at night (clear of the logo). Times follow a
   July day in Athens: sunrise ≈ 06:15, sunset ≈ 20:50. */

export type Rgb = readonly [number, number, number];

export interface SeaLight {
  /** −1 … 1: the sun's height (0 = on the horizon, < 0 below it). */
  sunElev: number;
  /** 0 … 1 across the scene: where the sun (and its path on the water) stands. */
  sunX: number;
  /** 0 … 1: golden light — sunrise / sunset orange on the water and in the air. */
  warm: number;
  /** 0 … 1: night (deep navy water, the moon out). */
  night: number;
  /** Morning (true) or evening light — dawn is a touch pinker and cooler. */
  dawn: boolean;
  /** The reflection path under the sun (or the moon at night). */
  glitter: { color: Rgb; strength: number; width: number; x: number };
  /** 0 … 1 moon brightness, its place across the scene, and its colour. */
  moon: { strength: number; x: number; color: Rgb };
  /** What the water is graded toward (multiplied in by `amount`). */
  tint: { top: Rgb; deep: Rgb; amount: number };
  /** 0 … 1 cloud cover — dims the glitter, the moon and the warm light. */
  cloud: number;
}

export const SUNRISE = 6.25;
export const SUNSET = 20.85;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const NOON_GLITTER: Rgb = [1, 0.98, 0.9];
const LOW_GLITTER: Rgb = [1, 0.58, 0.22];
const DAWN_GLITTER: Rgb = [1, 0.66, 0.4];
const TWILIGHT_GLITTER: Rgb = [0.98, 0.42, 0.32];
const MOON: Rgb = [0.86, 0.9, 1];

/** The light on the water at `hour` (decimal, 0–24) in `weather`. */
export function seaLight(hour: number, weather: Pick<WeatherDemo, "glint" | "dim">): SeaLight {
  const day = SUNSET - SUNRISE;
  const p = (hour - SUNRISE) / day; // 0 at sunrise, 1 at sunset
  // Height: a sine arc by day; below the horizon it keeps sinking for ~1.5 h of twilight.
  const sunElev =
    p >= 0 && p <= 1 ? Math.sin(Math.PI * p) : -Math.min(1, (p < 0 ? -p : p - 1) * (day / 1.5));
  const sunX = 0.1 + 0.8 * clamp01(p);
  const dawn = hour < 13;
  // Clouds: a sunny sky has none; overcast and rain take most of the direct light away.
  const cloud = clamp01(1 - weather.glint);
  // Golden light peaks with the sun on the horizon and lingers a little after it sets.
  const golden = smooth(0.32, 0.02, sunElev) * smooth(-0.32, -0.02, sunElev);
  const warm = golden * (1 - 0.7 * cloud);
  const night = smooth(-0.05, -0.55, sunElev);
  // Glitter: a broad sheen at noon narrowing to a long column as the sun gets low.
  const low = smooth(0.45, 0.05, sunElev);
  const below = smooth(0, -0.25, sunElev);
  const sunColor = mix(
    mix(NOON_GLITTER, dawn ? DAWN_GLITTER : LOW_GLITTER, low),
    TWILIGHT_GLITTER,
    below,
  );
  const sunGlitter =
    (sunElev > -0.25 ? 0.55 + 0.45 * low : 0) * (1 - below * 0.8) * (1 - 0.85 * cloud);
  const moonStrength = night * (1 - 0.75 * cloud);
  const atNight = night > 0.5;
  const glitter = atNight
    ? { color: MOON, strength: moonStrength * 0.8, width: 0.06, x: 0.66 }
    : { color: sunColor, strength: sunGlitter, width: 0.45 - 0.37 * low, x: sunX };
  // Water: orange-pink at the horizon in golden light, deep navy at night.
  // Both ends of the day burn orange; dawn is a touch lighter and rosier at the shore.
  const warmTop: Rgb = dawn ? [1, 0.64, 0.4] : [1, 0.58, 0.32];
  const warmDeep: Rgb = dawn ? [0.86, 0.56, 0.48] : [0.78, 0.45, 0.42];
  const nightTop: Rgb = [0.16, 0.22, 0.38];
  const nightDeep: Rgb = [0.05, 0.08, 0.18];
  const tintTop = night > 0 ? mix(warmTop, nightTop, night) : warmTop;
  const tintDeep = night > 0 ? mix(warmDeep, nightDeep, night) : warmDeep;
  const amount = clamp01(Math.max(warm * 0.6, night * 0.85) * (1 - weather.dim * 0.4));
  return {
    sunElev,
    sunX,
    warm,
    night,
    dawn,
    glitter,
    moon: { strength: moonStrength, x: 0.66, color: MOON },
    tint: { top: tintTop, deep: tintDeep, amount },
    cloud,
  };
}

/** A clear noon — the light when the tenant pins the scene or the demo clock is off. */
export const NOON_LIGHT: SeaLight = seaLight(13.5, { glint: 1, dim: 0 });

export const rgbCss = (c: Rgb, a = 1) =>
  `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
