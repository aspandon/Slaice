import { Sunbed } from "./Beach";
import { LANDMARK_LABEL } from "../data/pricing";
import type { Landmark, SunbedSlot } from "../domain/types";

/* ---------- Shared sunbed map (AENR-469) ----------
   One zone's sets on a sea-at-the-top sand box, with landmarks and the
   accessibility mark — the same picture for the admin's "Preview as customer",
   the Cashier till and the entrance display. Every set is the shared <Sunbed>
   glyph, so states, tooltips and accessible names match the booking wizard. */
export function SunbedMap({
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
}: {
  /** A small state badge on a set — a letter plus colour, never colour alone (AENR-580). */
  marker?: (s: SunbedSlot) => { text: string; cls: string } | undefined;
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
            width: "clamp(30px, 5.2vw, 44px)",
            height: "clamp(30px, 5.2vw, 44px)",
          }}
        >
          <Sunbed
            state={s.state}
            sel={selected?.has(s.id)}
            price={priceOf ? priceOf(s) : s.price}
            label={`${s.id}${s.access ? " (step-free)" : ""}${s.inv ? ` — ${s.inv}` : ""}`}
            fill
            readOnly={readOnly || pickAny}
            onClick={onToggle && !pickAny ? () => onToggle(s) : undefined}
          />
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
            <span aria-hidden className="absolute left-1/2 -translate-x-1/2 top-[88%] whitespace-nowrap rounded bg-white/90 px-0.5 text-[9px] leading-tight font-semibold text-navy-900 tnum pointer-events-none">
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
