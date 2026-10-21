import type { SeaEnv } from "../LiveSeaCanvas";

/* The colour grade a filmed or rendered sea takes for the light (AENR-815) — shared by the Video sea
   and the Blender sea (AENR-827). The footage carries the Greek day's colour itself; the hour's colour
   comes from the light layer on top, so the grade only dims for night and greys for cloud.
   A plain translucent layer over the video, not a CSS filter on it (AENR-862): a filter takes the
   video off the browser's direct video path and costs a pass over every frame. A clear day draws
   nothing. */
export function gradeTint(env: SeaEnv): { background: string; opacity: number } | null {
  const { night: n, warm: w, cloud: c } = env.light;
  // What brightness() and saturate() did, as a layer: dark navy for the night, grey-blue for cloud.
  const dark = Math.max(0, 0.38 * n - 0.04 * w);
  const grey = 0.32 * c;
  if (dark + grey < 0.005) return null;
  const mix = dark / (dark + grey);
  const rgb = [Math.round(66 * (1 - mix) + 6 * mix), Math.round(82 * (1 - mix) + 14 * mix), Math.round(104 * (1 - mix) + 34 * mix)];
  return { background: `rgb(${rgb.join(",")})`, opacity: Math.min(0.6, dark + grey) };
}

/** The wind sets the playback speed (calm water slower, a fresh breeze faster). */
export const windRate = (wind: number) => Math.min(1.4, Math.max(0.6, 0.7 + 0.7 * wind));

/** The guest asked to save data: the still poster only, no video download. */
export const saveData = () =>
  typeof navigator !== "undefined" &&
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
