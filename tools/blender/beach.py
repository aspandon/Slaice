"""The Blender sea and beach (AENR-827).

A top-down Greek beach: open sea at the top, a curved shoreline (the app's own sand-top bezier),
waves running up the wet sand with foam, light golden-white sand at the bottom. Everything that
moves is exactly periodic over the loop length T, so frame N == frame 0:
  - the sea surface is a sum of wave trains, each with an integer number of cycles per loop
    (omega_n = 2*pi*n/T) — the loop closes by construction, no crossfade;
  - the shore break / swash has period T/2 (two waves per loop), computed per vertex (numpy):
    the water's height, the foam field and the wet-sand film are written as mesh attributes;
  - shader noise (foam lace, capillary ripples) walks a circle in 4D noise space;
  - the caustics are real refracted-sun light maps (caustics.py), tileable and looping.

Coordinates: 1 app scene unit = U metres. The app's scene is 1600 x 900 units; this frame covers
scene x 0..1600 and scene y -250..1250 (1600 x 1500), so the app's sand-top curve at dy = 0 sits
in the middle of the frame. Blender X = (sx - 800) * U, Y = -(sy - 500) * U; an orthographic
camera looks straight down -Z, so scene units map to pixels exactly (0.8 px per unit at 1280 wide).
Light: the Poly Haven sky (CC0), rotated so its sun stands ~62 deg high over the sea.

Background: blender -b --factory-startup -P beach.py -- W H SPP OUT_PATTERN START END [STEP]
(see render.sh). Through the Blender MCP: import this file, build(), then update(f) + render.
"""
import math, os, sys, time
import numpy as np
import bpy

U = 0.04  # metres per scene unit
T = 8.0  # loop length (s)
FPS = 24
NF = int(T * FPS)  # 192 frames
W_UNITS, H_UNITS = 1600, 1500
SY_TOP = -250  # scene y at the top of the frame
ASSETS = os.environ.get("BEACH_ASSETS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets"))
G = 9.81

# ---- the app's shoreline: the sand-top bezier from src/lib/seaShore.ts ----
SEGS = [
    [(-20, 500), (220, 460), (440, 555), (740, 510)],
    [(740, 510), (1040, 465), (1200, 450), (1620, 510)],
]


def _bez(seg, t):
    u = 1 - t
    w = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3]
    return (sum(w[i] * seg[i][0] for i in range(4)), sum(w[i] * seg[i][1] for i in range(4)))


_pts = []
for s in SEGS:
    for i in range(201):
        _pts.append(_bez(s, i / 200))
_pts = np.array(sorted(_pts))
# extend flat beyond the ends
_px = np.concatenate([[-2000], _pts[:, 0], [4000]])
_py = np.concatenate([[_pts[0, 1]], _pts[:, 1], [_pts[-1, 1]]])


def shore_Y(X):
    """Blender Y of the app's sand-top curve at Blender X."""
    sx = X / U + 800
    sy = np.interp(sx, _px, _py)
    return -(sy - 500) * U


# ---- the beach profile ----
MEAN_OFF = 1.2  # the mean waterline sits this far (m) seaward of the app's curve
SLOPE = 0.075  # beach-face slope


def depth_of(d):
    """Still-water depth (m) at d metres seaward of the mean waterline (negative = land height)."""
    d = np.asarray(d, dtype=np.float64)
    sea = SLOPE * d + 0.0042 * np.maximum(d - 4, 0) ** 2 + 0.0002 * np.maximum(d - 18, 0) ** 3
    land = -(SLOPE * np.minimum(-d, 5.0) + 0.03 * np.maximum(-d - 5.0, 0))
    return np.where(d >= 0, sea, land)


def extra_depth(d):
    """Colour-only extra depth out to sea: the water deepens to azure without a steep (dark) seabed."""
    d = np.asarray(d, dtype=np.float64)
    return 0.012 * np.maximum(d - 12, 0) ** 2.2


def fract(v):
    return v - np.floor(v)


def hash2(i, j, s=0):
    return fract(np.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453)


def vnoise(x, y, s=0):
    """Smooth value noise (numpy) for the sand's large-scale relief."""
    xi, yi = np.floor(x), np.floor(y)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b = hash2(xi, yi, s), hash2(xi + 1, yi, s)
    c, e = hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s)
    return (a + (b - a) * u) + ((c + (e - c) * u) - (a + (b - a) * u)) * v


# ---- waves ----
OM_S = 2 * math.pi * 2 / T  # the shore break: two waves per loop


def k_of(omega, h):
    """Wavenumber from the dispersion relation (Fenton & McKee approximation)."""
    h = np.maximum(h, 0.04)
    a = omega * omega * h / G
    kh = a / np.tanh(a ** 0.75) ** (2.0 / 3.0)
    return kh / h


# phase of the shore break, integrated along d (seaward), from d = -6 m to 60 m
_dd = np.linspace(-6, 60, 3301)
_kd = k_of(OM_S, np.maximum(depth_of(np.maximum(_dd, 0.0)), 0.04))
_phi = np.concatenate([[0], np.cumsum(0.5 * (_kd[1:] + _kd[:-1]) * np.diff(_dd))])
_phi -= np.interp(0.0, _dd, _phi)


def swell_phase(d):
    return np.interp(d, _dd, _phi)


def psi_x(X):
    """Alongshore variation of the incoming wave's phase: slightly oblique, gently irregular."""
    return 0.085 * X + 0.55 * np.sin(X / 7.3 + 1.0) + 0.3 * np.sin(X / 3.1 + 2.0)


R_UP = 2.0  # max run-up landward of the mean waterline (m)
R_BACK = 0.7  # how far the backwash draws the edge seaward


def runup_scale(X):
    return 1.0 + 0.16 * np.sin(2 * math.pi * X / 13.0 + 0.7) + 0.08 * np.sin(2 * math.pi * X / 5.3)


def edge_of(theta, X):
    """Waterline position u (m landward of the mean waterline) for swash phase theta."""
    tau = np.mod(theta, 2 * math.pi) / (2 * math.pi)
    up = 0.36
    ru = R_UP * runup_scale(X)
    rise = np.sin(0.5 * math.pi * np.clip(tau / up, 0, 1))
    s = np.clip((tau - up) / (1 - up), 0, 1)
    fall = s * s * (3 - 2 * s)
    u = np.where(tau < up, -R_BACK + (ru + R_BACK) * rise, ru - (ru + R_BACK) * fall)
    return u, tau


# the sea's chop: wave trains with an integer number of cycles per loop
rng = np.random.default_rng(827)
CHOP = []
for n in range(3, 17):
    om = 2 * math.pi * n / T
    k = om * om / G
    lam = 2 * math.pi / k
    for j in range(7):
        ang = -math.pi / 2 + rng.normal(0, 0.75)  # mostly travelling shoreward (-Y)
        amp = 0.0042 * lam ** 0.92 * rng.uniform(0.5, 1.2)
        CHOP.append((om, k, math.cos(ang), math.sin(ang), amp, rng.uniform(0, 2 * math.pi)))


class Grid:
    def __init__(self, nx, ny, x0, x1, y0, y1):
        xs = np.linspace(x0, x1, nx)
        ys = np.linspace(y0, y1, ny)
        self.X, self.Y = np.meshgrid(xs, ys)
        self.X = self.X.ravel()
        self.Y = self.Y.ravel()
        self.nx, self.ny = nx, ny
        self.d = self.Y - (shore_Y(self.X) + MEAN_OFF)  # metres seaward of the mean waterline


def sand_z(g):
    z = -depth_of(g.d)
    # gentle relief: shallow bars and hollows under water, soft undulation on land
    rel = vnoise(g.X / 6.0, g.Y / 4.0, 1) - 0.5
    z += rel * np.where(g.d > 0, 0.12 * np.clip(g.d / 6, 0, 1), 0.05)
    # beach cusps on the face
    z += 0.025 * np.sin(2 * math.pi * g.X / 13.0 + 0.7) * np.exp(-((g.d + 0.8) / 2.2) ** 2)
    return z


def water_state(g, t, zs):
    """Water surface z, foam, the swash coordinates and the film age, all at time t."""
    om_t = OM_S * t
    X, d = g.X, g.d
    psi = psi_x(X)
    theta_edge = om_t + psi
    u, tau = edge_of(theta_edge, X)
    rel = d + u  # metres seaward of the moving waterline
    # the shore-break swell beyond the swash
    h = np.maximum(depth_of(np.maximum(d, 0)), 0.02)
    A = np.minimum(0.055 * (np.maximum(h, 0.3) / 3.0) ** -0.25, 0.42 * h + 0.004)
    th = swell_phase(d) + om_t + psi
    th_s = th + 0.45 * np.sin(th)  # steep front, long back
    swell = A * (np.cos(th_s) + 0.25 * np.cos(2 * th_s)) / 1.25
    chop = np.zeros_like(X)
    for om, k, cx, cy, amp, ph in CHOP:
        chop += amp * np.cos(k * (cx * X + cy * g.Y) - om * t + ph)
    chop *= np.clip(rel / 2.5, 0, 1) ** 1.5 * (0.55 + 0.45 * np.clip(d / 8, 0, 1))
    # the thin swash sheet near the moving edge: z_sand at the edge, nearly flat seaward
    z_edge = -depth_of(-u)
    sheet = z_edge - 0.012 * rel
    w = np.clip(rel / 3.2, 0, 1)
    w = w * w * (3 - 2 * w)
    zw = sheet * (1 - w) + (swell + chop) * w
    zw = np.where(rel < 0, sheet, zw)
    # foam: the leading edge of the swash, the bore behind each breaking crest, lingering lace
    thick = np.maximum(zw - zs, 0)
    up = tau < 0.36
    f_edge = np.exp(-thick / 0.025) * np.where(up, 1.0, 0.55) * (rel > -0.05)
    # crest at th = 0 mod 2pi travelling toward the shore; behind it (seaward) th grows
    behind = np.mod(th, 2 * math.pi)
    surf = np.clip((4.8 - d) / 3.0, 0, 1) * np.clip((d + 0.3) / 1.0, 0, 1)
    f_bore = np.exp(-behind / 1.1) * surf
    f_lace = 0.35 * np.clip((6.0 - d) / 5.0, 0, 1) * np.clip(rel / 0.6, 0, 1)
    foam = np.clip(np.maximum(f_edge, f_bore) + f_lace * (1 - f_edge), 0, 1)
    foam *= (rel > -0.02)
    return zw, foam, u, rel, behind, theta_edge


def film_age(g, t, u_now):
    """Seconds since the swash last covered each sand point (0 = covered now), capped at T/2."""
    nx, ny = g.nx, g.ny
    Xc = g.X.reshape(ny, nx)[0]
    psi = psi_x(Xc)
    steps = 96
    dt = (T / 2) / steps
    us = np.stack([edge_of(OM_S * (t - j * dt) + psi, Xc)[0] for j in range(steps)])  # [steps, nx]
    M = np.maximum.accumulate(us, axis=0)  # prefix max going back in time
    land = (-g.d).reshape(ny, nx)  # metres landward of the mean waterline
    age = np.full((ny, nx), T / 2)
    for c in range(nx):
        idx = np.searchsorted(M[:, c], land[:, c], side="right")
        a = idx * dt
        age[:, c] = np.where(idx < steps, a, T / 2)
    return age.ravel()


# ======================= Blender scene =======================

def node(nt, kind, loc=(0, 0), **props):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in props.items():
        setattr(n, k, v)
    return n


def link(nt, a, b):
    nt.links.new(a, b)


def math_node(nt, op, a=None, b=None, loc=(0, 0), clamp=False):
    n = node(nt, "ShaderNodeMath", loc, operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            link(nt, v, n.inputs[i])
    return n.outputs[0]


def mix_rgb(nt, fac, a, b, loc=(0, 0), blend="MIX"):
    n = node(nt, "ShaderNodeMix", loc, data_type="RGBA", blend_type=blend)
    for sock, v in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v
        else:
            link(nt, v, sock)
    return n.outputs[2]


def srgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)


LOOP_R = {}  # value nodes driven per frame: name -> node
CAUS_NODES = []  # caustic image nodes, fed the frame's light map
CAUS_DIR = os.environ.get("CAUS_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "caus"))


def loop_coords(nt, scale_xy, radius, name, loc, vec_in=None):
    """A 3D vector + W that walk a circle in 4D as the loop runs: (x*s, y*s, r cos a) and W = r sin a."""
    if vec_in is None:
        tc = node(nt, "ShaderNodeNewGeometry", (loc[0] - 600, loc[1]))
        vec = tc.outputs["Position"]
    else:
        vec = vec_in
    sep = node(nt, "ShaderNodeSeparateXYZ", (loc[0] - 420, loc[1]))
    link(nt, vec, sep.inputs[0])
    cosn = node(nt, "ShaderNodeValue", (loc[0] - 420, loc[1] - 160))
    sinn = node(nt, "ShaderNodeValue", (loc[0] - 420, loc[1] - 240))
    LOOP_R.setdefault("cos", []).append((cosn, radius))
    LOOP_R.setdefault("sin", []).append((sinn, radius))
    comb = node(nt, "ShaderNodeCombineXYZ", (loc[0] - 240, loc[1]))
    link(nt, math_node(nt, "MULTIPLY", sep.outputs[0], scale_xy, (loc[0] - 300, loc[1] + 80)), comb.inputs[0])
    link(nt, math_node(nt, "MULTIPLY", sep.outputs[1], scale_xy, (loc[0] - 300, loc[1] + 20)), comb.inputs[1])
    link(nt, cosn.outputs[0], comb.inputs[2])
    return comb.outputs[0], sinn.outputs[0]


def make_grid_mesh(name, g, z):
    nx, ny = g.nx, g.ny
    me = bpy.data.meshes.new(name)
    verts = np.stack([g.X, g.Y, z], axis=1).astype(np.float32)
    ii, jj = np.meshgrid(np.arange(nx - 1), np.arange(ny - 1))
    a = (jj * nx + ii).ravel()
    quads = np.stack([a, a + 1, a + nx + 1, a + nx], axis=1)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.ravel())
    me.loops.add(quads.size)
    me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
    me.polygons.add(len(quads))
    me.polygons.foreach_set("loop_start", (np.arange(len(quads)) * 4).astype(np.int32))
    me.update(calc_edges=True)
    me.polygons.foreach_set("use_smooth", np.ones(len(quads), dtype=bool))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def set_attr(me, name, vals, kind="FLOAT"):
    a = me.attributes.get(name)
    if a is None:
        a = me.attributes.new(name, kind, "POINT")
    if kind == "FLOAT":
        a.data.foreach_set("value", np.asarray(vals, dtype=np.float32).ravel())
    else:
        a.data.foreach_set("vector", np.asarray(vals, dtype=np.float32).ravel())


def sand_material():
    m = bpy.data.materials.new("sand")
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial", (1600, 0))
    bsdf = node(nt, "ShaderNodeBsdfPrincipled", (1300, 0))
    link(nt, bsdf.outputs[0], out.inputs[0])
    geo = node(nt, "ShaderNodeNewGeometry", (-1800, 0))
    pos = geo.outputs["Position"]
    depth = node(nt, "ShaderNodeAttribute", (-1800, -300), attribute_name="depth").outputs["Factor"]
    wet = node(nt, "ShaderNodeAttribute", (-1800, -400), attribute_name="wet").outputs["Factor"]
    film = node(nt, "ShaderNodeAttribute", (-1800, -500), attribute_name="film").outputs["Factor"]
    sea = node(nt, "ShaderNodeAttribute", (-1800, -600), attribute_name="sea").outputs["Factor"]  # mean depth

    # --- sand albedo: light golden-white Greek sand, mottled at three scales (no image tiling) ---
    def nz(scale, loc, detail=3.0, rough=0.5):
        n = node(nt, "ShaderNodeTexNoise", loc)
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        link(nt, pos, n.inputs[0])
        return n.outputs["Factor"]
    mac = nz(0.08, (-1300, 300))
    med = nz(0.7, (-1300, 100), 2.0, 0.55)
    fine = nz(5.0, (-1300, -100), 2.0, 0.5)
    lum = math_node(nt, "ADD", math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", med, 0.5, (-1100, 100)), 0.16, (-950, 100)),
                    math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", fine, 0.5, (-1100, -100)), 0.12, (-950, -100)), (-800, 0))
    lum = math_node(nt, "ADD", lum, 1.0, (-650, 0))
    col = mix_rgb(nt, mac, srgb(os.environ.get("SAND_A", "#f2e7cf")), srgb(os.environ.get("SAND_B", "#e9d6b0")), (-650, 200))
    col = mix_rgb(nt, 1.0, col, lum, (-450, 100), blend="MULTIPLY")

    # --- wet sand: darker, a touch more golden; the fresh film is glossy ---
    wet_col = mix_rgb(nt, 1.0, col, srgb(os.environ.get("WETC", "#ebe3d6")), (-250, 100), blend="MULTIPLY")
    col = mix_rgb(nt, wet, col, wet_col, (-100, 100))

    # --- under water: the seabed seen through the water (absorption + in-scatter), caustics ---
    # caustics: real refracted-sun light maps (caustics.py — tileable, looping), sampled twice at
    # different scales and angles so the 3 m tile never shows; light = png * 4 (mean 1)
    def caus_tex(scale, rot, loc):
        mpn = node(nt, "ShaderNodeMapping", (loc[0] - 200, loc[1]))
        mpn.inputs["Scale"].default_value = (1 / scale, 1 / scale, 1)
        mpn.inputs["Rotation"].default_value = (0, 0, rot)
        link(nt, pos, mpn.inputs[0])
        im = node(nt, "ShaderNodeTexImage", loc)
        im.interpolation = "Cubic"
        link(nt, mpn.outputs[0], im.inputs[0])
        CAUS_NODES.append(im)
        return im.outputs["Color"]
    ca = caus_tex(3.0, 0.0, (-650, -500))
    cb = caus_tex(4.4, 0.65, (-650, -800))
    cmix = mix_rgb(nt, 0.32, ca, cb, (-400, -650))
    cbw = node(nt, "ShaderNodeRGBToBW", (-250, -650))
    link(nt, cmix, cbw.inputs[0])
    caus = math_node(nt, "SUBTRACT", math_node(nt, "MULTIPLY", cbw.outputs[0], 4.0, (-100, -650)), 1.0, (50, -650))
    # strongest in 0.2–1.5 m of water, gone on dry sand and in the deep
    cf_in = math_node(nt, "MINIMUM", math_node(nt, "DIVIDE", depth, 0.18, (-150, -1000), True), 1.0, (0, -1000))
    cf_out = math_node(nt, "EXPONENT", math_node(nt, "MULTIPLY", sea, -0.32, (0, -1100)), None, (150, -1100))
    cf = math_node(nt, "MULTIPLY", cf_in, cf_out, (300, -1000))
    caus = math_node(nt, "MULTIPLY", caus, math_node(nt, "MULTIPLY", cf, float(os.environ.get("CAUS", "0.55")), (400, -1000)), (500, -700))
    # col_bed = col * (1 + strength * (light - 1))
    add1 = math_node(nt, "MAXIMUM", math_node(nt, "ADD", caus, 1.0, (650, -700)), 0.0, (700, -700))
    bed = mix_rgb(nt, 1.0, col, add1, (800, -300), blend="MULTIPLY")
    # seagrass (Posidonia) patches in deeper water: dark olive, soft-edged
    pg = node(nt, "ShaderNodeTexNoise", (400, -1300))
    pg.inputs["Scale"].default_value = 0.11
    pg.inputs["Detail"].default_value = 6
    pg.inputs["Roughness"].default_value = 0.62
    link(nt, pos, pg.inputs[0])
    pmask = node(nt, "ShaderNodeMapRange", (600, -1300))
    pmask.inputs["From Min"].default_value = 0.56
    pmask.inputs["From Max"].default_value = 0.66
    link(nt, pg.outputs["Factor"], pmask.inputs["Value"])
    deep_ok = node(nt, "ShaderNodeMapRange", (600, -1500))
    deep_ok.inputs["From Min"].default_value = 1.3
    deep_ok.inputs["From Max"].default_value = 2.4
    link(nt, sea, deep_ok.inputs["Value"])
    pm = math_node(nt, "MULTIPLY", pmask.outputs[0], deep_ok.outputs[0], (800, -1400))
    bed = mix_rgb(nt, math_node(nt, "MULTIPLY", pm, 0.85, (900, -1400)), bed, srgb("#3d4a2a"), (950, -300))
    # absorption: transmittance down and back up, per channel (clear Aegean water; red goes first)
    sig = tuple(float(v) for v in os.environ.get("SIG", "1.4,0.14,0.06").split(","))
    dep2 = math_node(nt, "MULTIPLY", depth, -2.0, (600, -100))
    tr = node(nt, "ShaderNodeCombineColor", (900, -100))
    for i, s in enumerate(sig):
        link(nt, math_node(nt, "EXPONENT", math_node(nt, "MULTIPLY", dep2, s, (700, -50 - 60 * i)), None, (800, -50 - 60 * i)), tr.inputs[i])
    seen = mix_rgb(nt, 1.0, bed, tr.outputs[0], (1050, -200), blend="MULTIPLY")
    # in-scatter: the water's own colour — turquoise over the shallows, azure, then deep blue
    ramp = node(nt, "ShaderNodeValToRGB", (900, -700))
    rmap = node(nt, "ShaderNodeMapRange", (750, -700))
    rmap.inputs["From Min"].default_value = 0.0
    rmap.inputs["From Max"].default_value = 16.0
    link(nt, sea, rmap.inputs["Value"])
    link(nt, rmap.outputs[0], ramp.inputs[0])
    el = ramp.color_ramp.elements
    stops = [(0.0, "#3fdbe6"), (0.08, "#22c4e4"), (0.22, "#1ba0e2"), (0.45, "#187fda"), (1.0, "#1466cc")]
    el[0].position, el[0].color = stops[0][0], srgb(stops[0][1])
    el[1].position, el[1].color = stops[-1][0], srgb(stops[-1][1])
    for pos_, hx in stops[1:-1]:
        e = el.new(pos_)
        e.color = srgb(hx)
    ramp.color_ramp.interpolation = "B_SPLINE"
    rate = float(os.environ.get("SCAT", "0.6"))
    sc = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "EXPONENT", math_node(nt, "MULTIPLY", depth, -rate, (850, -500)), None, (950, -500)), (1050, -500))
    seen = mix_rgb(nt, sc, seen, ramp.outputs[0], (1150, -300))
    ws = math_node(nt, "MINIMUM", math_node(nt, "DIVIDE", depth, 0.01, (1000, -700), True), 1.0, (1100, -700))
    final = mix_rgb(nt, ws, col, seen, (1200, -100))
    link(nt, final, bsdf.inputs["Base Color"])

    # roughness: dry 0.9, wet 0.55, fresh film 0.08; under water (irrelevant, refraction) 0.7
    r = mix_rgb(nt, wet, (0.92, 0.92, 0.92, 1), (0.55, 0.55, 0.55, 1), (1000, 300))
    r = mix_rgb(nt, film, r, (0.07, 0.07, 0.07, 1), (1100, 300))
    rb = node(nt, "ShaderNodeRGBToBW", (1200, 300))
    link(nt, r, rb.inputs[0])
    link(nt, rb.outputs[0], bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    link(nt, math_node(nt, "MULTIPLY", film, 0.6, (1100, 450)), bsdf.inputs["Coat Weight"])
    bsdf.inputs["Coat Roughness"].default_value = 0.04

    # --- relief: ripples under the water, soft grain on land ---
    rip = node(nt, "ShaderNodeTexWave", (300, 700), wave_type="BANDS", bands_direction="Y")
    rip.inputs["Scale"].default_value = 0.9
    rip.inputs["Distortion"].default_value = 11.0
    rip.inputs["Detail"].default_value = 3.0
    rip.inputs["Detail Scale"].default_value = 0.6
    link(nt, pos, rip.inputs[0])
    under = math_node(nt, "MINIMUM", math_node(nt, "DIVIDE", sea, 0.4, (500, 600), True), 1.0, (600, 600))
    hr = math_node(nt, "ADD", math_node(nt, "MULTIPLY", rip.outputs["Factor"], under, (700, 700)), math_node(nt, "MULTIPLY", fine, 0.5, (700, 900)), (850, 800))
    bump = node(nt, "ShaderNodeBump", (1000, 700))
    bump.inputs["Strength"].default_value = float(os.environ.get("RIPB", "0.45"))
    bump.inputs["Distance"].default_value = 0.03
    link(nt, hr, bump.inputs["Height"])
    link(nt, bump.outputs[0], bsdf.inputs["Normal"])
    return m


def water_material():
    m = bpy.data.materials.new("water")
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial", (1400, 0))
    glass = node(nt, "ShaderNodeBsdfPrincipled", (900, 200))
    glass.inputs["Base Color"].default_value = (1, 1, 1, 1)
    glass.inputs["Transmission Weight"].default_value = 1.0
    glass.inputs["IOR"].default_value = 1.333
    glass.inputs["Roughness"].default_value = 0.025
    foam_b = node(nt, "ShaderNodeBsdfPrincipled", (900, -300))
    foam_b.inputs["Base Color"].default_value = srgb("#f7fbfb")
    foam_b.inputs["Roughness"].default_value = 0.6
    mix = node(nt, "ShaderNodeMixShader", (1200, 0))
    link(nt, mix.outputs[0], out.inputs[0])
    link(nt, glass.outputs[0], mix.inputs[1])
    link(nt, foam_b.outputs[0], mix.inputs[2])

    foam = node(nt, "ShaderNodeAttribute", (-1200, -300), attribute_name="foam").outputs["Factor"]
    fuv = node(nt, "ShaderNodeAttribute", (-1200, -500), attribute_name="fuv").outputs["Vector"]
    # foam lace: noise in the swash's own coordinates (it moves with the water), looping in 4D
    v, wv = loop_coords(nt, 1.0, 0.35, "f", (-700, -500), vec_in=fuv)
    n1 = node(nt, "ShaderNodeTexNoise", (-450, -500), noise_dimensions="4D")
    n1.inputs["Scale"].default_value = 2.2
    n1.inputs["Detail"].default_value = 3
    n1.inputs["Roughness"].default_value = 0.65
    n1.inputs["Distortion"].default_value = 0.4
    link(nt, v, n1.inputs["Vector"])
    link(nt, wv, n1.inputs["W"])
    vor = node(nt, "ShaderNodeTexVoronoi", (-450, -800), feature="DISTANCE_TO_EDGE", voronoi_dimensions="3D")
    vor.inputs["Scale"].default_value = 5.0
    link(nt, v, vor.inputs["Vector"])
    cells = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", vor.outputs["Distance"], 0.12, (-250, -800), True), (-100, -800))
    tex = math_node(nt, "ADD", math_node(nt, "MULTIPLY", n1.outputs["Factor"], 0.75, (-250, -500)), math_node(nt, "MULTIPLY", cells, 0.35, (0, -800)), (100, -600))
    # threshold falls as foam rises: dense white at the edge, lace where it thins
    thr = math_node(nt, "SUBTRACT", 1.02, math_node(nt, "MULTIPLY", foam, 0.75, (-250, -300)), (0, -300))
    fm = node(nt, "ShaderNodeMapRange", (300, -400))
    link(nt, tex, fm.inputs["Value"])
    link(nt, thr, fm.inputs["From Min"])
    link(nt, math_node(nt, "ADD", thr, 0.12, (150, -250)), fm.inputs["From Max"])
    fmask = math_node(nt, "MULTIPLY", fm.outputs[0], math_node(nt, "MINIMUM", math_node(nt, "MULTIPLY", foam, 4.0, (300, -150)), 1.0, (450, -150)), (600, -300))
    link(nt, math_node(nt, "MULTIPLY", fmask, 0.97, (750, -200)), mix.inputs[0])

    # capillary ripples: a looping 4D noise bump on top of the geometry's waves
    rv, rw = loop_coords(nt, 1.0, 0.6, "r", (-700, 400))
    rn = node(nt, "ShaderNodeTexNoise", (-450, 400), noise_dimensions="4D")
    rn.inputs["Scale"].default_value = 3.4
    rn.inputs["Detail"].default_value = 3
    rn.inputs["Roughness"].default_value = 0.55
    link(nt, rv, rn.inputs["Vector"])
    link(nt, rw, rn.inputs["W"])
    bump = node(nt, "ShaderNodeBump", (600, 400))
    bump.inputs["Strength"].default_value = 0.22
    bump.inputs["Distance"].default_value = 0.03
    link(nt, rn.outputs["Factor"], bump.inputs["Height"])
    link(nt, bump.outputs[0], glass.inputs["Normal"])
    link(nt, bump.outputs[0], foam_b.inputs["Normal"])
    return m


STATE = {}


def build(res=(1280, 1200), spp=16, engine="CYCLES", grid_step=0.1):
    # Clear the scene in place (read_factory_settings would also unload the MCP addon's server).
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.cameras,
                 bpy.data.lights, bpy.data.worlds, bpy.data.images, bpy.data.node_groups):
        for b in list(coll):
            coll.remove(b)
    LOOP_R.clear()
    CAUS_NODES.clear()
    sc = bpy.context.scene
    hw, hh = W_UNITS * U / 2, H_UNITS * U / 2
    m = 0.6
    nx = int(round((2 * hw + 2 * m) / grid_step)) + 1
    ny = int(round((2 * hh + 2 * m) / grid_step)) + 1
    g = Grid(nx, ny, -hw - m, hw + m, -hh - m, hh + m)
    zs = sand_z(g)
    sand = make_grid_mesh("sand", g, zs)
    sand.data.materials.append(sand_material())
    set_attr(sand.data, "sea", np.maximum(depth_of(g.d), 0) + extra_depth(g.d))
    STATE["extra"] = extra_depth(g.d)
    wet = np.clip((g.d + R_UP * runup_scale(g.X) + 0.9 + 0.3 * (vnoise(g.X / 1.3, g.Y / 1.3, 3) - 0.5)) / 0.9, 0, 1)
    set_attr(sand.data, "wet", wet)
    water = make_grid_mesh("water", g, np.zeros_like(zs))
    water.data.materials.append(water_material())
    water.visible_shadow = False
    water.visible_diffuse = False
    STATE.update(g=g, zs=zs, sand=sand, water=water)

    # sky: Poly Haven kloofendal_43d_clear_puresky (CC0)
    world = bpy.data.worlds.new("sky")
    sc.world = world
    wn = world.node_tree
    bg = wn.nodes.get("Background") or wn.nodes.new("ShaderNodeBackground")
    env = wn.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(ASSETS, "kloofendal_43d_clear_puresky_2k.hdr"))
    mp = wn.nodes.new("ShaderNodeMapping")
    # the sun raised from the HDRI's 43 deg to ~62 deg, standing over the sea (top left of the frame)
    eul = [math.radians(float(v)) for v in os.environ.get("SKY_EULER", "-18,-6,36").split(",")]
    mp.inputs["Rotation"].default_value = eul
    tc = wn.nodes.new("ShaderNodeTexCoord")
    wn.links.new(tc.outputs["Generated"], mp.inputs[0])
    wn.links.new(mp.outputs[0], env.inputs[0])
    # The HDRI's own sun lights the beach (a sun lamp at the same height washed the water out and
    # its glitter turned to haze at low sample counts).
    wn.links.new(env.outputs[0], bg.inputs[0])
    bg.inputs["Strength"].default_value = float(os.environ.get("SKY_STRENGTH", "1.0"))
    outw = wn.nodes.get("World Output") or wn.nodes.new("ShaderNodeOutputWorld")
    wn.links.new(bg.outputs[0], outw.inputs[0])
    STATE["sky_map"] = mp

    # Orthographic, straight down: scene units map to the frame exactly, at every height.
    cam_d = bpy.data.cameras.new("cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = W_UNITS * U
    cam_d.clip_end = 200
    cam = bpy.data.objects.new("cam", cam_d)
    cam.location = (0, 0, 60)
    sc.collection.objects.link(cam)
    sc.camera = cam

    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.fps = FPS
    sc.render.engine = engine
    if engine == "CYCLES":
        cy = sc.cycles
        cy.device = "CPU"
        cy.samples = spp
        cy.use_adaptive_sampling = True
        cy.adaptive_threshold = 0.03
        cy.use_denoising = True
        cy.denoiser = "OPENIMAGEDENOISE"
        cy.max_bounces = 6
        cy.diffuse_bounces = 1
        cy.glossy_bounces = 2
        cy.transmission_bounces = 4
        cy.transparent_max_bounces = 2
        cy.caustics_reflective = False
        cy.caustics_refractive = False
        cy.blur_glossy = 1.0
        cy.sample_clamp_indirect = 4.0
        cy.seed = 0
    sc.render.use_persistent_data = True
    try:
        sc.view_settings.view_transform = os.environ.get("VIEW", "AgX")
        sc.view_settings.look = os.environ.get("LOOK", "None")
    except Exception as e:
        print("view transform:", e)
    sc.view_settings.exposure = float(os.environ.get("EXPOSURE", "0.0"))
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    return g


def update(frame):
    g, zs = STATE["g"], STATE["zs"]
    t = (frame % NF) / FPS
    zw, foam, u, rel, behind, th_e = water_state(g, t, zs)
    wme = STATE["water"].data
    co = np.stack([g.X, g.Y, zw], axis=1).astype(np.float32)
    wme.vertices.foreach_set("co", co.ravel())
    set_attr(wme, "foam", foam)
    set_attr(wme, "fuv", np.stack([g.X, rel, behind / 3.0], axis=1), "FLOAT_VECTOR")
    wme.update()
    sme = STATE["sand"].data
    set_attr(sme, "depth", np.maximum(zw - zs, 0) + STATE["extra"])
    age = film_age(g, t, u)
    covered = (zw - zs) > 0.002
    film = np.where(covered, 0.0, np.exp(-age / 1.4)) * (g.d < 1.0)
    set_attr(sme, "film", film)
    sme.update()
    for i, n in enumerate(CAUS_NODES):
        old = n.image
        n.image = bpy.data.images.load(os.path.join(CAUS_DIR, "caus_%03d.png" % ((frame + 61 * i) % NF)), check_existing=True)
        n.image.colorspace_settings.name = "Non-Color"
        if old is not None and old != n.image and old.users == 0:
            bpy.data.images.remove(old)
    a = 2 * math.pi * (frame % NF) / NF
    for n, r in LOOP_R.get("cos", []):
        n.outputs[0].default_value = r * math.cos(a)
    for n, r in LOOP_R.get("sin", []):
        n.outputs[0].default_value = r * math.sin(a)


def render_frames(frames, pattern):
    sc = bpy.context.scene
    for f in frames:
        # Resumable: a long render (Full HD is ~4 h) picks up after the last frame written.
        if os.environ.get("SKIP_EXISTING") and os.path.exists(pattern % f):
            continue
        s = time.time()
        update(f)
        sc.render.filepath = pattern % f
        bpy.ops.render.render(write_still=True)
        print(f"FRAME {f} {time.time() - s:.1f}s", flush=True)


if __name__ == "__main__" and "--" in sys.argv:
    # background: blender -b -P beach.py -- W H SPP OUTPATTERN START END [STEP]
    a = sys.argv[sys.argv.index("--") + 1:]
    W, H, SPP, OUT, A, B = int(a[0]), int(a[1]), int(a[2]), a[3], int(a[4]), int(a[5])
    STEP = int(a[6]) if len(a) > 6 else 1
    build((W, H), SPP, grid_step=float(os.environ.get("GRID", "0.1")))
    render_frames(range(A, B, STEP), OUT)
