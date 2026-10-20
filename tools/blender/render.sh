#!/bin/sh
# Re-render the Blender sea and beach (AENR-827) into public/sea/blender/. Development tooling only.
# Needs Blender 5.2 (tools/mcp/blender.sh fetches the portable build into its cache), python3 with
# numpy + Pillow (for the caustics) and ffmpeg (libx264, libvpx-vp9, libwebp). About 2 h on 4 CPUs.
#
#   tools/blender/render.sh            Standard: 1280 x 1200, 4 spp + OpenImageDenoise, 192 frames (~1.5 h)
#   tools/blender/render.sh fullhd     Full HD: 1920 x 1800 (~4 h), encoded as Full HD and as High
#                                      (1600 x 1500, scaled down from it) — AENR-844
#   tools/blender/render.sh preview    one 640 x 600 frame, to check a look quickly
# An interrupted render resumes: frames already written are skipped.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
CACHE="${BLENDER_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/slaice-blender}"
BIN="${BLENDER_BIN:-$CACHE/blender-5.2.2-linux-x64/blender}"
[ -x "$BIN" ] || { echo "No Blender at $BIN — run tools/mcp/blender.sh once (or set BLENDER_BIN)" >&2; exit 1; }
TIER="${1:-standard}"
WORK="$HERE/frames"  # git-ignored
[ "$TIER" = fullhd ] && WORK="$HERE/frames-fullhd"
mkdir -p "$WORK" "$HERE/assets"

# The sky (Poly Haven, CC0) — kept out of git.
HDR="$HERE/assets/kloofendal_43d_clear_puresky_2k.hdr"
[ -f "$HDR" ] || curl -fL -o "$HDR" https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_43d_clear_puresky_2k.hdr
# The caustic light maps (tileable, looping) — made once.
[ -f "$HERE/caus/caus_191.png" ] || python3 "$HERE/caustics.py" "$HERE/caus"

export VIEW=Standard GRID=0.1 BEACH_ASSETS="$HERE/assets" CAUS_DIR="$HERE/caus"
if [ "${1:-}" = "preview" ]; then
  GRID=0.12 "$BIN" -b --factory-startup -P "$HERE/beach.py" -- 640 600 4 "$WORK/preview_%03d.png" 40 41
  echo "Preview: $WORK/preview_040.png"
  exit 0
fi
export SKIP_EXISTING=1
if [ "$TIER" = fullhd ]; then
  "$BIN" -b --factory-startup -P "$HERE/beach.py" -- 1920 1800 4 "$WORK/f_%03d.png" 0 192
  sh "$HERE/encode.sh" "$WORK" "$ROOT/public/sea/blender" fullhd
  sh "$HERE/encode.sh" "$WORK" "$ROOT/public/sea/blender" high
else
  "$BIN" -b --factory-startup -P "$HERE/beach.py" -- 1280 1200 4 "$WORK/f_%03d.png" 0 192
  sh "$HERE/encode.sh" "$WORK" "$ROOT/public/sea/blender" standard
fi
echo "Done. Delete $WORK when happy (≈370 MB of PNG frames; ≈830 MB at Full HD)."
