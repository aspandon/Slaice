// Bakes the sand-noise images the beach backdrop textures its sand with (perf 4A).
//
// The scene used to texture its sand with two live SVG fractal-noise filters
// (feTurbulence → feColorMatrix → feComposite). Browsers compute those on the
// CPU, pixel by pixel, every time the sand re-rasterises — the Plan slide and the
// camera zoom do. This script renders the same turbulence once, in headless
// Chromium, and saves it as lossless WebP into public/textures/. Beach.tsx draws
// the images clipped to the sand: no filters, masks or patterns at runtime.
//
//   sand-grain.webp         fine grain (baseFrequency 0.9, numOctaves 2, seed 3)
//                           in the old grain colour. A seamless tile
//                           (stitchTiles) of 120 × 120 scene units — a whole
//                           number of noise periods (0.9 × 120 = 108), so
//                           stitching doesn't nudge the frequency — at 3 px per
//                           unit (360 px): sharp on a dpr-3 phone.
//   sand-mottle-<id>.webp   large damp patches (baseFrequency 0.011 0.02,
//                           numOctaves 2, seed 11), one per grainy preset in that
//                           preset's tint (sand[2] darkened to 55%). One image
//                           over the whole 1600 × 900 scene at 0.5 px per unit
//                           (800 × 450 px): the noise is smooth, so it needs no
//                           tiling and upscales invisibly.
//
// Each image is the old filter's output, composited as before: colour = its
// colour-matrix tint, which the filter computed in linearRGB (so the sRGB
// encoding of it is what showed), alpha = noise × the matrix alpha (0.18 grain,
// 0.12 mottle) × the 0.5 opacity the sand path carried. Pixels are written
// unpremultiplied through WebGL, so the faint alpha keeps an exact flat colour
// (a 2D canvas would round it to noise and triple the file size).
//
// Re-run after adding a `grain: true` preset or changing a grainy preset's sand
// colour. Change a size here → update GRAIN_TILE / the mottle size in Beach.tsx.
//
// Run from the repo root (uses tools/orbit's Playwright: `cd tools/orbit && npm install`;
// Node ≥ 22.18 for the .ts import):
//   node tools/textures/sand-tiles.mjs [outDir=public/textures]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { BACKGROUNDS } from "../../src/data/backgrounds.ts";

const require = createRequire(new URL("../orbit/package.json", import.meta.url));
const { chromium } = require("playwright");

const OUT = process.argv[2] || "public/textures";
const CHROMIUM =
  process.env.CHROMIUM_PATH ||
  ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) =>
    fs.existsSync(p),
  );

/* Linear-light 0–1 → sRGB 0–255, as the filter's linearRGB → sRGB step. */
const srgb = (c) => Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
/* Beach.tsx's old shadeRgb: a hex colour darkened by f, linear 0–1 floats. */
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => (c / 255) * f);
};

const IMAGES = [
  {
    file: "sand-grain.webp",
    w: 120,
    h: 120,
    density: 3,
    noise: `baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch"`,
    rgb: [0.62, 0.48, 0.32],
    alpha: 0.18 * 0.5,
  },
  ...BACKGROUNDS.filter((p) => p.grain).map((p) => ({
    file: `sand-mottle-${p.id}.webp`,
    w: 1600,
    h: 900,
    density: 0.5,
    noise: `baseFrequency="0.011 0.02" numOctaves="2" seed="11"`,
    rgb: shade(p.sand[2], 0.55),
    alpha: 0.12 * 0.5,
  })),
];

/* The turbulence's alpha channel as opaque grey (sRGB interpolation, so the grey level is the alpha). */
const noiseSvg = ({ w, h, density, noise }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w * density}" height="${h * density}" viewBox="0 0 ${w} ${h}">
    <filter id="f" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <feTurbulence type="fractalNoise" ${noise} />
      <feColorMatrix color-interpolation-filters="sRGB" values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1" />
    </filter>
    <rect width="${w}" height="${h}" filter="url(#f)" />
  </svg>`;

/* In the page: render the noise, build the final RGBA, encode it losslessly. */
async function bake([markup, rgb, alpha]) {
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  await img.decode();
  const { width: W, height: H } = img;
  const c2d = document.createElement("canvas");
  c2d.width = W;
  c2d.height = H;
  const ctx = c2d.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const grey = ctx.getImageData(0, 0, W, H).data;
  // Decoders premultiply 8-bit colour by alpha rounding *down*; at these faint
  // alphas that alone darkens the sand by a level or more. So store, per pixel,
  // the smallest colour whose premultiplied value comes out exactly right —
  // under rounding down or to nearest alike.
  const px = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = Math.round(grey[i * 4] * alpha);
    for (let ch = 0; ch < 3; ch++)
      px[i * 4 + ch] = a ? Math.ceil((Math.round((rgb[ch] * a) / 255) * 255) / a) : rgb[ch];
    px[i * 4 + 3] = a;
  }
  // Draw the pixels 1:1 into an unpremultiplied WebGL canvas and encode that.
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const gl = c.getContext("webgl", {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    antialias: false,
  });
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
  for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(
    prog,
    shader(
      gl.VERTEX_SHADER,
      "attribute vec2 p; varying vec2 uv; void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }",
    ),
  );
  gl.attachShader(
    prog,
    shader(
      gl.FRAGMENT_SHADER,
      "precision highp float; varying vec2 uv; uniform sampler2D t; void main() { gl_FragColor = texture2D(t, vec2(uv.x, 1.0 - uv.y)); }",
    ),
  );
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return c.toDataURL("image/webp", 1); // quality 1 = lossless
}

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
const page = await browser.newPage();
fs.mkdirSync(OUT, { recursive: true });
for (const img of IMAGES) {
  const url = await page.evaluate(bake, [noiseSvg(img), img.rgb.map(srgb), img.alpha]);
  const buf = Buffer.from(url.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT, img.file), buf);
  console.log(
    `${img.file}: ${img.w * img.density}×${img.h * img.density}px, ${(buf.length / 1024).toFixed(1)} KB`,
  );
}
await browser.close();
