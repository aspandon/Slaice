import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";

/* ============================================================================
   Rain on the glass (AENR-826) — the guest looks at the site through a window
   pane while it rains: drops land on the glass, sit as beads, grow and merge,
   and now and then one slides down, leaving a short wet trail of tiny beads,
   and runs off the bottom.

   Why lighting-only lenses: WebGL can't read the DOM behind it, and the classic
   "rain on a window" effects (raindrop-fx, Codrops' RainEffect) refract a known
   background image. Our glass sits over live text and cards, so a refracted
   fake backdrop would paint beach colours over a white card. Instead every drop
   is lit, not refracted — what makes a real drop read as water is its light,
   not the image inside it:
   - a dark rim (light bent away at the edge of the lens), heavier on top,
   - the inverted sky glowing in its lower half (a lens flips the bright sky
     to the bottom of the drop),
   - a sharp specular glint and a broad sheen from the upper left,
   - a faint cool body, so the drop's interior keeps the text under it legible.
   Per-drop CSS backdrop-filter lenses were considered and rejected: each is its
   own render surface re-filtered every frame they move — an order of magnitude
   dearer than one canvas, and the drops would still need this lighting on top.

   Two passes, raw WebGL2 (no three.js), both instanced quads — one per drop:
   the first splats each drop's smooth kernel into a low-resolution "water
   field" (metaballs, so drops that touch melt into one outline, and a runner's
   head and neck into a teardrop); the second reads the field's slope as the
   lens normal and lights it, on the drops' own quads only (a few % of the
   screen), MAX-blended so overlapping quads stay exact. The simulation
   (landing, merging by volume, stick-slip sliding, trails of beads and a wet
   film, mist wiped off by runners) is plain JS on a bounded set of drops
   (≈ 0.1 ms a frame).

   Performance: ≤ 30 fps while a drop runs (24 on phones), 12 fps while the
   beads only land and sit; 0.75× / 0.6× DPR under a pixel budget; no frames
   while the tab is hidden or for 350 ms after a press or key; hard caps on
   beads, mist, trail beads and film points; shaders link in the background
   (KHR_parallel_shader_compile); if the page's frame interval keeps running
   slow it sheds drops, then resolution, then freezes on its last frame.
   Reduced motion: one still frame of beads, nothing slides. A software GL
   context is refused (as the live sea does) unless `localStorage["slaice.liveSea"]`
   or `["slaice.rainGlass"]` is "force" — `onFail` then lets the host fall back.
   ============================================================================ */

const FORCE = (() => {
  try {
    return (
      localStorage.getItem("slaice.liveSea") === "force" ||
      localStorage.getItem("slaice.rainGlass") === "force"
    );
  } catch {
    return false;
  }
})();

export type RainTier = "desktop" | "mobile";

/* ---- Per tier: pacing, resolution, how much water the glass holds ----
   Densities are per CSS megapixel, capped absolutely. */
const TIER = {
  desktop: {
    fps: 30,
    ratio: 0.75,
    maxRatio: 1.25,
    budget: 1_500_000,
    drops: 220,
    dropDensity: 170,
    mist: 320,
    mistDensity: 250,
    film: 360,
    trail: 110,
    rate: 16, // landings per second per megapixel
    size: 1,
  },
  mobile: {
    fps: 24,
    ratio: 0.6,
    maxRatio: 1.1,
    budget: 480_000,
    drops: 70,
    dropDensity: 210,
    mist: 110,
    mistDensity: 330,
    film: 140,
    trail: 40,
    rate: 14,
    size: 0.85,
  },
} as const;

const YIELD_MS = 350;
const CALM_FPS = 12; // the frame rate while nothing slides
const SLOW_MS = 24; // a page frame interval averaging above this (and well above the display's) is slow
const FADE_MS = 1000;
const STRIDE = 8; // floats per instance: x, y, half-w, half-h, film?, weight, size, 0
const SLIDE_R = 6; // CSS px: beads bigger than this start to slide now and then
const STOP_R = 3.1; // a runner smaller than this sticks again
const KERNEL = 1 / Math.SQRT1_2; // kernel radius per drop radius: the field's threshold lands on r
const FILM_S = 2; // how long a runner's wet streak takes to dry

/* Kinds of water on the glass. */
const BEAD = 0;
const MIST = 1;
const TRAIL = 2;

interface Drop {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  born: number;
  kind: number;
  slide: boolean;
  stall: number;
  travel: number;
  gap: number;
  film: number;
  dead: boolean;
}

/* ---------- Shaders ---------- */
const FIELD_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aBox;   // centre x, y, half width, half height (CSS px)
layout(location = 2) in vec4 aInfo;  // film?, weight, radius (CSS px), -
uniform vec2 uView;
out vec2 vQ;
out vec3 vInfo;
void main() {
  vec2 p = aBox.xy + aCorner * aBox.zw;
  vQ = aCorner;
  vInfo = aInfo.xyz;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`;

/* R = drop kernel (metaball field), G = wet film, B = kernel × radius / 16. */
const FIELD_FS = /* glsl */ `#version 300 es
precision mediump float;
in vec2 vQ;
in vec3 vInfo;
out vec4 o;
void main() {
  float q2 = dot(vQ, vQ);
  if (q2 >= 1.0) discard;
  float k = 1.0 - q2;
  k *= k;
  if (vInfo.x > 0.5) o = vec4(0.0, k * vInfo.y, 0.0, 0.0);
  else o = vec4(k * vInfo.y, 0.0, k * vInfo.y * vInfo.z / 16.0, 0.0);
}`;

const LIGHT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uTexel;     // one field texel in uv (the field matches the canvas)
uniform float uCss;      // CSS px per field texel
uniform float uNight;    // 0 day … 1 night
out vec4 o;

const float T = 0.25;    // the drop's outline in the field
float height(float f) { return sqrt(max(f - T, 0.0) / (1.0 - T)); }
// Premultiplied "over": a layer of colour c at opacity a on top of acc.
vec4 over(vec4 acc, vec3 c, float a) { return vec4(c * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a)); }

void main() {
  vec2 vUv = gl_FragCoord.xy * uTexel;
  vec4 F = texture(uField, vUv);
  float f = F.r;
  if (f < T * 0.55 && F.g < 0.02) { o = vec4(0.0); return; }

  vec4 acc = vec4(0.0);
  // The wet film a runner leaves: a faint streak, slightly darker, catching a little light.
  float film = smoothstep(0.04, 0.55, F.g) * (1.0 - smoothstep(T * 0.6, T, f));
  acc = over(acc, vec3(0.1, 0.16, 0.22), film * 0.06);

  if (f > T * 0.55) {
    float aa = max(fwidth(f), 1e-3) * 0.75;
    float m = smoothstep(T - aa, T + aa, f);
    float size = clamp(F.b / max(F.r, 1e-3) * 16.0, 0.6, 16.0);
    float hx = height(texture(uField, vUv + vec2(uTexel.x, 0.0)).r) - height(texture(uField, vUv - vec2(uTexel.x, 0.0)).r);
    float hy = height(texture(uField, vUv + vec2(0.0, uTexel.y)).r) - height(texture(uField, vUv - vec2(0.0, uTexel.y)).r);
    // Slope in drop radii (shape-invariant: a small bead is as round as a big one).
    vec2 g = vec2(hx, hy) / (2.0 * uCss) * size * 2.3;
    vec3 n = normalize(vec3(-g, 1.0));
    float edge = 1.0 - n.z;                 // 0 at the centre, → 1 at the rim
    float lower = smoothstep(0.02, 0.75, -n.y);
    float upper = smoothstep(-0.1, 0.7, n.y);

    vec3 sky = mix(vec3(0.88, 0.94, 1.0), vec3(0.5, 0.58, 0.72), uNight);
    vec3 shade = mix(vec3(0.03, 0.07, 0.12), vec3(0.01, 0.02, 0.05), uNight);
    vec3 hl = mix(vec3(1.0), vec3(1.0, 0.88, 0.7), uNight * 0.7);
    float light = 1.0 - 0.45 * uNight;

    vec4 d = vec4(0.0);
    // The lens flips the world: the dark ground shows in its upper half, the bright
    // sky in its lower half — a soft vertical grade through the body.
    float v = clamp(-n.y * 2.4, -1.0, 1.0);
    d = over(d, sky, 0.1 + 0.05 * edge);
    d = over(d, shade, max(-v, 0.0) * 0.16);
    d = over(d, sky, max(v, 0.0) * 0.32 * light);
    // The sky's glow gathered in a bright crescent just inside the lower rim.
    float glow = lower * smoothstep(0.08, 0.35, edge) * (1.0 - smoothstep(0.55, 0.85, edge));
    d = over(d, sky, glow * 0.65 * light);
    // The dark refracting rim, heavier on top where the lens shows the dark ground.
    float rim = smoothstep(0.38, 0.8, edge) * (0.5 + 0.5 * upper);
    d = over(d, shade, rim * 0.72);
    // A darker band just under the top highlight: the depth of the lens.
    d = over(d, shade, upper * smoothstep(0.15, 0.5, edge) * (1.0 - rim) * 0.16);
    // Highlights from a light up and to the left: a broad sheen and a sharp glint.
    vec3 L = normalize(vec3(-0.38, 0.62, 0.72));
    float ndh = max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0);
    float sheen = pow(ndh, 18.0) * 0.45;
    float glint = smoothstep(0.935, 0.985, ndh);
    d = over(d, hl, clamp((sheen + glint) * light, 0.0, 1.0));

    acc = d * m + acc * (1.0 - d.a * m);
  }
  o = acc;
}`;

/** Starts compiling and linking a program without waiting for it (see `linked`). */
function startProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  return { prog, vs, fs };
}
type Program = NonNullable<ReturnType<typeof startProgram>>;
/** Whether the program linked (blocks until it has, so poll COMPLETION_STATUS_KHR first). */
function linked(gl: WebGL2RenderingContext, p: Program) {
  const ok = !!gl.getProgramParameter(p.prog, gl.LINK_STATUS);
  if (!ok && import.meta.env.DEV)
    console.warn("[RainGlass]", gl.getShaderInfoLog(p.fs), gl.getProgramInfoLog(p.prog));
  gl.deleteShader(p.vs);
  gl.deleteShader(p.fs);
  return ok;
}

const rand = Math.random;
const vol = (r: number) => r * r * r;
const fromVol = (v: number) => Math.cbrt(Math.max(0, v));

export default function RainGlass({
  visible,
  night,
  tier,
  onFail,
}: {
  /** Fades in (true) or out (false) over ~1 s; the host unmounts after the fade-out. */
  visible: boolean;
  /** 0 day … 1 night — the drops' highlights dim and warm at night. */
  night: number;
  tier: RainTier;
  /** No WebGL2 / software GL / shader failure / context lost. */
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const props = useRef({ visible, night, tier });
  props.current = { visible, night, tier };
  const failRef = useRef(onFail);
  failRef.current = onFail;
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 w-full h-full";
    host.appendChild(canvas);
    let disposed = false;
    const fail = () => {
      if (!disposed) failRef.current();
    };
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: !FORCE,
    });
    // Compiled in the background where the driver allows (polled from the frame loop).
    const parallel = gl?.getExtension("KHR_parallel_shader_compile");
    const fieldP = gl && startProgram(gl, FIELD_VS, FIELD_FS);
    const lightP = gl && startProgram(gl, FIELD_VS, LIGHT_FS);
    if (!gl || !fieldP || !lightP) {
      canvas.remove();
      fail();
      return;
    }
    const fieldProg = fieldP.prog;
    const lightProg = lightP.prog;

    /* ---- Geometry: a unit quad, instanced once per drop ---- */
    const fieldVao = gl.createVertexArray();
    gl.bindVertexArray(fieldVao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const MAX_INST =
      TIER.desktop.drops * 2 + TIER.desktop.mist + TIER.desktop.trail + TIER.desktop.film; // a runner is two
    const inst = new Float32Array(MAX_INST * STRIDE);
    const instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRIDE * 4, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, STRIDE * 4, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    /* ---- The water field: half-float where it can be rendered to, else 8-bit ---- */
    const half = !!gl.getExtension("EXT_color_buffer_float");
    const fieldTex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    // EXT_color_buffer_float guarantees RGBA16F is renderable, so no (blocking) completeness check.
    const allocField = (w: number, h: number) => {
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    let ready = false;
    let uView: WebGLUniformLocation | null = null;
    let uViewL: WebGLUniformLocation | null = null;
    let uField: WebGLUniformLocation | null = null;
    let uTexel: WebGLUniformLocation | null = null;
    let uCss: WebGLUniformLocation | null = null;
    let uNight: WebGLUniformLocation | null = null;
    /** Once both programs are done: false while compiling, throws nothing, fails on a link error. */
    const finishLink = (): boolean | "fail" => {
      if (
        parallel &&
        (!gl.getProgramParameter(fieldProg, parallel.COMPLETION_STATUS_KHR) ||
          !gl.getProgramParameter(lightProg, parallel.COMPLETION_STATUS_KHR))
      )
        return false;
      if (!linked(gl, fieldP) || !linked(gl, lightP)) return "fail";
      uView = gl.getUniformLocation(fieldProg, "uView");
      uViewL = gl.getUniformLocation(lightProg, "uView");
      uField = gl.getUniformLocation(lightProg, "uField");
      uTexel = gl.getUniformLocation(lightProg, "uTexel");
      uCss = gl.getUniformLocation(lightProg, "uCss");
      uNight = gl.getUniformLocation(lightProg, "uNight");
      return true;
    };

    /* ---- State ---- */
    const reduced = prefersReducedMotion();
    let curTier: RainTier = props.current.tier;
    let W = 1;
    let H = 1;
    let quality = 1;
    let shed = 1; // share of the drop / mist caps kept (self-tuning sheds water first)
    let frozen = false;
    let sizeDirty = true;
    let raf = 0;
    let lastTick = -1;
    let lastDraw = -1e9;
    let yieldUntil = 0;
    let avgDt = 0;
    let baseDt = Infinity;
    let slowTicks = 0;
    let level = 0;
    let cpuMs = 0;
    let auditAt = 0;
    let running = false; // any drop sliding (set by step)
    let shown = false;
    let simT = 0;
    let spawnAcc = 0;
    let mistAcc = 0;
    let night = props.current.night;
    const drops: Drop[] = [];
    const film = new Float32Array(TIER.desktop.film * 4); // ring of x, y, r, born
    let filmAt = 0;
    let filmN = 0;

    const caps = () => {
      const t = TIER[curTier];
      const mpx = (W * H) / 1e6;
      return {
        drops: Math.round(Math.min(t.drops, t.dropDensity * mpx) * shed),
        mist: Math.round(Math.min(t.mist, t.mistDensity * mpx) * shed),
      };
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      const t = TIER[curTier];
      const dpr = Math.min((window.devicePixelRatio || 1) * t.ratio, t.maxRatio) * quality;
      let w = Math.max(1, Math.round(W * dpr));
      let h = Math.max(1, Math.round(H * dpr));
      const over = (w * h) / t.budget;
      if (over > 1) {
        w = Math.max(1, Math.round(w / Math.sqrt(over)));
        h = Math.max(1, Math.round(h / Math.sqrt(over)));
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        allocField(w, h);
      }
      sizeDirty = false;
    };

    /* ---------- The simulation (CSS px, seconds) ---------- */
    const remove = (i: number) => {
      const last = drops.pop();
      if (last && i < drops.length) drops[i] = last;
    };
    const addFilm = (x: number, y: number, r: number) => {
      const cap = TIER[curTier].film;
      const o = filmAt * 4;
      film[o] = x;
      film[o + 1] = y;
      film[o + 2] = r;
      film[o + 3] = simT;
      filmAt = (filmAt + 1) % cap;
      filmN = Math.min(cap, filmN + 1);
    };
    const land = (kind: number, r: number) => {
      const d: Drop = {
        x: rand() * W,
        y: rand() * H,
        r,
        vx: 0,
        vy: 0,
        born: simT,
        kind,
        slide: false,
        stall: 0,
        travel: 0,
        gap: 0,
        film: 0,
        dead: false,
      };
      if (kind === BEAD) {
        // A drop landing on another merges into it (volume adds, the centre moves to their mass centre).
        for (let j = drops.length - 1; j >= 0; j--) {
          const o = drops[j];
          const dx = o.x - d.x;
          const dy = o.y - d.y;
          const reach = d.r + o.r;
          if (dx * dx + dy * dy > reach * reach) continue;
          if (o.kind === MIST) {
            remove(j);
            continue;
          }
          const v1 = vol(d.r);
          const v2 = vol(o.r);
          d.x = (d.x * v1 + o.x * v2) / (v1 + v2);
          d.y = (d.y * v1 + o.y * v2) / (v1 + v2);
          d.r = fromVol(v1 + v2);
          d.born = Math.min(d.born, o.born + 0.2);
          remove(j);
        }
      }
      drops.push(d);
    };

    const step = (dt: number, still: boolean) => {
      simT += dt;
      const t = TIER[curTier];
      const cap = caps();
      let beads = 0;
      let mist = 0;
      let trails = 0;
      for (const d of drops) {
        if (d.kind === MIST) mist++;
        else if (d.kind === TRAIL) trails++;
        else beads++;
      }
      const trailCap = Math.round(t.trail * shed);
      // Landings: mostly small drops, now and then a big one.
      spawnAcc += dt * t.rate * ((W * H) / 1e6);
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        if (beads < cap.drops) {
          land(BEAD, t.size * (2.1 + 6.4 * Math.pow(rand(), 2.6)));
          beads++;
        }
      }
      // Mist: the fine spray that settles everywhere and is wiped off by runners.
      mistAcc += dt * 60 * ((W * H) / 1e6);
      while (mistAcc >= 1) {
        mistAcc -= 1;
        if (mist < cap.mist) {
          land(MIST, 0.9 + 1.1 * rand());
          mist++;
        }
      }

      // Removals inside the loop only mark drops dead; they are compacted after it.
      const count = drops.length;
      for (let i = 0; i < count; i++) {
        const d = drops[i];
        if (d.dead) continue;
        if (d.kind === TRAIL) {
          // Trail beads dry up over ~8–15 s.
          d.r -= dt * 0.11;
          if (d.r < 0.7) {
            d.dead = true;
            continue;
          }
        }
        if (!d.slide) {
          // Bigger beads give way sooner.
          if (!still && d.kind !== MIST && d.r > SLIDE_R && rand() < dt * (d.r - SLIDE_R) * 0.12) {
            d.slide = true;
            d.vy = 0;
            d.kind = BEAD;
            d.travel = 0;
            d.gap = d.r * (2 + rand() * 3);
          }
          continue;
        }
        // A runner: stick-slip — it lurches, pauses, wanders a little sideways.
        if (d.stall > 0) {
          d.stall -= dt;
          continue;
        }
        const pull = 340 * Math.min(1.25, Math.max(0.18, (d.r - 2.6) / 7));
        d.vy = Math.min(d.vy + pull * dt, 55 + d.r * 26);
        if (rand() < dt * 1.1 * Math.max(0.15, 1 - d.r / 13)) {
          d.stall = 0.06 + rand() * 0.3;
          d.vy *= 0.25;
        }
        // The path wanders: a slow sideways drift that changes now and then.
        if (rand() < dt * 2.2) d.vx = (rand() - 0.5) * 34;
        d.vx *= 1 - dt * 0.8;
        const dy = d.vy * dt;
        d.y += dy;
        d.x += d.vx * dt;
        d.travel += dy;
        d.film += dy;
        if (d.film > Math.max(2.5, d.r * 0.55)) {
          d.film = 0;
          addFilm(d.x, d.y - d.r * 0.5, d.r * 0.72);
        }
        // It leaves a bead behind now and then, and loses that water.
        if (d.travel > d.gap && trails < trailCap) {
          trails++;
          d.travel = 0;
          d.gap = d.r * (1.6 + rand() * 4.5);
          const tr = d.r * (0.14 + 0.24 * Math.pow(rand(), 1.5));
          d.r = fromVol(vol(d.r) - vol(tr));
          drops.push({
            x: d.x + (rand() - 0.5) * d.r * 0.9,
            y: d.y - d.r * 1.1,
            r: tr,
            vx: 0,
            vy: 0,
            born: simT - 1,
            kind: TRAIL,
            slide: false,
            stall: 0,
            travel: 0,
            gap: 0,
            film: 0,
            dead: false,
          });
        }
        // It swallows the beads in its path and wipes the mist off.
        for (let j = 0; j < drops.length; j++) {
          const o = drops[j];
          if (o === d || o.dead) continue;
          const ox = o.x - d.x;
          const oy = o.y - d.y;
          const reach = o.kind === MIST ? d.r * 1.25 : (d.r + o.r) * 0.82;
          if (ox * ox + oy * oy > reach * reach || oy < -d.r * 0.6) continue;
          if (o.kind !== MIST) {
            d.r = fromVol(vol(d.r) + vol(o.r));
            d.vy += 12;
          }
          o.dead = true;
        }
        if (d.y - d.r * 2 > H) {
          d.dead = true;
          continue;
        }
        if (d.r < STOP_R) d.slide = false;
      }
      let k = 0;
      running = false;
      for (const d of drops) {
        if (d.dead) continue;
        drops[k++] = d;
        if (d.slide) running = true;
      }
      drops.length = k;
    };

    /* ---------- Draw ---------- */
    const draw = () => {
      let n = 0;
      const put = (
        x: number,
        y: number,
        hw: number,
        hh: number,
        isFilm: number,
        w: number,
        r: number,
      ) => {
        if (n >= MAX_INST) return;
        const o = n * STRIDE;
        inst[o] = x;
        inst[o + 1] = y;
        inst[o + 2] = hw;
        inst[o + 3] = hh;
        inst[o + 4] = isFilm;
        inst[o + 5] = w;
        inst[o + 6] = r;
        n++;
      };
      const cap = TIER[curTier].film;
      for (let k = 0; k < filmN; k++) {
        const o = ((filmAt - 1 - k + cap) % cap) * 4;
        const age = simT - film[o + 3];
        if (age > FILM_S) continue;
        const r = film[o + 2] * 1.1;
        put(film[o], film[o + 1], r, r * 1.6, 1, (1 - age / FILM_S) * 0.5, r);
      }
      for (const d of drops) {
        // A landing drop spreads out over ~140 ms.
        const a = Math.min(1, (simT - d.born) / 0.14);
        const r = d.r * (0.45 + 0.55 * (1 - (1 - a) * (1 - a)));
        if (d.slide) {
          // A runner is a teardrop: its round head leads, a narrower neck trails above it
          // (two kernels the field melts into one outline), longer the faster it goes.
          const s = d.stall > 0 ? 0.15 : Math.min(1, d.vy / 200);
          const tail = r * (0.5 + 0.12 * s);
          put(d.x, d.y, r * KERNEL, r * (1 + 0.08 * s) * KERNEL, 0, 1, r);
          put(
            d.x - d.vx * 0.02,
            d.y - r * (0.75 + 0.75 * s),
            tail * KERNEL,
            tail * (1.3 + 0.9 * s) * KERNEL,
            0,
            0.9,
            r,
          );
        } else put(d.x, d.y, r * KERNEL, r * KERNEL, 0, 1, r);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (n) {
        gl.useProgram(fieldProg);
        gl.uniform2f(uView, W, H);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindVertexArray(fieldVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, n * STRIDE);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
        gl.disable(gl.BLEND);
      }
      // Lighting: only the drops' own quads are shaded (a few % of the screen), not a
      // fullscreen pass. Overlapping quads compute the very same colour from the field,
      // so MAX blending over a cleared canvas makes the overlaps exact.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (n) {
        gl.useProgram(lightProg);
        gl.uniform2f(uViewL, W, H);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fieldTex);
        gl.uniform1i(uField, 0);
        gl.uniform2f(uTexel, 1 / canvas.width, 1 / canvas.height);
        gl.uniform1f(uCss, W / canvas.width);
        gl.uniform1f(uNight, night);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.MAX);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
        gl.blendEquation(gl.FUNC_ADD);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(null);
      return n;
    };

    const show = () => {
      host.style.opacity = props.current.visible ? "1" : "0";
    };

    const wake = () => {
      if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const still = reduced;
    const tick = (now: number) => {
      raf = 0;
      if (disposed || gl.isContextLost()) return;
      if (!ready) {
        const done = finishLink();
        if (done === "fail") return fail();
        if (!done) return wake();
        ready = true;
        lastDraw = now - 1000; // draw at once
      }
      const tickDt = lastTick < 0 ? 0 : now - lastTick;
      lastTick = now;
      const p = props.current;
      if (p.tier !== curTier) {
        curTier = p.tier;
        sizeDirty = true;
        filmAt = 0; // the film ring's length is per tier
        filmN = 0;
      }
      night += (p.night - night) * 0.1;
      if (still || frozen) {
        // A still frame: redrawn only when the size or the light changes.
        if (sizeDirty) resize();
        draw();
        if (!shown) {
          shown = true;
          show();
        }
        if (Math.abs(p.night - night) > 0.005) wake();
        return;
      }
      if (now < yieldUntil) {
        lastTick = -1;
        // Resume where it paused: the first frame after the yield advances one frame, not 350 ms.
        lastDraw = Math.max(lastDraw, now - 1000 / TIER[curTier].fps);
        return wake();
      }
      // Watch the page's frame interval against the display's own; shed load when it lags.
      if (tickDt > 0) {
        baseDt = Math.min(baseDt, tickDt);
        avgDt = avgDt ? avgDt * 0.92 + tickDt * 0.08 : tickDt;
        slowTicks =
          avgDt > Math.max(SLOW_MS, baseDt * 1.6) ? slowTicks + 1 : Math.max(0, slowTicks - 2);
        if (slowTicks > 45) {
          slowTicks = 0;
          avgDt = 0;
          level++;
          if (level === 1) shed = 0.6;
          else if (level === 2) {
            shed = 0.4;
            quality = 0.7;
            sizeDirty = true;
          } else if (level === 3) {
            quality = 0.5;
            sizeDirty = true;
          } else frozen = true; // keep the last frame
          host.dataset.level = String(level);
        }
      }
      // Full rate only while a drop runs; beads landing and settling look the same at 12 fps.
      const interval = 1000 / (running ? TIER[curTier].fps : CALM_FPS);
      if (now - lastDraw < interval - 2) return wake();
      const dt = Math.min(0.1, (now - lastDraw) / 1000);
      lastDraw = now;
      if (sizeDirty) resize();
      const c0 = performance.now();
      step(dt, false);
      const n = draw();
      // For audits, once a second: the frame's main-thread cost (simulation + GL calls), smoothed, and the quads drawn.
      cpuMs = cpuMs * 0.95 + (performance.now() - c0) * 0.05;
      if (now - auditAt > 1000) {
        auditAt = now;
        host.dataset.cpuMs = cpuMs.toFixed(3);
        host.dataset.quads = String(n);
      }
      if (!shown) {
        shown = true;
        show();
      }
      wake();
    };

    /* ---- Warm-up: it has been raining for a while — the glass already holds water ---- */
    resize();
    for (let k = 0; k < (still ? 360 : 240); k++) step(1 / 30, still);
    if (still) for (const d of drops) d.born = simT - 1;
    wakeRef.current = () => {
      show();
      wake();
    };

    /* ---- Listeners ---- */
    const ro = new ResizeObserver(() => {
      sizeDirty = true;
      wake();
    });
    ro.observe(host);
    const onPress = () => {
      yieldUntil = performance.now() + YIELD_MS;
    };
    window.addEventListener("pointerdown", onPress, { capture: true, passive: true });
    window.addEventListener("keydown", onPress, { capture: true, passive: true });
    const onVis = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastTick = -1;
      if (!document.hidden) {
        lastDraw = performance.now(); // resume without a time jump
        wake();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      fail();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    wake();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      ro.disconnect();
      window.removeEventListener("pointerdown", onPress, { capture: true });
      window.removeEventListener("keydown", onPress, { capture: true });
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(fieldProg);
      gl.deleteProgram(lightProg);
      gl.deleteBuffer(quad);
      gl.deleteBuffer(instBuf);
      gl.deleteTexture(fieldTex);
      gl.deleteFramebuffer(fbo);
      gl.deleteVertexArray(fieldVao);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, []);

  // Weather / light / tier changed: fade, and wake a still frame to redraw.
  useEffect(() => {
    wakeRef.current();
  }, [visible, night, tier]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-rain-glass=""
      className="pointer-events-none fixed inset-0 z-[26] select-none"
      style={{ opacity: 0, transition: `opacity ${FADE_MS}ms ease` }}
    />
  );
}
