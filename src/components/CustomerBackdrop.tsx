import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BeachBackdrop, shorelineShift } from "./Beach";
import { HelpRing } from "./NeedAHand";
import { staticBackdrop, useLiteScene } from "../lib/motion";
import { WEATHER_DEMO } from "../data/beach";
import { NOON_LIGHT, seaLight } from "../lib/seaLight";
import type { SeaEnv } from "./LiveSeaCanvas";
import { WeatherFxCanvas } from "./WeatherFx";
import { useGuestScene } from "../lib/useGuestScene";
import { useApp } from "../app/store";
import { useTenantFeatures } from "../lib/useFeatures";
import { seaStyleOf } from "../domain/features";
import { SeaLayer } from "./sea/SeaLayer";
import { presetById } from "../data/backgrounds";
import { DUR } from "../lib/fx";
import { EASING } from "../lib/motionTokens";
import { markBusy } from "../lib/busy";
import { MARGIN_X, MARGIN_Y, cameraCss, cameraTransform, layerShoreline, setCameraLayer, shotFor, useCameraOn, useWizardShot, zoneWorldX } from "../lib/camera";

/* Sand-top fraction (0–1). Higher = thinner sand strip / ocean vista; lower lifts
   the shoreline so the sand fills the view. */
const REST = 0.8; // home + browsing
const IMMERSIVE = 0.2; // inside the booking wizard on phones — a sand-heavy beach you tap on (AENR-660)
// Desktop wizard: the sea comes down to the middle, the panel floats over it and the
// zones stand in one front row along the water (AENR-668).
const IMMERSIVE_WIDE = 0.5;
const wideNow = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

/** Runs `fn` when the browser has a moment (requestIdleCallback; a short timeout where there is none). */
const whenIdle = (fn: () => void) => {
  // Safari had no requestIdleCallback until recently.
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
};

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
  /** The life-ring "Need a hand?" button (off on sign-in, AENR-757 / 781). */
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
  // The shoreline goes straight to its new place; the scene's land layers slide there on their
  // own (a transform, AENR-823) instead of this component re-rendering the scene every frame.
  const shoreline = target;
  // Still backdrop for reduced-motion users and on phones / small tablets (AENR-730):
  // no WebGL sea, ambient decor, particles or parallax there. Follows resizes.
  const lite = useLiteScene();
  const stat = lite || staticBackdrop();

  // ---- One beach, one camera (AENR-784) ----
  // The scene sits in a layer larger than the screen; each page is a shot of it and a page
  // change tweens the layer (transform only). Off (Demo switch, reduced motion) = no layer
  // margins and no transform: the backdrop exactly as before.
  const cameraOn = useCameraOn();
  // The sea's effects, switched per tenant (AENR-810).
  const { feature, tenant } = useTenantFeatures();
  const sea = { live: feature("guest.liveSea"), depth: feature("guest.seaDepth"), detail: feature("guest.seaDetail") };
  // Which sea this device shows — the tenant's choice per device (AENR-813).
  // A video that can't play hands the beach back to Classic.
  const [videoFailed, setVideoFailed] = useState(false);
  const chosen = seaStyleOf(tenant, lite ? "mobile" : "desktop");
  const seaStyle = chosen === "video" && videoFailed ? "classic" : chosen;
  // A filmed or rendered sea (Video, Blender) is a new picture every frame: nothing live may sit on
  // it (AENR-862) — the page drops its backdrop blur and the grading below uses plain alpha.
  const film = seaStyle === "video" || seaStyle === "blender";
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (film) root.dataset.sea = "film";
    else delete root.dataset.sea;
    return () => {
      delete root.dataset.sea;
    };
  }, [film]);
  const wiz = useWizardShot();

  const { zoneMap, background } = useApp();
  const zoneId = (page === "plan" ? wiz?.zoneId : null) ?? null;
  const zx = zoneId ? zoneMap.find((z) => z.id === zoneId)?.x : undefined;
  const zoneX = zx == null ? null : zoneWorldX(zx);
  const shot = cameraOn ? shotFor(page, page === "plan" ? wiz : null, target, zoneX, wide) : null;
  const camRef = useRef<HTMLDivElement>(null);
  // Before the sea mounts (layout effects run ahead of its effect): size its pixels to the layer.
  useLayoutEffect(() => setCameraLayer(cameraOn), [cameraOn]);
  const shotKey = shot ? `${shot.pan}|${shot.zoom}|${shot.focusX}|${shot.focusY}` : "off";
  const first = useRef(true);
  const flight = useRef<Animation | null>(null);
  const rasterZoom = useRef(1);
  useLayoutEffect(() => {
    const el = camRef.current;
    if (!el) return;
    if (!shot) {
      flight.current?.cancel();
      el.style.transform = el.style.willChange = "";
      return;
    }
    const to = cameraTransform(shot, window.innerWidth, window.innerHeight);
    const end = cameraCss(to);
    // On the GPU for good (AENR-865): a pan never redraws the scene, and nothing redraws when the
    // camera lands — that full repaint used to land in the last frame of every move.
    el.style.willChange = "transform";
    // The first shot is set, not flown to — the camera only moves when the guest moves.
    if (first.current) {
      el.style.transform = end;
      rasterZoom.current = to.scale;
      first.current = false;
      return;
    }
    // The live sea holds still while the camera flies (AENR-836); a video sea pauses (AENR-866).
    markBusy(DUR.camera * 1000 + 100, true);
    // A Web Animation on transform (AENR-864): the browser's compositor runs it, so it keeps
    // flying while the page is being built. Interrupted mid-flight, it carries on from where it is.
    const from = getComputedStyle(el).transform;
    flight.current?.cancel();
    el.style.transform = end;
    const a = el.animate([{ transform: from === "none" ? "translate3d(0,0,0) scale(1)" : from }, { transform: end }], {
      duration: DUR.camera * 1000,
      easing: EASING.standard.css,
    });
    flight.current = a;
    // A new zoom level: drawn sharp at it once, when the browser is idle (a layer kept on the GPU
    // otherwise keeps the scale it was drawn at).
    if (Math.abs(to.scale - rasterZoom.current) > 0.001) {
      rasterZoom.current = to.scale;
      a.finished
        .then(() =>
          whenIdle(() => {
            if (flight.current !== a) return;
            el.style.willChange = "auto";
            requestAnimationFrame(() => requestAnimationFrame(() => (el.style.willChange = "transform")));
          }),
        )
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shotKey captures the shot
  }, [shotKey]);
  // Pixel offsets depend on the viewport: re-place the camera (no tween) after a resize.
  useEffect(() => {
    if (!shot) return;
    const onResize = () => {
      if (camRef.current) camRef.current.style.transform = cameraCss(cameraTransform(shot, window.innerWidth, window.innerHeight));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shotKey captures the shot
  }, [shotKey]);
  const drawShore = cameraOn ? layerShoreline(shoreline) : shoreline;

  // Resolve the environment. Disabled effects fall back to a neutral noon /
  // sunny scene, so the admin switches cleanly restore the original look.
  const wd = sceneFx.weather ? WEATHER_DEMO[weather] : WEATHER_DEMO.sunny;
  const hour = sceneFx.daytime ? dayTime : 12;
  // One light for the whole scene (AENR-815): the grading overlays below and every sea read it.
  // Golden-hour warmth is muted by cloud cover — no amber glow through an overcast or rainy sky.
  const light = sceneFx.daytime ? seaLight(hour, wd) : NOON_LIGHT;
  const warm = light.warm;
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
    light,
  };
  const raining = sceneFx.weather && weather === "rainy";
  // The particle layer runs for rain and for strong wind (gust streaks).
  const particles = raining || (sceneFx.weather && wd.wind > 0.5);
  // Cloud cover for grey weather (rain slightly heavier than plain overcast).
  const clouds = sceneFx.weather && (weather === "overcast" || weather === "rainy") ? (weather === "rainy" ? 0.7 : 0.58) : 0;

  return (
    <>
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
      {/* The video sea, behind the scene and outside the camera (AENR-835): at screen size the water
          keeps its filmed scale and sharpness; the scene above leaves its water open. The far water
          doesn't follow the camera's pans — at a distance it wouldn't visibly move. */}
      {seaStyle === "video" && (
        <SeaLayer style="video" preset={presetById(background.kind === "preset" ? background.id : "akti")} dy={shorelineShift(shoreline)} env={seaEnv} tier={lite ? "mobile" : "desktop"} onFail={() => setVideoFailed(true)} />
      )}
      <div
        ref={camRef}
        data-camera=""
        className="absolute"
        style={cameraOn ? { left: `${-MARGIN_X * 100}%`, right: `${-MARGIN_X * 100}%`, top: `${-MARGIN_Y * 100}%`, bottom: `${-MARGIN_Y * 100}%` } : { inset: 0 }}
      >
        <BeachBackdrop pos="absolute" className="inset-0 rounded-none" parallax={!stat} shoreline={drawShore} noVeg={immersive} seaEnv={seaEnv} sea={sea} seaStyle={seaStyle} />
      </div>

      {/* Cloud cover for overcast/rainy — drifting banks of soft grey blobs. */}
      <div className={`absolute inset-0 overflow-hidden transition-opacity duration-1000 ${clouds ? "" : "clouds-clear"}`} style={{ opacity: clouds }}>
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
      {/* Over a filmed or rendered sea the same grading in plain alpha (AENR-862): a blend mode over
          video makes the browser read back and re-blend the whole screen on every video frame. Each
          layer is left out while it shows nothing. */}
      {warm > 0.001 && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ transitionDuration: "1600ms", opacity: film ? warm * 0.32 : warm, mixBlendMode: film ? undefined : "soft-light", background: "linear-gradient(to top, rgba(255,118,40,0.85), rgba(255,104,72,0.45) 45%, rgba(255,150,80,0.3))" }}
        />
      )}
      {warm > 0.001 && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ transitionDuration: "1600ms", opacity: film ? warm * 0.45 : warm * 0.8, mixBlendMode: film ? undefined : "screen", background: "radial-gradient(58% 42% at 68% 6%, rgba(255,168,76,0.5), rgba(255,168,76,0) 70%)" }}
        />
      )}
      {night > 0.001 && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ transitionDuration: "1600ms", opacity: night * (film ? 0.42 : 0.55), mixBlendMode: film ? undefined : "multiply", background: film ? "#0b1630" : "#1d2f55" }}
        />
      )}
      {wd.dim > 0.001 && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: film ? wd.dim * 0.5 : wd.dim, mixBlendMode: film ? undefined : "multiply", background: "#42566e" }}
        />
      )}
      {/* Over a real-water sea (Video, Blender) only the rain falls — the drawn wind streaks read as
          scratches over footage (owner, AENR-834). */}
      {particles && !lite && (seaStyle === "classic" || seaStyle === "coastal" || raining) && (
        <WeatherFxCanvas key={`${raining}-${wd.wind}`} rain={raining} wind={seaStyle === "classic" || seaStyle === "coastal" ? wd.wind : 0} />
      )}
    </div>
    {/* The life-buoy bobs in the water, always in a slot content never uses
        (AENR-744): while browsing, in the left margin beside the 72rem content
        column — only on screens wide enough to have one; in the desktop
        booking flow, in the surf just off the raised shoreline; on tablets in
        the flow, top-left, clear of the menu and the tappable sand. Phones have
        no such slot, so it stays off there. It is the "Need a hand?" button
        (AENR-781), so it lives outside the aria-hidden, click-through scene
        (portalled to <body>) — same viewport coordinates, above the scene and
        under the booking flow's layer (z-20, click-through where empty). */}
    {ring && <HelpRing
      className={`fixed z-10 w-[60px] h-[60px] transition-[top,left] duration-slow ease-ios ${
        immersive
          ? wide
            ? "top-[40%] left-[6%]"
            : "hidden md:block top-[7%] left-[8%]"
          : "hidden min-[1360px]:block top-[72%] left-[calc((100vw-72rem)/2-84px)]"
      }`}
    />}
    </>
  );
}
