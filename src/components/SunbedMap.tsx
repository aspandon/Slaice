import { useLayoutEffect, useState, type ReactNode } from "react";
import { ZoomBox } from "./ZoomBox";
import { Sunbed } from "./Beach";
import { Icon } from "../lib/icons";
import { LANDMARK_LABEL } from "../data/pricing";
import type { Landmark, SunbedSlot } from "../domain/types";

/* ---------- Shared sunbed map (AENR-469) ----------
   One zone's sets on a sea-at-the-top sand box, with landmarks and the
   accessibility mark — the same picture for the admin's "Preview as customer",
   the Cashier till and the entrance display. Every set is the shared <Sunbed>
   glyph, so states, tooltips and accessible names match the booking wizard. */
type MapProps = Parameters<typeof MapCanvas>[0];

/* Phones (AENR-647): the map is drawn at a size where every set is a 44px target,
   in a pannable box that opens on the part that matters (your picks, the
   highlighted sets, or the first free set); pinch or −/+ to zoom. A Map | List
   toggle shows the same sets as rows with the same action, selections in sync. */
export function SunbedMap(props: MapProps & { list?: boolean }) {
  const { list = !!props.onToggle, ...rest } = props;
  const [view, setView] = useState<"map" | "list">("map");
  const narrow = useNarrow();
  return (
    <div className="space-y-2">
      {list && (
        <div role="radiogroup" aria-label={`${props.label} view`} className="flex justify-end">
          <div className="inline-flex rounded-lg ring-1 ring-slate-200 overflow-hidden text-[12px] font-semibold">
            {(["map", "list"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                className={`px-3 min-h-[36px] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${view === v ? "bg-navy-900 text-white" : "bg-white text-navy-900 hover:bg-slate-50"}`}>
                {v === "map" ? <Icon.map size={13} /> : <Icon.list size={13} />} {v === "map" ? "Map" : "List"}
              </button>
            ))}
          </div>
        </div>
      )}
      {view === "list" ? <SetList {...rest} /> : narrow ? <ZoomMap {...rest} /> : <MapCanvas {...rest} />}
    </div>
  );
}

function useNarrow() {
  const q = "(max-width: 767px)";
  const [n, setN] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useLayoutEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setN(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return n;
}

/** The smallest gap between neighbouring sets (in % of the box), across and down. */
function gaps(slots: readonly SunbedSlot[]) {
  const rows = new Map<number, number[]>();
  slots.forEach((s) => rows.set(Math.round(s.y), [...(rows.get(Math.round(s.y)) ?? []), s.x]));
  let dx = 100;
  rows.forEach((xs) => xs.sort((a, b) => a - b).forEach((x, i) => i && x - xs[i - 1] > 0.5 && (dx = Math.min(dx, x - xs[i - 1]))));
  const ys = [...rows.keys()].sort((a, b) => a - b);
  let dy = 100;
  ys.forEach((y, i) => i && (dy = Math.min(dy, y - ys[i - 1])));
  return { dx, dy };
}

const CELL = 44;
const AR = 0.75;
function ZoomMap(props: MapProps) {
  const { dx, dy } = gaps(props.slots);
  // Wide enough that neighbours sit a 44px target + 8px apart, rows a target + code label apart.
  // A taller box than on desktop (3:4) so rows spread down rather than across.
  const need = Math.max(((CELL + 8) * 100) / dx, ((CELL + 16) * 100) / (dy * AR));
  // Open on what matters: your picks, then highlighted sets, then the first free set.
  const s =
    props.slots.find((x) => props.selected?.has(x.id)) ??
    props.slots.find((x) => props.highlight?.has(x.id)) ??
    props.slots.find((x) => x.state === "a") ??
    props.slots[0];
  return (
    <ZoomBox minWidth={need} aspect={AR} focus={s ? { x: s.x, y: s.y } : undefined} vars={(z) => ({ "--cell": `${CELL * z}px` })}>
      <MapCanvas {...props} className={`${props.className ?? ""} !aspect-auto h-full !ring-0`} />
    </ZoomBox>
  );
}

/** The same sets as rows (AENR-647): code, state, price — and the same action. */
function SetList({ slots, selected, onToggle, describe, priceOf, marker, label, pickAny }: MapProps) {
  const rows = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  return (
    <ul aria-label={`${label} — list`} className="max-h-[440px] overflow-y-auto divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 bg-white/80">
      {rows.map((s) => {
        const on = !!selected?.has(s.id);
        const m = marker?.(s);
        const state = describe?.(s) ?? (s.state === "u" ? "taken" : s.state === "h" ? "on hold" : "free");
        const can = !!onToggle && (pickAny || s.state === "a" || on);
        return (
          <li key={s.id} className="flex items-center gap-3 px-3 min-h-[48px]">
            <span className="font-mono font-semibold text-navy-900 w-14">{s.id}</span>
            <span className="flex-1 min-w-0 truncate text-[13px] text-slate-600">
              {m && <span aria-hidden className={`inline-block min-w-[18px] h-[18px] px-1 mr-1.5 rounded-full text-[10px] font-bold leading-[18px] text-center align-middle ${m.cls}`}>{m.text}</span>}
              {state}{s.access ? " · step-free" : ""}{s.inv ? ` · ${s.inv}` : ""}
            </span>
            <span className="tnum text-[13px] text-slate-700">€{priceOf ? priceOf(s) : s.price}</span>
            {onToggle && (
              <button type="button" aria-pressed={on} disabled={!can} onClick={() => onToggle(s)} aria-label={`${on ? "Deselect" : "Select"} ${s.id}`}
                className={`min-h-[36px] min-w-[72px] rounded-lg px-2.5 text-[12.5px] font-semibold ring-1 transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-slate-300 hover:ring-teal-400"}`}>
                {on ? "Selected" : "Select"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MapCanvas({
  slots,
  landmarks = [],
  selected,
  onToggle,
  readOnly = false,
  priceOf,
  className = "",
  label,
  pickAny = false,
  highlight = null,
  showCodes = false,
  describe,
  marker,
  heat,
  staff = false,
}: {
  /** A small state badge on a set — a letter plus colour, never colour alone (AENR-580). */
  marker?: (s: SunbedSlot) => { text: ReactNode; cls: string } | undefined;
  /** Staff colours (AENR-663): booked sets solid, free sets outlined — busy reads busy. */
  staff?: boolean;
  /** Heatmap: 0–1 per set, drawn as a tint behind it (AENR-580). */
  heat?: (s: SunbedSlot) => number;
  /** Only these sets stay prominent (status filters, AENR-587); the rest fade. */
  highlight?: Set<string> | null;
  /** Print each set's code under it (staff maps). */
  showCodes?: boolean;
  /** Staff view: extra words for a set's accessible name (e.g. "unpaid"). */
  describe?: (s: SunbedSlot) => string | undefined;
  /** Staff view: every set is tappable (booked / blocked too), its status in the name. */
  pickAny?: boolean;
  slots: SunbedSlot[];
  landmarks?: Landmark[];
  selected?: Set<string>;
  onToggle?: (s: SunbedSlot) => void;
  readOnly?: boolean;
  priceOf?: (s: SunbedSlot) => number;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${label} — sea at the top`}
      className={`relative overflow-x-clip rounded-xl bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100/70 ring-1 ring-slate-200 aspect-[16/8] sm:aspect-[16/7] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-[7%] bg-sky-300/50 rounded-t-xl" aria-hidden />
      {landmarks.map((l) => (
        <span
          key={l.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-white/90 ring-1 ring-navy-900/20 px-1.5 py-0.5 text-[10px] font-semibold text-navy-900 shadow-sm pointer-events-none"
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
        >
          <span aria-hidden>{LANDMARK_LABEL[l.kind].icon}</span>
          {l.label || LANDMARK_LABEL[l.kind].label}
        </span>
      ))}
      {slots.map((s) => (
        <div
          key={s.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${highlight ? (highlight.has(s.id) ? "z-10" : "opacity-25 saturate-0") : ""}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: "var(--cell, clamp(30px, 5.2vw, 44px))",
            height: "var(--cell, clamp(30px, 5.2vw, 44px))",
          }}
        >
          {staff ? (
            <span className="absolute inset-[14%] top-[6%] bottom-[22%] grid"><StaffSet state={s.state} sel={!!selected?.has(s.id)} /></span>
          ) : (
          <Sunbed
            state={s.state}
            sel={selected?.has(s.id)}
            price={priceOf ? priceOf(s) : s.price}
            label={`${s.id}${s.access ? " (step-free)" : ""}${s.inv ? ` — ${s.inv}` : ""}`}
            fill
            readOnly={readOnly || pickAny}
            onClick={onToggle && !pickAny ? () => onToggle(s) : undefined}
          />
          )}
          {staff && !pickAny && onToggle && !readOnly && (
            <button
              type="button"
              aria-pressed={!!selected?.has(s.id)}
              disabled={s.state !== "a" && !selected?.has(s.id)}
              aria-label={`${s.id} — ${s.state === "u" ? "booked" : s.state === "h" ? "on hold" : "free"}, €${priceOf ? priceOf(s) : s.price}`}
              onClick={() => onToggle(s)}
              className="absolute inset-0 rounded-lg disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            />
          )}
          {pickAny && onToggle && (
            <button
              type="button"
              aria-pressed={!!selected?.has(s.id)}
              aria-label={`${s.id}${describe?.(s) ? ` — ${describe(s)}` : s.state === "u" ? " — taken" : s.state === "h" ? " — on hold" : " — free"}${s.inv ? `, ${s.inv}` : ""}`}
              onClick={() => onToggle(s)}
              className={`absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${selected?.has(s.id) ? "ring-2 ring-navy-900" : ""}`}
            />
          )}
          {heat && (() => {
            const h = Math.max(0, Math.min(1, heat(s)));
            return <span aria-hidden className="absolute -inset-1.5 -z-10 rounded-xl pointer-events-none" style={{ background: `rgba(${Math.round(20 + 220 * h)}, ${Math.round(184 - 120 * h)}, ${Math.round(166 - 120 * h)}, ${0.25 + h * 0.5})` }} />;
          })()}
          {(() => {
            const m = marker?.(s);
            return m ? <span aria-hidden className={`absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center ring-2 ring-white pointer-events-none z-[1] ${m.cls}`}>{m.text}</span> : null;
          })()}
          {highlight?.has(s.id) && <span aria-hidden className="absolute -inset-1 rounded-xl ring-[3px] ring-amber-500 pointer-events-none" />}
          {showCodes && (
            <span aria-hidden className="absolute z-[2] left-1/2 -translate-x-1/2 top-[88%] whitespace-nowrap rounded bg-white/90 px-0.5 text-[9px] leading-tight font-semibold text-navy-900 tnum pointer-events-none">
              {s.id}
            </span>
          )}
          {s.inv && <span aria-hidden title={s.inv} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-navy-900 text-white text-[8px] grid place-items-center ring-2 ring-white pointer-events-none">🔒</span>}
          {s.access && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] grid place-items-center ring-2 ring-white"
            >
              ♿
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* The staff glyph (AENR-663): booked = solid navy, free = an outline, on hold =
   striped. Same umbrella mark, so it still reads as the beach. */
export function StaffSet({ state, sel = false, size }: { state: "a" | "h" | "u"; sel?: boolean; size?: number }) {
  const box = size ? { width: size, height: size } : undefined;
  return (
    <span
      aria-hidden
      style={box}
      className={`grid place-items-center rounded-lg transition ${size ? "" : "w-full h-full"} ${
        sel
          ? "bg-teal-600 text-white ring-2 ring-navy-900 ring-offset-1"
          : state === "u"
            ? "bg-navy-800 text-white"
            : state === "h"
              ? "bg-[repeating-linear-gradient(45deg,#cbd5e1_0_3px,#f1f5f9_3px_6px)] text-slate-600 ring-1 ring-slate-400"
              : "bg-white/85 text-teal-700 ring-2 ring-teal-600"
      }`}
    >
      <Icon.umbrella size={size ? Math.round(size * 0.6) : 14} />
    </span>
  );
}
