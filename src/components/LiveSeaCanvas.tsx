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

  // Slow, large swell — the whole surface breathes.
  float swell = fbm(p * 0.003 + vec2(t * 0.024, t * 0.014));
  col *= 1.0 + (swell - 0.5) * 0.07;

  // Sun-glint sheen (the SVG's radial wash from top-centre), plus twinkle.
  float glint = 0.0;
  if (uGlint > 0.5) {
    glint = 1.0 - smoothstep(0.0, 780.0, distance(p, vec2(800.0, 0.0)));
    col += vec3(1.0) * 0.40 * glint * glint;
    float s1 = vnoise(p * 0.55 + vec2(t * 0.45, -t * 0.27));
    float s2 = vnoise(p * 0.55 + 37.7 - vec2(t * 0.36, t * 0.22));
    col += vec3(1.0) * smoothstep(0.62, 0.92, s1 * s2) * glint * 0.55;
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
  col += vec3(1.0) * (ridge * 0.07 + ridge2 * 0.045) * band * (0.7 + 0.5 * glint);

  // Crest lines — the SVG's white wave bands, now undulating and drifting.
  for (int i = 0; i < 4; i++) {
    if (float(i) < uWaves) {
      float fi = float(i);
      float yC = 180.0 + 60.0 * fi
               + 7.0 * sin(p.x * 0.0060 + t * 0.22 + fi * 2.1)
               + 5.0 * sin(p.x * 0.0023 - t * 0.13 + fi * 0.8);
      float a = 1.0 - smoothstep(0.0, 2.2, abs(p.y - yC));
      float op = fi < 1.0 ? 1.0 : fi < 2.0 ? 0.7 : 0.5;
      col = mix(col, vec3(1.0), a * op * 0.35 * (0.8 + 0.2 * sin(t * 0.5 + fi * 1.9)));
    }
  }

  // Shallow water lightens toward the sand; two noisy foam edges breathe on it.
  float sh = 1.0 - smoothstep(0.0, 150.0, max(dShore, 0.0));
  col = mix(col, mix(uSea3, vec3(1.0), 0.22), sh * 0.30);
  float e1 = yShore - 9.0 - 11.0 * vnoise(vec2(p.x * 0.016, t * 0.21)) - 5.0 * sin(t * 0.50 + p.x * 0.012);
  float f1 = (1.0 - smoothstep(0.0, 7.0, abs(p.y - e1))) * (0.46 + 0.22 * vnoise(vec2(p.x * 0.05, t * 0.33)));
  float e2 = yShore - 30.0 - 15.0 * vnoise(vec2(p.x * 0.012 + 7.3, t * 0.15));
  float f2 = (1.0 - smoothstep(0.0, 5.0, abs(p.y - e2))) * 0.16;
  col = mix(col, uFoamCol, clamp(f1 + f2, 0.0, 1.0) * uFoamA * step(0.0, dShore + 8.0));

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function LiveSeaCanvas({ preset, dy, onFail }: {
  preset: BeachPreset;
  /** Shoreline shift in scene units — tweened by the wizard's enter/leave. */
  dy: number;
  /** No WebGL / software GL / context lost → the host reverts to the SVG sea. */
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const matRef = useRef<ShaderMaterial | null>(null);
  // Latest-value refs so the one-time mount effect and the rAF loop never go stale.
  const dyRef = useRef(dy);
  dyRef.current = dy;
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
    const t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      uniforms.uTime.value = (now - t0) / 1000;
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
