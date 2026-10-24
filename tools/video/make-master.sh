#!/bin/sh
# make-master.sh SOURCE_4K OUT.mp4 — the Video sea's graded, seamless 4K loop (AENR-859).
# Development tooling only. SOURCE_4K is the Pexels clip (public/sea/CREDITS.md), 3840 x 2160.
#  1. grade: frames of the source and of the first clip (public/sea/sea-loop-1080.mp4) give a
#     colour transfer to the same Greek turquoise (greek-lut.py → greek.cube);
#  2. loop: source 2.0–11.6 s at 24 fps, its last second crossfaded into source 1.0–2.0 s, so the
#     last frame flows into the first (the same construction as the first clip's loop);
#  3. a near-lossless master (x264 CRF 6) for encode-sea.sh.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
SRC="$1"; OUTF="$2"; W="$(mktemp -d)"; mkdir -p "$W/g"
for t in 1 4 7 10 13; do ffmpeg -y -loglevel error -ss $t -i "$SRC" -frames:v 1 -vf scale=960:-2 "$W/g/src_$t.png"; done
for t in 1 3 5 7 9; do ffmpeg -y -loglevel error -ss $t -i "$ROOT/public/sea/sea-loop-1080.mp4" -frames:v 1 -vf scale=960:-2 "$W/g/ref_$t.png"; done
python3 -I "$HERE/greek-lut.py" "$W/g"
ffmpeg -y -loglevel error -i "$SRC" -filter_complex \
  "[0:v]fps=24,lut3d=$W/greek.cube,format=yuv420p,split[a][b];[a]trim=start=2:end=11.6,setpts=PTS-STARTPTS[main];[b]trim=start=1:end=2,setpts=PTS-STARTPTS[head];[main][head]xfade=transition=fade:duration=1:offset=8.6[out]" \
  -map "[out]" -c:v libx264 -preset veryfast -crf 6 -pix_fmt yuv420p "$OUTF"
rm -rf "$W"
