# The Blender sea and beach — credits (AENR-827)

An original render made for Slaice: a top-down Greek beach (open sea at the top, turquoise shallows over
sloping sand, a shore break running up the wet sand, light golden-white sand below), played as a seamless
8-second video loop behind the guest site. No footage or third-party imagery is in the frames apart from
the sky that lights them.

## What made it

| What                     | Who / licence                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blender 5.2.2 LTS        | Blender Foundation — GPL-3.0-or-later. The tool only; renders made with Blender belong to their author (<https://www.blender.org/about/license/>).                               |
| Cycles, OpenImageDenoise | Blender's path tracer (Apache-2.0) and Intel Open Image Denoise (Apache-2.0)                                                                                                     |
| MCP for Blender 2.2.1    | Siddharth Ahuja and contributors, `ahujasid/blender-mcp` — MIT. Used to build and preview the scene from the agent session (`execute_code` over `localhost:9876`); telemetry off |
| Sky                      | Poly Haven, **Kloofendal 43d Clear (Pure Sky)** by Greg Zaal — CC0 1.0 (<https://polyhaven.com/a/kloofendal_43d_clear_puresky>, 2K HDR, downloaded 2026-10-20)                   |
| Everything else          | Procedural, made for this render: the sand, the seabed, the water surface, the waves, the foam, the caustics (`tools/blender/`)                                                  |

The Poly Haven sand texture `sand_03` (CC0) was tried and left out: at this scale it tiled visibly.

## How it was rendered

- **Scene** (`tools/blender/beach.py`): a 64 × 60 m beach, seen by an orthographic camera straight down,
  so 1 app scene unit = 4 cm and the frame covers scene x 0–1600, y −250 to 1250 (1600 × 1500 units). The
  shoreline follows the app's own sand-top curve (`src/lib/seaShore.ts`): the mean waterline 30 units above
  it, the highest run-up about 30 units below.
- **Sand and seabed**: a height field (beach face 1 : 13, gentle bars and beach cusps); the colour seen
  through the water comes from the depth — red absorbed first, then an in-scatter that runs turquoise →
  azure → deep blue — with sand ripples and dark seagrass patches in mid-water.
- **Water**: a refractive surface (IOR 1.333) over the seabed, its height set per vertex each frame — chop
  from wave trains travelling ashore, a shore break with its own dispersion and shoaling, a thin swash
  sheet that runs up the beach and draws back — plus capillary ripples in the shader. The foam (the swash's
  leading edge, the bore behind each breaking crest, lingering lace) is a per-vertex field shaped by noise
  that moves with the water; the sand behind the backwash keeps a glossy film for a moment.
- **Caustics** (`tools/blender/caustics.py`): real ones — a tileable, looping wavy surface refracts a
  vertical sun onto a floor and the rays are counted into a light map, 192 frames of 384², sampled twice
  on the seabed at different scales and angles.
- **Light**: the Poly Haven sky, rotated so its sun stands about 62° high over the sea; neutral bright
  daylight, so the app can grade it for every other hour and the weather.
- **Render**: Cycles on 4 CPU cores, 1280 × 1200, 4 samples with adaptive sampling and OpenImageDenoise,
  view transform Standard; ≈ 30 s a frame, 192 frames in 1 h 35 min. Encoded with ffmpeg (two-pass).

## The loop

Everything that moves is exactly periodic over T = 8 s (192 frames at 24 fps), so frame 192 is frame 0:
each wave train of the sea has a whole number of cycles per loop (ω = 2πn / T), the shore break has two
waves per loop, the shader noise walks a circle in 4D noise space, and the caustic maps loop the same way.
Checked numerically: the water surface, the foam field and the swash at t = 8 s differ from t = 0 by
< 1e-14. The video files run one second past the loop (frames 0–191, then 0–23 again), and the guest
site's two players hand over at the loop's own period, crossfading identical frames — the restart can't
be seen. (The two stacked Ocean modifiers with a time crossfade were the first idea; a periodic wave
spectrum closes the loop just as exactly and also lets the waves feel the depth near the shore.)

## Files

| File                         | What                                                         | Size    |
| ---------------------------- | ------------------------------------------------------------ | ------- |
| `beach.webm`                 | desktop, 1280 × 1200, VP9, two-pass ≈ 2.2 Mb/s, 9 s          | 2.48 MB |
| `beach.mp4`                  | desktop, 1280 × 1200, H.264 High, two-pass ≈ 2.6 Mb/s        | 2.92 MB |
| `beach-portrait.mp4`         | phones, the middle 810 units, 648 × 1200, H.264 ≈ 0.95 Mb/s  | 1.07 MB |
| `beach-portrait.webm`        | phones, the same cut, VP9 ≈ 0.8 Mb/s (no H.264)              | 0.90 MB |
| `beach-poster.webp`          | the loop's first frame, WebP q80 (reduced motion, Save-Data) | 78 kB   |
| `beach-portrait-poster.webp` | the same, portrait cut                                       | 40 kB   |

Re-render: `tools/blender/render.sh` (or `render.sh preview` for one quick frame).
