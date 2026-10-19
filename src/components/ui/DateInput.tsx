import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "../../lib/icons";

/* ---------- DateInput (AENR-556) ----------
   The app's date field for staff flows, replacing native date inputs (which
   showed 10/12/2026 in US order). Shows "19 Jul 2026" (en-GB), opens a month
   calendar; value in and out is ISO YYYY-MM-DD so callers keep their logic.
   Keyboard: arrows move a day / week, PageUp/PageDown a month, Enter picks,
   Esc closes. */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
/** dd MMM yyyy — the one display format for dates. */
export const fmtDateGB = (s: string) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s)
    ? `${Number(s.slice(8, 10))} ${MON[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`
    : "";

export function DateInput({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Pick a date",
  className = "",
  id,
  "aria-label": ariaLabel,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(() => value || iso(new Date(2026, 6, 19)));
  const gridRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) setFocus(value || focus);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(
      () => gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus(),
      0,
    );
    return () => window.clearTimeout(t);
  }, [open, focus]);
  const f = parse(focus);
  const cells = useMemo(() => {
    const first = new Date(f.getFullYear(), f.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start Monday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [f.getFullYear(), f.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
  const out = (s: string) => (min && s < min) || (max && s > max);
  const move = (days: number, months = 0) => {
    const d = parse(focus);
    if (months) d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() + days);
    setFocus(iso(d));
  };
  const pick = (s: string) => {
    if (out(s)) return;
    onChange(s);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={
            ariaLabel ? `${ariaLabel}: ${value ? fmtDateGB(value) : "not set"}` : undefined
          }
          className={`glass-input inline-flex items-center gap-2 rounded-xl px-3 min-h-[44px] text-sm text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 disabled:opacity-50 ${className}`}
        >
          <Icon.calendar size={15} className="text-slate-500 shrink-0" />
          <span className={`tnum ${value ? "text-ink" : "text-slate-500"}`}>
            {value ? fmtDateGB(value) : placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[80] w-[296px] rounded-2xl bg-white p-3 shadow-overlay ring-1 ring-slate-200 text-ink"
          aria-labelledby={titleId}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => move(0, -1)}
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
            >
              <Icon.chevL size={16} />
            </button>
            <div id={titleId} className="font-semibold text-navy-900 text-sm" aria-live="polite">
              {MONTH[f.getMonth()]} {f.getFullYear()}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => move(0, 1)}
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
            >
              <Icon.chevR size={16} />
            </button>
          </div>
          <div
            className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500 mb-1"
            aria-hidden
          >
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div
            ref={gridRef}
            role="grid"
            tabIndex={-1}
            aria-labelledby={titleId}
            className="grid grid-cols-7 gap-0.5"
            onKeyDown={(e) => {
              const k = e.key;
              if (k === "ArrowLeft") move(-1);
              else if (k === "ArrowRight") move(1);
              else if (k === "ArrowUp") move(-7);
              else if (k === "ArrowDown") move(7);
              else if (k === "PageUp") move(0, -1);
              else if (k === "PageDown") move(0, 1);
              else return;
              e.preventDefault();
            }}
          >
            {cells.map((d) => {
              const s = iso(d);
              const inMonth = d.getMonth() === f.getMonth();
              const sel = s === value;
              const dis = !!out(s);
              return (
                <button
                  key={s}
                  type="button"
                  data-day={s}
                  role="gridcell"
                  aria-selected={sel}
                  disabled={dis}
                  tabIndex={s === focus ? 0 : -1}
                  aria-label={`${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`}
                  onClick={() => pick(s)}
                  onFocus={() => setFocus(s)}
                  className={`h-9 rounded-lg text-[13px] tnum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-30 ${sel ? "bg-navy-900 text-white font-semibold" : inMonth ? "text-navy-900 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between">
            {!required && value ? (
              <button
                type="button"
                className="text-[12px] font-semibold text-slate-600 hover:text-rose-600"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="text-[12px] font-semibold text-teal-700"
              onClick={() => pick("2026-07-19")}
            >
              Today
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
