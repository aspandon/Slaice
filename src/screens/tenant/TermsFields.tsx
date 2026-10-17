import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* ============ Form fields of Platform › tenant › Commercial terms (AENR-725 / 689) ============
   A money / percentage field that keeps what is being typed, and a row of
   radio buttons for two- or three-way choices. */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Numbers as typed: commas count as decimal points; empty or junk is NaN (the field shows its error). */
const parseNum = (s: string) => (s.trim() === "" ? NaN : Number(s.trim().replace(",", ".")));
const showNum = (v: number, money: boolean) =>
  Number.isFinite(v) ? (money ? v.toFixed(2) : String(r2(v))) : "";

/** A numeric field that keeps what is being typed ("1." stays "1.") and reports a number (or NaN). */
export function Num({
  label,
  short,
  value,
  onChange,
  unit,
  error,
  hideLabel = false,
}: {
  /** The full accessible name, e.g. "Sunbeds commission". */
  label: string;
  /** A shorter visible label where the context names the rest (the service is the row's heading). */
  short?: string;
  value: number;
  onChange: (v: number) => void;
  unit: "€" | "%";
  error?: string;
  /** Visually hidden on sm+ where a column header names the field (always read out). */
  hideLabel?: boolean;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const errId = useId();
  const shown = focused ? text : Number.isFinite(value) ? showNum(value, unit === "€") : text;
  // The error sits outside the <label> so it is not part of the field's name — it is its description.
  return (
    <div className="min-w-0">
      <label className="block">
        <span
          className={`block text-[11.5px] font-semibold text-slate-600 mb-1 ${hideLabel ? "sm:sr-only" : ""}`}
        >
          {short ?? label}
        </span>
        <span className="relative flex items-center">
          {/* z-10: the glass input paints over earlier siblings (backdrop-filter), so the unit sits above it. */}
          {unit === "€" && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-10 left-3 text-[13px] text-slate-500"
            >
              €
            </span>
          )}
          <input
            inputMode="decimal"
            autoComplete="off"
            aria-label={short ? label : undefined}
            value={shown}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onFocus={() => {
              setText(Number.isFinite(value) ? showNum(value, unit === "€") : text);
              setFocused(true);
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setText(e.target.value);
              onChange(parseNum(e.target.value));
            }}
            className={`glass-input w-full rounded-xl py-2 text-base sm:text-sm tnum outline-none transition focus:ring-2 focus:ring-teal-500/70 ${unit === "€" ? "pl-7 pr-3" : "pl-3 pr-8"} ${error ? "ring-2 ring-rose-400" : ""}`}
          />
          {unit === "%" && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-10 right-3 text-[13px] text-slate-500"
            >
              %
            </span>
          )}
        </span>
      </label>
      {error && (
        <span id={errId} className="mt-1 block text-[11.5px] font-medium text-rose-700">
          {error}
        </span>
      )}
    </div>
  );
}

const ARROW_STEP: Partial<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/** A two- or three-way choice as a row of buttons with radio semantics: one tab stop, arrow keys
 *  move the choice (WAI-ARIA radio group). */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { v: T; l: ReactNode; sub?: ReactNode }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.v === value),
  );
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = ARROW_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const n = (i + step + options.length) % options.length;
    onChange(options[n].v);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr"
    >
      {options.map((o, i) => {
        const on = o.v === value;
        return (
          <button
            key={o.v}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === current ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.v)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-h-[44px] rounded-xl px-3 py-2 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-slate-200 hover:ring-slate-400"}`}
          >
            <span className="block text-[13px] font-semibold">{o.l}</span>
            {o.sub && (
              <span
                className={`block text-[11.5px] leading-snug ${on ? "text-white/75" : "text-slate-500"}`}
              >
                {o.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
