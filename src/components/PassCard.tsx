import { useId } from "react";
import { qrCells, QR_N } from "./charts";
import { SEASON_END_LABEL } from "../data/passes";

/* Tenant membership card art (VIP / Season pass), from the supplied designs.
   Responsive (scales to its container via the viewBox) with dynamic holder /
   number / subtitle / valid-until. A black QR sits top-right (where the sun was).
   IDs are per-instance so several can render at once. */

type PassKind = "vip" | "season";

interface CardCfg {
  stops: [string, string][];
  waves: [string, string, string];
  ink: { title: string; subtitle: string; memberLabel: string; name: string; number: string };
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
    waves: ["#E7C76B", "#D6AF49", "#C4982F"],
    ink: { title: "#241B06", subtitle: "#4A3A12", memberLabel: "#5A4718", name: "#241B06", number: "#241B06" },
    defName: "ALEXANDROS DIMITRIOU",
    titleText: "VIP", titleSize: 58, titleY: 158, titleLS: "2px",
    subX: 46, subText: "MEMBER · 2026", subY: 190,
  },
  season: {
    stops: [["0", "#D8EFF9"], ["0.5", "#A6D9EE"], ["1", "#6FBBD9"]],
    waves: ["#BFE3F2", "#8CCAE6", "#5BA8CC"],
    ink: { title: "#082638", subtitle: "#0C3149", memberLabel: "#1C5C7E", name: "#082638", number: "#082638" },
    defName: "ELENI GEORGIOU",
    titleText: "SEASON PASS", titleSize: 34, titleY: 156, titleLS: "1px",
    subX: 44, subText: "SUMMER 2026", subY: 184,
  },
};

const WAVES = [
  "M0 302 C 120 284 200 320 320 302 S 520 286 600 304 L600 378 L0 378 Z",
  "M0 324 C 130 308 210 342 330 324 S 530 308 600 326 L600 378 L0 378 Z",
  "M0 346 C 110 332 200 360 320 346 S 520 334 600 348 L600 378 L0 378 Z",
];

// QR placement (card coords) where the decorative sun used to sit, top-right.
const QS = 100;
const QX = 436;
const QY = 70;

export function PassCard({ kind, holder, number = "NO. 0042", subtitle, validUntil, className = "" }: {
  kind: PassKind;
  holder?: string;
  number?: string;
  subtitle?: string;
  validUntil?: string;
  className?: string;
}) {
  const raw = useId().replace(/[:]/g, "");
  const grad = `pc-grad-${raw}`;
  const c = CFG[kind];
  const name = holder ?? c.defName;
  const sub = subtitle ?? c.subText;
  const until = (validUntil ?? SEASON_END_LABEL).toUpperCase();
  // The tenant beach logo replaces the wordmark, top-left.
  const logoUrl = `${import.meta.env.BASE_URL}tenant-logo.png`;
  const cells = qrCells(`${kind}-${number}`);
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
        {WAVES.map((d, i) => <path key={i} d={d} fill={c.waves[i]} />)}

        <image href={logoUrl} x="40" y="26" width="215" height="50" preserveAspectRatio="xMinYMid meet" />

        {/* QR (black) where the sun used to be. */}
        <rect x={QX - 10} y={QY - 10} width={QS + 20} height={QS + 20} rx="14" fill="#ffffff" stroke="rgba(0,0,0,0.08)" />
        <g transform={`translate(${QX} ${QY}) scale(${QS / QR_N})`}>
          {cells.map(([x, y], i) => <rect key={i} x={x} y={y} width="1" height="1" fill="#000000" />)}
        </g>

        <text x="42" y={c.titleY} fontSize={c.titleSize} fontWeight="700" fill={c.ink.title} style={{ letterSpacing: c.titleLS }}>{c.titleText}</text>
        <text x={c.subX} y={c.subY} fontSize="13" fontWeight="600" fill={c.ink.subtitle} style={{ letterSpacing: "3px" }}>{sub}</text>

        <text x="44" y="236" fontSize="12.5" fontWeight="700" fill={c.ink.memberLabel} style={{ letterSpacing: "2px" }}>MEMBER</text>
        <text x="44" y="263" fontSize="19" fontWeight="700" fill={c.ink.name} style={{ letterSpacing: "0.5px" }}>{name}</text>
        <text x="44" y="285" fontSize="11" fontWeight="600" fill={c.ink.subtitle} style={{ letterSpacing: "1px" }}>VALID UNTIL {until}</text>
        <text x="556" y="263" textAnchor="end" fontFamily="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" fontSize="19" fontWeight="600" fill={c.ink.number} style={{ letterSpacing: "1.5px" }}>{number}</text>
      </g>
    </svg>
  );
}
