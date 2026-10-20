#!/bin/sh
# encode.sh FRAMES_DIR OUT_DIR [NF] [TAIL]
# The loop's frames 0..NF-1 plus a TAIL of its first frames (the LoopVideo handover), at 24 fps.
set -eu
FR="$(cd "$1" && pwd)"; OUT="$2"; NF="${3:-192}"; TAIL="${4:-24}"
SEQ="$FR/seq"
rm -rf "$SEQ"; mkdir -p "$SEQ" "$OUT"
i=0
while [ "$i" -lt $((NF + TAIL)) ]; do
  src=$(printf "%s/f_%03d.png" "$FR" $((i % NF)))
  ln -s "$src" "$(printf "%s/s_%03d.png" "$SEQ" "$i")"
  i=$((i + 1))
done
IN="-framerate 24 -i $SEQ/s_%03d.png"
P="$FR/ff2pass"
# desktop: 1280x1200, H.264 + VP9, two-pass
ffmpeg -y -loglevel error $IN -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 2600k -pass 1 -passlogfile "$P" -an -f mp4 /dev/null
ffmpeg -y -loglevel error $IN -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 2600k -pass 2 -passlogfile "$P" -an -movflags +faststart "$OUT/beach.mp4"
ffmpeg -y -loglevel error $IN -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 2200k -row-mt 1 -deadline good -cpu-used 2 -pass 1 -passlogfile "$P-vp9" -an -f webm /dev/null
ffmpeg -y -loglevel error $IN -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 2200k -row-mt 1 -deadline good -cpu-used 1 -pass 2 -passlogfile "$P-vp9" -an "$OUT/beach.webm"
# phones: the middle 810 of 1600 scene units (x 316..964 px), 648x1200 (no rescale)
CROP="crop=648:1200:316:0"
ffmpeg -y -loglevel error $IN -vf "$CROP" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 950k -pass 1 -passlogfile "$P-p" -an -f mp4 /dev/null
ffmpeg -y -loglevel error $IN -vf "$CROP" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 950k -pass 2 -passlogfile "$P-p" -an -movflags +faststart "$OUT/beach-portrait.mp4"
ffmpeg -y -loglevel error $IN -vf "$CROP" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 800k -row-mt 1 -deadline good -cpu-used 2 -pass 1 -passlogfile "$P-pv" -an -f webm /dev/null
ffmpeg -y -loglevel error $IN -vf "$CROP" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 800k -row-mt 1 -deadline good -cpu-used 1 -pass 2 -passlogfile "$P-pv" -an "$OUT/beach-portrait.webm"
# posters: the loop's first frame
ffmpeg -y -loglevel error -i "$FR/f_000.png" -c:v libwebp -quality 80 "$OUT/beach-poster.webp"
ffmpeg -y -loglevel error -i "$FR/f_000.png" -vf "$CROP" -c:v libwebp -quality 80 "$OUT/beach-portrait-poster.webp"
rm -f "$P"*
ls -la "$OUT"
