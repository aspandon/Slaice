import { useEffect, useRef, useState } from "react";
import { BeachBackdrop } from "./Beach";
import { LifeRing } from "./LifeRing";
import { prefersReducedMotion, staticBackdrop } from "../lib/motion";
import { dayLight, WEATHER_DEMO } from "../data/beach";
import type { SeaEnv } from "./LiveSeaCanvas";
import { WeatherFxCanvas } from "./WeatherFx";
import { useApp } from "../app/store";

/* Sand-top fraction (0–1). Higher = thinner sand strip / ocean vista; lower lifts
   the shoreline so the sand fills the view. */
const REST = 0.8; // home + browsing
const IMMERSIVE = 0.4; // inside the booking wizard — a sand-heavy beach you tap on

/* ---------- Customer page backdrop ----------
   The beach scene behind the whole customer surface. Entering the guided-booking
   wizard animates the shoreline upward so far more sand is revealed (the beach the
   guest then taps zones / sunbeds on); leaving eases it back to the ocean vista.
   Owning the shoreline tween *here* — rather than in App — keeps its ~45 frames
   from re-rendering the entire app tree each frame.

   This component also resolves the scene "environment": the demo weather and
   the scene clock (both admin-switchable via sceneFx) become page-wide grading
   overlays + a rain layer here, and a SeaEnv handed down to the live water.
   One resolution for every customer page — home, wizard and checkout always
   share identical conditions. */
export function CustomerBackdrop({ immersive }: { immersive: boolean }) {
  const { weather, dayTime, sceneFx } = useApp();
  const [shoreline, setShoreline] = useState(immersive ? IMMERSIVE : REST);
  // Only reduced-motion users keep a still backdrop — phones run the same live
  // scene as desktop (the sea canvas caps DPR and degrades to SVG by itself).
  const [stat] = useState(staticBackdrop);
  // Mirror the latest value so the tween can read its start point without
  // re-subscribing the effect on every frame.
  const ref = useRef(shoreline);
  ref.current = shoreline;

  useEffect(() => {
    const target = immersive ? IMMERSIVE : REST;
    if (stat || prefersReducedMotion()) {
      setShoreline(target);
      return;
    }
    const from = ref.current;
    if (Math.abs(from - target) < 0.001) return;
    const dur = 780;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setShoreline(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [immersive, stat]);

  // Resolve the environment. Disabled effects fall back to a neutral noon /
  // sunny scene, so the admin switches cleanly restore the original look.
  const wd = sceneFx.weather ? WEATHER_DEMO[weather] : WEATHER_DEMO.sunny;
  const hour = sceneFx.daytime ? dayTime : 12;
  // Golden-hour warmth is muted by cloud cover — no amber glow through an
  // overcast or rainy sky.
  const light = sceneFx.daytime ? dayLight(hour) : { warm: 0, night: 0 };
  const warm = light.warm * (0.2 + 0.8 * wd.glint);
  const night = light.night;
  const seaEnv: SeaEnv = {
    wind: wd.wind,
    glint: wd.glint,
    dusk: warm,
    night,
    // Decor clouds belong to weather, not the preset: clear sky when sunny,
    // otherwise drifting right-to-left at the weather's own pace (racing in
    // wind, crawling under flat overcast).
    clouds: sceneFx.weather && weather !== "sunny" ? 1 : 0,
    cloudSpeed: sceneFx.weather ? wd.cloudSpeed : 0,
  };
  const raining = sceneFx.weather && weather === "rainy";
  // The particle layer runs for rain and for strong wind (gust streaks).
  const particles = raining || (sceneFx.weather && wd.wind > 0.5);
  // Cloud cover for grey weather (rain slightly heavier than plain overcast).
  const clouds = sceneFx.weather && (weather === "overcast" || weather === "rainy") ? (weather === "rainy" ? 0.7 : 0.58) : 0;

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
      <BeachBackdrop pos="absolute" className="inset-0 rounded-none" parallax={!stat} shoreline={shoreline} noVeg={immersive} seaEnv={seaEnv} />
      {/* The life-buoy bobs in the open water. As the booking flow lifts the
          shoreline, it rides up with the sea to a spot in the top-left, clear of
          the menu and the tappable sand. */}
      <LifeRing className={`hidden sm:block absolute left-[8%] w-[60px] h-[60px] transition-[top] duration-700 ease-out ${immersive ? "top-[20%]" : "top-[72%]"}`} />

      {/* Cloud cover for overcast/rainy — drifting banks of soft grey blobs. */}
      <div className="absolute inset-0 overflow-hidden transition-opacity duration-1000" style={{ opacity: clouds }}>
        <div className="cloud-bank" />
        <div className="cloud-bank-b" />
      </div>

      {/* ---- Scene grading ----
          Golden hour: a soft-light warmth over everything plus a screen-blended
          sun haze high in the sky; dawn/dusk: a deep blue multiply. Weather adds
          its own grey multiply. Blend overlays grade the SVG fallback and the
          WebGL sea alike, so phones get the same mood. The daylight overlays
          glide slowly (1.6s) so scrubbing the scene clock reads as the day
          actually turning. */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ transitionDuration: "1600ms", opacity: warm, mixBlendMode: "soft-light", background: "linear-gradient(to top, rgba(255,118,40,0.85), rgba(255,82,96,0.45) 45%, rgba(122,72,150,0.3))" }}
      />
      <div
        className="absolute inset-0 transition-opacity"
        style={{ transitionDuration: "1600ms", opacity: warm * 0.8, mixBlendMode: "screen", background: "radial-gradient(58% 42% at 68% 6%, rgba(255,168,76,0.5), rgba(255,168,76,0) 70%)" }}
      />
      <div
        className="absolute inset-0 transition-opacity"
        style={{ transitionDuration: "1600ms", opacity: night * 0.55, mixBlendMode: "multiply", background: "#1d2f55" }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: wd.dim, mixBlendMode: "multiply", background: "#42566e" }}
      />
      {particles && <WeatherFxCanvas key={`${raining}-${wd.wind}`} rain={raining} wind={wd.wind} />}
    </div>
  );
}
