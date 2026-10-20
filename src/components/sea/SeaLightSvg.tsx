import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
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
   `twinkle` sets the glints shimmering (CSS, off under reduced motion) — only where
   it's cheap: a full-screen SVG repaints on every frame of it, so phones keep it still. */

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

export function SeaLightGroup({
  light,
  dy = 0,
  twinkle = false,
  tint = "full",
  view = FULL_VIEW,
}: {
  light: SeaLight;
  /** The visible part of the scene — where the horizon, the sun and the moon are. */
  view?: SceneView;
  dy?: number;
  twinkle?: boolean;
  /** Colour the water: "full" for a painted sea; "soft" over real footage (a glow that keeps its
   *  detail, a lighter navy at night); false where the sea colours itself. */
  tint?: "full" | "soft" | false;
}) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const shore = 470 + dy; // a little above the sand top (≈ 450–555 + dy), so nothing pokes onto the sand
  const warm = light.warm * (1 - light.night);
  const night = light.night;
  const g = light.glitter;
  const X = (f: number) => view.x0 + f * view.w;
  const top = view.y0;
  const gx = X(g.x);
  const sunGlow = warm > 0.02 && light.sunElev > -0.3;
  const moon = light.moon.strength > 0.03;
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
        <radialGradient id={id("disc")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6dc" />
          <stop offset="45%" stopColor={rgbCss(light.glitter.color)} />
          <stop offset="100%" stopColor={rgbCss(light.glitter.color, 0)} />
        </radialGradient>
        <radialGradient id={id("sun")} cx="50%" cy="0%" r="50%">
          <stop offset="0%" stopColor={rgbCss(light.glitter.color, 0.95)} />
          <stop offset="35%" stopColor={rgbCss(light.tint.top, 0.55)} />
          <stop offset="100%" stopColor={rgbCss(light.tint.top, 0)} />
        </radialGradient>
        <radialGradient id={id("moon")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={rgbCss(light.moon.color, 0.6)} />
          <stop offset="30%" stopColor={rgbCss(light.moon.color, 0.18)} />
          <stop offset="100%" stopColor={rgbCss(light.moon.color, 0)} />
        </radialGradient>
        {/* The path's soft column: bright in the middle, gone at its sides. */}
        <linearGradient
          id={id("path")}
          x1={gx - view.w * g.width * 0.55}
          y1="0"
          x2={gx + view.w * g.width * 0.55}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={rgbCss(g.color)} stopOpacity={0} />
          <stop offset="50%" stopColor={rgbCss(g.color)} stopOpacity={0.5} />
          <stop offset="100%" stopColor={rgbCss(g.color)} stopOpacity={0} />
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

      {/* The low sun's glow on the horizon; the moon and its halo at night. */}
      {sunGlow && (
        <ellipse
          cx={X(light.sunX)}
          cy={top}
          rx={420}
          ry={190}
          fill={`url(#${id("sun")})`}
          opacity={warm}
        />
      )}
      {/* The sun's disc on the horizon while it is low (sunrise, sunset), glowing through the haze. */}
      {sunGlow && light.sunElev > -0.06 && light.sunElev < 0.32 && (
        <g opacity={Math.min(1, warm * 1.4) * (1 - light.cloud * 0.85)}>
          <circle
            cx={X(light.sunX)}
            cy={top + 34 + 90 * Math.max(0, light.sunElev)}
            r={90}
            fill={`url(#${id("disc")})`}
          />
          <circle
            cx={X(light.sunX)}
            cy={top + 34 + 90 * Math.max(0, light.sunElev)}
            r={22}
            fill="#fff4d6"
          />
        </g>
      )}
      {moon && (
        <g opacity={light.moon.strength}>
          <circle cx={X(light.moon.x)} cy={top + 105} r={190} fill={`url(#${id("moon")})`} />
          <circle cx={X(light.moon.x)} cy={top + 105} r={21} fill="#f4f6ff" />
          {/* A hint of the moon's seas. */}
          <circle cx={X(light.moon.x) - 6} cy={top + 100} r={6} fill="#dfe3f2" />
          <circle cx={X(light.moon.x) + 7} cy={top + 111} r={4} fill="#e2e6f4" />
        </g>
      )}

      {/* The reflection path: a soft column, then glints broken by the swell. */}
      {g.strength > 0.02 && (
        <g opacity={Math.min(1, g.strength)} style={{ mixBlendMode: "screen" }}>
          <path
            d={`M ${gx - view.w * g.width * 0.18} ${top} L ${gx + view.w * g.width * 0.18} ${top} L ${gx + view.w * g.width * 0.55} ${shore} L ${gx - view.w * g.width * 0.55} ${shore} Z`}
            fill={`url(#${id("path")})`}
            // Only a low sun or the moon draws a column; the noon sheen is the glints alone.
            opacity={0.85 * Math.min(1, Math.max(0, (0.3 - g.width) / 0.2))}
          />
          <g fill={rgbCss(g.color)} className={twinkle ? "sea-glints" : undefined}>
            {GLINTS.map(([t, s, k], i) => {
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
                  style={twinkle ? { animationDelay: `${-((i * 0.37) % 2.4)}s` } : undefined}
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
  className = "",
}: {
  light: SeaLight;
  dy?: number;
  twinkle?: boolean;
  tint?: "full" | "soft" | false;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const view = useSceneView(ref);
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full ${className}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <SeaLightGroup light={light} dy={dy} twinkle={twinkle} tint={tint} view={view} />
    </svg>
  );
}
