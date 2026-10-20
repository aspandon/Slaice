import { useState, useSyncExternalStore } from "react";
import { readyRes, videoResOf, type VideoRes } from "../../domain/features";
import { prefersReducedMotion } from "../../lib/motion";
import { useTenantFeatures } from "../../lib/useFeatures";
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
   download. Hidden tab: paused. A video that can't play hands back to Classic.

   Resolutions (AENR-859, Platform › tenant › Guest sea › Resolution, per device): Standard is the
   first clip; Full HD and 4K come from a 4K master, and a phone or tablet held upright gets a
   portrait cut of its middle (on a tall screen the 16:9 frame is mostly cropped away, so a
   landscape file plays about three times enlarged). A size the device can't decode, or decodes
   too slowly, steps down one size at a time. */

const BASE = import.meta.env.BASE_URL;
const src = (f: string) => `${BASE}sea/${f}`;
const vp9 = (level: string) => `video/webm; codecs="vp09.00.${level}.08"`;
const mp4 = (level: string) => `video/mp4; codecs="avc1.6400${level}"`;

/** Each resolution's files: computers, and phones and tablets (landscape, and held upright). */
const FILES: Record<VideoRes, { wide: Cut; phone: Cut; tall?: Cut }> = {
  standard: {
    wide: { poster: "sea-poster.webp", files: [{ src: "sea-loop-1080.webm", type: "video/webm" }, { src: "sea-loop-1080.mp4", type: "video/mp4" }] },
    phone: { poster: "sea-poster.webp", files: [{ src: "sea-loop.mp4", type: "video/mp4" }] },
  },
  fullhd: {
    wide: { poster: "sea-fullhd-poster.webp", files: [{ src: "sea-fullhd.webm", type: vp9("40") }, { src: "sea-fullhd.mp4", type: mp4("32") }] },
    phone: { poster: "sea-fullhd-poster.webp", files: [{ src: "sea-fullhd.mp4", type: mp4("32") }, { src: "sea-fullhd.webm", type: vp9("40") }] },
    tall: { poster: "sea-portrait-fullhd-poster.webp", files: [{ src: "sea-portrait-fullhd.mp4", type: mp4("32") }, { src: "sea-portrait-fullhd.webm", type: vp9("40") }] },
  },
  "4k": {
    wide: { poster: "sea-4k-poster.webp", files: [{ src: "sea-4k.webm", type: vp9("50") }, { src: "sea-4k.mp4", type: mp4("33") }] },
    phone: { poster: "sea-4k-poster.webp", files: [{ src: "sea-4k.mp4", type: mp4("33") }, { src: "sea-4k.webm", type: vp9("50") }] },
    tall: { poster: "sea-portrait-4k-poster.webp", files: [{ src: "sea-portrait-4k.mp4", type: mp4("32") }, { src: "sea-portrait-4k.webm", type: vp9("50") }] },
  },
};
interface Cut {
  poster: string;
  files: { src: string; type: string }[];
}

// Held upright: the portrait cut covers the screen (a landscape tablet under 1024 px keeps the wide file).
const PORTRAIT = "(orientation: portrait)";
const onTurn = (cb: () => void) => {
  const m = window.matchMedia(PORTRAIT);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const upright = () => window.matchMedia(PORTRAIT).matches;

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
  const { tenant } = useTenantFeatures();
  const tall = useSyncExternalStore(onTurn, upright, () => false);
  // A size the device can't play (or plays too slowly) steps down one at a time; Standard failing
  // hands the sea back to Classic.
  const [down, setDown] = useState(0);
  const tiers = readyRes("video");
  const want = tiers.findIndex((x) => x.id === videoResOf(tenant, tier));
  const at = Math.max(0, want - down);
  const set = FILES[tiers[at].id as VideoRes];
  const cut = tier === "desktop" ? set.wide : tall && set.tall ? set.tall : set.phone;
  const stepDown = at > 0 ? () => setDown((n) => n + 1) : undefined;

  const media = "absolute inset-0 w-full h-full object-cover transition-[filter] duration-1000";
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {still ? (
        <img src={src(cut.poster)} alt="" className={media} style={{ filter }} />
      ) : (
        <LoopVideo
          // A new size or cut (a new tenant setting, the device turned) is a new pair of players.
          key={cut.files[0].src}
          className={media}
          style={{ filter }}
          sources={cut.files.map((f) => ({ src: src(f.src), type: f.type }))}
          poster={src(cut.poster)}
          rate={rate}
          onFail={stepDown ?? onFail}
          onSlow={stepDown}
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
