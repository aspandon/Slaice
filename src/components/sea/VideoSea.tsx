import { useEffect, useRef } from "react";
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
  const ref = useRef<HTMLVideoElement>(null);
  const still = prefersReducedMotion() || saveData();
  const filter = grade(env);
  const rate = Math.min(1.4, Math.max(0.6, 0.7 + 0.7 * env.wind));

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = rate;
  }, [rate]);

  // Paused while the tab is hidden; playing again when it's back.
  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const onVis = () => {
      if (document.hidden) v.pause();
      else void v.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [still]);

  const media = "absolute inset-0 w-full h-full object-cover transition-[filter] duration-1000";
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {still ? (
        <img src={src("sea-poster.webp")} alt="" className={media} style={{ filter }} />
      ) : (
        <video
          ref={ref}
          className={media}
          style={{ filter }}
          poster={src("sea-poster.webp")}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={onFail}
        >
          {tier === "desktop" && <source src={src("sea-loop.webm")} type="video/webm" />}
          {/* Errors on a <source> don't reach the video: the last one reports it. */}
          <source
            src={src(tier === "desktop" ? "sea-loop.mp4" : "sea-loop-480.mp4")}
            type="video/mp4"
            onError={onFail}
          />
        </video>
      )}
      {/* The light the video can't film: the path under the sun or the moon, the horizon glow. */}
      <SeaLightSvg light={env.light} dy={dy} tint="soft" twinkle={tier === "desktop" && !still} />
    </div>
  );
}
