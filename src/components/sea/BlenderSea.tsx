import { useLayoutEffect, useRef, useState } from "react";
import { blenderResOf, type BlenderRes } from "../../domain/features";
import { prefersReducedMotion } from "../../lib/motion";
import { useTenantFeatures } from "../../lib/useFeatures";
import { seaAbove } from "../../lib/seaShore";
import { useShoreSlide } from "../../lib/useShoreSlide";
import type { SeaEnv } from "../LiveSeaCanvas";
import { LoopVideo } from "./LoopVideo";
import { SeaLightSvg } from "./SeaLightSvg";
import { grade, saveData, windRate } from "./videoGrade";

/* ============ The Blender sea and beach (AENR-827) ============
   A seamless loop of a whole Greek beach rendered in Blender (public/sea/blender/CREDITS.md):
   open sea at the top, turquoise shallows over sloping sand with caustics, a shore break that
   runs up the wet sand with foam, light golden-white sand below. Unlike Coastal and Video it
   replaces the sand too, so the host draws it over the drawn land (which stays underneath as the
   loading state and the fallback), and the sets and zones stand on its sand as DOM.

   The frame is taller than the scene: it covers scene x 0–1600 and y −250–1250 (1600 × 1500
   scene units), rendered with its waterline on the app's own sand-top curve (lib/seaShore.ts) at
   dy = 0. It is placed in scene space — cover-fitted like the SVG scene and moved down by `dy` —
   so the rendered shoreline is the scene's shoreline in every shot, and when the shoreline moves
   (Home ↔ Plan) it slides with the land (useShoreSlide). Phones get a portrait cut of the
   middle (x 395–1205, 810 units wide: everything a portrait screen shows) at a fraction of the
   desktop file's weight; anything wider gets the full frame.

   The light, weather and wind reach it exactly as they reach the Video sea: a CSS grade (dimmer at
   night and under cloud), the shared light layer on top — kept on the water by a clip along the
   shore — and the playback speed. Reduced motion or Save-Data: the still poster, no video. A video
   that can't play hands back to Classic. */

const BASE = import.meta.env.BASE_URL;
const src = (f: string) => `${BASE}sea/blender/${f}`;

/** The loop: 8 s, exactly periodic; the files run a 1 s tail past it for the handover (LoopVideo). */
const PERIOD = 8;
/** The rendered frame in scene units (beach.py: 1280 × 1200 px — or 1600 × 1500, 1920 × 1800 — for 1600 × 1500 units). */
const FRAME_TOP = -250;
const FRAME_H = 1500;
// Each with its codec in the type, so a browser without H.264 (or VP9) skips to the next file. The
// H.264 level follows the frame size (the larger frames need a higher level).
const WEBM = 'video/webm; codecs="vp9"';
const mp4 = (level: string) => `video/mp4; codecs="avc1.6400${level}"`;
/** The tenant's resolution for this device (AENR-844): the file suffix and each cut's H.264 level. */
const RES: Record<BlenderRes, { suf: string; wide: string; tall: string }> = {
  standard: { suf: "", wide: "28", tall: "1f" },
  high: { suf: "-high", wide: "32", tall: "20" },
  fullhd: { suf: "-fullhd", wide: "32", tall: "28" },
};
const cutsFor = (res: BlenderRes) => {
  const r = RES[res];
  return {
    wide: {
      x: 0,
      w: 1600,
      poster: `beach${r.suf}-poster.webp`,
      files: [
        { src: src(`beach${r.suf}.webm`), type: WEBM },
        { src: src(`beach${r.suf}.mp4`), type: mp4(r.wide) },
      ],
    },
    // H.264 first on phones (the lightest to decode), VP9 where there is no H.264.
    tall: {
      x: 395,
      w: 810,
      poster: `beach-portrait${r.suf}-poster.webp`,
      files: [
        { src: src(`beach-portrait${r.suf}.mp4`), type: mp4(r.tall) },
        { src: src(`beach-portrait${r.suf}.webm`), type: WEBM },
      ],
    },
  };
};

export default function BlenderSea({
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
  const host = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useShoreSlide(dy, [slide]);
  // Standard, High or Full HD — the tenant's choice for this device (Platform › tenant › Guest sea).
  const { tenant } = useTenantFeatures();
  const cuts = cutsFor(blenderResOf(tenant, tier));

  const still = prefersReducedMotion() || saveData();
  const filter = grade(env);
  const rate = windRate(env.wind);
  // Place the frame in scene space, the way the SVG scene is cover-fitted ("slice").
  const k = size ? Math.max(size.w / 1600, size.h / 900) : 0;
  // The portrait cut only where it covers the whole layer (portrait phones and tablets).
  const cut = cuts[tier === "mobile" && size && size.w / k <= cuts.tall.w - 8 ? "tall" : "wide"];
  const box = size && {
    left: (size.w - 1600 * k) / 2 + cut.x * k,
    top: (size.h - 900 * k) / 2 + (FRAME_TOP + dy) * k,
    width: cut.w * k,
    height: FRAME_H * k,
  };
  const media = "absolute inset-0 w-full h-full object-fill transition-[filter] duration-1000";
  return (
    <div
      ref={host}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <div ref={slide} className="absolute inset-0">
        {box && (
          <div className="absolute" style={box}>
            {still ? (
              <img src={src(cut.poster)} alt="" className={media} style={{ filter }} />
            ) : (
              <LoopVideo
                // A new cut or resolution (a resize across the phone / tablet line, a new tenant setting)
                // is a new pair of players.
                key={cut.poster}
                className={media}
                style={{ filter }}
                sources={cut.files}
                poster={src(cut.poster)}
                rate={rate}
                period={PERIOD}
                onFail={onFail}
              />
            )}
          </div>
        )}
        {/* The light the render can't know: the hour's colour on the water, the sun's or the moon's path.
            Kept on the water, fading out across the swash, so the sand keeps its own colour. */}
        <SeaLightSvg
          light={env.light}
          dy={dy}
          tint="soft"
          // No drawn whitecaps over a rendered sea (owner, as for the Video sea): the render has its own surf.
          wind={0}
          clip={seaAbove(dy, -8)}
          twinkle={tier === "desktop" && !still}
        />
      </div>
    </div>
  );
}
