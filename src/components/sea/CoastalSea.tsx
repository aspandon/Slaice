import { useEffect, useRef } from "react";
import type { BeachPreset } from "../../data/backgrounds";
import type { SeaEnv } from "../LiveSeaCanvas"; // type-only: erased, so three.js is never pulled in
import { seaPixelScale } from "../../lib/camera";
import { prefersReducedMotion } from "../../lib/motion";
import { buildShore } from "../../lib/seaShore";
import { NOON_LIGHT, type Rgb, type SeaLight } from "../../lib/seaLight";
import { COASTAL_FRAG, COASTAL_VERT, TEX, cellTexture, rippleTexture } from "./coastalShader";

/* ============================================================================
   Coastal sea (AENR-811) — lightweight, realistic water behind the guest scene.

   Raw WebGL2, one fullscreen triangle and one fragment pass (coastalShader.ts):
   turquoise shallows over sand with caustics falling into the preset's deep
   blues, wind-driven ripples with a Fresnel sky sheen, the sun's (or the moon's)
   reflection path, and a shore break that runs up the beach — all in the same
   1600×900 cover-fitted scene space as the illustrated SVG sand drawn on top.

   Why not three.js: the only thing the sea needs is a shader on a triangle, so
   this chunk is a few kB instead of the renderer, and the cost is decided here,
   not by a general-purpose engine:
   - Baked noise — the ripple field, noise octaves and cell seams are generated
     once (JS, ~20 ms, cached per page) into two 256² mipmapped tiles; the shader
     samples them instead of hashing and looping per pixel.
   - Reduced resolution — water is soft, so the canvas renders at 0.8× DPR on
     desktop (0.55× on phones) under a pixel budget and CSS upscales it.
   - Frame cap — 30 fps on desktop, 20 fps for a live phone loop. The water
     moves slowly; twice the frames would only buy twice the GPU time.
   - Phones draw a poster — one still frame (all effects, time frozen), redrawn
     only when the weather, the light or the shoreline change. A probe of the
     first frames (each synchronised with a 1-px readPixels, so it measures real
     GPU time; a clearly slow frame ends it at once) lets a phone that draws a
     frame in under 6 ms animate at 20 fps instead, and starts a slow desktop
     at half resolution.
   - Reduced motion — always the poster, never animated.
   - Taps first — for 350 ms after any pointer press or key the sea skips its
     frames, so the interaction paints without queueing behind the shader.
   - Self-tuning — if the page's frame interval keeps averaging over ~22 ms
     (and well above the display's own), the resolution halves (twice at most);
     still too slow at the floor, the sea stops animating and keeps its last
     frame. Slowness alone never calls onFail — the sea just gets cheaper.
   - Hidden tab — no frames at all.
   - Compiles off the main thread where KHR_parallel_shader_compile exists.

   The shoreline (AENR-819): when `dy` changes the host slides the SVG sand to it
   over 0.78 s (GSAP, power3.out) without re-rendering, so the water runs the
   same curve itself, drawing every display frame for those 780 ms (no frame
   cap, no tap-yield; a phone poster loops just for the slide) — the surf stays
   glued to the sand. Reduced motion: it jumps.

   onFail (→ the host's Classic SVG sea): no WebGL2, a software-rendered context
   (failIfMajorPerformanceCaveat, unless `localStorage["slaice.liveSea"]="force"`,
   the same escape hatch as LiveSeaCanvas — headless test browsers only have
   SwiftShader), a shader that won't compile or link, or a lost context.

   Every other input — wind, light, tint, glow, the preset's colours — glides to
   its new target (~1 s), so the weather and the time-of-day slider never jump.
   ============================================================================ */

const FORCE = (() => {
  try {
    return localStorage.getItem("slaice.liveSea") === "force";
  } catch {
    return false;
  }
})();

/* ---- Resolution & pacing per tier ---- */
const TIER = {
  desktop: { ratio: 0.8, maxRatio: 1.25, budget: 1_600_000, fps: 30 },
  mobile: { ratio: 0.55, maxRatio: 1.0, budget: 450_000, fps: 20 },
} as const;
type Tier = keyof typeof TIER;
const MIN_QUALITY = 0.25; // two halvings at most
const PROBE_FRAMES = { mobile: 10, desktop: 6 }; // first frames timed with a GPU sync (2 warm-ups discarded)
const PROBE_LIVE_MS = 6; // a phone this fast may animate
const PROBE_HALF_MS = 14; // a desktop this slow starts at half resolution
const YIELD_MS = 350;
const SLOW_MS = 22;
const POSTER_T = 31.5; // the poster's frozen moment: a wave mid-run-up, a crest behind it
const GLIDE_S = 0.33; // lerp time constant (≈ 95 % of the way in 1 s)
/* The shoreline glide (AENR-819): the host sets `dy` once and slides the SVG sand
   there with GSAP over 0.78 s, power3.out — the water follows the same curve. */
const SHORE_MS = 780;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 3);

/* ---- Colour helpers (sRGB in, sRGB out — the shader matches the SVG's values) ---- */
const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const cssRgba = (c: string): [number, number, number, number] => {
  if (c.startsWith("#")) return [...hexRgb(c), 1];
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [1, 1, 1, 0.85];
  const [r = 255, g = 255, b = 255, a = 1] = m[1].split(",").map((x) => parseFloat(x));
  return [r / 255, g / 255, b / 255, a];
};
const mix3 = (a: Rgb, b: Rgb, t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/* ---- Uniform layout ----
   Every env/preset-driven uniform lives in one flat Float32Array so a frame can
   lerp them all in one loop and tell when they have settled. */
const SLOTS = [
  ["uWind", 1],
  ["uDeep0", 3],
  ["uDeep1", 3],
  ["uAbsorb", 3],
  ["uFoam", 4],
  ["uSkyHor", 3],
  ["uSkyZen", 3],
  ["uLightDir", 3],
  ["uGlitCol", 3],
  ["uGlit", 3],
  ["uSunGlow", 3],
  ["uSunGlowCol", 3],
  ["uMoonGlow", 3],
  ["uMoonGlowCol", 3],
  ["uTintTop", 3],
  ["uTintDeep", 3],
  ["uGrade", 4],
] as const;
type Slot = (typeof SLOTS)[number][0];
const OFFSET = {} as Record<Slot, number>;
const SIZE = SLOTS.reduce((at, [name, n]) => ((OFFSET[name] = at), at + n), 0);

const SKY_DAY_HOR: Rgb = [0.8, 0.9, 0.97];
const SKY_DAY_ZEN: Rgb = [0.36, 0.62, 0.88];
const SKY_NIGHT_HOR: Rgb = [0.13, 0.17, 0.3];
const SKY_NIGHT_ZEN: Rgb = [0.03, 0.05, 0.12];
const SKY_CLOUD: Rgb = [0.66, 0.7, 0.74];

/* A direction toward a light standing at `x` (0..1 across the scene) and `elev`
   radians above the horizon, in the shader's world frame (camera 1 unit up,
   looking along +Z, scene x spanning ±800/900 of a unit at distance 1). */
const lightDir = (x: number, elev: number): [number, number, number] => {
  const sx = (x * 1600 - 800) / 900;
  const l = Math.hypot(sx, 1);
  const c = Math.cos(elev);
  return [(sx / l) * c, Math.sin(elev), (1 / l) * c];
};

/** The uniform targets for this preset + environment. `vis` is the share of the
 *  scene's width the canvas shows (cover-fit crops the sides on narrow screens). */
function targets(out: Float32Array, preset: BeachPreset, env: SeaEnv, vis: number) {
  const L: SeaLight = env.light ?? NOON_LIGHT;
  const put = (k: Slot, v: readonly number[]) => out.set(v, OFFSET[k]);
  const cloud = L.cloud;
  put("uWind", [env.wind]);
  put("uDeep0", hexRgb(preset.sea[0]));
  put("uDeep1", hexRgb(preset.sea[1]));
  // Per-channel extinction from the preset's third stop: water one unit deep
  // transmits exactly that colour — turquoise for the blue presets, amber for
  // the sunset ones, grey-blue for slate.
  put(
    "uAbsorb",
    hexRgb(preset.sea[2]).map((c) =>
      Math.min(3, Math.max(0.03, -Math.log(Math.min(0.98, Math.max(0.04, c))))),
    ),
  );
  put("uFoam", cssRgba(preset.foam));
  // The sky the water reflects: day blue → golden-hour tint → navy night → cloud grey.
  let hor = mix3(SKY_DAY_HOR, mix3(L.tint.top, [1, 0.82, 0.66], 0.35), L.warm);
  let zen = mix3(SKY_DAY_ZEN, [0.52, 0.5, 0.72], L.warm);
  hor = mix3(hor, SKY_NIGHT_HOR, L.night);
  zen = mix3(zen, SKY_NIGHT_ZEN, L.night);
  const grey = mix3(SKY_CLOUD, SKY_NIGHT_HOR, L.night);
  put("uSkyHor", mix3(hor, grey, cloud * 0.8));
  put("uSkyZen", mix3(zen, grey, cloud * 0.8));
  // The light's place across the view: seaLight's x is a share of the scene,
  // read here as a share of what is on screen (like the host's own sun haze),
  // so a phone, which only sees the middle of the scene, still gets its sun path.
  const onScreen = (x: number) => 0.5 + (x - 0.5) * vis;
  // The reflection path: the sun's (its height compressed so a noon sun still
  // throws a broad sheen inside the frame), or at night the moon's.
  const atNight = L.night > 0.5;
  const elev = atNight ? 0.11 : 0.035 + 0.6 * Math.pow(Math.max(0, L.sunElev), 0.85);
  const gx = onScreen(L.glitter.x);
  put("uLightDir", lightDir(gx, elev));
  put("uGlitCol", L.glitter.color);
  put("uGlit", [
    L.glitter.strength * (preset.glint ? 1 : 0.55),
    L.glitter.width * Math.pow(vis, 0.7),
    gx,
  ]);
  // Glows on the horizon: the low sun's orange where it stands, the moon's silver.
  const sunGlow = L.warm * (1 - 0.5 * cloud);
  put("uSunGlow", [onScreen(L.sunX), sunGlow, 0]);
  put("uSunGlowCol", L.dawn ? [1, 0.62, 0.46] : [1, 0.55, 0.24]);
  put("uMoonGlow", [onScreen(L.moon.x), L.moon.strength, 0]);
  put("uMoonGlowCol", L.moon.color);
  put("uTintTop", L.tint.top);
  put("uTintDeep", L.tint.deep);
  // Daylight drives the caustics and the ripple shading: it needs the sun up
  // (a low sun's light no longer focuses on the floor); cloud takes it away.
  const sunUp = Math.min(1, Math.max(0, (L.sunElev - 0.02) / 0.35));
  // Less light reaches into the water with the sun low, and none at night
  // beyond the moon's (the tint already carries the colour).
  const bodyLight = 0.6 + 0.4 * Math.min(1, Math.max(0, (L.sunElev + 0.05) / 0.45));
  put("uGrade", [L.tint.amount, cloud, sunUp * (1 - 0.75 * cloud), bodyLight]);
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

export default function CoastalSea({
  preset,
  dy,
  env,
  tier,
  onFail,
}: {
  preset: BeachPreset;
  /** Shoreline shift in scene units (the sand-top curve moves by dy). */
  dy: number;
  /** Weather + the light on the water (lerped per frame). */
  env: SeaEnv;
  tier: Tier;
  /** No WebGL2 / software GL / shader failure / context lost → the Classic SVG sea. */
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Latest-value refs so the one-time mount effect and the frame loop never go stale.
  const props = useRef({ preset, dy, env, tier });
  props.current = { preset, dy, env, tier };
  const failRef = useRef(onFail);
  failRef.current = onFail;
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // The canvas is made here rather than rendered: a context lost on unmount
    // can't be revived, and StrictMode's re-mount must start from a fresh one.
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 w-full h-full";
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 900ms ease";
    host.appendChild(canvas);
    let disposed = false;
    const fail = () => {
      if (!disposed) failRef.current();
    };

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: !FORCE,
    });
    if (!gl) {
      canvas.remove();
      fail();
      return;
    }

    /* ---- Program (compiled in the background where the driver allows) ---- */
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    const vs = compile(gl, gl.VERTEX_SHADER, COASTAL_VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, COASTAL_FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      canvas.remove();
      fail();
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    const vao = gl.createVertexArray();

    /* ---- Shoreline LUT: 64×1 R8, linear ---- */
    const shore = buildShore();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 1, 0, gl.RED, gl.UNSIGNED_BYTE, shore.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /* ---- The baked noise: ripple slopes + noise, and cell seams (coastalShader.ts) ----
       Tileable and mipmapped — the shader picks the level from each pixel's
       footprint, so distance fades them to their average instead of aliasing. */
    const tile = (data: Uint8Array) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TEX, TEX, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      return t;
    };
    const rippleTex = tile(rippleTexture());
    const cellTex = tile(cellTexture());

    let loc: Record<string, WebGLUniformLocation | null> = {};
    let ready = false;
    const finishLink = (): boolean => {
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        if (import.meta.env.DEV)
          console.warn("[CoastalSea]", gl.getShaderInfoLog(fs), gl.getProgramInfoLog(prog));
        return false;
      }
      gl.useProgram(prog);
      const names = [
        "uRes",
        "uTime",
        "uDy",
        "uShore",
        "uShoreMap",
        "uRipple",
        "uCells",
        ...SLOTS.map(([n]) => n),
      ];
      loc = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)]));
      gl.uniform1i(loc.uShore, 0);
      gl.uniform1i(loc.uRipple, 1);
      gl.uniform1i(loc.uCells, 2);
      gl.uniform2f(loc.uShoreMap, shore.off, shore.scale);
      gl.bindVertexArray(vao);
      [tex, rippleTex, cellTex].forEach((t, i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
      });
      return true;
    };

    /* ---- State ---- */
    const cur = new Float32Array(SIZE);
    const tgt = new Float32Array(SIZE);
    let snap = true; // the first frame jumps straight to the targets
    const reduced = prefersReducedMotion();
    let curTier: Tier = props.current.tier;
    let quality = 1;
    let mode: "live" | "poster" = curTier === "desktop" && !reduced ? "live" : "poster";
    let probe = 0; // frames left to probe
    const probeMs: number[] = [];
    if (!reduced) probe = PROBE_FRAMES[curTier];
    let clock = POSTER_T;
    let sizeDirty = true;
    let drawnDy = NaN;
    let dyFrom = props.current.dy;
    let dyTo = props.current.dy;
    let dyNow = dyTo;
    let dyStart = -Infinity;
    let raf = 0;
    let shown = false;
    let lastTick = -1;
    let lastDraw = -1e9;
    let yieldUntil = 0;
    let avgDt = 0;
    let baseDt = Infinity;
    let slowTicks = 0;
    // Share of the scene's width on screen (cover-fit: the 16:9 scene fills the
    // host, so narrow screens see only its middle). Kept from the host's box —
    // not the canvas, whose size only changes right before a draw.
    const shareOf = (r: DOMRectReadOnly) =>
      Math.min(1, (r.width / Math.max(1, r.height)) * (900 / 1600));
    let vis = shareOf(host.getBoundingClientRect());

    const resize = () => {
      const r = host.getBoundingClientRect();
      const t = TIER[curTier];
      const dpr =
        Math.min((window.devicePixelRatio || 1) * t.ratio, t.maxRatio) * seaPixelScale() * quality;
      let w = Math.max(1, Math.round(r.width * dpr));
      let h = Math.max(1, Math.round(r.height * dpr));
      const over = (w * h) / t.budget;
      if (over > 1) {
        w = Math.max(1, Math.round(w / Math.sqrt(over)));
        h = Math.max(1, Math.round(h / Math.sqrt(over)));
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      sizeDirty = false;
    };

    const wake = () => {
      if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    const tick = (now: number) => {
      raf = 0;
      if (disposed || gl.isContextLost()) return;
      if (!ready) {
        // Poll the background compile; link errors surface only once it is done.
        if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR))
          return wake();
        if (!finishLink()) return fail();
        ready = true;
      }
      const tickDt = lastTick < 0 ? 0 : now - lastTick;
      lastTick = now;
      const p = props.current;
      // A new shoreline: glide from wherever the water is now (instant under reduced motion).
      if (p.dy !== dyTo) {
        dyFrom = reduced ? p.dy : dyNow;
        dyTo = p.dy;
        dyStart = reduced ? -Infinity : now;
      }
      const shoreP = (now - dyStart) / SHORE_MS;
      const sliding = shoreP < 1;
      dyNow = sliding ? dyFrom + (dyTo - dyFrom) * power3Out(Math.max(0, shoreP)) : dyTo;
      // While the sand slides the water must keep up with it, every display frame:
      // no tap-yield and no frame cap for those 780 ms.
      if (now < yieldUntil && !sliding) {
        lastTick = -1;
        return wake();
      }
      if (p.tier !== curTier) {
        curTier = p.tier;
        quality = 1;
        mode = curTier === "desktop" && !reduced ? "live" : "poster";
        sizeDirty = true;
      }

      // Live loops watch the page's frame interval against the display's own.
      if (mode === "live" && tickDt > 0 && !sliding) {
        baseDt = Math.min(baseDt, tickDt);
        avgDt = avgDt ? avgDt * 0.92 + tickDt * 0.08 : tickDt;
        slowTicks =
          avgDt > Math.max(SLOW_MS, baseDt * 1.6) ? slowTicks + 1 : Math.max(0, slowTicks - 2);
        if (slowTicks > 45) {
          slowTicks = 0;
          avgDt = 0;
          if (quality > MIN_QUALITY) {
            quality /= 2;
            sizeDirty = true;
          } else mode = "poster"; // keep showing the last frame
        }
      }

      targets(tgt, p.preset, p.env, vis);
      let settled = true;
      for (let i = 0; i < SIZE; i++) if (Math.abs(tgt[i] - cur[i]) > 1e-3) settled = false;
      const live = mode === "live";
      if (!live && settled && !snap && !sizeDirty && dyNow === drawnDy && probe === 0) return; // poster: idle

      // Frame cap (posters gliding to new targets use it too) — lifted while the shoreline slides.
      const interval = 1000 / TIER[curTier].fps;
      if (!snap && !sliding && now - lastDraw < interval - 2) return wake();
      const dt = snap ? 0 : Math.min(0.1, (now - lastDraw) / 1000);
      lastDraw = now;

      if (snap) cur.set(tgt);
      else {
        const k = 1 - Math.exp(-dt / GLIDE_S);
        for (let i = 0; i < SIZE; i++) cur[i] += (tgt[i] - cur[i]) * k;
      }
      snap = false;
      if (live) clock += dt * (0.8 + 0.6 * cur[OFFSET.uWind]);
      if (sizeDirty) resize();

      const t0 = probe > 0 ? performance.now() : 0;
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uTime, clock);
      gl.uniform1f(loc.uDy, dyNow);
      drawnDy = dyNow;
      for (const [name, n] of SLOTS) {
        const o = OFFSET[name];
        const l = loc[name];
        if (n === 1) gl.uniform1f(l, cur[o]);
        else if (n === 3) gl.uniform3f(l, cur[o], cur[o + 1], cur[o + 2]);
        else gl.uniform4f(l, cur[o], cur[o + 1], cur[o + 2], cur[o + 3]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (probe > 0) {
        // A 1-px readback waits for the GPU, so this times the frame itself.
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        probeMs.push(performance.now() - t0);
        // The sync stalls the main thread for a frame's GPU time, so a clearly slow
        // device ends its probe at the first timed frame instead of stalling ten times.
        const limit = curTier === "mobile" ? PROBE_LIVE_MS : PROBE_HALF_MS;
        if (probeMs.length > 2 && probeMs[probeMs.length - 1] > 4 * limit) probe = 1;
        if (--probe === 0) {
          const ms = probeMs.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, probeMs.length - 2);
          if (curTier === "mobile") mode = ms < PROBE_LIVE_MS ? "live" : "poster";
          else if (ms > PROBE_HALF_MS) {
            quality = 0.5;
            sizeDirty = true;
          }
          canvas.dataset.probeMs = ms.toFixed(2);
        }
      }
      canvas.dataset.mode = mode;
      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
      if (mode === "live" || probe > 0 || !settled || sizeDirty || sliding || dyNow !== dyTo)
        wake();
    };

    /* ---- Listeners ---- */
    const ro = new ResizeObserver(([entry]) => {
      if (entry) vis = shareOf(entry.contentRect);
      sizeDirty = true;
      wake();
    });
    ro.observe(host);
    // Taps first (AENR-762): skip frames for a moment after any press.
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
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteTexture(tex);
      gl.deleteTexture(rippleTex);
      gl.deleteTexture(cellTex);
      gl.deleteVertexArray(vao);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, []);

  // New weather, light, preset or shoreline: wake the loop (a poster redraws, a live loop glides).
  useEffect(() => {
    wakeRef.current();
  }, [preset, dy, env, tier]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0 pointer-events-none" />;
}
