import{r as K,j as Ce}from"./react-BSyyv8QX.js";import{Q as Ue,p as Ie,a0 as We,a1 as Be}from"./index-DsD3BBF5.js";import{b as Oe}from"./seaShore-DazdPM7k.js";import"./icons-DnMcxnvQ.js";import"./radix-BInn39V8.js";import"./vendor-C9Z-7UvD.js";const qe=`#version 300 es
// One oversized triangle covering the viewport; no vertex buffer needed.
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}
`,Xe=`#version 300 es
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
`,j=256;function Pe(o){let t=o>>>0;return()=>{t=t+1831565813>>>0;let r=t;return r=Math.imul(r^r>>>15,r|1),r^=r+Math.imul(r^r>>>7,r|61),((r^r>>>14)>>>0)/4294967296}}function ne(o,t){const r=Float32Array.from({length:o*o},t);return(l,a)=>{const i=l/j*o,h=a/j*o,m=Math.floor(i),x=Math.floor(h),f=i-m,n=h-x,T=f*f*(3-2*f),g=n*n*(3-2*n),e=(b,E)=>r[(E%o+o)%o*o+(b%o+o)%o],v=e(m,x),c=e(m+1,x),d=e(m,x+1),s=e(m+1,x+1);return v+(c-v)*T+(d-v)*g+(v-c-d+s)*T*g}}let ue=null;function ze(){if(ue)return ue;const o=Pe(811),t=j,r=new Float32Array(t*t),l=new Float32Array(t*t),a=new Float32Array(t),i=new Float32Array(t),h=new Float32Array(t),m=new Float32Array(t),x=22;for(let c=0;c<x;c++){const d=2*Math.pow(20,c/(x-1)),s=(o()*2-1)*1.1,b=Math.round(d*Math.sin(s));let E=Math.round(d*Math.cos(s));b===0&&E===0&&(E=1);const D=Math.pow(Math.hypot(b,E),-1.6),W=o()*Math.PI*2;for(let p=0;p<t;p++){const O=2*Math.PI*b*p/t+W;a[p]=Math.cos(O),i[p]=Math.sin(O);const V=2*Math.PI*E*p/t;h[p]=Math.cos(V),m[p]=Math.sin(V)}const B=D*2*Math.PI*b,P=D*2*Math.PI*E;for(let p=0;p<t;p++){const O=h[p],V=m[p],y=p*t;for(let k=0;k<t;k++){const N=a[k]*O-i[k]*V;r[y+k]+=B*N,l[y+k]+=P*N}}}let f=1e-6;for(let c=0;c<t*t;c++)f=Math.max(f,Math.abs(r[c]),Math.abs(l[c]));const n=ne(8,o),T=ne(16,o),g=ne(32,o),e=ne(64,o),v=new Uint8Array(t*t*4);for(let c=0;c<t;c++)for(let d=0;d<t;d++){const s=c*t+d;v[s*4]=Math.round((.5+.5*r[s]/f)*255),v[s*4+1]=Math.round((.5+.5*l[s]/f)*255),v[s*4+2]=Math.round((.66*n(d,c)+.34*T(d,c))*255),v[s*4+3]=Math.round((.66*g(d,c)+.34*e(d,c))*255)}return ue=v,v}let fe=null;function Ve(){if(fe)return fe;const o=Pe(1911),t=16,r=Float32Array.from({length:t*t*2},()=>.12+.76*o()),l=j,a=new Uint8Array(l*l*4),i=(h,m,x)=>{const f=Math.min(1,Math.max(0,(x-h)/(m-h)));return f*f*(3-2*f)};for(let h=0;h<l;h++)for(let m=0;m<l;m++){const x=(m+.5)/l*t,f=(h+.5)/l*t,n=Math.floor(x),T=Math.floor(f);let g=9,e=9;for(let d=-1;d<=1;d++)for(let s=-1;s<=1;s++){const b=((n+s)%t+t)%t,D=(((T+d)%t+t)%t*t+b)*2,W=n+s+r[D]-x,B=T+d+r[D+1]-f,P=W*W+B*B;P<g?(e=g,g=P):P<e&&(e=P)}const v=Math.sqrt(e)-Math.sqrt(g),c=(h*l+m)*4;a[c]=Math.round(Math.pow(1-i(0,.2,v),2.5)*255),a[c+1]=Math.round(Math.pow(1-i(0,.5,v),2)*255),a[c+2]=0,a[c+3]=255}return fe=a,a}const He=(()=>{try{return localStorage.getItem("slaice.liveSea")==="force"}catch{return!1}})(),Se={desktop:{ratio:.8,maxRatio:1.25,budget:16e5,fps:30},mobile:{ratio:.55,maxRatio:1,budget:45e4,fps:20}},Ye=.25,Ze={mobile:10,desktop:6},ke=6,_e=14,Ke=350,je=22,Qe=31.5,Je=.33,$e=780,et=o=>1-Math.pow(1-o,3),ie=o=>{const t=parseInt(o.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},tt=o=>{if(o.startsWith("#"))return[...ie(o),1];const t=o.match(/rgba?\(([^)]+)\)/);if(!t)return[1,1,1,.85];const[r=255,l=255,a=255,i=1]=t[1].split(",").map(h=>parseFloat(h));return[r/255,l/255,a/255,i]},I=(o,t,r)=>[o[0]+(t[0]-o[0])*r,o[1]+(t[1]-o[1])*r,o[2]+(t[2]-o[2])*r],de=[["uWind",1],["uDeep0",3],["uDeep1",3],["uAbsorb",3],["uFoam",4],["uSkyHor",3],["uSkyZen",3],["uLightDir",3],["uGlitCol",3],["uGlit",3],["uSunGlow",3],["uSunGlowCol",3],["uMoonGlow",3],["uMoonGlowCol",3],["uTintTop",3],["uTintDeep",3],["uGrade",4]],le={},se=de.reduce((o,[t,r])=>(le[t]=o,o+r),0),ot=[.8,.9,.97],at=[.36,.62,.88],Ae=[.13,.17,.3],rt=[.03,.05,.12],nt=[.66,.7,.74],st=(o,t)=>{const r=(o*1600-800)/900,l=Math.hypot(r,1),a=Math.cos(t);return[r/l*a,Math.sin(t),1/l*a]};function it(o,t,r,l){const a=r.light??We,i=(s,b)=>o.set(b,le[s]),h=a.cloud;i("uWind",[r.wind]),i("uDeep0",ie(t.sea[0])),i("uDeep1",ie(t.sea[1])),i("uAbsorb",ie(t.sea[2]).map(s=>Math.min(3,Math.max(.03,-Math.log(Math.min(.98,Math.max(.04,s))))))),i("uFoam",tt(t.foam));let m=I(ot,I(a.tint.top,[1,.82,.66],.35),a.warm),x=I(at,[.52,.5,.72],a.warm);m=I(m,Ae,a.night),x=I(x,rt,a.night);const f=I(nt,Ae,a.night);i("uSkyHor",I(m,f,h*.8)),i("uSkyZen",I(x,f,h*.8));const n=s=>.5+(s-.5)*l,g=a.night>.5?.11:.035+.6*Math.pow(Math.max(0,a.sunElev),.85),e=n(a.glitter.x);i("uLightDir",st(e,g)),i("uGlitCol",a.glitter.color),i("uGlit",[a.glitter.strength*(t.glint?1:.55),a.glitter.width*Math.pow(l,.7),e]);const v=a.warm*(1-.5*h);i("uSunGlow",[n(a.sunX),v,0]),i("uSunGlowCol",a.dawn?[1,.62,.46]:[1,.55,.24]),i("uMoonGlow",[n(a.moon.x),a.moon.strength,0]),i("uMoonGlowCol",a.moon.color),i("uTintTop",a.tint.top),i("uTintDeep",a.tint.deep);const c=Math.min(1,Math.max(0,(a.sunElev-.02)/.35)),d=.6+.4*Math.min(1,Math.max(0,(a.sunElev+.05)/.45));i("uGrade",[a.tint.amount,h,c*(1-.75*h),d])}function De(o,t,r){const l=o.createShader(t);return l?(o.shaderSource(l,r),o.compileShader(l),l):null}function pt({preset:o,dy:t,env:r,tier:l,onFail:a}){const i=K.useRef(null),h=K.useRef({preset:o,dy:t,env:r,tier:l});h.current={preset:o,dy:t,env:r,tier:l};const m=K.useRef(a);m.current=a;const x=K.useRef(()=>{});return K.useEffect(()=>{const f=i.current;if(!f)return;const n=document.createElement("canvas");n.className="absolute inset-0 w-full h-full",n.style.opacity="0",n.style.transition="opacity 900ms ease",f.appendChild(n);let T=!1;const g=()=>{T||m.current()},e=n.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,preserveDrawingBuffer:!1,powerPreference:"low-power",failIfMajorPerformanceCaveat:!He});if(!e){n.remove(),g();return}const v=e.getExtension("KHR_parallel_shader_compile"),c=De(e,e.VERTEX_SHADER,qe),d=De(e,e.FRAGMENT_SHADER,Xe),s=e.createProgram();if(!c||!d||!s){n.remove(),g();return}e.attachShader(s,c),e.attachShader(s,d),e.linkProgram(s);const b=e.createVertexArray(),E=Oe(),D=e.createTexture();e.bindTexture(e.TEXTURE_2D,D),e.pixelStorei(e.UNPACK_ALIGNMENT,1),e.texImage2D(e.TEXTURE_2D,0,e.R8,64,1,0,e.RED,e.UNSIGNED_BYTE,E.data),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const W=u=>{const w=e.createTexture();return e.bindTexture(e.TEXTURE_2D,w),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,j,j,0,e.RGBA,e.UNSIGNED_BYTE,u),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),w},B=W(ze()),P=W(Ve());let p={},O=!1;const V=()=>{if(!e.getProgramParameter(s,e.LINK_STATUS))return!1;e.useProgram(s);const u=["uRes","uTime","uDy","uShore","uShoreMap","uRipple","uCells",...de.map(([w])=>w)];return p=Object.fromEntries(u.map(w=>[w,e.getUniformLocation(s,w)])),e.uniform1i(p.uShore,0),e.uniform1i(p.uRipple,1),e.uniform1i(p.uCells,2),e.uniform2f(p.uShoreMap,E.off,E.scale),e.bindVertexArray(b),[D,B,P].forEach((w,M)=>{e.activeTexture(e.TEXTURE0+M),e.bindTexture(e.TEXTURE_2D,w)}),!0},y=new Float32Array(se),k=new Float32Array(se);let N=!0;const Q=Ue();let G=h.current.tier,J=1,q=G==="desktop"&&!Q?"live":"poster",X=0;const H=[];Q||(X=Ze[G]);let pe=Qe,F=!0,me=NaN,ce=h.current.dy,Y=h.current.dy,Z=Y,xe=-1/0,C=0,ve=!1,$=-1,ae=-1e9,we=0,ee=0,he=1/0,te=0;const ge=u=>Math.min(1,u.width/Math.max(1,u.height)*(900/1600));let ye=ge(f.getBoundingClientRect());const Ge=()=>{const u=f.getBoundingClientRect(),w=Se[G],M=Math.min((window.devicePixelRatio||1)*w.ratio,w.maxRatio)*Be()*J;let L=Math.max(1,Math.round(u.width*M)),R=Math.max(1,Math.round(u.height*M));const z=L*R/w.budget;z>1&&(L=Math.max(1,Math.round(L/Math.sqrt(z))),R=Math.max(1,Math.round(R/Math.sqrt(z)))),(n.width!==L||n.height!==R)&&(n.width=L,n.height=R),e.viewport(0,0,L,R),F=!1},U=()=>{!C&&!T&&!document.hidden&&(C=requestAnimationFrame(Le))};x.current=U;const Le=u=>{if(C=0,T||e.isContextLost())return;if(!O){if(v&&!e.getProgramParameter(s,v.COMPLETION_STATUS_KHR))return U();if(!V())return g();O=!0}const w=$<0?0:u-$;$=u;const M=h.current;M.dy!==Y&&(ce=Q?M.dy:Z,Y=M.dy,xe=Q?-1/0:u);const L=(u-xe)/$e,R=L<1;if(Z=R?ce+(Y-ce)*et(Math.max(0,L)):Y,(u<we||Ie(u))&&!R)return $=-1,U();M.tier!==G&&(G=M.tier,J=1,q=G==="desktop"&&!Q?"live":"poster",F=!0),q==="live"&&w>0&&!R&&(he=Math.min(he,w),ee=ee?ee*.92+w*.08:w,te=ee>Math.max(je,he*1.6)?te+1:Math.max(0,te-2),te>45&&(te=0,ee=0,J>Ye?(J/=2,F=!0):q="poster")),it(k,M.preset,M.env,ye);let z=!0;for(let _=0;_<se;_++)Math.abs(k[_]-y[_])>.001&&(z=!1);const Me=q==="live";if(!Me&&z&&!N&&!F&&Z===me&&X===0)return;const Ne=1e3/Se[G].fps;if(!N&&!R&&u-ae<Ne-2)return U();const Re=N?0:Math.min(.1,(u-ae)/1e3);if(ae=u,N)y.set(k);else{const _=1-Math.exp(-Re/Je);for(let S=0;S<se;S++)y[S]+=(k[S]-y[S])*_}N=!1,Me&&(pe+=Re*(.8+.6*y[le.uWind])),F&&Ge();const Fe=X>0?performance.now():0;e.uniform2f(p.uRes,n.width,n.height),e.uniform1f(p.uTime,pe),e.uniform1f(p.uDy,Z),me=Z;for(const[_,S]of de){const A=le[_],oe=p[_];S===1?e.uniform1f(oe,y[A]):S===3?e.uniform3f(oe,y[A],y[A+1],y[A+2]):e.uniform4f(oe,y[A],y[A+1],y[A+2],y[A+3])}if(e.drawArrays(e.TRIANGLES,0,3),X>0){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array(4)),H.push(performance.now()-Fe);const _=G==="mobile"?ke:_e;if(H.length>2&&H[H.length-1]>4*_&&(X=1),--X===0){const S=H.slice(2).reduce((A,oe)=>A+oe,0)/Math.max(1,H.length-2);G==="mobile"?q=S<ke?"live":"poster":S>_e&&(J=.5,F=!0),n.dataset.probeMs=S.toFixed(2)}}n.dataset.mode=q,ve||(ve=!0,n.style.opacity="1"),(q==="live"||X>0||!z||F||R||Z!==Y)&&U()},Te=new ResizeObserver(([u])=>{u&&(ye=ge(u.contentRect)),F=!0,U()});Te.observe(f);const re=()=>{we=performance.now()+Ke};window.addEventListener("pointerdown",re,{capture:!0,passive:!0}),window.addEventListener("keydown",re,{capture:!0,passive:!0});const be=()=>{cancelAnimationFrame(C),C=0,$=-1,document.hidden||(ae=performance.now(),U())};document.addEventListener("visibilitychange",be);const Ee=u=>{u.preventDefault(),cancelAnimationFrame(C),C=0,g()};return n.addEventListener("webglcontextlost",Ee),U(),()=>{var u;T=!0,cancelAnimationFrame(C),x.current=()=>{},Te.disconnect(),window.removeEventListener("pointerdown",re,{capture:!0}),window.removeEventListener("keydown",re,{capture:!0}),document.removeEventListener("visibilitychange",be),n.removeEventListener("webglcontextlost",Ee),e.deleteProgram(s),e.deleteShader(c),e.deleteShader(d),e.deleteTexture(D),e.deleteTexture(B),e.deleteTexture(P),e.deleteVertexArray(b),(u=e.getExtension("WEBGL_lose_context"))==null||u.loseContext(),n.remove()}},[]),K.useEffect(()=>{x.current()},[o,t,r,l]),Ce.jsx("div",{ref:i,"aria-hidden":"true",className:"absolute inset-0 pointer-events-none"})}export{pt as default};
