import { useEffect, useRef } from "react";
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
  WebGLRenderer,
} from "three";
import type { IUniform } from "three";
import type { BeachPreset } from "../data/backgrounds";

/* ============================================================================
   Live WebGL sea — the animated water plane behind the customer surface.

   Replaces the static sea of the far parallax plane (Beach.tsx renders it only
   on the desktop layered backdrop). One fullscreen triangle + fragment shader:
   the preset's exact 4-stop gradient, plus slow swell, shimmer filaments, a
   twinkling sun-glint, drifting crest lines and a breathing foam edge along
   the same shoreline curve the SVG sand is drawn with. Everything is computed
   in the SVG's 1600×900 scene space (cover-fitted like
   preserveAspectRatio="xMidYMid slice"), so each feature lands exactly where
   the static scene put it and the SVG sand/foam layers stack seamlessly on top.

   The host keeps the static SVG sea rendered *underneath*: this canvas fades
   in over it once the first frame is up, and calls `onFail` (→ permanent SVG
   fallback) if WebGL is unavailable, software-rendered, or the context is
   lost. Loaded via React.lazy, so three.js ships in its own chunk that
   phones / reduced-motion users never download.
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

/* ---- Shoreline LUT ----
   The sand-top bezier from Beach.tsx (`sandD`), sampled into a 64×1 texture so
   the shader knows where the water meets the sand at any x. Encoded 8-bit
   against [min,max] (≈1px precision after LINEAR filtering); uDy adds the
   wizard's shoreline shift at sample time. */
type Pt = [number, number];
type Seg = [Pt, Pt, Pt, Pt];
const SAND_SEGS: Seg[] = [
  [[-20, 500], [220, 460], [440, 555], [740, 510]],
  // The path's S-command: first control = the previous C reflected about its end.
  [[740, 510], [1040, 465], [1200, 450], [1620, 510]],
];
const bezier = ([p0, p1, p2, p3]: Seg, t: number): Pt => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w[0] * p0[0] + w[1] * p1[0] + w[2] * p2[0] + w[3] * p3[0],
    w[0] * p0[1] + w[1] * p1[1] + w[2] * p2[1] + w[3] * p3[1],
  ];
};
function buildShore() {
  const pts: Pt[] = [];
  SAND_SEGS.forEach((seg) => {
    for (let i = 0; i <= 48; i++) pts.push(bezier(seg, i / 48));
  });
  const N = 64;
  const ys: number[] = [];
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 1600;
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1][0] < x) j++;
    const [x0, y0] = pts[j];
    const [x1, y1] = pts[j + 1];
    ys.push(x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  }
  const off = Math.min(...ys);
  const scale = Math.max(1, Math.max(...ys) - off);
  const data = new Uint8Array(N);
  ys.forEach((y, i) => { data[i] = Math.round(((y - off) / scale) * 255); });
  return { data, off, scale };
}

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

const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uDy;
uniform float uWind;   // 0 calm … 1 windy: agitates swell, shimmer, crests, surf
uniform float uGlintW; // demo-weather glint visibility (overcast kills the sheen)
uniform float uDusk;   // golden-hour factor: warms the water + the sun trail
uniform float uNight;  // dusk-to-night factor: deepens and cools the water
uniform vec3  uSea0; uniform vec3 uSea1; uniform vec3 uSea2; uniform vec3 uSea3;
uniform float uGlint;
uniform float uWaves;
uniform vec3  uFoamCol;
uniform float uFoamA;
uniform sampler2D uShore;
uniform float uShoreOff;
uniform float uShoreScale;

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

  // Slow, large swell — the whole surface breathes (harder when windy; the
  // wind also speeds the water clock itself, accumulated JS-side).
  float swell = fbm(p * 0.003 + vec2(t * 0.024, t * 0.014));
  col *= 1.0 + (swell - 0.5) * (0.05 + 0.13 * uWind);

  // Sun-glint sheen (the SVG's radial wash from top-centre), plus twinkle.
  // uGlintW fades the whole sheen out as the demo weather clouds over; at
  // golden hour the trail warms to amber and drifts west with the low sun.
  float glint = 0.0;
  vec3 glintCol = mix(vec3(1.0), vec3(1.0, 0.72, 0.42), uDusk);
  if (uGlint > 0.5) {
    float gx = mix(800.0, 1080.0, uDusk);
    glint = (1.0 - smoothstep(0.0, 780.0, distance(p, vec2(gx, 0.0)))) * uGlintW;
    col += glintCol * 0.40 * (1.0 + 0.35 * uDusk) * glint * glint;
    float s1 = vnoise(p * 0.55 + vec2(t * 0.45, -t * 0.27));
    float s2 = vnoise(p * 0.55 + 37.7 - vec2(t * 0.36, t * 0.22));
    col += glintCol * smoothstep(0.62, 0.92, s1 * s2) * glint * 0.55;
  }

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
  col += vec3(1.0) * (ridge * 0.07 + ridge2 * 0.045) * (0.85 + 0.7 * uWind) * band * (0.7 + 0.5 * glint);

  // Whitecaps — wind shears the ridge tops into broken white flecks. Almost
  // absent on a calm day, unmistakable chop when it blows.
  float caps = smoothstep(0.78 - 0.25 * uWind, 0.95, n1) * uWind;
  col = mix(col, vec3(1.0), caps * 0.6 * band);

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
      col = mix(col, vec3(1.0), a * op * 0.35 * (0.7 + 1.3 * uWind) * (0.8 + 0.2 * sin(t * 0.5 + fi * 1.9)));
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
  col = mix(col, uFoamCol, clamp(f1 + f2, 0.0, 1.0) * uFoamA * step(0.0, dShore + 8.0));

  // Time-of-day grade on the water itself (the page-wide overlays handle the
  // rest of the scene): golden hour warms the surface, nightfall deepens it.
  col = mix(col, col * vec3(1.10, 0.85, 0.66) + vec3(0.04, 0.0, 0.02), uDusk * 0.5);
  col = mix(col, col * vec3(0.45, 0.52, 0.72), uNight * 0.55);

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Scene-environment targets for the water (demo weather + time of day). The
 *  canvas eases toward them every frame, so condition changes glide. */
export interface SeaEnv {
  wind: number;
  glint: number;
  dusk: number;
  night: number;
}
export const DEFAULT_SEA_ENV: SeaEnv = { wind: 0.22, glint: 1, dusk: 0, night: 0 };

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
  const dyRef = useRef(dy);
  dyRef.current = dy;
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
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    renderer.setPixelRatio(dpr);

    const shore = buildShore();
    const tex = new DataTexture(shore.data, 64, 1, RedFormat, UnsignedByteType);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearFilter;
    tex.wrapS = ClampToEdgeWrapping;
    tex.needsUpdate = true;

    const uniforms: SeaUniforms = {
      uTime: { value: 0 },
      uRes: { value: new Vector2(1, 1) },
      uDy: { value: dyRef.current },
      uWind: { value: envRef.current.wind },
      uGlintW: { value: envRef.current.glint },
      uDusk: { value: envRef.current.dusk },
      uNight: { value: envRef.current.night },
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

    const resize = () => {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * dpr, h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let shown = false;
    let last = -1;
    let tAcc = 0; // the water's own clock — wind speeds it up
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last < 0 ? 0.016 : Math.min(0.1, (now - last) / 1000);
      last = now;
      // Ease every env uniform toward its target, then advance the water
      // clock at a wind-scaled rate. Accumulating (rather than scaling t)
      // keeps the phase continuous while the wind changes.
      const e = envRef.current;
      const k = Math.min(1, dt * 2.2);
      uniforms.uWind.value += (e.wind - uniforms.uWind.value) * k;
      uniforms.uGlintW.value += (e.glint - uniforms.uGlintW.value) * k;
      uniforms.uDusk.value += (e.dusk - uniforms.uDusk.value) * k;
      uniforms.uNight.value += (e.night - uniforms.uNight.value) * k;
      tAcc += dt * (0.85 + 0.7 * uniforms.uWind.value);
      uniforms.uTime.value = tAcc;
      uniforms.uDy.value = dyRef.current;
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

  // Tenant background changes (BackgroundPicker) retune the running shader.
  useEffect(() => {
    if (matRef.current) applyPreset(matRef.current.uniforms as SeaUniforms, preset);
  }, [preset]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />;
}
