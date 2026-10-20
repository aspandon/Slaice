#!/bin/sh
# encode-sea.sh MASTER OUT_DIR — the Video sea's Full HD and 4K files (AENR-859). Development tooling only.
#
# MASTER is the graded, seamless 4K loop (3840 x 2160, 24 fps, 9.6 s) made from the source clip —
# see make-master.sh and public/sea/CREDITS.md. Writes, for computers (16:9) and for phones and
# tablets held upright (a 9:16 cut of the middle, x 1312–2528):
#   sea-4k.webm / .mp4                    3840 x 2160  VP9 / H.264 (level 5.1)
#   sea-fullhd.webm / .mp4                1920 x 1080  VP9 / H.264 (level 4.0)
#   sea-portrait-4k.mp4 / .webm           1216 x 2160  H.264 (level 5.0) / VP9
#   sea-portrait-fullhd.mp4 / .webm       1080 x 1920  H.264 (level 4.0) / VP9
#   and a WebP poster of each (the loop's first frame).
# Rates are set for sharpness (~0.10–0.16 bit per pixel): sun glitter on moving water is the
# hardest detail to keep, and a lean encode turns it to mush. Two-pass; needs ffmpeg with
# libx264, libvpx-vp9 and libwebp.
set -eu
IN="$1"; OUT="$2"; mkdir -p "$OUT"
P="$OUT/.ff2pass"
X264="-c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow"
VP9="-c:v libvpx-vp9 -pix_fmt yuv420p -row-mt 1 -deadline good -tile-columns 2"
CUT="crop=1216:2160:1312:0"
# name filter h264-kbps vp9-kbps
one() {
  ffmpeg -y -loglevel error -i "$IN" -vf "$2" $X264 -b:v "${3}k" -pass 1 -passlogfile "$P" -an -f mp4 /dev/null
  ffmpeg -y -loglevel error -i "$IN" -vf "$2" $X264 -b:v "${3}k" -pass 2 -passlogfile "$P" -an -movflags +faststart "$OUT/$1.mp4"
  ffmpeg -y -loglevel error -i "$IN" -vf "$2" $VP9 -b:v "${4}k" -cpu-used 2 -pass 1 -passlogfile "$P-vp9" -an -f webm /dev/null
  ffmpeg -y -loglevel error -i "$IN" -vf "$2" $VP9 -b:v "${4}k" -cpu-used 2 -pass 2 -passlogfile "$P-vp9" -an "$OUT/$1.webm"
  ffmpeg -y -loglevel error -i "$IN" -frames:v 1 -vf "$2" -c:v libwebp -quality 82 "$OUT/$1-poster.webp"
}
one sea-4k "null" 28000 20000
one sea-fullhd "scale=1920:1080:flags=lanczos" 8000 6000
one sea-portrait-4k "$CUT" 10000 7500
one sea-portrait-fullhd "$CUT,scale=1080:1920:flags=lanczos" 8000 6000
rm -f "$P"*
ls -la "$OUT"
