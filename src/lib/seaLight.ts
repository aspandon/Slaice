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
  /** The water at this hour, horizon → shore (AENR-824) — what `tint` blends toward. */
  palette: readonly [Rgb, Rgb, Rgb, Rgb];
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
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/* ---- The day in colour (AENR-824) ----
   Keyframes taken from the owner's photographs of Greek beaches: the water horizon →
   shore, the colour of the light on it, and how strongly the hour overrides the beach's
   own sea preset (none at midday — the tenant's colours, Greek azure-to-turquoise by
   default — most at sunset and at night). Between keyframes everything blends smoothly,
   so moving the demo clock glides from one light to the next. */
const hex = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
interface Key {
  h: number;
  water: readonly [string, string, string, string];
  light: string;
  amount: number;
}
const NIGHT_KEY = {
  water: ["#0a1838", "#0c2148", "#0f2c58", "#183a66"],
  light: "#e6eeff",
  amount: 0.86,
} as const;
const KEYS: readonly Key[] = [
  { h: 0, ...NIGHT_KEY },
  { h: 5.3, ...NIGHT_KEY },
  // Blue hour before sunrise: the navy lifts to slate violet.
  { h: 5.9, water: ["#3d3f70", "#4b4d7c", "#4d6688", "#4f7c94"], light: "#f3c9b0", amount: 0.8 },
  // Sunrise: peach-orange toward the horizon, still cool by the shore.
  { h: 6.45, water: ["#f6a35c", "#e88b5e", "#a99c9a", "#5fb5c4"], light: "#ffc27a", amount: 0.78 },
  // Morning: the blues come in.
  { h: 7.6, water: ["#6fa9d6", "#3797d6", "#2bbad8", "#5fd4e0"], light: "#fff2d6", amount: 0.3 },
  // The Greek day: deep azure out to sea, turquoise in the shallows.
  { h: 9.5, water: ["#1565c8", "#1a8fdc", "#1fc4e2", "#6fe3ec"], light: "#ffffff", amount: 0 },
  { h: 17.2, water: ["#1565c8", "#1a8fdc", "#1fc4e2", "#6fe3ec"], light: "#ffffff", amount: 0 },
  // Late afternoon: a little softer and warmer.
  { h: 18.6, water: ["#3a7fc4", "#2a98cf", "#31bad0", "#7ad6da"], light: "#fff0c8", amount: 0.12 },
  // Golden hour: amber water, the turquoise only at the shore.
  { h: 19.7, water: ["#f2b04a", "#e8913c", "#9aa58a", "#63b2b6"], light: "#ffd27a", amount: 0.58 },
  // Sunset: the sea burns orange.
  { h: 20.6, water: ["#ff8a2a", "#f06a2e", "#c4573e", "#6c5767"], light: "#ffb347", amount: 0.84 },
  // Dusk: rose and violet over a darkening sea.
  { h: 21.05, water: ["#c0627a", "#7a4f86", "#3b3f72", "#24365e"], light: "#ff9f6e", amount: 0.86 },
  { h: 21.6, ...NIGHT_KEY },
  { h: 24, ...NIGHT_KEY },
];
/** The sea under a cloudy sky (AENR-824), horizon → shore. */
const CLOUD_WATER: readonly Rgb[] = ["#2b6c84", "#2e8794", "#45a7ab", "#8ccac2"].map(hex);

function keyAt(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(0, 1, (h - a.h) / Math.max(0.001, b.h - a.h));
  const water = [0, 1, 2, 3].map((k) =>
    mix(hex(a.water[k]), hex(b.water[k]), t),
  ) as unknown as readonly [Rgb, Rgb, Rgb, Rgb];
  return {
    water,
    light: mix(hex(a.light), hex(b.light), t),
    amount: a.amount + (b.amount - a.amount) * t,
  };
}

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
  // Cloudy sunsets keep most of their fire (the owner's photos): cloud mutes the warmth only so far.
  const warm = golden * (1 - 0.45 * cloud);
  const night = smooth(-0.05, -0.55, sunElev);
  // Glitter: a broad sheen at noon narrowing to a long column as the sun gets low.
  const low = smooth(0.45, 0.05, sunElev);
  const below = smooth(0, -0.25, sunElev);
  const key = keyAt(hour);
  // The light's colour follows the hour's keyframe; below the horizon it reddens to the afterglow.
  const sunColor = mix(key.light, TWILIGHT_GLITTER, below * 0.6);
  const sunGlitter =
    (sunElev > -0.25 ? 0.55 + 0.45 * low : 0) * (1 - below * 0.8) * (1 - 0.85 * cloud);
  const moonStrength = night * (1 - 0.75 * cloud);
  const atNight = night > 0.5;
  const glitter = atNight
    ? { color: MOON, strength: moonStrength * 0.8, width: 0.06, x: 0.66 }
    : { color: sunColor, strength: sunGlitter, width: 0.45 - 0.37 * low, x: sunX };
  // Water: the hour's keyframe. Under cloud it doesn't go grey — in the owner's cloudy photos the
  // sea stays teal and clear, muted toward slate out to sea and still turquoise over the sand.
  const palette = key.water.map((c, i) =>
    mix(c, CLOUD_WATER[i], cloud * 0.7 * (1 - 0.55 * key.amount)),
  ) as unknown as readonly [Rgb, Rgb, Rgb, Rgb];
  // By day the beach's own preset shows; cloud brings in the muted teal too.
  const amount = clamp01(
    Math.max(key.amount, cloud * 0.62 * (1 - key.amount)) * (1 - weather.dim * 0.25),
  );
  return {
    sunElev,
    sunX,
    warm,
    night,
    dawn,
    glitter,
    moon: { strength: moonStrength, x: 0.66, color: MOON },
    tint: { top: palette[0], deep: palette[3], amount },
    palette,
    cloud,
  };
}

/* ---- The sky over the horizon (AENR-828) ----
   Zenith → horizon colours per hour, from the same photographs: deep night with stars, a violet
   blue hour, a peach sunrise, Greek blue by day, an amber golden hour, a burning sunset under a
   violet sky, rose dusk. Cloud greys it toward slate (but sunsets keep their glow). */
const SKY_KEYS: readonly { h: number; sky: readonly [string, string] }[] = [
  { h: 0, sky: ["#030817", "#0e1d3f"] },
  { h: 5.3, sky: ["#030817", "#0e1d3f"] },
  { h: 5.9, sky: ["#2a2c5c", "#9a7c9c"] },
  { h: 6.45, sky: ["#6e8fc8", "#ffc48a"] },
  { h: 7.6, sky: ["#4f93dc", "#cfe6f5"] },
  { h: 9.5, sky: ["#2f7fd6", "#bfe3f7"] },
  { h: 17.2, sky: ["#2f7fd6", "#bfe3f7"] },
  { h: 18.6, sky: ["#4a86cf", "#f3e2c0"] },
  { h: 19.7, sky: ["#6a7fb8", "#ffcf7a"] },
  { h: 20.6, sky: ["#6b4a8a", "#ff8a2a"] },
  { h: 21.05, sky: ["#2b2f62", "#c0627a"] },
  { h: 21.6, sky: ["#030817", "#0e1d3f"] },
  { h: 24, sky: ["#030817", "#0e1d3f"] },
];
const CLOUD_SKY: readonly [Rgb, Rgb] = [hex("#6f7d8c"), hex("#c9d2da")];

/** The sky at `hour`: zenith and horizon colours, greyed by cloud (0–1) — sunsets keep their glow. */
export function skyAt(hour: number, cloud: number): readonly [Rgb, Rgb] {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].h <= h) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const t = smooth(0, 1, (h - a.h) / Math.max(0.001, b.h - a.h));
  const glow = keyAt(hour).amount; // the hour's colour strength: high at sunrise, sunset and night
  return [0, 1].map((k) =>
    mix(mix(hex(a.sky[k]), hex(b.sky[k]), t), CLOUD_SKY[k], cloud * 0.75 * (1 - 0.5 * glow)),
  ) as unknown as readonly [Rgb, Rgb];
}

/** A clear noon — the light when the tenant pins the scene or the demo clock is off. */
export const NOON_LIGHT: SeaLight = seaLight(13.5, { glint: 1, dim: 0 });

export const rgbCss = (c: Rgb, a = 1) =>
  `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
