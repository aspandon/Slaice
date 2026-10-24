/* ============================================================================
   Coastal sea — the shader and its generated textures (AENR-811)

   One fullscreen-triangle pass. Everything is worked out in the guest scene's
   1600×900 space (cover-fitted like the SVG's preserveAspectRatio="xMidYMid
   slice"), so the waterline lands exactly under the illustrated sand on top.

   Cheap by construction: the expensive noise is baked once, in JS, into two
   small tileable textures (nothing is downloaded), and the shader samples them
   ~12 times per pixel instead of hashing and looping:
   - ripple tile — RG: the slope of a tileable wave field (a spectrum of
     directional waves, onshore-biased), B / A: smooth value-noise octaves;
   - cell tile — R: thin seams between jittered cells (caustics), G: wider
     ones (foam lace).
   Both are mipmapped, so ripples and caustics fade to their average toward the
   horizon for free instead of aliasing.

   The model, top to bottom of `main`:
   1. Perspective — each scene row is a distance across a flat sea seen from a
      camera one unit above it, the horizon just above the scene's top edge. All
      water detail lives in those world coordinates, so ripples shrink and
      flatten toward the horizon by themselves; detail lost below a pixel is
      handed to the glitter as roughness so the sun path stays bright.
   2. Ripples — two scrolling slope layers (flow-map style: different scale,
      direction and speed), gusty patches on the fine one; both scale with wind.
   3. Depth — distance off the waterline (+ a sandbar and soft noise). The sea
      floor (warm sand, dark seagrass meadows, two drifting caustic layers) is
      seen through water whose per-channel extinction comes from the preset's
      third stop, scattered toward the preset's deep blues — turquoise shallows
      fall naturally into deep water, and a tenant's palette still reads.
   4. Sky — Fresnel reflection of a two-tone sky, strongest toward the horizon.
   5. Shore break — crests shoal in, steepen and break into a foam line; the
      bore runs up the beach and washes back (its tip and the wet band under
      the SVG sand + foam band, which cover the first few px).
   6. Light — cloud flattening, the reflection path (sun or moon), the low
      sun's / the moon's glow on the horizon, and a dither against banding.

   Our own code throughout (no Shadertoy snippets — their default licence is
   non-commercial).
   ============================================================================ */

export const COASTAL_VERT = /* glsl */ `#version 300 es
// One oversized triangle covering the viewport; no vertex buffer needed.
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export const COASTAL_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2  uRes;       // drawing-buffer size (px)
uniform float uTime;      // the water's clock (s) — wind speeds it up, frozen on posters
uniform float uDy;        // shoreline shift (scene units)
uniform sampler2D uShore; // 64×1 sand-top heights over x 0..1600
uniform vec2  uShoreMap;  // LUT decode: off, scale
uniform sampler2D uRipple; // RG slope (0.5-centred), B noise (8 cells / tile), A noise (32 cells / tile)
uniform sampler2D uCells;  // R caustic seams, G lace seams (16 cells / tile)

uniform vec3  uDeep0;     // preset sea[0] — deep water toward the horizon
uniform vec3  uDeep1;     // preset sea[1] — deep water nearer the beach
uniform vec3  uAbsorb;    // per-channel extinction (from preset sea[2])
uniform vec4  uFoam;      // preset foam rgb + alpha
uniform float uWind;      // 0 calm … 1 windy

uniform vec3  uSkyHor;    // sky colour at the horizon / overhead (reflections)
uniform vec3  uSkyZen;
uniform vec3  uLightDir;  // toward the light making the reflection path (sun or moon)
uniform vec3  uGlitCol;
uniform vec3  uGlit;      // strength, width (0..1 of the scene), x (0..1)
uniform vec3  uSunGlow;   // x, strength, 0
uniform vec3  uSunGlowCol;
uniform vec3  uMoonGlow;  // x, strength, 0
uniform vec3  uMoonGlowCol;
uniform vec3  uTintTop;   // the time-of-day grade (horizon / near water)
uniform vec3  uTintDeep;
uniform vec4  uGrade;     // tint amount, cloud cover, daylight (caustics, ripple shading), light into the water

out vec4 outColor;

const float V0 = 0.1;                         // horizon sits this far above the scene top
const vec3  SAND = vec3(0.949, 0.886, 0.761); // #f2e2c2 seen through the water
const vec3  LUMA = vec3(0.299, 0.587, 0.114);
const mat2  ROT = mat2(0.8, 0.6, -0.6, 0.8);  // the second ripple layer runs at an angle

// Smooth tileable noise, x in noise cells; LOD 0 — these are always magnified.
float nLo(vec2 x) { return textureLod(uRipple, x * 0.125, 0.0).b; }
// Both octaves at once: .x 8-cell noise, .y the 32-cell one at 4× the frequency.
vec2 nPair(vec2 x) { return textureLod(uRipple, x * 0.125, 0.0).ba; }
// Mipmapped lookups take an explicit level from the pixel's footprint (one log2
// per pixel instead of per-sample derivatives — the same filtering, cheaper on
// software GL, and safe after the early-out below).
vec2 slopeAt(vec2 uv, float lod) { return textureLod(uRipple, uv, lod).rg * 2.0 - 1.0; }
float lodFor(float texelsPerWorld, float fp) { return max(0.0, log2(fp * texelsPerWorld)); }

/* ---- Surf ----
   One broken wave as foam: its front rushes from the break point dB up past the
   waterline to the run-up limit −runR, then washes back to dBack while the sheet
   thins into lace. Returns (foam, front position). */
vec2 bore(float d, float tau, float dB, float runR, float dBack, float lace) {
  const float UP = 0.38;
  float a = tau / UP, b = (tau - UP) / (1.0 - UP);
  float dF = tau < UP ? mix(dB, -runR, a * (2.0 - a))   // rush in, slowing as it climbs
                      : mix(-runR, dBack, b * b * (2.0 - b)); // drain back, gathering pace
  float sheet = smoothstep(dF - 2.5, dF + 1.5, d) * smoothstep(dB + 6.0, dB - 6.0, d);
  // The bore: a band of white water riding the front, thinning as it runs up.
  float band = 1.0 - smoothstep(6.0, 34.0 * (1.0 - 0.55 * tau), d - dF);
  float front = max(band, exp(-max(d - dF, 0.0) / 34.0) * 0.55) * (1.0 - 0.6 * tau);
  float dens = max(lace * (0.8 - 0.5 * tau) * mix(0.25, 1.0, exp(-max(d - dF, 0.0) / 40.0)), front);
  return vec2(sheet * dens, dF);
}

void main() {
  // Cover-fit the 1600×900 scene, then work in scene units (y down, like the SVG).
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float s = max(uRes.x / 1600.0, uRes.y / 900.0);
  vec2 p = (frag - 0.5 * uRes) / s + vec2(800.0, 450.0);
  float t = uTime;

  // Where the water meets the sand at this x (texel centres sit at i/63 of the width).
  float lx = (clamp(p.x / 1600.0, 0.0, 1.0) * 63.0 + 0.5) / 64.0;
  float yShore = textureLod(uShore, vec2(lx, 0.5), 0.0).r * uShoreMap.y + uShoreMap.x + uDy;
  float ds = yShore - p.y; // scene px to the waterline (> 0 in the water)

  /* 1 — Perspective. */
  float v = max(p.y, 0.0) / 900.0 + V0;
  float vs = max(yShore, 30.0) / 900.0 + V0;
  float Z = 1.0 / v;
  vec2 W = vec2((p.x - 800.0) / 900.0 * Z, Z); // on the water plane, camera 1 unit up
  float fp = max(max(fwidth(W.x), fwidth(W.y)), 1e-5); // world units per pixel

  /* 2 — Ripples. */
  float spd = 0.6 + 0.6 * uWind;
  // Vertical footprint dominates near the horizon; bias slightly sharp (−0.5)
  // so the far water keeps a little texture, like anisotropic filtering would.
  vec2 sA = slopeAt(W * 1.6 + vec2(0.012, -0.05) * t * spd, lodFor(1.6 * 256.0, fp) - 0.5);
  vec2 sB = slopeAt(ROT * W * 4.3 + vec2(-0.03, -0.11) * t * spd, lodFor(4.3 * 256.0, fp) - 0.5) * ROT;
  // The shore-break phase field (section 5), here for the same reason.
  float pk = clamp(vs / (0.8 + V0), 0.3, 1.4);
  vec2 alongN = nPair(vec2(p.x * 0.0021, 0.37));
  float along = alongN.x;
  float d = ds / pk + (alongN.y - 0.5) * 14.0;
  float ph = t * 0.14 + 0.7 * along;          // a wave every ~7 s, staggered along the beach
  float dB = 92.0 + 18.0 * (along - 0.5) + 16.0 * uWind; // the break point
  float Phi = ph + pow(max(d - dB, 0.0) / 72.0, 0.85);
  float fwPhi = fwidth(Phi);
  // Foam lace: a net of bubbles, warped so it never reads as a honeycomb.
  vec2 lq = p * vec2(0.026, 0.07) / pk + vec2(t * 0.03, -t * 0.05);
  lq += 0.9 * nPair(lq * 0.45);
  float lace = textureLod(uCells, lq * 0.0625, 0.0).g; // the surf zone is always near

  // Deep under the sand the SVG hides everything — skip the work.
  if (ds < -60.0) { outColor = vec4(SAND * 0.9, 1.0); return; }
  vec3 V = normalize(vec3(W.x, -1.0, W.y));    // eye → water
  float dW = Z - 1.0 / vs;                     // world distance off the waterline
  float vn = clamp(p.y / max(yShore, 30.0), 0.0, 1.0); // 0 horizon … 1 waterline

  // Cat's paws: gustier patches ruffle the fine layer (the same noise row as the sandbar).
  vec2 barsN = nPair(W * vec2(1.3, 2.4) + 3.0);
  float gust = 0.5 + 1.0 * barsN.y;
  vec2 slope = sA * (0.075 + 0.05 * uWind) + sB * (0.03 + 0.08 * uWind) * gust;
  // Slope variance the mips averaged away (finer than a pixel) → glitter roughness.
  float lost = 0.004 * smoothstep(0.0008, 0.012, fp) + 0.006 * smoothstep(0.003, 0.04, fp);
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

  /* 3 — Depth, sea floor and the water body. */
  float bars = barsN.x;
  float bq = (dW - 0.42) / 0.12;
  float bar = 0.13 * exp(-bq * bq) * (0.4 + 1.2 * barsN.y);
  // The beach shelves quickly: a little water already right at the waterline.
  float h = 0.6 * smoothstep(-0.03, 0.05, dW) + max(dW, 0.0) * 2.0 - bar
          + (bars - 0.5) * 0.35 * smoothstep(0.0, 0.5, dW);
  h = max(h, 0.0);
  vec3 Tr = exp(-(uAbsorb + 0.35) * h);
  float day = uGrade.z;
  vec2 floorW = W + slope * 0.06; // refraction wobble on everything seen below
  // Seagrass meadows (Posidonia) as dark patches in the mid-depths; the sand
  // itself mottles a little with the finer octave.
  vec2 floorN = nPair(floorW * vec2(0.55, 0.9) + 7.7);
  vec3 bottom = SAND * (0.95 + 0.1 * (floorN.y - 0.5));
  float grass = smoothstep(0.6, 0.72, 0.5 * floorN.x + 0.5 * floorN.y) * smoothstep(0.3, 0.9, dW);
  bottom = mix(bottom, vec3(0.16, 0.22, 0.15), grass * 0.85);
  // Caustics: two caustic layers drifting apart; where their webs cross the
  // light focuses hardest, so the pattern keeps re-forming.
  vec2 cq = floorW * vec2(19.0, 24.0) * 0.0625;
  float lc = lodFor(24.0 * 16.0, fp);
  float c1 = textureLod(uCells, cq + vec2(0.011, 0.019) * t, lc).r;
  float c2 = textureLod(uCells, ROT * cq * 1.37 - vec2(0.015, 0.008) * t, lc + 0.45).r;
  float c = smoothstep(0.15, 1.1, c1 + c2) * (0.35 + 0.9 * floorN.y); // uneven focus
  bottom *= 1.0 + c * 0.9 * day * (1.0 - grass) * exp(-h * 0.9);
  vec3 deep = mix(uDeep0, uDeep1, smoothstep(0.05, 0.95, vn));
  vec3 col = bottom * Tr + deep * (1.0 - Tr);

  // Ripples catch the light a little (sun-side facets brighter) — what makes
  // shallow water read as moving even where the Fresnel reflection is weak.
  vec2 lh = normalize(uLightDir.xz + vec2(0.0, 0.001));
  col *= 1.0 + dot(slope, lh) * (1.4 + 1.6 * day) * (0.4 + 0.6 * smoothstep(0.0, 0.3, dW));
  // Time of day on the water body: multiplied toward the light's tint (golden
  // at sunrise / sunset, deep navy at night) so its hues survive. The sky it
  // reflects (next) is already graded, and carries the horizon's colour.
  vec3 tint = mix(uTintTop, uTintDeep, smoothstep(0.0, 1.0, vn));
  vec3 grade = mix(vec3(1.0), tint * 1.25 + 0.06, uGrade.x) * uGrade.w;
  col *= grade;

  /* 4 — Sky reflection (Fresnel, so it grows toward the horizon). */
  vec3 R = reflect(V, N);
  float cosT = clamp(dot(-V, N), 0.0, 1.0);
  float f1 = 1.0 - cosT, f2 = f1 * f1;
  float F = 0.02 + 0.98 * f2 * f2 * f1;
  vec3 sky = mix(uSkyHor, uSkyZen, sqrt(clamp(R.y, 0.0, 1.0)));
  col = mix(col, sky, F * 0.85);
  // Haze: distance lifts the far water toward the horizon sky.
  col = mix(col, uSkyHor, smoothstep(3.5, 10.0, Z) * 0.22);

  // Whitecaps: in a strong wind the steepest facets of the gustiest patches
  // break white (distance averages the slopes away, so they thin out by themselves).
  float caps = smoothstep(0.085, 0.15, length(slope)) * smoothstep(0.8, 1.3, gust) * smoothstep(0.45, 1.0, uWind);
  col = mix(col, sky * 0.35 + 0.72, caps * 0.6);

  /* 5 — Shore break. Distances (d, dB, runR) are scene px at the resting
     shoreline; pk scales the surf zone with perspective when the shoreline moves up. */
  float tau = fract(ph);                      // time since the last one broke
  float runR = 6.0 + 8.0 * uWind;             // how far the swash runs up under the SVG sand
  float foam = 0.0;
  vec2 b1 = vec2(0.0, 99.0);
  if (d < dB + 260.0) {
    // Shoaling crests: phase grows seaward; crests sit on whole numbers and
    // drift shoreward, bunching up as they near the break. Each one is broken up
    // along the beach (its own noise row), so lines never run ruler-straight.
    float cr = fract(Phi);
    float brokenUp = smoothstep(0.3, 0.8, nLo(vec2(p.x * 0.005 / pk, floor(Phi) * 7.3)));
    float grow = smoothstep(dB + 250.0, dB + 20.0, d) * step(dB - 2.0, d) * (0.55 + 0.45 * uWind)
               * mix(0.12, 1.0, brokenUp);
    float face = smoothstep(0.62, 0.96, cr) * (1.0 - smoothstep(0.96, 1.0, cr));
    float lq2 = min(cr, 1.0 - cr) / max(fwPhi * 3.2, 0.02);
    float lip = exp(-lq2 * lq2);
    col = mix(col, col * vec3(0.66, 0.86, 0.9), face * grow * 0.9);
    col += sky * 0.3 * lip * grow;
    // Breaking: the crest curls into white water over the last few px.
    float brk = smoothstep(dB + 34.0, dB + 2.0, d) * grow;
    foam = brk * max(lip, face) * (0.65 + 0.5 * nLo(p * vec2(0.05, 0.14) / pk + vec2(t * 0.15, 0.0)));
    // The broken wave rushing up the beach and washing back, and a smaller one
    // between sets that breaks closer in. Lace is patchy and uneven.
    vec2 patchN = nPair(lq * 0.3 + 3.1);
    lace *= smoothstep(0.12, 0.5, patchN.x) * (0.45 + 0.75 * patchN.y);
    b1 = bore(d, tau, dB, runR, 38.0, lace);
    vec2 b2 = bore(d, fract(ph + 0.5 + 0.15 * along), dB * 0.55, runR * 0.3, 26.0, lace);
    foam = max(foam, max(b1.x, b2.x * 0.6));
    // On the sand: a swash film where the sheet has run up, a darker wet band
    // where it has been (only a few px of this peek out from under the SVG).
    if (d < 0.0) {
      float wet = smoothstep(-runR - 6.0, -runR + 4.0, d);
      vec3 sand = mix(SAND * 0.9, SAND * vec3(0.74, 0.72, 0.7), wet) * grade;
      float film = smoothstep(b1.y - 2.0, b1.y + 2.0, d);
      col = mix(sand, mix(col, sky, 0.25), film * 0.7);
    }
  }
  vec3 foamCol = uFoam.rgb * mix(vec3(1.0), uTintTop * 1.1 + 0.15, uGrade.x) * (0.86 + 0.14 * day);
  col = mix(col, foamCol, clamp(foam, 0.0, 1.0) * uFoam.a);

  /* 6 — Light. Clouds: greyer, flatter water. */
  col = mix(col, vec3(dot(col, LUMA)) * vec3(0.93, 0.97, 1.0), uGrade.y * 0.4);

  // The reflection path under the sun (or the moon): a broad sheen plus
  // sparkles off the facets that mirror the light into the eye. Detail lost
  // below a pixel widens the highlight instead of vanishing (roughness).
  float colW = uGlit.y * (0.35 + 0.85 * vn);
  float off = (p.x / 1600.0 - uGlit.z) / colW;
  if (uGlit.x > 0.002 && off * off < 40.0) {
    float narrow = smoothstep(0.45, 0.08, uGlit.y);
    vec3 H = normalize(uLightDir - V);
    float nh = max(dot(N, H), 0.0);
    float n1 = mix(30.0, 70.0, narrow);
    float n2 = mix(900.0, 1300.0, narrow);
    n1 /= 1.0 + n1 * lost * 3.0;
    n2 /= 1.0 + n2 * lost * 3.0;
    float sheen = pow(nh, n1);
    float spark = pow(nh, n2);
    float mask = exp(-off * off);            // sparkles: the path's own width
    float soft = exp(-off * off * 0.25);     // sheen: a softer, wider glow around it
    float g = (sheen * soft * mix(0.07, 0.4, narrow) + spark * mask * mix(1.6, 2.6, narrow))
            * uGlit.x * (1.0 - 0.6 * foam) * step(-4.0, ds);
    // Soft-clipped and screen-blended, so a low sun's path stays orange instead of clipping white.
    col = 1.0 - (1.0 - col) * (1.0 - uGlitCol * (1.0 - exp(-1.3 * g)));
  }
  // The low sun's and the moon's glow along the horizon.
  vec2 gs = vec2((p.x / 1600.0 - uSunGlow.x) / 0.16, p.y / 230.0);
  col += uSunGlowCol * uSunGlow.y * exp(-dot(gs, gs)) * 0.55;
  vec2 gm = vec2((p.x / 1600.0 - uMoonGlow.x) / 0.08, p.y / 120.0);
  col += uMoonGlowCol * uMoonGlow.y * exp(-dot(gm, gm)) * 0.35;

  /* 7 — Triangular dither (±1 LSB) so the long gradients never band. */
  vec2 q = fract(gl_FragCoord.xy * vec2(0.1031, 0.1030));
  q += dot(q, q.yx + 33.33);
  float n = fract((q.x + q.y) * q.x) + fract((q.x - q.y) * q.y * 1.7) - 1.0;
  outColor = vec4(clamp(col, 0.0, 1.0) + n / 255.0, 1.0);
}
`;

/* ============ The generated textures ============
   Built once per page (module cache) from a fixed seed, so every visit — and
   every poster — looks the same. ~10–20 ms on a phone, then free. */

export const TEX = 256;

/** A tiny deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Tileable value noise: `cells` lattice cells across the tile, smoothstep-interpolated. */
function valueNoise(cells: number, rand: () => number) {
  const lat = Float32Array.from({ length: cells * cells }, rand);
  return (x: number, y: number) => {
    const fx = (x / TEX) * cells;
    const fy = (y / TEX) * cells;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const ux = tx * tx * (3 - 2 * tx);
    const uy = ty * ty * (3 - 2 * ty);
    const at = (i: number, j: number) =>
      lat[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const c = at(ix, iy + 1);
    const d = at(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
}

let rippleCache: Uint8Array | null = null;
/** RG: slope of a tileable wave field; B: noise (8 + 16 cells); A: noise (32 + 64 cells). */
export function rippleTexture(): Uint8Array {
  if (rippleCache) return rippleCache;
  const rand = rng(811);
  const N = TEX;
  const sx = new Float32Array(N * N);
  const sy = new Float32Array(N * N);
  // A spectrum of directional waves with whole wave numbers (so the tile wraps),
  // fanned ±1.1 rad around the onshore axis; height ∝ k^-1.6 (longer = taller).
  const cosX = new Float32Array(N);
  const sinX = new Float32Array(N);
  const cosY = new Float32Array(N);
  const sinY = new Float32Array(N);
  const COMPONENTS = 22;
  for (let c = 0; c < COMPONENTS; c++) {
    const m = 2 * Math.pow(20, c / (COMPONENTS - 1)); // |k| 2 … 40 cycles per tile
    const ang = (rand() * 2 - 1) * 1.1;
    const kx = Math.round(m * Math.sin(ang));
    let ky = Math.round(m * Math.cos(ang));
    if (kx === 0 && ky === 0) ky = 1;
    const amp = Math.pow(Math.hypot(kx, ky), -1.6);
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < N; i++) {
      const ax = (2 * Math.PI * kx * i) / N + phase;
      cosX[i] = Math.cos(ax);
      sinX[i] = Math.sin(ax);
      const ay = (2 * Math.PI * ky * i) / N;
      cosY[i] = Math.cos(ay);
      sinY[i] = Math.sin(ay);
    }
    // d/du of amp·sin(θ) = amp·2πk·cos(θ), with cos(a+b) split into the tables.
    const gx = amp * 2 * Math.PI * kx;
    const gy = amp * 2 * Math.PI * ky;
    for (let y = 0; y < N; y++) {
      const cy = cosY[y];
      const sny = sinY[y];
      const row = y * N;
      for (let x = 0; x < N; x++) {
        const cs = cosX[x] * cy - sinX[x] * sny;
        sx[row + x] += gx * cs;
        sy[row + x] += gy * cs;
      }
    }
  }
  let max = 1e-6;
  for (let i = 0; i < N * N; i++) max = Math.max(max, Math.abs(sx[i]), Math.abs(sy[i]));
  const n8 = valueNoise(8, rand);
  const n16 = valueNoise(16, rand);
  const n32 = valueNoise(32, rand);
  const n64 = valueNoise(64, rand);
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      out[i * 4] = Math.round((0.5 + (0.5 * sx[i]) / max) * 255);
      out[i * 4 + 1] = Math.round((0.5 + (0.5 * sy[i]) / max) * 255);
      out[i * 4 + 2] = Math.round((0.66 * n8(x, y) + 0.34 * n16(x, y)) * 255);
      out[i * 4 + 3] = Math.round((0.66 * n32(x, y) + 0.34 * n64(x, y)) * 255);
    }
  }
  rippleCache = out;
  return out;
}

let cellCache: Uint8Array | null = null;
/** R: thin seams between jittered cells (caustics); G: wider seams (foam lace). 16 cells, tileable. */
export function cellTexture(): Uint8Array {
  if (cellCache) return cellCache;
  const rand = rng(1911);
  const C = 16;
  const pts = Float32Array.from({ length: C * C * 2 }, () => 0.12 + 0.76 * rand());
  const N = TEX;
  const out = new Uint8Array(N * N * 4);
  const sstep = (a: number, b: number, v: number) => {
    const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const fx = ((x + 0.5) / N) * C;
      const fy = ((y + 0.5) / N) * C;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      let d1 = 9;
      let d2 = 9;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const cx = (((ix + i) % C) + C) % C;
          const cy = (((iy + j) % C) + C) % C;
          const k = (cy * C + cx) * 2;
          const dx = ix + i + pts[k] - fx;
          const dy = iy + j + pts[k + 1] - fy;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
          } else if (dd < d2) d2 = dd;
        }
      }
      const e = Math.sqrt(d2) - Math.sqrt(d1); // small along cell borders
      const o = (y * N + x) * 4;
      out[o] = Math.round(Math.pow(1 - sstep(0, 0.2, e), 2.5) * 255);
      out[o + 1] = Math.round(Math.pow(1 - sstep(0, 0.5, e), 2) * 255);
      out[o + 2] = 0;
      out[o + 3] = 255;
    }
  }
  cellCache = out;
  return out;
}
