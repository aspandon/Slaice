# greek-lut.py FRAMES_DIR — the Video sea grade (AENR-859): a Reinhard colour transfer (Lab mean and
# std) from frames of the first clip (ref_*.png) to frames of the 4K source (src_*.png), baked into
# FRAMES_DIR/../greek.cube for ffmpeg lut3d. Development tooling only; needs numpy + Pillow.
import sys, glob, numpy as np
from PIL import Image
D = sys.argv[1]
def srgb2lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lin2srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)
M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
Mi = np.linalg.inv(M); WP = np.array([0.95047, 1.0, 1.08883])
def f(t): return np.where(t > 216 / 24389, np.cbrt(t), (24389 / 27 * t + 16) / 116)
def fi(t): return np.where(t ** 3 > 216 / 24389, t ** 3, (116 * t - 16) / (24389 / 27))
def rgb2lab(rgb):
    xyz = srgb2lin(rgb) @ M.T / WP
    fx, fy, fz = f(xyz[..., 0]), f(xyz[..., 1]), f(xyz[..., 2])
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], -1)
def lab2rgb(lab):
    fy = (lab[..., 0] + 16) / 116; fx = fy + lab[..., 1] / 500; fz = fy - lab[..., 2] / 200
    xyz = np.stack([fi(fx), fi(fy), fi(fz)], -1) * WP
    return np.clip(lin2srgb(xyz @ Mi.T), 0, 1)
def stats(pat):
    px = np.concatenate([np.asarray(Image.open(p).convert("RGB"), dtype=np.float64).reshape(-1, 3) / 255 for p in sorted(glob.glob(pat))])
    lab = rgb2lab(px); return lab.mean(0), lab.std(0)
ms, ss = stats(f"{D}/src_*.png"); mr, sr = stats(f"{D}/ref_*.png")
print("src", ms.round(1), ss.round(1)); print("ref", mr.round(1), sr.round(1))
# Keep the source's own lightness contrast a little (its sparkle), take the reference's colour.
k = sr / ss; k[0] = (k[0] + 1) / 2; k[1:] = np.minimum(k[1:], 1.25)  # no blotches from stretched chroma
N = 33; g = np.linspace(0, 1, N)
b, gg, r = np.meshgrid(g, g, g, indexing="ij")  # .cube order: r fastest
rgb = np.stack([r, gg, b], -1).reshape(-1, 3)
out = lab2rgb((rgb2lab(rgb) - ms) * k + mr)
with open(f"{D}/../greek.cube", "w") as fh:
    fh.write(f"LUT_3D_SIZE {N}\n")
    for o in out: fh.write(f"{o[0]:.6f} {o[1]:.6f} {o[2]:.6f}\n")
print("lut ok")
