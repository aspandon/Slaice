import { useEffect, useRef, type CSSProperties } from "react";
import { prefersReducedMotion } from "../../lib/motion";
import type { SeaEnv } from "../LiveSeaCanvas";
import { SeaLightSvg } from "./SeaLightSvg";

/* ============ Video sea (AENR-814) ============
   A short seamless loop of real water filmed straight down (Coverr, free licence —
   public/sea/CREDITS.md) under the drawn sand and foam. Playing a video is the
   lightest live sea there is: the device's video decoder does the work, not the
   CPU or a shader, so it runs on phones too (they get a 480p file, ≈0.8 MB).

   The weather and the time of day reach it two ways (AENR-815): a colour grade on
   the video itself (CSS filter — darker and bluer at night, warmer at sunrise and
   sunset, flatter under cloud) and the shared light layer on top (the orange path
   under a low sun, the moon and its silver path, the horizon glow). The wind sets
   the playback speed. Reduced motion or Save-Data: the still poster only, no video
   download. Hidden tab: paused. A video that can't play hands back to Classic. */

const BASE = import.meta.env.BASE_URL;
const src = (f: string) => `${BASE}sea/${f}`;

/** The colour grade for the light: a CSS filter string. */
function grade(env: SeaEnv) {
  const { night: n, warm: w, cloud: c } = env.light;
  // The footage carries the Greek day's colour itself (graded at encode, AENR-824); the hour's colour comes
  // from the light layer on top, so the filter only dims for night and cloud.
  const brightness = 1 - 0.38 * n - 0.1 * c + 0.04 * w;
  const saturate = Math.max(0.4, 1 - 0.4 * c - 0.25 * n);
  return `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
}

const saveData = () =>
  typeof navigator !== "undefined" &&
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

export default function VideoSea({
  dy,
  env,
  tier,
  onFail,
}: {
  dy: number;
  env: SeaEnv;
  tier: "desktop" | "mobile";
  onFail: () => void;
}) {
  const still = prefersReducedMotion() || saveData();
  const filter = grade(env);
  const rate = Math.min(1.4, Math.max(0.6, 0.7 + 0.7 * env.wind));

  const media = "absolute inset-0 w-full h-full object-cover transition-[filter] duration-1000";
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {still ? (
        <img src={src("sea-poster.webp")} alt="" className={media} style={{ filter }} />
      ) : (
        <LoopVideo className={media} style={{ filter }} tier={tier} rate={rate} onFail={onFail} />
      )}
      {/* The light the video can't film: the path under the sun or the moon, the horizon glow. */}
      <SeaLightSvg
        light={env.light}
        dy={dy}
        tint="soft"
        wind={env.wind}
        twinkle={tier === "desktop" && !still}
      />
    </div>
  );
}

/* ---- A loop nobody can see (AENR-814) ----
   The clip itself ends by crossfading into its first second, and on top of that two players take
   turns: shortly before the playing one ends, the other starts from the top and the two crossfade,
   so the guest never sees the browser jump back to the start (some browsers hitch for a frame on a
   plain `loop`). Only one decodes outside the half-second handover. Paused while the tab is hidden. */
const HANDOVER = 0.5; // s

function LoopVideo({
  className,
  style,
  tier,
  rate,
  onFail,
}: {
  className: string;
  style: CSSProperties;
  tier: "desktop" | "mobile";
  rate: number;
  onFail: () => void;
}) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const va = a.current;
    const vb = b.current;
    if (!va || !vb) return;
    // A re-run (the wind changed the speed) keeps whichever player is showing in front.
    let front = vb.style.opacity === "1" ? vb : va;
    let back = front === va ? vb : va;
    let handing = false;
    let timer = 0;
    [va, vb].forEach((v) => (v.playbackRate = rate));
    if (!va.style.opacity) {
      va.style.opacity = "1";
      vb.style.opacity = "0";
    }
    void front.play().catch(() => undefined);
    const tick = () => {
      const d = front.duration;
      if (!handing && d && front.currentTime >= d - HANDOVER * rate) {
        handing = true;
        back.currentTime = 0;
        back.playbackRate = rate;
        void back.play().catch(() => undefined);
        back.style.opacity = "1";
        front.style.opacity = "0";
        const done = front;
        timer = window.setTimeout(
          () => {
            done.pause();
            done.currentTime = 0;
            [front, back] = [back, front];
            handing = false;
          },
          HANDOVER * 1000 + 60,
        );
      }
    };
    va.addEventListener("timeupdate", tick);
    vb.addEventListener("timeupdate", tick);
    const onVis = () => {
      if (document.hidden) [va, vb].forEach((v) => v.pause());
      else void front.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      va.removeEventListener("timeupdate", tick);
      vb.removeEventListener("timeupdate", tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [rate]);
  const sources = (
    <>
      {tier === "desktop" && <source src={src("sea-loop.webm")} type="video/webm" />}
      {/* Errors on a <source> don't reach the video: the last one reports it. */}
      <source
        src={src(tier === "desktop" ? "sea-loop.mp4" : "sea-loop-480.mp4")}
        type="video/mp4"
        onError={onFail}
      />
    </>
  );
  // Opacity is owned by the handover (set on the elements, never by a re-render); the filter keeps its glide.
  const fade = { transition: `opacity ${HANDOVER}s linear, filter 1s` };
  return (
    <>
      <video
        ref={a}
        className={className}
        style={{ ...style, ...fade }}
        poster={src("sea-poster.webp")}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={onFail}
      >
        {sources}
      </video>
      <video
        ref={b}
        className={className}
        style={{ ...style, ...fade }}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={onFail}
      >
        {sources}
      </video>
    </>
  );
}
