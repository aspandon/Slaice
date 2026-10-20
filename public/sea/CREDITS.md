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
   - `sea-loop.mp4` — H.264 High, yuv420p, `+faststart`, 1280×720, two-pass about 1.85 Mbps.
   - `sea-loop.webm` — VP9 profile 0, 1280×720, two-pass about 1.55 Mbps.
   - `sea-loop-480.mp4` — H.264 High, yuv420p, `+faststart`, 854×480, two-pass about 0.71 Mbps.
   - `sea-poster.webp` — first frame of the loop, 1280×720, WebP quality 82.
