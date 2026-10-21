#!/bin/sh
# deep_region.sh [START END] — the natural deep sea (AENR 5A) for the 4K loop, without re-rendering
# the shore: re-render only the top of the frame with DEEP=2 and blend it onto frames-4k.
#
#   frames-4k/f_NNN.png        the existing 4K frames (render.sh 4k, DEEP=0) — read only
#   frames-4k-deep-raw/d_NNN.png  the deep part: the top 1680 of 3600 rows, full width (render
#                              border, cropped), DEEP=2, same mesh (GRID=0.025), samples and seed
#   frames-4k-deep/f_NNN.png   the result: old pixels up to 5 m seaward of the mean waterline (bit
#                              for bit), new ones from 7 m, a smoothstep blend between them, along
#                              the shore (deep_composite.py documents the mask)
#
# beach.py changes nothing up to 8 m (deep_of), so old and new agree across the 5–7 m band; each
# frame's agreement there is printed and anything above 3/255 is flagged. Resumable (frames
# already rendered are skipped). Needs ~10 GB of memory, like the 4K render: run it alone.
# Measured: ~2.4 min a frame on 4 CPUs (see the AENR 5A notes) — 192 frames ≈ 8 h.
# Then encode the result as before: sh encode.sh tools/blender/frames-4k-deep public/sea/blender 4k
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
CACHE="${BLENDER_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/slaice-blender}"
BIN="${BLENDER_BIN:-$CACHE/blender-5.2.2-linux-x64/blender}"
[ -x "$BIN" ] || { echo "No Blender at $BIN — run tools/mcp/blender.sh once (or set BLENDER_BIN)" >&2; exit 1; }
A="${1:-0}"; B="${2:-192}"
OLD="$HERE/frames-4k"; RAW="$HERE/frames-4k-deep-raw"; OUT="$HERE/frames-4k-deep"
n=$A
while [ "$n" -lt "$B" ]; do
  [ -f "$(printf "%s/f_%03d.png" "$OLD" "$n")" ] || { echo "missing $(printf "f_%03d.png" "$n") in $OLD — finish render.sh 4k first" >&2; exit 1; }
  n=$((n + 1))
done
mkdir -p "$RAW" "$OUT"
DEEP=2 BORDER_ROWS=1680 SKIP_EXISTING=1 VIEW=Standard GRID=0.025 BEACH_ASSETS="$HERE/assets" CAUS_DIR="$HERE/caus" \
  "$BIN" -b --factory-startup -P "$HERE/beach.py" -- 3840 3600 4 "$RAW/d_%03d.png" "$A" "$B"
python3 "$HERE/deep_composite.py" "$OLD" "$RAW" "$OUT" "$A" "$B"
echo "Done: $OUT. Encode with: sh $HERE/encode.sh $OUT <out dir> 4k (and fullhd / high / standard, scaled down)."
