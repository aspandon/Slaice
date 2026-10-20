#!/bin/sh
# Re-render the Blender sea and beach (AENR-827) into public/sea/blender/. Development tooling only.
# Needs Blender 5.2 (tools/mcp/blender.sh fetches the portable build into its cache), python3 with
# numpy + Pillow (for the caustics) and ffmpeg (libx264, libvpx-vp9, libwebp). About 2 h on 4 CPUs.
#
#   tools/blender/render.sh            full render (1280 x 1200, 4 spp + OpenImageDenoise, 192 frames)
#   tools/blender/render.sh preview    one 640 x 600 frame, to check a look quickly
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
CACHE="${BLENDER_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/slaice-blender}"
BIN="${BLENDER_BIN:-$CACHE/blender-5.2.2-linux-x64/blender}"
[ -x "$BIN" ] || { echo "No Blender at $BIN — run tools/mcp/blender.sh once (or set BLENDER_BIN)" >&2; exit 1; }
WORK="$HERE/frames"  # git-ignored
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
"$BIN" -b --factory-startup -P "$HERE/beach.py" -- 1280 1200 4 "$WORK/f_%03d.png" 0 192
sh "$HERE/encode.sh" "$WORK" "$ROOT/public/sea/blender"
echo "Done. Delete $WORK when happy (≈370 MB of PNG frames)."
