import type { SeaEnv } from "../LiveSeaCanvas";

/* The colour grade a filmed or rendered sea takes for the light (AENR-815) — shared by the Video sea
   and the Blender sea (AENR-827). The footage carries the Greek day's colour itself; the hour's colour
   comes from the light layer on top, so the filter only dims for night and cloud. */
export function grade(env: SeaEnv) {
  const { night: n, warm: w, cloud: c } = env.light;
  const brightness = 1 - 0.38 * n - 0.1 * c + 0.04 * w;
  const saturate = Math.max(0.4, 1 - 0.4 * c - 0.25 * n);
  // A clear midday needs no grade: "none" spares the browser a render surface for the video (AENR-844).
  if (Math.abs(brightness - 1) < 0.005 && Math.abs(saturate - 1) < 0.005) return "none";
  return `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
}

/** The wind sets the playback speed (calm water slower, a fresh breeze faster). */
export const windRate = (wind: number) => Math.min(1.4, Math.max(0.6, 0.7 + 0.7 * wind));

/** The guest asked to save data: the still poster only, no video download. */
export const saveData = () =>
  typeof navigator !== "undefined" &&
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
