import { useLayoutEffect, useRef, type ReactNode } from "react";
import { EASE, gsap, motionOK } from "../lib/fx";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(MorphSVGPlugin);
import { Icon } from "../lib/icons";
import { useMoney, useT } from "../app/store";
import type { SunbedSlot, SunbedState } from "../domain/types";

/* ============ Set tiles — the phone sunbed map (AENR-749) ============
   On phones each umbrella set is a rounded tile instead of the top-down
   umbrella glyph: big enough to read at arm's length and to tap, and every
   state differs by shape as well as colour (WCAG 1.4.1):
     free    white, teal ring, umbrella + its price
     on hold dashed amber border, clock, no price — not selectable
     taken   flat grey, struck through, no icon or price — not selectable
     yours   coral, lifted, a tick badge
   The map fits the phone's width (no sideways panning, so no column is cut
   off): `tileGeometry` sizes the tiles from the layout's column and row
   spacing, and positions are stretched to the layout's own bounds so the
   zone's empty margins don't eat into the tiles. */

const TILE_MIN_W = 38;
const TILE_MAX_W = 58;
const TILE_H_RATIO = 1.2;
const ROW_GAP = 12;

const distinct = (vals: number[]) =>
  [...new Set(vals.map((v) => Math.round(v * 10) / 10))].sort((a, b) => a - b);
const minStep = (vals: number[]) => {
  let m = Infinity;
  for (let i = 1; i < vals.length; i++) m = Math.min(m, vals[i] - vals[i - 1]);
  return m;
};

/** Tile size and content height for `slots` drawn `width` px wide. */
export function tileGeometry(slots: readonly SunbedSlot[], width: number) {
  const xs = distinct(slots.map((s) => s.x));
  const ys = distinct(slots.map((s) => s.y));
  const spanX = xs.length > 1 ? xs[xs.length - 1] - xs[0] : 0;
  const spanY = ys.length > 1 ? ys[ys.length - 1] - ys[0] : 0;
  // k = closest column step as a share of the whole span; with the tile's half
  // width as the margin on each side, the column step in px is w·k / (1 + k).
  const k = spanX > 0 ? minStep(xs) / spanX : 1;
  const step = (width * k) / (1 + k);
  const w = Math.round(Math.max(TILE_MIN_W, Math.min(TILE_MAX_W, step - 8)));
  const h = Math.round(w * TILE_H_RATIO);
  const rows = spanY > 0 ? Math.round(spanY / minStep(ys)) : 0;
  const height = rows * (h + ROW_GAP) + h + 8;
  return { w, h, height, bounds: { x0: xs[0] ?? 0, spanX, y0: ys[0] ?? 0, spanY } };
}

/** Where a slot's centre sits, in px, inside a box of `width` × `height`. */
export function tilePosition(
  s: SunbedSlot,
  g: ReturnType<typeof tileGeometry>,
  width: number,
  height: number,
) {
  const mx = g.w / 2 + 2;
  const my = g.h / 2 + 4;
  const fx = g.bounds.spanX > 0 ? (s.x - g.bounds.x0) / g.bounds.spanX : 0.5;
  const fy = g.bounds.spanY > 0 ? (s.y - g.bounds.y0) / g.bounds.spanY : 0.5;
  return { left: mx + fx * (width - 2 * mx), top: my + fy * (height - 2 * my) };
}

type TileState = "free" | "hold" | "taken" | "yours";

const tileState = (state: SunbedState, sel: boolean): TileState =>
  sel ? "yours" : state === "h" ? "hold" : state === "u" ? "taken" : "free";

const SKIN: Record<TileState, string> = {
  free: "bg-white text-navy-900 ring-2 ring-teal-600/80 shadow-sm",
  hold: "bg-amber-50/95 text-amber-800 border-2 border-dashed border-amber-500",
  taken: "set-tile-taken bg-slate-200/70 ring-1 ring-slate-300/60",
  yours:
    "bg-coral-700 text-white ring-2 ring-white shadow-[0_8px_16px_-6px_rgba(201,67,31,0.65)] -translate-y-0.5",
};

export function SetTile({
  state,
  sel,
  price,
  label,
  readOnly = false,
  onClick,
}: {
  state: SunbedState;
  sel: boolean;
  price: number;
  /** Set id and row, e.g. "CE-12, Front row". */
  label: string;
  readOnly?: boolean;
  onClick?: () => void;
}) {
  const tr = useT();
  const money = useMoney();
  const t = tileState(state, sel);
  const blocked = t === "hold" || t === "taken";
  const status = t === "hold" ? tr("on hold") : t === "taken" ? tr("unavailable") : money(price);
  return (
    <button
      type="button"
      disabled={blocked || readOnly}
      onClick={onClick}
      aria-label={`${tr("Sunbed")} ${label} ${status}${sel ? `, ${tr("selected")}` : ""}`}
      aria-pressed={sel}
      className={`relative w-full h-full rounded-[14px] flex flex-col items-center justify-center gap-0.5 transition duration-fast ease-spring ${SKIN[t]} ${
        readOnly
          ? sel
            ? ""
            : "opacity-60"
          : blocked
            ? "cursor-not-allowed"
            : "cursor-pointer active:scale-95 hover:-translate-y-0.5"
      } focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-navy-900`}
    >
      {t === "hold" ? (
        <Icon.clock size={15} aria-hidden />
      ) : (
        t !== "taken" && <Parasol open={sel} className={t === "free" ? "text-teal-700" : undefined} />
      )}
      {(t === "free" || t === "yours") && (
        <span className="text-[12px] font-bold leading-none tnum">{money(price)}</span>
      )}
      {t === "yours" && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-white text-coral-700 grid place-items-center shadow ring-1 ring-coral-700/20 animate-pop"
        >
          <Icon.check size={11} />
        </span>
      )}
    </button>
  );
}

/* The tile's umbrella (AENR-790): when the set becomes yours its canopy changes shape (MorphSVG,
   AENR-808) from a furled umbrella — a slim spindle down the pole — to the open dome, with a small
   overshoot; let go, it furls part-way and springs back. Not on mount. */
const DOME = "M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z";
const FURLED = "M12 3c1.2 2.6 1.6 6 1.2 9h-2.4C10.4 9 10.8 5.6 12 3Z";
function Parasol({ open, className }: { open: boolean; className?: string }) {
  const canopy = useRef<SVGPathElement>(null);
  const was = useRef(open);
  useLayoutEffect(() => {
    if (was.current === open) return;
    was.current = open;
    if (!motionOK() || !canopy.current) return;
    const tw = open
      ? gsap.fromTo(canopy.current, { morphSVG: FURLED }, { morphSVG: DOME, duration: 0.45, ease: "back.out(1.6)" })
      : gsap.timeline().to(canopy.current, { morphSVG: FURLED, duration: 0.14, ease: EASE.in }).to(canopy.current, { morphSVG: DOME, duration: 0.3, ease: "back.out(1.3)" });
    return () => { tw.kill(); };
  }, [open]);
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden data-canopy="" className={className}>
      <path ref={canopy} d={DOME} />
      <path d="M12 3v1M12 12v7a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** The four states as a one-line legend, drawn with the tiles themselves. */
export function SetTileLegend({ children }: { children?: ReactNode }) {
  const t = useT();
  const chip = (cls: string, icon: ReactNode, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`w-4 h-[18px] rounded-[5px] grid place-items-center ${cls}`}>
        {icon}
      </span>
      {text}
    </span>
  );
  return (
    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-guest-caption font-semibold text-slate-600">
      {chip("bg-white ring-[1.5px] ring-teal-600/80", null, t("Free"))}
      {chip("bg-amber-50 border-[1.5px] border-dashed border-amber-500", null, t("On hold"))}
      {chip("set-tile-taken bg-slate-200", null, t("Taken"))}
      {chip("bg-coral-700 text-white", <Icon.check size={9} />, t("Yours"))}
      {children}
    </div>
  );
}
