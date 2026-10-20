#!/bin/sh
# encode.sh FRAMES_DIR OUT_DIR [TIER] [NF] [TAIL]
# The loop's frames 0..NF-1 plus a TAIL of its first frames (the LoopVideo handover), at 24 fps,
# encoded for one resolution tier (AENR-844):
#   standard  1280 x 1200 desktop, 648 x 1200 phone cut  — beach.*,        beach-portrait.*
#   high      1600 x 1500 desktop, 810 x 1500 phone cut  — beach-high.*,   beach-portrait-high.*
#   fullhd    1920 x 1800 desktop, 972 x 1800 phone cut  — beach-fullhd.*, beach-portrait-fullhd.*
# The frames may be larger than the tier (High is cut from the Full HD render): they are scaled
# down, never up. Standard keeps its first encode's rates; High and Full HD get ~0.10 bit per pixel
# (H.264) / 0.08 (VP9) — moving water and foam are fine detail that a lean encode smears.
set -eu
FR="$(cd "$1" && pwd)"; OUT="$2"; TIER="${3:-standard}"; NF="${4:-192}"; TAIL="${5:-24}"
case "$TIER" in
  standard) W=1280; SUF="" ;;
  high) W=1600; SUF="-high" ;;
  fullhd) W=1920; SUF="-fullhd" ;;
  *) echo "unknown tier $TIER (standard | high | fullhd)" >&2; exit 1 ;;
esac
H=$((W * 15 / 16))
# The phone cut: the middle 810 of the scene's 1600 units (x 395..1205) — all a portrait screen shows.
PW=$((W * 810 / 1600 / 2 * 2))
# Source size, from the first frame.
SW=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$FR/f_000.png")
[ "$SW" -ge "$W" ] || { echo "frames are $SW px wide — too small for $TIER ($W px)" >&2; exit 1; }
SPW=$((SW * 810 / 1600 / 2 * 2))
SX=$((SW * 395 / 1600))
SH=$((SW * 15 / 16))
if [ "$SW" -eq "$W" ]; then
  DESK="null"
  CROP="crop=$SPW:$SH:$SX:0"
else
  DESK="scale=$W:$H:flags=lanczos"
  CROP="crop=$SPW:$SH:$SX:0,scale=$PW:$H:flags=lanczos"
fi
# Bitrates (kbit/s): bits per pixel (in thousandths) x pixels x 24 fps.
r() { echo $(($1 * $2 * H * 24 / 1000 / 1000)); }
if [ "$TIER" = standard ]; then
  B264=2600; BVP9=2200; P264=950; PVP9=800
else
  B264=$(r 100 "$W"); BVP9=$(r 80 "$W"); P264=$(r 100 "$PW"); PVP9=$(r 80 "$PW")
fi

SEQ="$FR/seq"
rm -rf "$SEQ"; mkdir -p "$SEQ" "$OUT"
i=0
while [ "$i" -lt $((NF + TAIL)) ]; do
  src=$(printf "%s/f_%03d.png" "$FR" $((i % NF)))
  ln -s "$src" "$(printf "%s/s_%03d.png" "$SEQ" "$i")"
  i=$((i + 1))
done
IN="-framerate 24 -i $SEQ/s_%03d.png"
P="$FR/ff2pass$SUF"
X264="-c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow"
VP9="-c:v libvpx-vp9 -pix_fmt yuv420p -row-mt 1 -deadline good"
# desktop: H.264 + VP9, two-pass
ffmpeg -y -loglevel error $IN -vf "$DESK" $X264 -b:v "${B264}k" -pass 1 -passlogfile "$P" -an -f mp4 /dev/null
ffmpeg -y -loglevel error $IN -vf "$DESK" $X264 -b:v "${B264}k" -pass 2 -passlogfile "$P" -an -movflags +faststart "$OUT/beach$SUF.mp4"
ffmpeg -y -loglevel error $IN -vf "$DESK" $VP9 -b:v "${BVP9}k" -cpu-used 2 -pass 1 -passlogfile "$P-vp9" -an -f webm /dev/null
ffmpeg -y -loglevel error $IN -vf "$DESK" $VP9 -b:v "${BVP9}k" -cpu-used 1 -pass 2 -passlogfile "$P-vp9" -an "$OUT/beach$SUF.webm"
# phones: the portrait cut
ffmpeg -y -loglevel error $IN -vf "$CROP" $X264 -b:v "${P264}k" -pass 1 -passlogfile "$P-p" -an -f mp4 /dev/null
ffmpeg -y -loglevel error $IN -vf "$CROP" $X264 -b:v "${P264}k" -pass 2 -passlogfile "$P-p" -an -movflags +faststart "$OUT/beach-portrait$SUF.mp4"
ffmpeg -y -loglevel error $IN -vf "$CROP" $VP9 -b:v "${PVP9}k" -cpu-used 2 -pass 1 -passlogfile "$P-pv" -an -f webm /dev/null
ffmpeg -y -loglevel error $IN -vf "$CROP" $VP9 -b:v "${PVP9}k" -cpu-used 1 -pass 2 -passlogfile "$P-pv" -an "$OUT/beach-portrait$SUF.webm"
# posters: the loop's first frame
ffmpeg -y -loglevel error -i "$FR/f_000.png" -vf "$DESK" -c:v libwebp -quality 80 "$OUT/beach$SUF-poster.webp"
ffmpeg -y -loglevel error -i "$FR/f_000.png" -vf "$CROP" -c:v libwebp -quality 80 "$OUT/beach-portrait$SUF-poster.webp"
rm -f "$P"*
ls -la "$OUT"
