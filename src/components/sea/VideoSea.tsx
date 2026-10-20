import { prefersReducedMotion } from "../../lib/motion";
import type { SeaEnv } from "../LiveSeaCanvas";
import { SeaLightSvg } from "./SeaLightSvg";
import { LoopVideo } from "./LoopVideo";
import { grade, saveData, windRate } from "./videoGrade";

/* ============ Video sea (AENR-814) ============
   A short seamless loop of real water filmed straight down (Coverr, free licence —
   public/sea/CREDITS.md) under the drawn sand and foam. Playing a video is the
   lightest live sea there is: the device's video decoder does the work, not the
   CPU or a shader, so it runs on phones too. It plays in its own screen-sized layer behind the
   scene (not inside the camera's oversized layer), so the water shows at about its filmed scale —
   1080p on computers (≈4.6 MB MP4 / 3.7 MB WebM), 720p on phones (≈2.3 MB) — AENR-835.

   The weather and the time of day reach it two ways (AENR-815): a colour grade on
   the video itself (CSS filter — darker and bluer at night, warmer at sunrise and
   sunset, flatter under cloud) and the shared light layer on top (the orange path
   under a low sun, the moon and its silver path, the horizon glow). The wind sets
   the playback speed. Reduced motion or Save-Data: the still poster only, no video
   download. Hidden tab: paused. A video that can't play hands back to Classic. */

const BASE = import.meta.env.BASE_URL;
const src = (f: string) => `${BASE}sea/${f}`;

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
  const rate = windRate(env.wind);

  const media = "absolute inset-0 w-full h-full object-cover transition-[filter] duration-1000";
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {still ? (
        <img src={src("sea-poster.webp")} alt="" className={media} style={{ filter }} />
      ) : (
        <LoopVideo
          className={media}
          style={{ filter }}
          sources={
            tier === "desktop"
              ? [
                  { src: src("sea-loop-1080.webm"), type: "video/webm" },
                  { src: src("sea-loop-1080.mp4"), type: "video/mp4" },
                ]
              : [{ src: src("sea-loop.mp4"), type: "video/mp4" }]
          }
          poster={src("sea-poster.webp")}
          rate={rate}
          onFail={onFail}
        />
      )}
      {/* The light the video can't film: the path under the sun or the moon, the horizon glow. */}
      <SeaLightSvg
        light={env.light}
        dy={dy}
        tint="soft"
        // No drawn whitecaps over real water (owner): the footage moves by itself.
        wind={0}
        twinkle={tier === "desktop" && !still}
      />
    </div>
  );
}
