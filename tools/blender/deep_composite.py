"""Blend the re-rendered deep sea (AENR 5A) onto the existing 4K frames.

python3 deep_composite.py OLD_DIR RAW_DIR OUT_DIR [START END]

OLD_DIR/f_NNN.png  the full frames as rendered before (DEEP=0, 3840 x 3600)
RAW_DIR/d_NNN.png  the deep part re-rendered with DEEP=2: the top BORDER_ROWS rows, full width
                   (Blender render border, cropped — see deep_region.sh)
OUT_DIR/f_NNN.png  the blend, full size

The blend mask follows the shore, not the pixel rows: for every pixel, d = metres seaward of the
mean waterline (beach.py's own shoreline, so the band runs parallel to the waves' fronts). The new
render is weighted by smoothstep((d - BAND_D0) / (BAND_D1 - BAND_D0)): 0 (the old pixels, copied
bit for bit) up to BAND_D0 = 5 m, 1 (the new pixels) from BAND_D1 = 7 m. In between, old and new
agree to denoiser noise: the scene is identical there (beach.py changes nothing up to DEEP_D0 =
8 m), but OpenImageDenoise sees a different (cropped) image in the border render, so pixels differ
by +-1/255, rarely 2-4, with no bias (frame 100: mean -0.05..0.02, sd 0.67, max 4) — invisible
across a 120 px smooth blend. At 4K
the band covers rows 1237-1481 (it follows the curved shore), ends 1 m (60 px) shoreward of the
first changed pixel, and its lowest pixel sits ~200 px above the border's edge (row 1680), clear
of the denoiser's edge effects there. Each frame's agreement in the band is
printed (max, 99.9th percentile and mean of new - old); a max above 6 or a mean beyond +-0.5
means something changed in the shallows and is flagged.
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BAND_D0 = float(os.environ.get("BAND_D0", "5.0"))
BAND_D1 = float(os.environ.get("BAND_D1", "7.0"))

# beach.py's shoreline, without Blender
sys.path.insert(0, HERE)
import types
sys.modules.setdefault("bpy", types.ModuleType("bpy"))
import importlib.util
_sp = importlib.util.spec_from_file_location("beach_geo", os.path.join(HERE, "beach.py"))
beach = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(beach)


def blend_weight(w, h, rows):
    """Weight of the new render for the top `rows` rows of a w x h frame."""
    xs = ((np.arange(w) + 0.5) / w - 0.5) * beach.W_UNITS * beach.U
    ys = (0.5 - (np.arange(rows) + 0.5) / h) * beach.H_UNITS * beach.U
    d = ys[:, None] - (beach.shore_Y(xs)[None, :] + beach.MEAN_OFF)
    s = np.clip((d - BAND_D0) / (BAND_D1 - BAND_D0), 0, 1)
    return s * s * (3 - 2 * s)


def main():
    old_dir, raw_dir, out_dir = sys.argv[1:4]
    a, b = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (0, beach.NF)
    os.makedirs(out_dir, exist_ok=True)
    wmask = None
    worst = 0
    for f in range(a, b):
        old = np.asarray(Image.open(os.path.join(old_dir, "f_%03d.png" % f)).convert("RGB"))
        new = np.asarray(Image.open(os.path.join(raw_dir, "d_%03d.png" % f)).convert("RGB"))
        h, w, _ = old.shape
        rows = new.shape[0]
        assert new.shape[1] == w, "the deep render must be full width"
        if wmask is None:
            wmask = blend_weight(w, h, rows)
            assert wmask[-1].max() == 0.0, "the border must reach below the band"
            band = (wmask > 0) & (wmask < 1)
        top = old[:rows].astype(np.float64)
        mix = top + wmask[..., None] * (new.astype(np.float64) - top)
        out = old.copy()
        out[:rows] = np.where(wmask[..., None] > 0, np.rint(mix), old[:rows]).astype(np.uint8)
        Image.fromarray(out).save(os.path.join(out_dir, "f_%03d.png" % f), compress_level=6)
        sd = (new.astype(int) - old[:rows].astype(int))[band]
        diff = np.abs(sd).max(axis=1)
        mx, p999, bias = int(diff.max()), float(np.percentile(diff, 99.9)), float(sd.mean())
        worst = max(worst, mx)
        flag = "  <-- CHECK" if mx > 6 or abs(bias) > 0.5 else ""
        print(f"f_{f:03d}: band |new-old| max {mx}, 99.9% {p999:.0f}, mean {bias:+.3f}{flag}", flush=True)
    print(f"done, worst band difference {worst}/255")


if __name__ == "__main__":
    main()
