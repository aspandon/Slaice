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
  [5, 7, 7], [12, 26, 4], [19, 11, 9], [27, 48, 5], [33, 19, 6], [41, 66, 8], [47, 31, 4], [53, 8, 7],
  [60, 44, 5], [66, 17, 9], [72, 58, 6], [79, 29, 4], [85, 9, 8], [91, 47, 5], [96, 24, 6], [8, 79, 6],
  [23, 89, 8], [37, 82, 4], [50, 93, 7], [62, 77, 5], [75, 88, 8], [88, 74, 5], [15, 57, 5], [44, 4, 5],
];
// The drops that run: [left %, delay s, duration s].
const RUNNERS: ReadonlyArray<readonly [number, number, number]> = [
  [9, 0, 3.2], [24, 1.4, 4.1], [38, 0.6, 2.9], [57, 2.2, 3.7], [70, 0.9, 3.3], [84, 1.8, 4.4], [93, 0.3, 3.6],
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
        <span key={x} className="rain-run" style={{ left: `${x}%`, animationDelay: `${d}s`, animationDuration: `${t}s` }}>
          <span className="rain-run-head" />
        </span>
      ))}
    </div>
  );
}
