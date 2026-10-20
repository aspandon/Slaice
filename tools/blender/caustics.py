"""Physically made, seamlessly looping and tileable caustics (AENR-827).

A wavy water surface that tiles in space (integer wavenumbers on an L x L torus) and loops in time
(integer cycles per loop T) refracts a vertical sun onto a flat floor D metres below; the rays are
splatted (wrapping) into an N x N light map. Frame i of NF is written as caus_%03d.png (8-bit, mean
light = 128/255 * 1/GAIN), so in Blender: light = png * GAIN.
"""
import sys, os, math
import numpy as np
from PIL import Image

OUT = sys.argv[1]
T, NF = 8.0, 192
L, N, RAYS = 3.0, 384, 768
D = 0.9  # effective depth (m)
ETA = 1 / 1.333
GAIN = 4.0
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(27)
waves = []
for _ in range(34):
    while True:
        m, n = rng.integers(-9, 10, 2)
        lam = L / max(1e-6, math.hypot(m, n))
        if 0.22 < lam < 1.6:
            break
    k = 2 * math.pi * math.hypot(m, n) / L
    om = math.sqrt(9.81 * k)  # deep-water dispersion, then snapped to whole cycles per loop
    p = max(1, round(om * T / (2 * math.pi)))
    amp = 0.0045 * lam ** 1.1 * rng.uniform(0.6, 1.2)
    waves.append((2 * math.pi * m / L, 2 * math.pi * n / L, 2 * math.pi * p / T, amp, rng.uniform(0, 2 * math.pi)))

u = (np.arange(RAYS) + 0.5) / RAYS * L
X, Y = np.meshgrid(u, u)
for f in range(NF):
    t = f * T / NF
    gx = np.zeros_like(X)
    gy = np.zeros_like(X)
    for kx, ky, om, a, ph in waves:
        s = -a * np.sin(kx * X + ky * Y - om * t + ph)
        gx += s * kx
        gy += s * ky
    # refraction of a vertical ray through a surface of slope (gx, gy): horizontal drift ~ (1 - eta) * slope
    hx = np.mod(X - D * (1 - ETA) * gx, L)
    hy = np.mod(Y - D * (1 - ETA) * gy, L)
    H, _, _ = np.histogram2d(hy.ravel(), hx.ravel(), bins=N, range=[[0, L], [0, L]])
    H *= (N * N) / H.sum()  # mean 1
    # a touch of blur (the sun's disc is not a point), wrapping
    k = np.array([0.25, 0.5, 0.25])
    for ax in (0, 1):
        H = sum(w * np.roll(H, s, axis=ax) for w, s in zip(k, (-1, 0, 1)))
    img = np.clip(H / GAIN * 255, 0, 255).astype(np.uint8)
    Image.fromarray(img, "L").save(os.path.join(OUT, "caus_%03d.png" % f))
    if f % 32 == 0:
        print(f, float(H.max()), float((H > 2).mean()), flush=True)
