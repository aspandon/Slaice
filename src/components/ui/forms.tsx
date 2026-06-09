import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../lib/icons";
import { chipLabel, dateStrip, fromISO, todayISO, toISO } from "../../data/beach";
import { useApp, useT } from "../../app/store";
import { localeFor } from "../../app/i18n";

/* ---------- Field / inputs ---------- */
export function Field({ label, children, hint }: { label?: ReactNode; children?: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      {label && <div className="text-[12px] font-semibold text-slate-700 mb-1">{label}</div>}
      {children}
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}
// text-base on mobile (16px) prevents iOS Safari's focus-zoom.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} {...props} className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow outline-none placeholder:text-slate-400 ${className}`} />;
  },
);
type SelectOption = string | { v: string; l: string };
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options?: SelectOption[] }>(
  function Select({ options = [], className = "", ...props }, ref) {
    return (
      <select ref={ref} {...props} className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow outline-none cursor-pointer ${className}`}>
        {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>))}
      </select>
    );
  },
);

/* ---------- Toggle ---------- */
export function Toggle({ on, onChange, label }: { on?: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="inline-flex items-center gap-2 group">
      <span className={`w-11 h-7 rounded-full transition-colors duration-200 relative ${on ? "bg-teal-600" : "bg-slate-300 group-hover:bg-slate-400"}`}>
        <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-200 ease-spring ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </button>
  );
}

/* ---------- Stepper (quantity) ---------- */
export function Stepper({ value, onChange, min = 0, label }: { value: number; onChange: (v: number) => void; min?: number; label?: string }) {
  const what = label ? ` ${label}` : "";
  return (
    <div className="flex items-center gap-3">
      <button aria-label={`Decrease${what}`} onClick={() => onChange(Math.max(min, value - 1))} className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg ring-1 ring-slate-300 grid place-items-center text-slate-600 transition hover:bg-slate-50 hover:ring-slate-400 active:scale-90 disabled:opacity-40" disabled={value <= min}><Icon.minus size={16} /></button>
      <span className="w-6 text-center font-semibold tnum tabular-nums" aria-live="polite" aria-label={label ? `${value} ${label}` : undefined}>{value}</span>
      <button aria-label={`Increase${what}`} onClick={() => onChange(value + 1)} className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg ring-1 ring-slate-300 grid place-items-center text-slate-600 transition hover:bg-slate-50 hover:ring-slate-400 active:scale-90"><Icon.plus size={16} /></button>
    </div>
  );
}

/* ---------- DatePickerRow ----------
   Date picker. `value` is an array of ISO YYYY-MM-DD strings. With `multiple`
   off (the default for single-day bookings) selecting a date replaces the
   selection; with it on, dates toggle and accumulate. */
export function DatePickerRow({ value = [], onChange, quickDays = 7, multiple = true, maxDays, className = "" }: {
  value?: string[];
  onChange: (v: string[]) => void;
  quickDays?: number;
  multiple?: boolean;
  /** Cap the number of days that can be selected (e.g. 7 for a week). */
  maxDays?: number;
  className?: string;
}) {
  const [picker, setPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const { lang } = useApp();
  const t = useT();
  const loc = localeFor(lang);
  // Dates re-localize when the language changes (loc derives from lang); t is
  // stable in behaviour for a given language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const strip = useMemo(() => dateStrip(quickDays, loc, t), [quickDays, loc]);
  const stripSet = useMemo(() => new Set(strip.map((d) => d.iso)), [strip]);
  const extras = useMemo(() => value.filter((iso) => !stripSet.has(iso)).sort(), [value, stripSet]);
  const atCap = !!maxDays && multiple && value.length >= maxDays;
  const toggle = (iso: string) => {
    if (!multiple) { onChange([iso]); return; } // single-day: replace selection
    const has = value.includes(iso);
    if (has && value.length === 1) return; // keep at least one
    if (!has && maxDays && value.length >= maxDays) return; // cap reached
    onChange(has ? value.filter((x) => x !== iso) : [...value, iso].sort());
  };
  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanL(el.scrollLeft > 2);
    setCanR(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2);
  };
  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [strip.length, extras.length]);
  const nudge = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(140, el.clientWidth * 0.7), behavior: "smooth" });
  };
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={t("Scroll dates left")} onClick={() => nudge(-1)} disabled={!canL}
          className="shrink-0 w-7 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:text-navy-900 hover:ring-teal-400 transition disabled:opacity-30 disabled:cursor-not-allowed">
          <Icon.arrowL size={14} />
        </button>
        <div ref={scrollRef} className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {strip.map((d) => {
            const on = value.includes(d.iso);
            return <DatePill key={d.iso} on={on} disabled={!on && atCap} label={d.label} sub={d.sub} onClick={() => toggle(d.iso)} />;
          })}
          {extras.map((iso) => {
            const lbl = chipLabel(iso, loc, t);
            return <DatePill key={iso} on label={lbl.label} sub={lbl.sub} onClick={() => toggle(iso)} />;
          })}
          <button type="button" onClick={() => setPicker(true)}
            className="px-3 py-2.5 min-h-[64px] rounded-xl min-w-[78px] ring-1 ring-dashed ring-slate-300 text-slate-600 hover:ring-teal-400 hover:text-teal-700 transition shrink-0 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold"
            aria-label={t("Pick dates from calendar")}>
            <Icon.calendar size={14} /> {multiple ? t("Pick dates") : t("Pick a date")}
          </button>
        </div>
        <button type="button" aria-label={t("Scroll dates right")} onClick={() => nudge(1)} disabled={!canR}
          className="shrink-0 w-7 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:text-navy-900 hover:ring-teal-400 transition disabled:opacity-30 disabled:cursor-not-allowed">
          <Icon.arrowR size={14} />
        </button>
      </div>
      {picker && <DateCalendarModal value={value} onChange={onChange} onClose={() => setPicker(false)} locale={loc} t={t} multiple={multiple} maxDays={maxDays} />}
    </div>
  );
}

function DatePill({ on, label, sub, onClick, disabled = false }: { on?: boolean; label: ReactNode; sub: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} disabled={disabled}
      className={`relative px-3.5 py-2.5 min-h-[64px] rounded-xl min-w-[78px] ring-1 transition shrink-0 inline-flex flex-col items-center justify-center gap-1 ${
        on ? "bg-navy-900 text-white ring-navy-900" : disabled ? "bg-slate-50 ring-slate-200 opacity-40 cursor-not-allowed" : "bg-white ring-slate-200 hover:ring-teal-400"
      }`}>
      <span className="text-[13px] font-semibold leading-none">{label}</span>
      <span className={`text-[11px] leading-none ${on ? "text-white/80" : "text-slate-600"}`}>{sub}</span>
      {on && (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-500 text-white grid place-items-center ring-2 ring-navy-900">
          <Icon.check size={10} />
        </span>
      )}
    </button>
  );
}

function DateCalendarModal({ value, onChange, onClose, locale = "en-GB", t = (s) => s, multiple = true, maxDays }: { value: string[]; onChange: (v: string[]) => void; onClose: () => void; locale?: string; t?: (s: string) => string; multiple?: boolean; maxDays?: number }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const todayIso = todayISO();
  const today = fromISO(todayIso);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startWeekday = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const out: ({ iso: string; day: number; past: boolean } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let i = 1; i <= last.getDate(); i++) {
      const d = new Date(month.getFullYear(), month.getMonth(), i);
      out.push({ iso: toISO(d), day: i, past: d < today });
    }
    return out;
  }, [month, today]);
  const atCap = !!maxDays && value.length >= maxDays;
  const toggle = (iso: string) => {
    if (!multiple) { onChange([iso]); onClose(); return; } // single-day: pick & close
    const has = value.includes(iso);
    if (has && value.length === 1) return;
    if (!has && maxDays && value.length >= maxDays) return; // cap reached
    onChange(has ? value.filter((x) => x !== iso) : [...value, iso].sort());
  };
  // Localized weekday headers (2024-01-01 is a Monday).
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" })),
    [locale],
  );
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canPrev = monthStart > todayMonth;
  const title = monthStart.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return createPortal((
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center p-4 animate-fade-in">
      <button type="button" aria-label={t("Close")} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-navy-950/45 backdrop-blur-xl cursor-default" />
      <div className="glass-card-solid relative rounded-2xl w-full max-w-sm animate-pop">
        <div className="px-4 py-3 border-b border-white/40 flex items-center justify-between">
          <div className="font-display font-bold text-navy-900 inline-flex items-center gap-2"><Icon.calendar size={16} /> {multiple ? t("Pick dates") : t("Pick a date")}</div>
          <button aria-label={t("Close")} onClick={onClose} className="text-slate-500 hover:text-navy-900 hover:bg-white/40 p-1.5 rounded-lg"><Icon.x size={18} /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} disabled={!canPrev}
              className="w-9 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t("Previous month")}><Icon.arrowL size={15} /></button>
            <div className="font-semibold text-navy-900">{title}</div>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="w-9 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={t("Next month")}><Icon.arrowR size={15} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {weekdays.map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={`b-${i}`} />;
              const sel = value.includes(c.iso);
              const isToday = c.iso === todayIso;
              const capped = !sel && atCap;
              return (
                <button key={c.iso} type="button" disabled={c.past || capped} onClick={() => toggle(c.iso)}
                  className={`relative aspect-square rounded-lg text-sm font-medium transition ${
                    c.past || capped
                      ? "text-slate-300 cursor-not-allowed"
                      : sel
                        ? "bg-navy-900 text-white shadow-sm hover:bg-navy-800"
                        : isToday
                          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200 hover:bg-teal-100"
                          : "text-navy-900 hover:bg-slate-100"
                  }`}>
                  {c.day}
                  {sel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-300" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-slate-600">
            <span><b className="text-navy-900 tnum">{value.length}</b>{maxDays ? `/${maxDays}` : ""} {value.length !== 1 ? t("dates selected") : t("date selected")}</span>
            <button onClick={onClose} className="font-semibold text-teal-700 hover:text-teal-800">{t("Done")}</button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
