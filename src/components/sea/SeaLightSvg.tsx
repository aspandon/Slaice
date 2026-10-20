import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { DUR } from "../../lib/fx";
import { rgbCss, type SeaLight } from "../../lib/seaLight";

/* ============ The light on a drawn or filmed sea (AENR-815) ============
   The time of day and the weather painted over a sea that can't light itself —
   the still Classic sea (phones, reduced motion, no WebGL) and the Video sea. Drawn
   in the beach's 1600×900 scene space (its own <svg>, or a <g> inside the scene's),
   between the water and the sand, so the shore always covers its lower edge:
   - the water's colour: orange-pink toward the horizon at sunrise and sunset, deep
     navy at night (from SeaLight.tint);
   - the glow of the low sun, or the moon, at the horizon (the top edge);
   - the reflection path: a broad sheen at noon, a long narrow column of orange
     glints under a low sun, the moon's silver path at night (SeaLight.glitter).
   `twinkle` (SeaLightSvg only) sets the glints shimmering the cheap way (AENR-819): the glints are
   split across two extra layers whose opacity pulses in turn — the compositor alone runs it, the SVG
   never repaints. Nothing inside the scene's own SVG animates (that repainted the whole scene, and
   every blurred glass panel over it, on every frame). Off under reduced motion. */

/** The part of the 1600×900 scene the guest actually sees (scene units): the scene is cover-fitted
 *  ("slice"), overscanned for parallax and moved by the camera, so on a portrait phone only its
 *  middle third shows. The sun, the moon and their paths are placed across this view — things at
 *  infinity stay put on screen while the camera pans. */
export interface SceneView {
  x0: number;
  w: number;
  y0: number;
}
export const FULL_VIEW: SceneView = { x0: 0, w: 1600, y0: 0 };

/** Measures the visible part of the scene drawn by `ref`'s <svg>, again after a resize and once the camera settles. */
export function useSceneView(ref: RefObject<SVGSVGElement>): SceneView {
  const [view, setView] = useState(FULL_VIEW);
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const k = Math.max(r.width / 1600, r.height / 900);
    if (!k) return;
    const ox = (r.width - 1600 * k) / 2;
    const oy = (r.height - 900 * k) / 2;
    const x0 = Math.max(0, (0 - r.left - ox) / k);
    const x1 = Math.min(1600, (window.innerWidth - r.left - ox) / k);
    const y0 = Math.max(0, (0 - r.top - oy) / k);
    const next = { x0: Math.round(x0), w: Math.round(Math.max(200, x1 - x0)), y0: Math.round(y0) };
    setView((v) => (v.x0 === next.x0 && v.w === next.w && v.y0 === next.y0 ? v : next));
  };
  useLayoutEffect(measure);
  useEffect(() => {
    let t = 0;
    const later = () => {
      window.clearTimeout(t);
      t = window.setTimeout(measure, DUR.camera * 1000 + 120);
    };
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", later);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("hashchange", later);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the ref is stable
  }, []);
  return view;
}

// Fixed glint positions so the path never jumps between renders: [t 0–1 down the path, spread −1…1, size 0–1].
const GLINTS: ReadonlyArray<readonly [number, number, number]> = Array.from(
  { length: 78 },
  (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12543.1234;
    const c = Math.sin(i * 39.425) * 24634.6345;
    const fr = (v: number) => v - Math.floor(v);
    // More glints toward the horizon, where the path is foreshortened.
    return [Math.pow(fr(a), 1.35), fr(b) * 2 - 1, fr(c)] as const;
  },
);

// Fixed whitecap positions: [across 0–1, down the water 0–1 (more toward the shore), size 0–1].
const CAPS: ReadonlyArray<readonly [number, number, number]> = Array.from(
  { length: 46 },
  (_, i) => {
    const fr = (v: number) => v - Math.floor(v);
    return [
      fr(Math.sin(i * 91.7) * 4375.5),
      Math.pow(fr(Math.sin(i * 27.3) * 1543.1), 0.7),
      fr(Math.sin(i * 63.1) * 2614.9),
    ] as const;
  },
);

export function SeaLightGroup({
  light,
  dy = 0,
  glints = "all",
  tint = "full",
  view = FULL_VIEW,
  wind = 0,
}: {
  light: SeaLight;
  /** The visible part of the scene — where the horizon, the sun and the moon are. */
  view?: SceneView;
  /** 0 … 1 wind — whitecaps and foam streaks from a fresh breeze up (AENR-824). */
  wind?: number;
  dy?: number;
  /** Which glints to draw: all, none (another layer has them), or one of the two twinkle subsets. */
  glints?: "all" | "none" | 0 | 1;
  /** Colour the water: "full" for a painted sea; "soft" over real footage (a glow that keeps its
   *  detail, a lighter navy at night); false where the sea colours itself. */
  tint?: "full" | "soft" | false;
}) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const shore = 470 + dy; // a little above the sand top (≈ 450–555 + dy), so nothing pokes onto the sand
  const night = light.night;
  const g = light.glitter;
  const X = (f: number) => view.x0 + f * view.w;
  const top = view.y0;
  const gx = X(g.x);
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      <defs>
        {/* The hour's water, horizon → shore (SeaLight.palette, AENR-824). */}
        <linearGradient
          id={id("water")}
          x1="0"
          y1={top}
          x2="0"
          y2={shore + 60}
          gradientUnits="userSpaceOnUse"
        >
          {light.palette.map((c, i) => (
            <stop key={i} offset={`${(i / 3) * 100}%`} stopColor={rgbCss(c)} />
          ))}
        </linearGradient>
        <linearGradient
          id={id("night")}
          x1="0"
          y1="0"
          x2="0"
          y2={shore}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1a2a4f" />
          <stop offset="100%" stopColor="#0a1530" />
        </linearGradient>
      </defs>

      {/* The water's colour for the hour: painted over a drawn sea; over real footage only its hue
          ("color" blend — the footage keeps its own light and texture). Night also darkens by
          multiplying, so the wave lines and ripples still read. */}
      {tint && light.tint.amount > 0.01 && (
        <rect
          y={top}
          width="1600"
          height={shore + 60 - top}
          fill={`url(#${id("water")})`}
          opacity={light.tint.amount * (tint === "soft" ? 0.85 : 1 - night * 0.45)}
          style={tint === "soft" ? { mixBlendMode: "color" } : undefined}
        />
      )}
      {tint && night > 0.01 && (
        <rect
          width="1600"
          height={shore + 60}
          fill={`url(#${id("night")})`}
          opacity={night * (tint === "soft" ? 0.55 : 0.6)}
          style={{ mixBlendMode: "multiply" }}
        />
      )}

      {/* No sun or moon disc on the water, and no beam (owner, AENR-834): from above they read as a
          blob — the glints below carry the light; the sky band shows the sun and the moon. */}

      {/* Whitecaps (the owner's windy photos): white crests breaking across the water, more and
          longer the stronger the wind, smaller toward the horizon; slanted with the wind. */}
      {wind > 0.45 && (
        <g fill="#ffffff" opacity={Math.min(1, (wind - 0.45) / 0.45) * (1 - night * 0.6)}>
          {CAPS.map(([u, t, k], i) => {
            // A short curled crest, drawn as a stroke — longer and thicker toward the shore.
            const y = top + 20 + t * (shore - top - 30);
            const len = (9 + 24 * k) * (0.35 + 0.9 * t) * Math.max(0.5, view.w / 1600);
            const x = view.x0 + u * view.w - len / 2;
            return (
              <path
                key={i}
                d={`M ${x} ${y} q ${len * 0.45} ${-len * 0.22} ${len} ${-len * 0.04}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth={(0.9 + 2.1 * t) * (0.7 + 0.5 * k)}
                strokeLinecap="round"
                opacity={0.4 + 0.5 * k}
              />
            );
          })}
        </g>
      )}

      {/* The reflection path: glints broken by the swell, gathering under a low sun or the moon. */}
      {g.strength > 0.02 && (
        <g opacity={Math.min(1, g.strength)} style={{ mixBlendMode: "screen" }}>
          <g fill={rgbCss(g.color)}>
            {GLINTS.map(([t, s, k], i) => {
              if (glints === "none" || (glints !== "all" && i % 2 !== glints)) return null;
              const y = top + 8 + t * (shore - top - 18);
              const spread = view.w * g.width * (0.16 + 0.42 * t);
              // Glints sized to the visible view, so a phone's narrow strip isn't a stack of bars.
              const vs = Math.max(0.42, view.w / 1600);
              const w = vs * (5 + (14 + 26 * k) * (0.25 + t));
              const h = (0.6 + 0.4 * vs) * (1.4 + 2.2 * t);
              return (
                <ellipse
                  key={i}
                  cx={gx + s * spread * (0.4 + 0.6 * Math.abs(s))}
                  cy={y}
                  rx={w / 2}
                  ry={h / 2}
                  opacity={0.35 + 0.65 * k * (1 - Math.abs(s) * 0.6)}
                />
              );
            })}
          </g>
        </g>
      )}
    </g>
  );
}

/** The same light as its own full-scene layer — over the Video sea, under the sand. */
export function SeaLightSvg({
  light,
  dy,
  twinkle,
  tint,
  wind,
  clip,
  className = "",
}: {
  light: SeaLight;
  dy?: number;
  twinkle?: boolean;
  tint?: "full" | "soft" | false;
  wind?: number;
  /** Keep the light on the water (a scene-space path, its edge feathered) — over a sea that draws its own sand (Blender, AENR-827). */
  clip?: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const view = useSceneView(ref);
  const cid = `sea-clip-${useId().replace(/:/g, "")}`;
  const layer = (child: ReactNode, extra = "", r?: RefObject<SVGSVGElement>) => (
    <svg
      ref={r}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full ${className} ${extra}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      {clip ? (
        <>
          {/* A feathered edge: the light fades out across the swash instead of stopping on a line. */}
          <filter id={`${cid}-f`} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <mask id={cid} maskUnits="userSpaceOnUse" x="-200" y="-2200" width="2000" height="4000">
            <path d={clip} fill="#fff" filter={`url(#${cid}-f)`} />
          </mask>
          <g mask={`url(#${cid})`}>{child}</g>
        </>
      ) : (
        child
      )}
    </svg>
  );
  const group = (glints: "all" | "none" | 0 | 1) => (
    <SeaLightGroup
      light={light}
      dy={dy}
      glints={glints}
      tint={glints === 0 || glints === 1 ? false : tint}
      view={view}
      wind={glints === 0 || glints === 1 ? 0 : wind}
    />
  );
  if (!twinkle) return layer(group("all"), "", ref);
  // Two glint subsets on their own layers, pulsing in turn (compositor-only), over the rest.
  return (
    <>
      {layer(group("none"), "", ref)}
      {layer(group(0), "sea-twinkle-a")}
      {layer(group(1), "sea-twinkle-b")}
    </>
  );
}
