/* ============ The shoreline as data (AENR-813) ============
   The sand-top bezier from Beach.tsx (`sandD`), sampled into 64 heights so a sea
   shader knows where the water meets the sand at any x. Encoded 8-bit against
   [min, max] (≈1 px precision after linear filtering); a shader adds the wizard's
   shoreline shift at sample time. Shared by the Classic and Coastal seas. */
type Pt = [number, number];
type Seg = [Pt, Pt, Pt, Pt];
const SAND_SEGS: Seg[] = [
  [
    [-20, 500],
    [220, 460],
    [440, 555],
    [740, 510],
  ],
  // The path's S-command: first control = the previous C reflected about its end.
  [
    [740, 510],
    [1040, 465],
    [1200, 450],
    [1620, 510],
  ],
];
const bezier = ([p0, p1, p2, p3]: Seg, t: number): Pt => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w[0] * p0[0] + w[1] * p1[0] + w[2] * p2[0] + w[3] * p3[0],
    w[0] * p0[1] + w[1] * p1[1] + w[2] * p2[1] + w[3] * p3[1],
  ];
};
export function buildShore() {
  const pts: Pt[] = [];
  SAND_SEGS.forEach((seg) => {
    for (let i = 0; i <= 48; i++) pts.push(bezier(seg, i / 48));
  });
  const N = 64;
  const ys: number[] = [];
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 1600;
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1][0] < x) j++;
    const [x0, y0] = pts[j];
    const [x1, y1] = pts[j + 1];
    ys.push(x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  }
  const off = Math.min(...ys);
  const scale = Math.max(1, Math.max(...ys) - off);
  const data = new Uint8Array(N);
  ys.forEach((y, i) => {
    data[i] = Math.round(((y - off) / scale) * 255);
  });
  return { data, off, scale };
}
