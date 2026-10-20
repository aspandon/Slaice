import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BeachBackdrop } from "./Beach";
import { LifeRing } from "./LifeRing";
import { prefersReducedMotion, staticBackdrop, useLiteScene } from "../lib/motion";
import { dayLight, WEATHER_DEMO } from "../data/beach";
import type { SeaEnv } from "./LiveSeaCanvas";
import { WeatherFxCanvas } from "./WeatherFx";
import { useGuestScene } from "../lib/useGuestScene";
import { useApp } from "../app/store";
import { useTenantFeatures } from "../lib/useFeatures";
import { DUR } from "../lib/fx";
import { MARGIN_X, MARGIN_Y, cameraTransform, layerShoreline, setCameraLayer, shotFor, useCameraOn, useWizardShot, zoneWorldX } from "../lib/camera";

/* Sand-top fraction (0–1). Higher = thinner sand strip / ocean vista; lower lifts
   the shoreline so the sand fills the view. */
const REST = 0.8; // home + browsing
const IMMERSIVE = 0.2; // inside the booking wizard on phones — a sand-heavy beach you tap on (AENR-660)
// Desktop wizard: the sea comes down to the middle, the panel floats over it and the
// zones stand in one front row along the water (AENR-668).
const IMMERSIVE_WIDE = 0.5;
const wideNow = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

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
export function CustomerBackdrop({ immersive, ring = true, page = "" }: {
  immersive: boolean;
  /** The decorative life-ring (off on sign-in, AENR-757). */
  ring?: boolean;
  /** The guest page — chooses the camera's shot (AENR-784). */
  page?: string;
}) {
  // The tenant's live-scene switch (AENR-737) can pin this to a sunny 11:00.
  const { weather, dayTime, sceneFx } = useGuestScene();
  const [wide, setWide] = useState(wideNow);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const target = immersive ? (wide ? IMMERSIVE_WIDE : IMMERSIVE) : REST;
  const [shoreline, setShoreline] = useState(target);
  // Still backdrop for reduced-motion users and on phones / small tablets (AENR-730):
  // no WebGL sea, ambient decor, particles or parallax there. Follows resizes.
  const lite = useLiteScene();
  const stat = lite || staticBackdrop();
  // Mirror the latest value so the tween can read its start point without
  // re-subscribing the effect on every frame.
  const ref = useRef(shoreline);
  ref.current = shoreline;

  useEffect(() => {
    if (prefersReducedMotion()) {
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
  }, [target]);

  // ---- One beach, one camera (AENR-784) ----
  // The scene sits in a layer larger than the screen; each page is a shot of it and a page
  // change tweens the layer (transform only). Off (Demo switch, reduced motion) = no layer
  // margins and no transform: the backdrop exactly as before.
  const cameraOn = useCameraOn();
  // The sea's effects, switched per tenant (AENR-810).
  const { feature } = useTenantFeatures();
  const sea = { live: feature("guest.liveSea"), depth: feature("guest.seaDepth"), detail: feature("guest.seaDetail") };
  const wiz = useWizardShot();
  const { zoneMap } = useApp();
  const zoneId = (page === "plan" ? wiz?.zoneId : null) ?? null;
  const zx = zoneId ? zoneMap.find((z) => z.id === zoneId)?.x : undefined;
  const zoneX = zx == null ? null : zoneWorldX(zx);
  const shot = cameraOn ? shotFor(page, page === "plan" ? wiz : null, target, zoneX, wide) : null;
  const camRef = useRef<HTMLDivElement>(null);
  // Before the sea mounts (layout effects run ahead of its effect): size its pixels to the layer.
  useLayoutEffect(() => setCameraLayer(cameraOn), [cameraOn]);
  const shotKey = shot ? `${shot.pan}|${shot.zoom}|${shot.focusX}|${shot.focusY}` : "off";
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = camRef.current;
    if (!el) return;
    if (!shot) {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform" });
      return;
    }
    const to = cameraTransform(shot, window.innerWidth, window.innerHeight);
    // The first shot is set, not flown to — the camera only moves when the guest moves.
    // force3D "auto": composited while moving, re-rasterised crisp once the camera settles.
    if (first.current) gsap.set(el, to);
    else gsap.to(el, { ...to, duration: DUR.camera, ease: "power3.inOut", overwrite: "auto", force3D: "auto" });
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shotKey captures the shot
  }, [shotKey]);
  // Pixel offsets depend on the viewport: re-place the camera (no tween) after a resize.
  useEffect(() => {
    if (!shot) return;
    const onResize = () => camRef.current && gsap.set(camRef.current, cameraTransform(shot, window.innerWidth, window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shotKey captures the shot
  }, [shotKey]);
  const drawShore = cameraOn ? layerShoreline(shoreline) : shoreline;

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
      <div
        ref={camRef}
        data-camera=""
        className="absolute"
        style={cameraOn ? { left: `${-MARGIN_X * 100}%`, right: `${-MARGIN_X * 100}%`, top: `${-MARGIN_Y * 100}%`, bottom: `${-MARGIN_Y * 100}%` } : { inset: 0 }}
      >
        {/* Tilt the phone (AENR-792): the scene drifts a few px with the phone — inside the
            camera, so the two transforms never fight; still in the wizard, where sets stand on the sand. */}
        <div className="tilt-sea absolute inset-0" data-still={immersive ? "" : undefined}>
          <BeachBackdrop pos="absolute" className="inset-0 rounded-none" parallax={!stat} shoreline={drawShore} noVeg={immersive} seaEnv={seaEnv} sea={sea} />
        </div>
      </div>
      {/* The life-buoy bobs in the water, always in a slot content never uses
          (AENR-744): while browsing, in the left margin beside the 72rem content
          column — only on screens wide enough to have one; in the desktop
          booking flow, in the surf just off the raised shoreline; on tablets in
          the flow, top-left, clear of the menu and the tappable sand. */}
      {ring && <LifeRing
        className={`absolute w-[60px] h-[60px] transition-[top,left] duration-slow ease-ios ${
          immersive
            ? wide
              ? "top-[40%] left-[6%]"
              : "hidden sm:block top-[7%] left-[8%]"
            : "hidden min-[1360px]:block top-[72%] left-[calc((100vw-72rem)/2-84px)]"
        }`}
      />}

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
      {particles && !lite && <WeatherFxCanvas key={`${raining}-${wd.wind}`} rain={raining} wind={wd.wind} />}
    </div>
  );
}
