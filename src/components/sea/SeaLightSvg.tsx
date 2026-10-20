import { useId } from "react";
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
  tint = true,
}: {
  light: SeaLight;
  dy?: number;
  twinkle?: boolean;
  /** Colour the water — off where the sea grades itself (the video's CSS filter). */ tint?: boolean;
}) {
  const rid = useId().replace(/:/g, "");
  const id = (k: string) => `${k}-${rid}`;
  const shore = 470 + dy; // a little above the sand top (≈ 450–555 + dy), so nothing pokes onto the sand
  const warm = light.warm * (1 - light.night);
  const night = light.night;
  const g = light.glitter;
  const gx = g.x * 1600;
  const sunGlow = warm > 0.02 && light.sunElev > -0.3;
  const moon = light.moon.strength > 0.03;
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      <defs>
        <linearGradient
          id={id("warm")}
          x1="0"
          y1="0"
          x2="0"
          y2={shore}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={rgbCss(light.tint.top)} stopOpacity={0.75} />
          <stop offset="55%" stopColor={rgbCss(light.tint.top)} stopOpacity={0.4} />
          <stop offset="100%" stopColor={rgbCss(light.tint.deep)} stopOpacity={0.22} />
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
        <radialGradient id={id("sun")} cx="50%" cy="0%" r="50%">
          <stop offset="0%" stopColor={rgbCss(light.glitter.color, 0.95)} />
          <stop offset="35%" stopColor={rgbCss(light.tint.top, 0.55)} />
          <stop offset="100%" stopColor={rgbCss(light.tint.top, 0)} />
        </radialGradient>
        <radialGradient id={id("moon")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={rgbCss(light.moon.color, 0.45)} />
          <stop offset="100%" stopColor={rgbCss(light.moon.color, 0)} />
        </radialGradient>
        <linearGradient
          id={id("path")}
          x1="0"
          y1="0"
          x2="0"
          y2={shore}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={rgbCss(g.color)} stopOpacity={0.55} />
          <stop offset="100%" stopColor={rgbCss(g.color)} stopOpacity={0.08} />
        </linearGradient>
      </defs>

      {/* The water's colour. Night darkens by multiplying, so the drawn wave lines still read. */}
      {tint && warm > 0.01 && (
        <rect width="1600" height={shore + 60} fill={`url(#${id("warm")})`} opacity={warm} />
      )}
      {tint && night > 0.01 && (
        <rect
          width="1600"
          height={shore + 60}
          fill={`url(#${id("night")})`}
          opacity={night * 0.78}
          style={{ mixBlendMode: "multiply" }}
        />
      )}

      {/* The low sun's glow on the horizon; the moon and its halo at night. */}
      {sunGlow && (
        <ellipse
          cx={light.sunX * 1600}
          cy={0}
          rx={420}
          ry={190}
          fill={`url(#${id("sun")})`}
          opacity={warm}
        />
      )}
      {moon && (
        <g opacity={light.moon.strength}>
          <circle cx={light.moon.x * 1600} cy={46} r={150} fill={`url(#${id("moon")})`} />
          <circle cx={light.moon.x * 1600} cy={46} r={19} fill={rgbCss(light.moon.color)} />
        </g>
      )}

      {/* The reflection path: a soft column, then glints broken by the swell. */}
      {g.strength > 0.02 && (
        <g opacity={Math.min(1, g.strength)} style={{ mixBlendMode: "screen" }}>
          <path
            d={`M ${gx - 1600 * g.width * 0.18} 0 L ${gx + 1600 * g.width * 0.18} 0 L ${gx + 1600 * g.width * 0.55} ${shore} L ${gx - 1600 * g.width * 0.55} ${shore} Z`}
            fill={`url(#${id("path")})`}
            opacity={0.55}
          />
          <g fill={rgbCss(g.color)} className={twinkle ? "sea-glints" : undefined}>
            {GLINTS.map(([t, s, k], i) => {
              const y = 8 + t * (shore - 18);
              const spread = 1600 * g.width * (0.16 + 0.42 * t);
              const w = 5 + (14 + 26 * k) * (0.25 + t);
              const h = 1.4 + 2.2 * t;
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
  tint?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full ${className}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <SeaLightGroup light={light} dy={dy} twinkle={twinkle} tint={tint} />
    </svg>
  );
}
