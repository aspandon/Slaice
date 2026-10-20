import { rgbCss, skyAt, type SeaLight } from "../../lib/seaLight";

/* ============ A strip of sky at the horizon (AENR-828) ============
   Once the guest has chosen their zone and their sets (Who, Pay, the confirmation) the view lifts
   to the horizon: a strip of sky comes down over the top of the sea, so the sun and the moon stand
   in a sky above the water, like in the owner's photographs. Its colours follow the hour
   (lib/seaLight.ts › skyAt); the low sun sits on the horizon and climbs with the day, the moon and
   stars come out at night, clouds drift across when it's cloudy. It slides in and out with a
   transform (compositor-only); reduced motion: it simply appears. A tenant switch
   (Platform › tenant › Modules & features › Guest site › Sky at the horizon) turns it off. */

// Fixed star positions [x %, y %, size px].
const STARS: ReadonlyArray<readonly [number, number, number]> = Array.from(
  { length: 34 },
  (_, i) => {
    const fr = (v: number) => v - Math.floor(v);
    return [
      fr(Math.sin(i * 12.71) * 9137.3) * 100,
      fr(Math.sin(i * 78.23) * 4351.7) * 78,
      1 + fr(Math.sin(i * 3.1) * 733.1) * 1.6,
    ] as const;
  },
);
// Soft cloud banks [x %, y %, width %, delay s].
const CLOUDS: ReadonlyArray<readonly [number, number, number, number]> = [
  [8, 30, 34, 0],
  [46, 55, 40, -18],
  [70, 22, 30, -36],
  [25, 70, 28, -9],
];

export function SkyBand({ show, light, hour }: { show: boolean; light: SeaLight; hour: number }) {
  const [zenith, horizon] = skyAt(hour, light.cloud);
  const night = light.night;
  const sunUp = light.sunElev > -0.04 && night < 0.6;
  // The sun climbs from the horizon (0) to near the top of the strip; it can't leave it.
  const sunY = Math.min(78, Math.max(4, light.sunElev * 120));
  const warm = light.warm;
  const sunColor = warm > 0.15 ? "#ffd27a" : "#fffbe8";
  const cloudy = light.cloud > 0.15;
  return (
    <div
      aria-hidden="true"
      className="sky-band absolute inset-x-0 top-0 overflow-hidden"
      data-show={show ? "" : undefined}
      style={{ background: `linear-gradient(${rgbCss(zenith)}, ${rgbCss(horizon)})` }}
    >
      {/* Stars at night, fading out at dawn. */}
      {night > 0.3 &&
        STARS.map(([x, y, sz], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: sz,
              height: sz,
              opacity: (night - 0.3) * (0.5 + (i % 3) * 0.2),
            }}
          />
        ))}
      {/* The sun, with its glow — through the cloud only faintly. */}
      {sunUp && (
        <span
          className="absolute -translate-x-1/2 translate-y-1/2 rounded-full"
          style={{
            left: `${light.sunX * 100}%`,
            bottom: `${sunY}%`,
            width: 30,
            height: 30,
            background: sunColor,
            boxShadow: `0 0 28px 12px ${rgbCss(light.glitter.color, 0.55)}, 0 0 90px 40px ${rgbCss(light.glitter.color, 0.25)}`,
            opacity: 1 - light.cloud * 0.75,
          }}
        />
      )}
      {/* The moon and its halo. */}
      {light.moon.strength > 0.05 && (
        <span
          className="absolute -translate-x-1/2 translate-y-1/2 rounded-full"
          style={{
            left: `${light.moon.x * 100}%`,
            bottom: "52%",
            width: 26,
            height: 26,
            background: "radial-gradient(circle at 40% 38%, #ffffff, #e6eaf6 60%, #cfd6ea)",
            boxShadow: "0 0 26px 10px rgba(220,230,255,0.35), 0 0 80px 36px rgba(200,215,255,0.16)",
            opacity: Math.min(1, light.moon.strength * 1.5),
          }}
        />
      )}
      {/* Clouds drifting with the wind. */}
      {cloudy &&
        CLOUDS.map(([x, y, w, d], i) => (
          <span
            key={i}
            className="sky-cloud absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: "38%",
              animationDelay: `${d}s`,
              background: `radial-gradient(closest-side, ${rgbCss(night > 0.5 ? [0.35, 0.4, 0.5] : warm > 0.3 ? [0.55, 0.42, 0.5] : [0.92, 0.94, 0.96], 0.85)}, transparent)`,
              opacity: Math.min(1, light.cloud * 1.1),
            }}
          />
        ))}
      {/* The horizon: a soft haze where the sky meets the sea. */}
      <span
        className="absolute inset-x-0 bottom-0 h-3"
        style={{ background: `linear-gradient(transparent, ${rgbCss(horizon, 0.9)})` }}
      />
    </div>
  );
}
