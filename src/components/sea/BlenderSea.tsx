import { useLayoutEffect, useRef, useState } from "react";
import { blenderResOf, readyRes, type BlenderRes } from "../../domain/features";
import { prefersReducedMotion } from "../../lib/motion";
import { useTenantFeatures } from "../../lib/useFeatures";
import { seaAbove } from "../../lib/seaShore";
import { useShoreSlide } from "../../lib/useShoreSlide";
import type { SeaEnv } from "../LiveSeaCanvas";
import { LoopVideo } from "./LoopVideo";
import { SeaLightSvg } from "./SeaLightSvg";
import { gradeTint, saveData, windRate } from "./videoGrade";

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
const NO_STYLE = {};
const src = (f: string) => `${BASE}sea/blender/${f}`;

// The loop: 8 s, exactly periodic — the files are exactly one period (AENR-860 1A), so the
// browser's own loop is seamless.
/** The rendered frame in scene units (beach.py: 1280 × 1200 px — or 1600 × 1500, 1920 × 1800 — for 1600 × 1500 units). */
const FRAME_TOP = -250;
const FRAME_H = 1500;
// H.264 first everywhere (AENR-861: the hardware-decoded path in Safari and Chrome), VP9 where there
// is no H.264. Each with its codec in the type, so a browser skips a file it can't play. The
// levels follow the frame size (the larger frames need a higher level; 4K's wide frame, 3840 × 3600,
// is past what level 5 decoders take — H.264 6.0, VP9 6.0).
const vp9 = (level = "") => (level ? `video/webm; codecs="vp09.00.${level}.08"` : 'video/webm; codecs="vp9"');
const mp4 = (level: string) => `video/mp4; codecs="avc1.6400${level}"`;
/** Each resolution (AENR-844, AENR-856): the file suffix and each cut's H.264 (and VP9) level. */
const RES: Record<BlenderRes, { suf: string; wide: string; tall: string; vWide?: string; vTall?: string }> = {
  standard: { suf: "", wide: "28", tall: "1f" },
  high: { suf: "-high", wide: "32", tall: "28" },
  fullhd: { suf: "-fullhd", wide: "32", tall: "2a" },
  "4k": { suf: "-4k", wide: "3c", tall: "33", vWide: "60", vTall: "50" },
};
const cutsFor = (res: BlenderRes) => {
  const r = RES[res];
  return {
    wide: {
      x: 0,
      w: 1600,
      poster: `beach${r.suf}-poster.webp`,
      files: [
        { src: src(`beach${r.suf}.mp4`), type: mp4(r.wide) },
        { src: src(`beach${r.suf}.webm`), type: vp9(r.vWide) },
      ],
    },
    tall: {
      x: 395,
      w: 810,
      poster: `beach-portrait${r.suf}-poster.webp`,
      files: [
        { src: src(`beach-portrait${r.suf}.mp4`), type: mp4(r.tall) },
        { src: src(`beach-portrait${r.suf}.webm`), type: vp9(r.vTall) },
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
  // A device that can't play the chosen size (a 4K decoder it doesn't have) steps down one size at a
  // time; only Standard failing hands the sea back to Classic.
  const [down, setDown] = useState(0);
  const tiers = readyRes("blender");
  const want = tiers.findIndex((x) => x.id === blenderResOf(tenant, tier));
  const at = Math.max(0, want - down);
  const cuts = cutsFor(tiers[at].id);
  const fail = at > 0 ? () => setDown((n) => n + 1) : onFail;

  const still = prefersReducedMotion() || saveData();
  const tint = gradeTint(env);
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
  const media = "absolute inset-0 w-full h-full object-fill";
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
              <img src={src(cut.poster)} alt="" className={media} />
            ) : (
              <LoopVideo
                // A new cut or resolution (a resize across the phone / tablet line, a new tenant setting)
                // is a new player.
                key={cut.poster}
                className={media}
                style={NO_STYLE}
                sources={cut.files}
                poster={src(cut.poster)}
                rate={rate}
                onFail={fail}
                onSlow={at > 0 ? () => setDown((n) => n + 1) : undefined}
              />
            )}
            {/* The grade for night and cloud: a plain layer over the video (AENR-862). */}
            {tint && <div className="absolute inset-0 transition-opacity duration-1000" style={tint} />}
          </div>
        )}
        {/* The light the render can't know: the hour's colour on the water, the sun's or the moon's path.
            Kept on the water, fading out across the swash, so the sand keeps its own colour. */}
        <SeaLightSvg
          light={env.light}
          dy={dy}
          tint="soft"
          flat
          // No drawn whitecaps over a rendered sea (owner, as for the Video sea): the render has its own surf.
          wind={0}
          clip={seaAbove(dy, -8)}
        />
      </div>
    </div>
  );
}
