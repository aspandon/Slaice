import { useId } from "react";

/* Tenant membership card art (VIP / Season pass), from the supplied designs.
   Responsive (scales to its container via the viewBox) with dynamic holder /
   number / subtitle. IDs are per-instance so several can render at once. */

type PassKind = "vip" | "season";

interface CardCfg {
  stops: [string, string][];
  sun: string;
  sunStroke: string;
  ray: string;
  rayOpacity: number;
  waves: [string, string, string];
  ink: { akti: string; title: string; subtitle: string; memberLabel: string; name: string; number: string };
  defName: string;
  titleText: string;
  titleSize: number;
  titleY: number;
  titleLS: string;
  subX: number;
  subText: string;
  subY: number;
}

const CFG: Record<PassKind, CardCfg> = {
  vip: {
    stops: [["0", "#F4DA8A"], ["0.55", "#E2BB57"], ["1", "#C2912F"]],
    sun: "#FCEFB6", sunStroke: "#FFF8DC", ray: "#FBE59A", rayOpacity: 0.9,
    waves: ["#E7C76B", "#D6AF49", "#C4982F"],
    ink: { akti: "#3A2C0E", title: "#241B06", subtitle: "#4A3A12", memberLabel: "#5A4718", name: "#241B06", number: "#241B06" },
    defName: "ALEXANDROS DIMITRIOU",
    titleText: "VIP", titleSize: 58, titleY: 158, titleLS: "2px",
    subX: 46, subText: "MEMBER · 2026", subY: 190,
  },
  season: {
    stops: [["0", "#D8EFF9"], ["0.5", "#A6D9EE"], ["1", "#6FBBD9"]],
    sun: "#FFE9A6", sunStroke: "#FFF6D6", ray: "#FFE09A", rayOpacity: 0.95,
    waves: ["#BFE3F2", "#8CCAE6", "#5BA8CC"],
    ink: { akti: "#0C3149", title: "#082638", subtitle: "#0C3149", memberLabel: "#1C5C7E", name: "#082638", number: "#082638" },
    defName: "ELENI GEORGIOU",
    titleText: "SEASON PASS", titleSize: 34, titleY: 156, titleLS: "1px",
    subX: 44, subText: "SUMMER 2026", subY: 184,
  },
};

const RAYS: [number, number, number, number][] = [
  [546, 120, 558, 120], [528.4, 162.4, 536.9, 170.9], [486, 180, 486, 192], [443.6, 162.4, 435.1, 170.9],
  [426, 120, 414, 120], [443.6, 77.6, 435.1, 69.1], [486, 60, 486, 48], [528.4, 77.6, 536.9, 69.1],
];
const WAVES = [
  "M0 302 C 120 284 200 320 320 302 S 520 286 600 304 L600 378 L0 378 Z",
  "M0 324 C 130 308 210 342 330 324 S 530 308 600 326 L600 378 L0 378 Z",
  "M0 346 C 110 332 200 360 320 346 S 520 334 600 348 L600 378 L0 378 Z",
];

export function PassCard({ kind, holder, number = "NO. 0042", subtitle, className = "" }: {
  kind: PassKind;
  holder?: string;
  number?: string;
  subtitle?: string;
  className?: string;
}) {
  const raw = useId().replace(/[:]/g, "");
  const grad = `pc-grad-${raw}`;
  const c = CFG[kind];
  const name = holder ?? c.defName;
  const sub = subtitle ?? c.subText;
  // Corners are rounded by the embedding container (overflow-hidden + rounded),
  // so the art fills it flush — no double-radius notch.
  return (
    <svg viewBox="0 0 600 378" className={`block w-full h-auto ${className}`} role="img" aria-label={`${c.titleText} card`}
      fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0.2" y2="1">
          {c.stops.map(([off, col]) => <stop key={off} offset={off} stopColor={col} />)}
        </linearGradient>
      </defs>
      <g>
        <rect width="600" height="378" fill={`url(#${grad})`} />
        <circle cx="486" cy="120" r="54" fill={c.sun} />
        <circle cx="486" cy="120" r="54" fill="none" stroke={c.sunStroke} strokeWidth="2" strokeOpacity="0.7" />
        <g stroke={c.ray} strokeWidth="3" strokeLinecap="round" strokeOpacity={c.rayOpacity}>
          {RAYS.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
        </g>
        {WAVES.map((d, i) => <path key={i} d={d} fill={c.waves[i]} />)}
        <text x="44" y="58" fontSize="14" fontWeight="600" fill={c.ink.akti} style={{ letterSpacing: "3px" }}>AKTI TOU ILIOU</text>
        <text x="42" y={c.titleY} fontSize={c.titleSize} fontWeight="700" fill={c.ink.title} style={{ letterSpacing: c.titleLS }}>{c.titleText}</text>
        <text x={c.subX} y={c.subY} fontSize="13" fontWeight="600" fill={c.ink.subtitle} style={{ letterSpacing: "3px" }}>{sub}</text>
        <text x="44" y="246" fontSize="11" fontWeight="600" fill={c.ink.memberLabel} style={{ letterSpacing: "2px" }}>MEMBER</text>
        <text x="44" y="266" fontSize="15" fontWeight="600" fill={c.ink.name} style={{ letterSpacing: "1px" }}>{name}</text>
        <text x="556" y="266" textAnchor="end" fontFamily="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" fontSize="15" fontWeight="500" fill={c.ink.number} style={{ letterSpacing: "2px" }}>{number}</text>
      </g>
    </svg>
  );
}
