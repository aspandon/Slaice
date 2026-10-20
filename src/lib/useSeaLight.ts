import { useMemo } from "react";
import { WEATHER_DEMO } from "../data/beach";
import { NOON_LIGHT, seaLight, type SeaLight } from "./seaLight";
import { useGuestScene } from "./useGuestScene";
import { sunCast, type SunCast } from "../components/sunbedGlyph";

/* The scene's light for anything drawn on the sand (AENR-829) — the same light the backdrop
   grades the sea with (CustomerBackdrop), so every umbrella's shading and shadow agree with the
   sun in the sky. The manager's switches fall back the same way: no daytime → a clear noon; no
   weather → sunny. Memoised on the inputs, so a grid of glyphs shares one object. */
export function useSeaLight(): SeaLight {
  const { weather, dayTime, sceneFx } = useGuestScene();
  return useMemo(
    () =>
      sceneFx.daytime
        ? seaLight(dayTime, sceneFx.weather ? WEATHER_DEMO[weather] : WEATHER_DEMO.sunny)
        : NOON_LIGHT,
    [weather, dayTime, sceneFx.daytime, sceneFx.weather],
  );
}

/** The scene's sun on the sand (AENR-829): where every umbrella is lit from and where its shadow
 *  falls — one cast shared by the SVG marks and the Konva grid. */
export function useSunCast(): SunCast {
  const light = useSeaLight();
  return useMemo(() => sunCast(light), [light]);
}
