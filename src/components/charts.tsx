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

/** `colors` (optional) colours each bar; `avg` draws a dashed reference line;
 *  `labelEvery` thins the x-axis labels for long daily series. */
export function BarChart({ data, color = "#0D9488", height = 220, label, colors, avg, labelEvery = 1 }: { data: SeriesPoint[]; color?: string; height?: number; label?: string; colors?: string[]; avg?: { v: number; label: string }; labelEvery?: number }) {
  const max = Math.max(...data.map((d) => d.v), avg?.v ?? 0) * 1.15 || 1;
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
              <rect key={i} x={i * bw + bw * 0.18} y={60 - h} width={bw * 0.64} height={h} rx="0.6" fill={colors?.[i] ?? color} opacity={d.hi ? 1 : 0.78} />
            );
          })}
          {avg && <line x1="0" x2="100" y1={60 - (avg.v / max) * 60} y2={60 - (avg.v / max) * 60} stroke="#0B2545" strokeWidth="0.35" strokeDasharray="1.2 0.8" />}
        </svg>
        {avg && <span className="absolute right-0 text-[11px] font-semibold text-navy-900 bg-white/85 rounded px-1 -translate-y-full" style={{ top: `${(1 - avg.v / max) * 100}%` }}>{avg.label}</span>}
      </div>
      {/* X-axis labels */}
      <div className="absolute right-0 bottom-0 grid text-[12.5px] font-medium text-slate-600 pointer-events-none" style={{ left: PAD_LEFT, height: PAD_BOTTOM, gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((d, i) => <span key={i} className={`text-center pt-1.5 ${labelEvery > 1 ? "whitespace-nowrap overflow-visible" : "truncate"}`}>{i % labelEvery === 0 ? d.l : ""}</span>)}
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

// `compare` draws a dashed reference series (e.g. last year) on the same scale.
// `partialLast`: the last point is a period still in progress (e.g. this month) —
// its segment is dashed and its dot hollow, so a lower value doesn't read as a drop.
export function LineChartMini({ data, color = "#0D9488", height = 220, label, compare, compareColor = "#94a3b8", partialLast = false }: { data: SeriesPoint[]; color?: string; height?: number; label?: string; compare?: SeriesPoint[]; compareColor?: string; partialLast?: boolean }) {
  const all = [...data, ...(compare ?? [])];
  const max = Math.max(...all.map((d) => d.v)) * 1.1 || 1;
  const min = Math.min(...all.map((d) => d.v)) * 0.9;
  const xOf = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * 100 : 50);
  const span = max - min || 1;
  const ticks = [1, 0.66, 0.33, 0];
  const yOf = (v: number) => 60 - ((v - min) / span) * 60;
  const pts = data.map((d, i) => `${xOf(i)},${yOf(d.v)}`).join(" ");
  const solid = partialLast && data.length > 1 ? data.slice(0, -1) : data;
  const solidPts = solid.map((d, i) => `${xOf(i)},${yOf(d.v)}`).join(" ");
  const tail = partialLast && data.length > 1 ? `${xOf(data.length - 2)},${yOf(data[data.length - 2].v)} ${xOf(data.length - 1)},${yOf(data[data.length - 1].v)}` : "";
  const cmpPts = compare?.map((d, i) => `${xOf(i)},${60 - ((d.v - min) / span) * 60}`).join(" ");
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
          {cmpPts && <polyline points={cmpPts} fill="none" stroke={compareColor} strokeWidth="0.8" strokeDasharray="2 1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          <polyline points={solidPts} fill="none" stroke={color} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {tail && <polyline points={tail} fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />}
          {data.map((d, i) => {
            const open = partialLast && i === data.length - 1;
            return <circle key={i} cx={xOf(i)} cy={yOf(d.v)} r="0.8" fill={open ? "white" : color} stroke={open ? color : undefined} strokeWidth={open ? 0.4 : undefined} />;
          })}
        </svg>
      </div>
      {/* Labels sit under their points (first and last aligned to the edges). On phones a long
          series shows every other label, counted back from the latest, so they never overlap. */}
      <div className="absolute right-0 bottom-0 text-[12.5px] font-medium text-slate-600 pointer-events-none" style={{ left: PAD_LEFT, height: PAD_BOTTOM }}>
        {data.map((d, i) => {
          const x = xOf(i);
          const shift = data.length === 1 ? "-50%" : i === 0 ? "0" : i === data.length - 1 ? "-100%" : "-50%";
          const thin = data.length > 7 && (data.length - 1 - i) % 2 === 1;
          return <span key={i} className={`absolute pt-1.5 whitespace-nowrap${thin ? " max-sm:hidden" : ""}`} style={{ left: `${x}%`, transform: `translateX(${shift})` }}>{d.l}</span>;
        })}
      </div>
    </div>
  );
}

/* The centre shows the real total (AENR-555) — e.g. "€889k" over "revenue" —
   never the sum of the percentages. */
export function Donut({ segments, size = 120, label, className, total: centre, totalLabel }: { segments: DonutSegment[]; size?: number; label?: string; className?: string; total?: string; totalLabel?: string }) {
  const total = segments.reduce((a, s) => a + s.v, 0);
  let acc = 0;
  const r = 42, c = 2 * Math.PI * r;
  const aria = label || `Donut chart: ${segments.map((s) => `${Math.round((s.v / total) * 100)}%`).join(", ")}`;
  return (
    <svg viewBox="0 0 100 100" style={className ? undefined : { width: size, height: size }} className={className} role="img" aria-label={aria}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f6" strokeWidth="12" />
      {segments.map((s, i) => {
        const frac = s.v / total, dash = frac * c, off = acc * c;
        acc += frac;
        return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.c} strokeWidth="12"
          strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" strokeLinecap="butt" />;
      })}
      {centre && <text x="50" y={totalLabel ? 50 : 54} textAnchor="middle" fontSize={centre.length > 6 ? 10 : 12} fontWeight="700" fill="#0B2545">{centre}</text>}
      {centre && totalLabel && <text x="50" y="61" textAnchor="middle" fontSize="6" fill="#475569">{totalLabel}</text>}
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
export function Funnel({ steps, color = "#13315c" }: { steps: FunnelStep[]; color?: string }) {
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
/** Grid size of the (mock) QR matrix. */
export const QR_N = 21;

/** Deterministic on-cells for a seed — reusable so a QR can be drawn inline in
 *  another SVG (e.g. the membership card) rather than only as the QR component. */
export function qrCells(seed: string): [number, number][] {
  const n = QR_N;
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
  return cells;
}

export function QR({ size = 120, seed = "SLAICE" }: { size?: number; seed?: string }) {
  const cells = qrCells(seed);
  return (
    <svg viewBox={`0 0 ${QR_N} ${QR_N}`} style={{ width: size, height: size }} className="rounded-lg bg-white" role="img" aria-label={`QR code for ${seed}`}>
      <rect width={QR_N} height={QR_N} fill="#fff" />
      {cells.map(([x, y], i) => <rect key={i} x={x} y={y} width="1" height="1" fill="#0B2545" />)}
    </svg>
  );
}

/* ---------- Multi-line chart ----------
   Several series on one scale (e.g. revenue per channel over time), each with
   its own colour and a legend; announced as one labelled image. */
export function MultiLineChart({ labels, series, height = 220, label }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number; label?: string }) {
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 0) * 1.1 || 1;
  const ticks = [1, 0.66, 0.33, 0];
  const xOf = (i: number) => (labels.length > 1 ? (i / (labels.length - 1)) * 100 : 50);
  const aria = label || `Line chart: ${series.map((s) => s.name).join(", ")}`;
  const every = Math.max(1, Math.ceil(labels.length / 12));
  return (
    <div>
      <div className="relative" style={{ height }} role="img" aria-label={aria}>
        <div className="absolute left-0 top-0 flex flex-col justify-between text-[12px] font-medium text-slate-500 tnum pr-2 pointer-events-none" style={{ width: PAD_LEFT, bottom: PAD_BOTTOM }}>
          {ticks.map((t, i) => <span key={i} className="text-right leading-none">{formatTick(max * t)}</span>)}
        </div>
        <div className="absolute top-0 right-0" style={{ left: PAD_LEFT, bottom: PAD_BOTTOM }}>
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full">
            {ticks.map((t, i) => <line key={i} x1="0" x2="100" y1={60 * (1 - t)} y2={60 * (1 - t)} stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="0.8 0.8" />)}
            {series.map((s) => (
              <polyline key={s.name} points={s.values.map((v, i) => `${xOf(i)},${60 - (v / max) * 60}`).join(" ")} fill="none" stroke={s.color} strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
        <div className="absolute right-0 bottom-0 grid text-[12px] font-medium text-slate-600 pointer-events-none" style={{ left: PAD_LEFT, height: PAD_BOTTOM, gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
          {labels.map((l, i) => <span key={i} className="text-center pt-1.5 truncate">{i % every === 0 ? l : ""}</span>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-slate-600">
        {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1.5"><i className="w-4 h-0.5 inline-block" style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  );
}
