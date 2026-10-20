import { useEffect } from "react";
import { WEATHER_DEMO } from "../data/beach";
import { useGuestScene } from "../lib/useGuestScene";

/* ---------- Weather you can see (AENR-807) ----------
   The demo weather reaches the interface, not just the backdrop:
   - wind: every umbrella sways in irregular gusts (CSS on `[data-canopy]`, driven by
     <html data-gust="1|2"> so portaled sheets and the map sway too);
   - cloud: soft cloud shadows drift across the screen, over the glass panels;
   - rain: drops cling to and run down the booking panel's glass (<RainOnGlass>).
   Everything is transform / opacity only and off under reduced motion (index.css). The
   tenant's live-scene switch and the manager's weather switch turn it off with the scene. */

/** Wind strength the umbrellas sway at: 0 calm · 1 a breeze (rain) · 2 windy. */
function gustOf(wind: number) {
  return wind >= 0.9 ? 2 : wind >= 0.6 ? 1 : 0;
}

/** Mounted once on the guest surface: the gust flag and the cloud shadows. */
export function WeatherUi() {
  const { weather, sceneFx } = useGuestScene();
  const on = sceneFx.weather;
  const gust = on ? gustOf(WEATHER_DEMO[weather].wind) : 0;
  const shadows = on && (weather === "overcast" || weather === "rainy");
  useEffect(() => {
    const root = document.documentElement;
    if (gust) root.dataset.gust = String(gust);
    else delete root.dataset.gust;
    return () => {
      delete root.dataset.gust;
    };
  }, [gust]);
  if (!shadows) return null;
  return (
    <div aria-hidden className="weather-shade pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      <span className="weather-shade-a" />
      <span className="weather-shade-b" />
    </div>
  );
}

// Fixed positions so the drops never jump between renders: [left %, top %, size px].
const BEADS: ReadonlyArray<readonly [number, number, number]> = [
  [6, 8, 5], [14, 31, 3], [22, 12, 4], [31, 54, 6], [38, 22, 3], [47, 70, 4], [55, 9, 5], [63, 41, 3],
  [71, 18, 6], [79, 63, 4], [88, 27, 3], [94, 49, 5], [9, 77, 4], [27, 88, 3], [52, 92, 5], [84, 85, 4],
];
// The drops that run: [left %, delay s, duration s].
const RUNNERS: ReadonlyArray<readonly [number, number, number]> = [
  [11, 0, 3.4], [29, 1.6, 4.1], [46, 0.8, 3.1], [67, 2.4, 3.8], [86, 1.1, 4.4],
];

/** Rain on the booking panel's glass — rendered inside the panel, over its content but faint. */
export function RainOnGlass() {
  const { weather, sceneFx } = useGuestScene();
  if (!sceneFx.weather || weather !== "rainy") return null;
  return (
    <div aria-hidden className="rain-glass pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit]">
      {BEADS.map(([x, y, s]) => (
        <span key={`${x}-${y}`} className="rain-bead" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s * 1.15 }} />
      ))}
      {RUNNERS.map(([x, d, t]) => (
        <span key={x} className="rain-run" style={{ left: `${x}%`, animationDelay: `${d}s`, animationDuration: `${t}s` }} />
      ))}
    </div>
  );
}
