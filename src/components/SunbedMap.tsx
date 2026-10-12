import { Sunbed } from "./Beach";
import { LANDMARK_LABEL } from "../data/pricing";
import type { Landmark, SunbedSlot } from "../domain/types";

/* ---------- Shared sunbed map (AENR-469) ----------
   One store's sets on a sea-at-the-top sand box, with landmarks and the
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
}: {
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
          className="absolute -translate-x-1/2 -translate-y-1/2"
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
              aria-label={`${s.id}${s.state === "u" ? " — taken" : s.state === "h" ? " — on hold" : " — free"}${s.inv ? `, ${s.inv}` : ""}`}
              onClick={() => onToggle(s)}
              className={`absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${selected?.has(s.id) ? "ring-2 ring-navy-900" : ""}`}
            />
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
