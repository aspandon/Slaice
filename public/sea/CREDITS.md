# Sea background video — credits

| Field       | Value                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Title       | Clear ocean water ("Drone shot of crystal clear water in the ocean.")                          |
| Source page | <https://coverr.co/videos/clear-ocean-water-zu1hathkpo>                                       |
| Source file | `https://cdn.coverr.co/videos/coverr-clear-ocean-water-5446/1080p.mp4` (1920×1080, 23.976 fps, 15.9 s, no audio) |
| Author      | Coverr (in-house clip; no individual contributor is listed — `contributor: null`)             |
| Published   | 2021-11-04 on Coverr (free tier, `isPremium: false`, `isAiGenerated: false`)                   |
| Licence     | Coverr License — <https://coverr.co/license>                                                   |
| Downloaded  | 2026-10-20                                                                                     |

## Licence summary (from <https://coverr.co/license>, read 2026-10-20)

> All videos and music tracks published on Coverr.co are available for free for both commercial and
> non-commercial purposes. You are not required to seek permission from or provide credit to the
> content creator or Coverr.co, although it is appreciated when possible. Coverr.co grants you an
> irrevocable, non-exclusive, worldwide copyright license to download, copy, modify, perform, and use
> videos and music from Coverr.co for free, including for commercial purposes […]

Not permitted: building a similar/competing stock service from Coverr content, and using it to train
AI models or as a dataset. Neither applies to a website background. Attribution is optional; this file
records it anyway.

## What was changed

1. **Trim** — used source 0.75 s – 11.35 s (start point picked by comparing frames so the loop's start
   and end look as close as possible).
2. **Seamless loop** — output = source 1.75 s – 11.35 s (9.6 s); over the last 1.0 s it crossfades into
   source 0.75 s – 1.75 s, so the last frame flows into the first. ffmpeg `trim` + `xfade=fade` +
   `concat`. Final length 9.63 s (231 frames at 23.976 fps).
3. **Scale** — 1920×1080 → 1280×720 (Lanczos). No crop needed (already 16:9). No colour grading.
4. **Re-encode** (no audio track):
   - (AENR-835) rebuilt from the 1080p source with the same loop: `sea-loop-1080.mp4` (H.264, 1920×1080, two-pass ≈3.8 Mbps), `sea-loop-1080.webm` (VP9 ≈3 Mbps), `sea-loop.mp4` (H.264, 1280×720 for phones, ≈1.9 Mbps); graded to Greek turquoise (gradient map); the 480p and 720p WebM files are retired.
  - `sea-loop.mp4` (earlier) — H.264 High, yuv420p, `+faststart`, 1280×720, two-pass about 1.85 Mbps.
   - `sea-loop.webm` — VP9 profile 0, 1280×720, two-pass about 1.55 Mbps.
   - `sea-loop-480.mp4` — H.264 High, yuv420p, `+faststart`, 854×480, two-pass about 0.71 Mbps.
   - `sea-poster.webp` — first frame of the loop, 1280×720, WebP quality 82.

## Full HD and 4K (AENR-859)

The Video sea's **Full HD** and **4K** resolutions come from a second clip, filmed in 4K; **Standard**
stays the Coverr clip above (its 4K original is only offered to signed-in Coverr users).

| Field       | Value                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Title       | "Aerial view of sparkling turquoise sea"                                                        |
| Source page | <https://www.pexels.com/video/aerial-view-of-sparkling-turquoise-sea-38223113/>                |
| Source file | `https://videos.pexels.com/video-files/38223113/16227812_3840_2160_60fps.mp4` (3840×2160, 59.94 fps, 16.2 s, H.264, no audio) |
| Author      | Efrem Efre (Pexels)                                                                             |
| Licence     | Pexels License — <https://www.pexels.com/license/> (free to use, commercial included; attribution not required; not to be resold unaltered or redistributed as stock) |
| Downloaded  | 2026-10-20                                                                                      |
| Credit      | "Video by Efrem Efre from Pexels" (optional; given here)                                        |

What was changed (`tools/video/make-master.sh`, `tools/video/encode-sea.sh`):

1. **Grade** — matched to the first clip's Greek turquoise: a colour transfer in Lab (mean and spread
   of frames of `sea-loop-1080.mp4` onto frames of this clip, the colour spread capped at 1.25× so
   the seabed doesn't turn blotchy), baked into a 3D LUT (`greek-lut.py`, ffmpeg `lut3d`).
2. **Seamless loop** — 24 fps; source 2.0–11.6 s, its last second crossfaded into source 1.0–2.0 s,
   so the last frame flows into the first (9.6 s, 230 frames). The jump from the last frame to the
   first measures like any one frame to the next (PSNR 22.8 dB, against 24.6 dB).
3. **Cuts and encodes** (two-pass, no audio): 3840×2160 and 1920×1080 for computers; for phones and
   tablets held upright, a 9:16 cut of the middle (x 1312–2528) at 1216×2160 and 1080×1920. H.264
   High (`+faststart`) and VP9, at about 0.10–0.16 bit per pixel; WebP posters (the first frame).
