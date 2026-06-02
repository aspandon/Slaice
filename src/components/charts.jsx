// Dependency-free SVG charts.

export function BarChart({ data, color = "#0D9488", height = 150 }) {
  const max = Math.max(...data.map((d) => d.v)) * 1.15 || 1;
  const bw = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height / 2}`} className="w-full" style={{ height }}>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1="0" x2="100" y1={(height / 2) * (1 - g)} y2={(height / 2) * (1 - g)} stroke="#eef2f6" strokeWidth="0.4" />
      ))}
      {data.map((d, i) => {
        const h = (d.v / max) * (height / 2 - 8);
        return (
          <g key={i}>
            <rect x={i * bw + bw * 0.2} y={height / 2 - h - 6} width={bw * 0.6} height={h} rx="1" fill={color} opacity={d.hi ? 1 : 0.78} />
            <text x={i * bw + bw * 0.5} y={height / 2 - 1} fontSize="2.6" textAnchor="middle" fill="#94a3b8">{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChartMini({ data, color = "#0D9488", height = 150 }) {
  const max = Math.max(...data.map((d) => d.v)) * 1.1 || 1;
  const min = Math.min(...data.map((d) => d.v)) * 0.9;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${height / 2 - ((d.v - min) / (max - min)) * (height / 2 - 8) - 4}`).join(" ");
  const area = `0,${height / 2} ${pts} 100,${height / 2}`;
  const gid = `g${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 100 ${height / 2}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map((g, i) => <line key={i} x1="0" x2="100" y1={(height / 2) * (1 - g)} y2={(height / 2) * (1 - g)} stroke="#eef2f6" strokeWidth="0.4" />)}
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      {data.map((d, i) => <text key={i} x={(i / (data.length - 1)) * 100} y={height / 2 - 0.5} fontSize="2.4" textAnchor="middle" fill="#94a3b8">{d.l}</text>)}
    </svg>
  );
}

export function Donut({ segments, size = 120 }) {
  const total = segments.reduce((a, s) => a + s.v, 0);
  let acc = 0;
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f6" strokeWidth="12" />
      {segments.map((s, i) => {
        const frac = s.v / total, dash = frac * c, off = acc * c;
        acc += frac;
        return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.c} strokeWidth="12"
          strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" strokeLinecap="butt" />;
      })}
      <text x="50" y="48" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B2545">{total}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="6" fill="#94a3b8">total</text>
    </svg>
  );
}

// Deterministic faux-QR for mockups.
export function QR({ size = 120, seed = "SLAICE" }) {
  const n = 21;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = (i) => {
    let x = (h ^ (i * 2654435761)) >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) % 100 < 48;
  };
  const cells = [];
  const finder = (cx, cy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const on = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      if (on) cells.push([cx + x, cy + y]);
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd(y * n + x)) cells.push([x, y]);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} style={{ width: size, height: size }} className="rounded-lg bg-white">
      <rect width={n} height={n} fill="#fff" />
      {cells.map(([x, y], i) => <rect key={i} x={x} y={y} width="1" height="1" fill="#0B2545" />)}
    </svg>
  );
}
