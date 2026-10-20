import { useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";
import { seaPixelScale } from "../lib/camera";
import { buildShore } from "../lib/seaShore";
import { NOON_LIGHT, type Rgb, type SeaLight } from "../lib/seaLight";
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  RedFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import type { IUniform } from "three";
import type { BeachPreset } from "../data/backgrounds";
import { isBusy } from "../lib/busy";

/* ============================================================================
   Live WebGL sea — the animated water plane behind the customer surface.

   Replaces the static sea of the far parallax plane (Beach.tsx renders it only
   on the desktop layered backdrop). One fullscreen triangle + fragment shader:
   the preset's exact 4-stop gradient, plus slow swell, shimmer filaments,
   drifting crest lines and a breathing foam edge along the same shoreline
   curve the SVG sand is drawn with. The time of day and the weather come from
   the shared light model (lib/seaLight.ts, AENR-815): the water grades to
   sunrise / sunset orange-pink or night navy, the reflection path runs from a
   broad noon sheen to a long column of sparkles under the low sun or the moon,
   and the horizon carries the low sun's or the moon's glow. Everything is computed
   in the SVG's 1600×900 scene space (cover-fitted like
   preserveAspectRatio="xMidYMid slice"), so each feature lands exactly where
   the static scene put it and the SVG sand/foam layers stack seamlessly on top.

   The host keeps the static SVG sea rendered *underneath*: this canvas fades
   in over it once the first frame is up, and calls `onFail` (→ permanent SVG
   fallback) if WebGL is unavailable, software-rendered, or the context is
   lost. Loaded via React.lazy, so three.js ships in its own chunk that
   reduced-motion users and non-WebGL2 engines never download. Runs on phones
   too — the DPR cap keeps the fragment load modest on small screens.
   ============================================================================ */

/* Demo escape hatch: `localStorage["slaice.liveSea"]="force"` accepts a
   software-GL context (headless test browsers, GPU-blocked machines). By
   default a major-performance-caveat context is rejected so weak hardware
   keeps the cheap static scene. */
const FORCE = (() => {
  try {
    return localStorage.getItem("slaice.liveSea") === "force";
  } catch {
    return false;
  }
})();

/* Render at most 1.5× DPR — the water is soft gradients and noise, so extra
   retina pixels cost GPU time without visible gain. */
const MAX_DPR = 1.5;

/* Frame budget: 30 fps, with a little slack so a 60 Hz display reliably lands on
   every second frame. */
const FRAME_MS = 1000 / 30 - 4;
/* The shoreline glide — the same 0.78 s the host gives the SVG sand (AENR-819). */
const SHORE_MS = 780;

/* ---- Shoreline LUT ---- `buildShore` (lib/seaShore.ts) samples the sand-top curve into a
   64×1 texture so the shader knows where the water meets the sand; uDy adds the wizard's shift. */

/* ---- Preset colours → shader-ready RGB (0–1) ----
   Parsed by hand rather than THREE.Color so no colour-management conversion
   runs: the shader outputs the same sRGB values the SVG gradient uses. */
const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const cssRgba = (c: string): [number, number, number, number] => {
  if (c.startsWith("#")) return [...hexRgb(c), 1];
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [1, 1, 1, 0.85];
  const [r = 255, g = 255, b = 255, a = 1] = m[1].split(",").map((v) => parseFloat(v));
  return [r / 255, g / 255, b / 255, a];
};

interface SeaUniforms extends Record<string, IUniform> {
  uTime: { value: number };
  uRes: { value: Vector2 };
  uView: { value: Vector4 };
  uDy: { value: number };
  uWind: { value: number };
  uGlintW: { value: number };
  uSea0: { value: Vector3 };
  uSea1: { value: Vector3 };
  uSea2: { value: Vector3 };
  uSea3: { value: Vector3 };
  uGlint: { value: number };
  uWaves: { value: number };
  uFoamCol: { value: Vector3 };
  uFoamA: { value: number };
  uShore: { value: DataTexture };
  uShoreOff: { value: number };
  uShoreScale: { value: number };
  // The light on the water (AENR-815, lib/seaLight.ts).
  uSunX: { value: number };
  uSunCol: { value: Vector3 };
  uWarm: { value: number };
  uNight: { value: number };
  uCloud: { value: number };
  uGlitCol: { value: Vector3 };
  uGlitS: { value: number };
  uGlitWd: { value: number };
  uGlitX: { value: number };
  uMoonS: { value: number };
  uMoonX: { value: number };
  uMoonCol: { value: Vector3 };
  uTintTop: { value: Vector3 };
  uTintDeep: { value: Vector3 };
  uTintAmt: { value: number };
}

function applyPreset(u: SeaUniforms, p: BeachPreset) {
  u.uSea0.value.set(...hexRgb(p.sea[0]));
  u.uSea1.value.set(...hexRgb(p.sea[1]));
  u.uSea2.value.set(...hexRgb(p.sea[2]));
  u.uSea3.value.set(...hexRgb(p.sea[3]));
  const [fr, fg, fb, fa] = cssRgba(p.foam);
  u.uFoamCol.value.set(fr, fg, fb);
  u.uFoamA.value = fa;
  u.uGlint.value = p.glint ? 1 : 0;
  u.uWaves.value = p.waves;
}

/* The low sun's glow at the horizon. By night the reflection path belongs to the
   moon, so the (fading) afterglow keeps the sunset orange of its own. */
const AFTERGLOW: Rgb = [1, 0.5, 0.3];
const moonlit = (l: SeaLight) => l.night > 0.5;
const sunGlowColor = (l: SeaLight): Rgb => (moonlit(l) ? AFTERGLOW : l.glitter.color);

const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;

uniform vec2  uRes;
uniform vec4  uView;   // the part of the scene on screen (x0, y0, x1, y1), scene units
uniform float uTime;
uniform float uDy;
uniform float uWind;   // 0 calm … 1 windy: agitates swell, shimmer, crests, surf
uniform float uGlintW; // demo-weather glint visibility (overcast kills the noon sheen)
uniform vec3  uSea0; uniform vec3 uSea1; uniform vec3 uSea2; uniform vec3 uSea3;
uniform float uGlint;
uniform float uWaves;
uniform vec3  uFoamCol;
uniform float uFoamA;
uniform sampler2D uShore;
uniform float uShoreOff;
uniform float uShoreScale;
// The light on the water (lib/seaLight.ts).
uniform float uSunX;    // 0..1 across the view: where the sun stands
uniform vec3  uSunCol;  // the low sun's glow colour
uniform float uWarm;    // golden light
uniform float uNight;   // night
uniform float uCloud;   // cloud cover
uniform vec3  uGlitCol; // reflection path: colour, strength, width (share of the view), place
uniform float uGlitS;
uniform float uGlitWd;
uniform float uGlitX;
uniform float uMoonS;
uniform float uMoonX;
uniform vec3  uMoonCol;
uniform vec3  uTintTop; // the water's grade: at the horizon, at the shore, how much
uniform vec3  uTintDeep;
uniform float uTintAmt;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int k = 0; k < 3; k++) { v += a * vnoise(p); p = p * 2.03 + 19.19; a *= 0.5; }
  return v;
}

void main() {
  // Cover-fit the 1600x900 scene box (preserveAspectRatio="xMidYMid slice"),
  // then work in scene units so features align with the SVG layers above.
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float s = max(uRes.x / 1600.0, uRes.y / 900.0);
  vec2 p = (frag - 0.5 * uRes) / s + vec2(800.0, 450.0);
  float t = uTime;

  // The preset's 4-stop vertical gradient — exact parity with the SVG sea.
  float g = clamp(p.y / 900.0, 0.0, 1.0);
  vec3 col = g < 0.35 ? mix(uSea0, uSea1, g / 0.35)
           : g < 0.70 ? mix(uSea1, uSea2, (g - 0.35) / 0.35)
           :            mix(uSea2, uSea3, (g - 0.70) / 0.30);

  // Where the water meets the sand at this x (plus the wizard's shoreline shift).
  float yShore = texture2D(uShore, vec2(clamp(p.x / 1600.0, 0.0, 1.0), 0.5)).r
               * uShoreScale + uShoreOff + uDy;
  float dShore = yShore - p.y; // >0 while still in the water

  // The guest's horizon is the top of what they see (the camera layer and the
  // parallax overscan crop the scene), and the sun / moon stand across that view
  // — they are at infinity, so they hold still on screen while the camera pans.
  float hy = uView.y;
  float vw = uView.z - uView.x;
  float d = clamp((p.y - hy) / max(yShore - hy, 60.0), 0.0, 1.0); // 0 horizon … 1 shore

  // Slow, large swell — the whole surface breathes (harder when windy; the
  // wind also speeds the water clock itself, accumulated JS-side).
  float swell = fbm(p * 0.003 + vec2(t * 0.024, t * 0.014));
  col *= 1.0 + (swell - 0.5) * (0.05 + 0.13 * uWind);

  // ---- The reflection path ----
  // One model from noon to night: by day a broad sheen washing down from the
  // sun's side of the horizon (the SVG's radial glint), and as the sun gets low
  // (narrow glitter width) a long column of sparkles from the horizon to the
  // shore, under the sun or — at night — the moon.
  float gxs = mix(uView.x, uView.z, uGlitX);
  float low = 1.0 - smoothstep(0.1, 0.4, uGlitWd); // 0 broad sheen … 1 column
  float sheen = uGlint > 0.5
    ? (1.0 - smoothstep(0.0, 780.0, distance(p, vec2(gxs, 0.0)))) * uGlintW * (1.0 - low)
    : 0.0;
  // The column widens toward the viewer (perspective) and thins out near the shore.
  float hw = max(uGlitWd * 0.5 * vw * (0.3 + 0.7 * d), 4.0);
  float lat = (p.x - gxs + (swell - 0.5) * hw * 1.4) / hw; // the swell sways it
  float core = exp(-lat * lat) * low * uGlitS * mix(1.0, 0.5, d) * step(0.0, dShore);

  // Shimmer filaments — warped-noise ridges standing in for the static wavelet
  // marks. Anisotropic coords (y squashed ~3×) stretch the cells horizontally so
  // they read as ripple glints, not blobs; calm at the horizon and off the sand.
  vec2 q = p * vec2(0.016, 0.050);
  q += 0.35 * vec2(vnoise(q * 0.9 + t * 0.05), vnoise(q * 0.9 - t * 0.04));
  float n1 = vnoise(q + vec2(t * 0.10, -t * 0.06));
  float ridge = smoothstep(0.55, 0.66, n1) * (1.0 - smoothstep(0.66, 0.80, n1));
  float n2 = vnoise(p * vec2(0.040, 0.110) - vec2(t * 0.14, t * 0.05));
  float ridge2 = smoothstep(0.62, 0.71, n2) * (1.0 - smoothstep(0.71, 0.82, n2));
  float band = smoothstep(40.0, 200.0, p.y) * smoothstep(15.0, 130.0, dShore);
  float hl = (ridge * 0.07 + ridge2 * 0.045) * (0.85 + 0.7 * uWind) * band; // highlights, for the moon below
  col += vec3(1.0) * hl * (0.7 + 0.5 * (sheen + core));

  // Whitecaps — wind shears the ridge tops into broken white flecks. Almost
  // absent on a calm day, unmistakable chop when it blows.
  float caps = smoothstep(0.78 - 0.25 * uWind, 0.95, n1) * uWind * 0.6 * band;
  col = mix(col, vec3(1.0), caps);
  hl += caps * 0.5;

  // Crest lines — the SVG's white wave bands, undulating much harder in wind
  // (and presets with fewer bands gain extra ones as it picks up).
  float amp = 0.8 + 1.1 * uWind;
  for (int i = 0; i < 4; i++) {
    if (float(i) < uWaves + 2.0 * uWind) {
      float fi = float(i);
      float yC = 180.0 + 60.0 * fi
               + 7.0 * amp * sin(p.x * 0.0060 + t * 0.22 + fi * 2.1)
               + 5.0 * amp * sin(p.x * 0.0023 - t * 0.13 + fi * 0.8);
      float a = 1.0 - smoothstep(0.0, 2.2, abs(p.y - yC));
      float op = fi < 1.0 ? 1.0 : fi < 2.0 ? 0.7 : 0.5;
      float cr = a * op * 0.35 * (0.7 + 1.3 * uWind) * (0.8 + 0.2 * sin(t * 0.5 + fi * 1.9));
      col = mix(col, vec3(1.0), cr);
      hl += cr;
    }
  }

  // Shallow water lightens toward the sand; two noisy foam edges breathe on it
  // (the surf reaches further and breaks whiter as the wind picks up).
  float sh = 1.0 - smoothstep(0.0, 150.0, max(dShore, 0.0));
  col = mix(col, mix(uSea3, vec3(1.0), 0.22), sh * 0.30);
  float e1 = yShore - 9.0 - 11.0 * amp * vnoise(vec2(p.x * 0.016, t * 0.21)) - 5.0 * amp * sin(t * 0.50 + p.x * 0.012);
  float f1 = (1.0 - smoothstep(0.0, 7.0, abs(p.y - e1))) * (0.42 + 0.28 * uWind + 0.22 * vnoise(vec2(p.x * 0.05, t * 0.33)));
  float e2 = yShore - 30.0 - 15.0 * amp * vnoise(vec2(p.x * 0.012 + 7.3, t * 0.15));
  float f2 = (1.0 - smoothstep(0.0, 5.0, abs(p.y - e2))) * (0.16 + 0.1 * uWind);
  float foam = clamp(f1 + f2, 0.0, 1.0) * uFoamA * step(0.0, dShore + 8.0);
  col = mix(col, uFoamCol, foam);
  hl += foam * 0.6;

  // ---- Time-of-day grade ----
  // The water takes the sky's colour: orange-pink at sunrise / sunset (warmest at
  // the horizon), deep navy at night. Graded by luminance, so the swell, ripples,
  // crests and surf keep their relief in any light.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 tint = mix(uTintTop, uTintDeep, smoothstep(0.1, 1.0, d));
  col = mix(col, tint * (0.42 + 0.95 * lum), clamp(uTintAmt * 1.45, 0.0, 1.0));
  // At night the crests, ripples and surf catch the moon.
  col += uMoonCol * hl * uNight * (0.12 + 0.3 * uMoonS);

  // The sheen and the column, broken up by the swell and the ripples into
  // sparkles: smaller and denser toward the horizon (perspective). Skipped where
  // there is no light to reflect — most of the screen at sunset and at night.
  if (sheen + core > 0.004) {
    float sc = mix(1.0, 0.28 + 0.72 * d, low);
    vec2 sp = vec2(p.x, p.y - hy) * mix(vec2(0.55), vec2(0.24, 0.75), low) / sc;
    float s1 = vnoise(sp + vec2(t * 0.45, -t * 0.27));
    float s2 = vnoise(sp + 37.7 - vec2(t * 0.36, t * 0.22));
    float spark = smoothstep(0.62 - 0.14 * low, 0.92 - 0.12 * low, s1 * s2);
    col += uGlitCol * (0.40 * sheen * sheen + spark * sheen * 0.55);
    // Facets tilted toward the light: the ripple field breaks the column into
    // horizontal streaks; direct light only, so cloud leaves a dull sheen.
    // Screen-blended, so a hot core whitens instead of clipping to yellow.
    float facets = smoothstep(0.30, 0.72, n1) * (0.6 + 0.8 * swell);
    float direct = 1.0 - 0.7 * uCloud;
    vec3 path = uGlitCol * core * (0.3 + 0.9 * facets * direct + 2.4 * spark * direct);
    col = 1.0 - (1.0 - min(col, 1.0)) * (1.0 - min(path, 1.0));
  }

  // ---- The horizon ----
  // The low sun's warm glow (sunrise left, sunset right) and the moon's soft one.
  float dxs = (p.x - mix(uView.x, uView.z, uSunX)) / (0.32 * vw);
  float dys = (p.y - hy) / 190.0;
  float dxm = (p.x - mix(uView.x, uView.z, uMoonX)) / (0.14 * vw);
  float dym = (p.y - hy) / 110.0;
  vec3 glow = uSunCol * exp(-(dxs * dxs + dys * dys)) * uWarm * (1.0 - 0.65 * uCloud) * 0.85
            + uMoonCol * exp(-(dxm * dxm + dym * dym)) * uMoonS * 0.3;
  col = 1.0 - (1.0 - min(col, 1.0)) * (1.0 - min(glow, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Scene-environment targets for the water (demo weather + time of day). The
 *  canvas eases toward them every frame, so condition changes glide. `clouds`
 *  and `cloudSpeed` are consumed by the scene's ambient layer (decor cloud
 *  visibility + right-to-left drift), not the shader — they ride along so the
 *  whole environment stays one object. */
export interface SeaEnv {
  wind: number;
  glint: number;
  dusk: number;
  night: number;
  clouds: number;
  cloudSpeed: number;
  /** The light on the water — sun / moon, colours, reflection path (AENR-815, lib/seaLight.ts). */
  light: SeaLight;
}
export const DEFAULT_SEA_ENV: SeaEnv = { wind: 0.22, glint: 1, dusk: 0, night: 0, clouds: 0, cloudSpeed: 0, light: NOON_LIGHT };

export default function LiveSeaCanvas({ preset, dy, env = DEFAULT_SEA_ENV, onFail }: {
  preset: BeachPreset;
  /** Shoreline shift in scene units — tweened by the wizard's enter/leave. */
  dy: number;
  /** Weather / daylight targets (lerped per frame). */
  env?: SeaEnv;
  /** No WebGL / software GL / context lost → the host reverts to the SVG sea. */
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const matRef = useRef<ShaderMaterial | null>(null);
  // Latest-value refs so the one-time mount effect and the rAF loop never go stale.
  // Shoreline glide (AENR-819): the host hands over the new `dy` once and slides the
  // SVG sand there with GSAP (0.78 s, power3.out); the rAF loop eases uDy the same
  // way, so the foam edge stays glued to the sand without a React render per frame.
  const glideRef = useRef({ from: dy, to: dy, t0: 0 });
  const envRef = useRef(env);
  envRef.current = env;
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const failRef = useRef(onFail);
  failRef.current = onFail;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        antialias: false,
        depth: false,
        stencil: false,
        alpha: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: !FORCE,
      });
    } catch {
      failRef.current();
      return;
    }
    // Inside the one-beach camera's larger layer, fewer pixels per CSS px (AENR-784).
    let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * seaPixelScale();
    renderer.setPixelRatio(dpr);

    const shore = buildShore();
    const tex = new DataTexture(shore.data, 64, 1, RedFormat, UnsignedByteType);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearFilter;
    tex.wrapS = ClampToEdgeWrapping;
    tex.needsUpdate = true;

    const L0 = envRef.current.light;
    const v3 = (c: Rgb) => new Vector3(c[0], c[1], c[2]);
    const uniforms: SeaUniforms = {
      uTime: { value: 0 },
      uRes: { value: new Vector2(1, 1) },
      uView: { value: new Vector4(0, 0, 1600, 900) },
      uDy: { value: glideRef.current.to },
      uWind: { value: envRef.current.wind },
      uGlintW: { value: envRef.current.glint },
      // The light starts at its target (no glide from noon on first paint).
      uSunX: { value: L0.sunX },
      uSunCol: { value: v3(sunGlowColor(L0)) },
      uWarm: { value: L0.warm },
      uNight: { value: L0.night },
      uCloud: { value: L0.cloud },
      uGlitCol: { value: v3(L0.glitter.color) },
      uGlitS: { value: L0.glitter.strength },
      uGlitWd: { value: L0.glitter.width },
      uGlitX: { value: L0.glitter.x },
      uMoonS: { value: L0.moon.strength },
      uMoonX: { value: L0.moon.x },
      uMoonCol: { value: v3(L0.moon.color) },
      uTintTop: { value: v3(L0.tint.top) },
      uTintDeep: { value: v3(L0.tint.deep) },
      uTintAmt: { value: L0.tint.amount },
      uSea0: { value: new Vector3() },
      uSea1: { value: new Vector3() },
      uSea2: { value: new Vector3() },
      uSea3: { value: new Vector3() },
      uGlint: { value: 0 },
      uWaves: { value: 0 },
      uFoamCol: { value: new Vector3(1, 1, 1) },
      uFoamA: { value: 0.85 },
      uShore: { value: tex },
      uShoreOff: { value: shore.off },
      uShoreScale: { value: shore.scale },
    };
    applyPreset(uniforms, presetRef.current);

    const mat = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false, depthWrite: false });
    matRef.current = mat;
    // One oversized triangle covers the viewport with no interior edge.
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mesh = new Mesh(geo, mat);
    mesh.frustumCulled = false;
    const scene = new Scene();
    scene.add(mesh);
    const camera = new OrthographicCamera(); // pass-through vertex shader; never used

    const canvas = renderer.domElement;
    canvas.className = "absolute inset-0 w-full h-full";
    // Fade in over the static SVG sea once the first frame has rendered.
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 900ms ease";
    host.appendChild(canvas);

    // The part of the scene the guest actually sees (scene units): the camera layer
    // and the parallax overscan crop it, and the shader puts the horizon and the
    // sun / moon in that view. Re-measured a few times a second, eased in between.
    const view = new Vector4(0, 0, 1600, 900);
    let viewSnap = true;
    const measure = () => {
      const r = host.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const W = uniforms.uRes.value.x;
      const H = uniforms.uRes.value.y;
      const s = Math.max(W / 1600, H / 900);
      const sx = (x: number) => Math.min(1600, Math.max(0, ((x - r.left) * (W / r.width) - 0.5 * W) / s + 800));
      const sy = (y: number) => Math.min(900, Math.max(0, ((y - r.top) * (H / r.height) - 0.5 * H) / s + 450));
      view.set(sx(0), sy(0), sx(window.innerWidth), sy(window.innerHeight));
      if (view.z - view.x < 1) view.set(0, 0, 1600, 900);
      if (viewSnap) uniforms.uView.value.copy(view);
      viewSnap = false;
    };
    const resize = () => {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * dpr, h * dpr);
      measure();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let shown = false;
    let last = -1;
    let frame = 0;
    let tAcc = 0; // the water's own clock — wind speeds it up
    // Taps first (AENR-762): for a moment after any pointer press the sea skips
    // its frames, so the tap's own update paints without waiting behind the
    // shader. The water moves slowly enough that the pause doesn't show.
    let yieldUntil = 0;
    const onPress = () => { yieldUntil = performance.now() + 350; };
    window.addEventListener("pointerdown", onPress, { capture: true, passive: true });
    // Weak GPU: when frames keep running long (under ~22 fps against the 30 fps
    // cap), step the resolution down (to 0.75× at most) instead of slowing the page.
    let slowFrames = 0;
    // The reflection path belongs to the sun by day and the moon by night: on the
    // hand-over it fades out, jumps to the other light and fades back in.
    let glitMoon = moonlit(envRef.current.light);
    const tmp = new Vector3();
    const easeV = (o: { value: Vector3 }, c: Rgb, k: number) => o.value.lerp(tmp.set(c[0], c[1], c[2]), k);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // While the shoreline glides, every display frame renders (no tap yield, no
      // cap), so the foam edge keeps pace with the GSAP-driven sand.
      const g = glideRef.current;
      const gp = Math.min(1, Math.max(0, (now - g.t0) / SHORE_MS));
      const gliding = gp < 1;
      // A page change (AENR-836) holds the water too, unless the sand is sliding.
      if (!gliding && (now < yieldUntil || isBusy(now))) { last = -1; return; }
      // 30 fps cap: the water is slow, so every other display frame is free GPU
      // time for the page (scroll, taps, the camera) on weak machines.
      if (!gliding && last >= 0 && now - last < FRAME_MS) return;
      const dt = last < 0 ? 0.033 : Math.min(0.1, (now - last) / 1000);
      last = now;
      slowFrames = dt > 0.045 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 30 && dpr > 0.76 * seaPixelScale()) {
        slowFrames = 0;
        dpr = Math.max(0.75 * seaPixelScale(), dpr - 0.25);
        renderer.setPixelRatio(dpr);
        resize();
      }
      if (++frame % 6 === 0) measure();
      const u = uniforms;
      u.uView.value.lerp(view, Math.min(1, dt * 6));
      // Ease every env uniform toward its target, then advance the water
      // clock at a wind-scaled rate. Accumulating (rather than scaling t)
      // keeps the phase continuous while the wind changes.
      const e = envRef.current;
      const L = e.light;
      const k = Math.min(1, dt * 2.2);
      const ease = (o: { value: number }, v: number) => { o.value += (v - o.value) * k; };
      ease(u.uWind, e.wind);
      ease(u.uGlintW, e.glint);
      ease(u.uSunX, L.sunX);
      ease(u.uWarm, L.warm);
      ease(u.uNight, L.night);
      ease(u.uCloud, L.cloud);
      ease(u.uMoonS, L.moon.strength);
      ease(u.uMoonX, L.moon.x);
      ease(u.uTintAmt, L.tint.amount);
      easeV(u.uSunCol, sunGlowColor(L), k);
      easeV(u.uMoonCol, L.moon.color, k);
      easeV(u.uTintTop, L.tint.top, k);
      easeV(u.uTintDeep, L.tint.deep, k);
      if (moonlit(L) !== glitMoon) {
        u.uGlitS.value -= u.uGlitS.value * Math.min(1, k * 2);
        if (u.uGlitS.value < 0.02) {
          glitMoon = moonlit(L);
          u.uGlitX.value = L.glitter.x;
          u.uGlitWd.value = L.glitter.width;
          u.uGlitCol.value.set(...L.glitter.color);
        }
      } else {
        ease(u.uGlitS, L.glitter.strength);
        ease(u.uGlitX, L.glitter.x);
        ease(u.uGlitWd, L.glitter.width);
        easeV(u.uGlitCol, L.glitter.color, k);
      }
      tAcc += dt * (0.85 + 0.7 * u.uWind.value);
      u.uTime.value = tAcc;
      u.uDy.value = g.from + (g.to - g.from) * (1 - (1 - gp) ** 3); // power3.out
      renderer.render(scene, camera);
      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
    };
    raf = requestAnimationFrame(tick);
    // Stop burning GPU while the tab is hidden.
    const onVis = () => {
      cancelAnimationFrame(raf);
      last = -1;
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);
    const onLost = (e: Event) => {
      e.preventDefault();
      failRef.current();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", onPress, { capture: true });
      canvas.removeEventListener("webglcontextlost", onLost);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      tex.dispose();
      renderer.dispose();
      canvas.remove();
      matRef.current = null;
    };
  }, []);

  // A new shoreline target starts a glide from wherever the water is now (instant
  // under reduced motion, or before the first frame).
  useLayoutEffect(() => {
    const g = glideRef.current;
    if (dy === g.to) return;
    const cur = matRef.current ? (matRef.current.uniforms as SeaUniforms).uDy.value : dy;
    glideRef.current = prefersReducedMotion()
      ? { from: dy, to: dy, t0: 0 }
      : { from: cur, to: dy, t0: performance.now() };
  }, [dy]);

  // Tenant background changes (BackgroundPicker) retune the running shader.
  useEffect(() => {
    if (matRef.current) applyPreset(matRef.current.uniforms as SeaUniforms, preset);
  }, [preset]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />;
}
