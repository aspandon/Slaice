// Dependency-free SVG charts with readable axis labels (HTML overlay so the
// type-size doesn't get distorted by SVG scaling).

interface SeriesPoint {
  l: string;
  v: number;
  hi?: number;
}
interface DonutSegment {
  v: number;
  c: string;
  l?: string;
}
interface FunnelStep {
  l: string;
  v: number;
}

function formatTick(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return Math.round(v).toString();
}

// Build a concise text summary so a chart is announced as a single labelled
// image (WCAG 1.1.1) — e.g. "Bar chart. 9h: 90, 10h: 180, …".
function seriesSummary(kind: string, data: SeriesPoint[], label?: string): string {
  const series = data.map((d) => `${d.l}: ${d.v}`).join(", ");
  return `${label || kind}. ${series}`;
}

const PAD_LEFT = 44;   // px reserved for Y-axis labels
const PAD_BOTTOM = 28; // px reserved for X-axis labels

export function BarChart({ data, color = "#0D9488", height = 220, label }: { data: SeriesPoint[]; color?: string; height?: number; label?: string }) {
  const max = Math.max(...data.map((d) => d.v)) * 1.15 || 1;
  const ticks = [1, 0.66, 0.33, 0];
  return (
    <div className="relative" style={{ height }} role="img" aria-label={seriesSummary("Bar chart", data, label)}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 flex flex-col justify-between text-[12px] font-medium text-slate-500 tnum pr-2 pointer-events-none" style={{ width: PAD_LEFT, bottom: PAD_BOTTOM }}>
        {ticks.map((t, i) => <span key={i} className="text-right leading-none">{formatTick(max * t)}</span>)}
      </div>
      {/* Plot area */}
      <div className="absolute top-0 right-0" style={{ left: PAD_LEFT, bottom: PAD_BOTTOM }}>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full">
          {ticks.map((t, i) => (
            <line key={i} x1="0" x2="100" y1={60 * (1 - t)} y2={60 * (1 - t)} stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="0.8 0.8" />
          ))}
          {data.map((d, i) => {
            const h = (d.v / max) * 60;
            const bw = 100 / data.length;
            return (
              <rect key={i} x={i * bw + bw * 0.18} y={60 - h} width={bw * 0.64} height={h} rx="0.6" fill={color} opacity={d.hi ? 1 : 0.78} />
            );
          })}
        </svg>
      </div>
      {/* X-axis labels */}
      <div className="absolute right-0 bottom-0 grid text-[12.5px] font-medium text-slate-600 pointer-events-none" style={{ left: PAD_LEFT, height: PAD_BOTTOM, gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((d, i) => <span key={i} className="text-center pt-1.5 truncate">{d.l}</span>)}
      </div>
    </div>
  );
}

// Horizontal bars — best for category data (e.g. zones) where vertical x-axis
// labels would otherwise truncate to cryptic abbreviations. Full labels sit on
// the left; the value sits at the end of each bar.
export function HBarChart({ data, color = "#0D9488", unit = "", max, label }: { data: SeriesPoint[]; color?: string; unit?: string; max?: number; label?: string }) {
  const m = max || Math.max(...data.map((d) => d.v)) * 1.05 || 1;
  return (
    <div role="img" aria-label={seriesSummary("Bar chart", data, label)} className="space-y-2 py-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 sm:w-24 shrink-0 text-right text-[12.5px] text-slate-600 truncate">{d.l}</div>
          <div className="flex-1 h-5 rounded-md bg-slate-100 overflow-hidden">
            <div className="h-full rounded-md transition-all duration-500" style={{ width: `${Math.min(100, (d.v / m) * 100)}%`, background: color, opacity: d.hi ? 1 : 0.8 }} />
          </div>
          <div className="w-12 shrink-0 text-right text-[12.5px] font-semibold text-navy-900 tnum">{d.v}{unit}</div>
        </div>
      ))}
    </div>
  );
}

export function LineChartMini({ data, color = "#0D9488", height = 220, label }: { data: SeriesPoint[]; color?: string; height?: number; label?: string }) {
  const max = Math.max(...data.map((d) => d.v)) * 1.1 || 1;
  const min = Math.min(...data.map((d) => d.v)) * 0.9;
  const span = max - min || 1;
  const ticks = [1, 0.66, 0.33, 0];
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${60 - ((d.v - min) / span) * 60}`).join(" ");
  const area = `0,60 ${pts} 100,60`;
  const gid = `g${color.replace("#", "")}`;
  return (
    <div className="relative" style={{ height }} role="img" aria-label={seriesSummary("Line chart", data, label)}>
      <div className="absolute left-0 top-0 flex flex-col justify-between text-[12px] font-medium text-slate-500 tnum pr-2 pointer-events-none" style={{ width: PAD_LEFT, bottom: PAD_BOTTOM }}>
        {ticks.map((t, i) => <span key={i} className="text-right leading-none">{formatTick(min + span * t)}</span>)}
      </div>
      <div className="absolute top-0 right-0" style={{ left: PAD_LEFT, bottom: PAD_BOTTOM }}>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <line key={i} x1="0" x2="100" y1={60 * (1 - t)} y2={60 * (1 - t)} stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="0.8 0.8" />
          ))}
          <polygon points={area} fill={`url(#${gid})`} />
          <polyline points={pts} fill="none" stroke={color} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 60 - ((d.v - min) / span) * 60;
            return <circle key={i} cx={x} cy={y} r="0.8" fill={color} />;
          })}
        </svg>
      </div>
      <div className="absolute right-0 bottom-0 grid text-[12.5px] font-medium text-slate-600 pointer-events-none" style={{ left: PAD_LEFT, height: PAD_BOTTOM, gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((d, i) => <span key={i} className="text-center pt-1.5 truncate">{d.l}</span>)}
      </div>
    </div>
  );
}

export function Donut({ segments, size = 120, label }: { segments: DonutSegment[]; size?: number; label?: string }) {
  const total = segments.reduce((a, s) => a + s.v, 0);
  let acc = 0;
  const r = 42, c = 2 * Math.PI * r;
  const aria = label || `Donut chart: ${segments.map((s) => `${Math.round((s.v / total) * 100)}%`).join(", ")}`;
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} role="img" aria-label={aria}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f6" strokeWidth="12" />
      {segments.map((s, i) => {
        const frac = s.v / total, dash = frac * c, off = acc * c;
        acc += frac;
        return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.c} strokeWidth="12"
          strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" strokeLinecap="butt" />;
      })}
      <text x="50" y="48" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B2545">{total}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="6" fill="#64748b">total</text>
    </svg>
  );
}

// Inline sparkline — a tiny trend line for KPI tiles.
export function Sparkline({ data, color = "#0D9488", width = 96, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...data) * 1.05 || 1;
  const min = Math.min(...data) * 0.95;
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / span) * 28 - 1}`).join(" ");
  const gid = `sl${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width, height }} className="overflow-visible" aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,30 ${pts} 100,30`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Horizontal stacked bar — segments sum to 100% of the track width.
export function StackedBar({ segments, height = 10, className = "" }: { segments: DonutSegment[]; height?: number; className?: string }) {
  const total = segments.reduce((a, s) => a + s.v, 0) || 1;
  return (
    <div className={`w-full rounded-full overflow-hidden flex ${className}`} style={{ height }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${(s.v / total) * 100}%`, background: s.c }} title={`${s.l}: ${Math.round((s.v / total) * 100)}%`} />
      ))}
    </div>
  );
}

// Conversion funnel — each step a shrinking bar with a count + drop-off.
export function Funnel({ steps, color = "#3a47cc" }: { steps: FunnelStep[]; color?: string }) {
  const top = steps[0]?.v || 1;
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = Math.round((s.v / top) * 100);
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-[12px] mb-0.5"><span className="text-slate-600">{s.l}</span><span className="tnum font-semibold text-navy-900">{s.v.toLocaleString()} · {pct}%</span></div>
            <div className="h-6 rounded-lg bg-slate-100 overflow-hidden"><div className="h-full rounded-lg flex items-center" style={{ width: `${pct}%`, background: color, opacity: 0.55 + 0.45 * (s.v / top) }} /></div>
          </div>
        );
      })}
    </div>
  );
}

// Deterministic faux-QR for mockups.
export function QR({ size = 120, seed = "SLAICE" }: { size?: number; seed?: string }) {
  const n = 21;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = (i: number) => {
    let x = (h ^ (i * 2654435761)) >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) % 100 < 48;
  };
  const cells: [number, number][] = [];
  const finder = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const on = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      if (on) cells.push([cx + x, cy + y]);
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd(y * n + x)) cells.push([x, y]);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} style={{ width: size, height: size }} className="rounded-lg bg-white" role="img" aria-label={`QR code for ${seed}`}>
      <rect width={n} height={n} fill="#fff" />
      {cells.map(([x, y], i) => <rect key={i} x={x} y={y} width="1" height="1" fill="#0B2545" />)}
    </svg>
  );
}
