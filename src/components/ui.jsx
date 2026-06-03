import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons.jsx";
import { chipLabel, dateStrip, fromISO, todayISO, toISO } from "../data/beach.js";

/* ---------- Badge ---------- */
export function Badge({ tone = "slate", children, className = "" }) {
  const tones = {
    mvp: "bg-teal-100 text-teal-600 ring-teal-600/20",
    future: "bg-orange-50 text-orange-600 ring-orange-500/20",
    slate: "bg-slate-100 text-slate-600 ring-slate-400/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    coral: "bg-orange-100 text-coral-600 ring-coral-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tones[tone] || tones.slate} ${className}`}>
      {children}
    </span>
  );
}

/* ---------- StatusBadge ----------
   Status conveyed by colour AND an icon + text, so meaning never relies on
   colour alone (WCAG 1.4.1 Use of Color). Pass a known status or any label. */
const STATUS_MAP = {
  confirmed: { tone: "green", icon: Icon.checkCircle },
  paid: { tone: "green", icon: Icon.checkCircle },
  active: { tone: "green", icon: Icon.checkCircle },
  live: { tone: "green", icon: Icon.checkCircle },
  ok: { tone: "green", icon: Icon.checkCircle },
  used: { tone: "slate", icon: Icon.check },
  unpaid: { tone: "amber", icon: Icon.clock },
  pending: { tone: "amber", icon: Icon.clock },
  awaiting: { tone: "amber", icon: Icon.clock },
  issued: { tone: "blue", icon: Icon.doc },
  refunded: { tone: "red", icon: Icon.refund },
  cancelled: { tone: "red", icon: Icon.x },
  canceled: { tone: "red", icon: Icon.x },
  failed: { tone: "red", icon: Icon.alert },
};
export function StatusBadge({ status, label, className = "" }) {
  const text = label ?? status;
  const norm = String(status || "").toLowerCase();
  const key = Object.keys(STATUS_MAP).find((k) => norm.includes(k));
  const meta = (key && STATUS_MAP[key]) || (norm.includes("✓") ? STATUS_MAP.ok : { tone: "slate", icon: Icon.info });
  const IconC = meta.icon;
  return <Badge tone={meta.tone} className={className}><IconC size={11} /> {text}</Badge>;
}

/* ---------- Card ---------- */
export function Card({ className = "", children, onClick, hover }) {
  return (
    <div onClick={onClick}
      className={`glass-card rounded-2xl ${hover ? "transition duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-lift" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Button ---------- */
export function Btn({ children, variant = "primary", size = "md", onClick, icon: IconC, full, disabled, loading, className = "", type = "button" }) {
  const base = "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 ease-smooth active:scale-[.97] disabled:pointer-events-none select-none";
  const sizes = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-[15px]" };
  // When disabled, every variant collapses to the same quiet slate ghost so a
  // disabled CTA never looks like a heavy navy slab. Loading keeps the active
  // variant so the spinner appears on the live colour.
  const off = "!bg-slate-100 !text-slate-400 !ring-1 !ring-slate-200 !shadow-none";
  const variants = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-btn-primary hover:shadow-lift",
    teal: "bg-teal-600 text-white hover:bg-teal-500 shadow-btn-teal hover:shadow-lift",
    coral: "bg-coral-600 text-white hover:bg-coral-500 shadow-lift",
    dark: "bg-navy-950 text-white hover:bg-navy-900 shadow-btn-primary hover:shadow-lift",
    indigo: "bg-slaice-600 text-white hover:bg-slaice-500 shadow-lift",
    ghost: "bg-slate-100 text-navy-900 hover:bg-slate-200",
    outline: "ring-1 ring-slate-300 text-navy-900 hover:bg-slate-50 hover:ring-slate-400 bg-white",
    light: "bg-white/15 text-white hover:bg-white/25 ring-1 ring-white/20 backdrop-blur-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-lift",
  };
  const isDisabled = disabled && !loading;
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${isDisabled ? off : ""} ${className}`}>
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : IconC && <IconC size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ size = 18, className = "" }) {
  return (
    <span aria-hidden className={`inline-block rounded-full border-2 border-current/25 border-t-current animate-spin ${className}`}
      style={{ width: size, height: size, borderTopColor: "currentColor" }} />
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/* Simulate a short data fetch so screens can show loading state (Nielsen:
   visibility of system status). Returns true while "loading". */
export function useMockLoad(ms = 650) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

/* Table-shaped skeleton matching the Table component's padding. */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div aria-busy="true" aria-live="polite" className="px-1">
      <span className="sr-only">Loading…</span>
      <div className="flex gap-3 px-3 py-2.5 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 px-3 py-3.5 border-b border-slate-100 last:border-0 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? "flex-[1.4]" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* Grid-of-cards skeleton (e.g. stat cards, tiles). */
export function CardGridSkeleton({ count = 4, className = "" }) {
  return (
    <div aria-busy="true" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon: IconC = Icon.inbox, title, body, action, compact = false, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-7 px-4" : "py-12 px-6"} ${className}`}>
      <span className={`${compact ? "w-11 h-11" : "w-14 h-14"} rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-3`}>
        <IconC size={compact ? 20 : 26} />
      </span>
      {title && <div className="font-semibold text-navy-900">{title}</div>}
      {body && <div className="text-[13px] text-slate-500 mt-1 max-w-xs leading-relaxed">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- StatCard ---------- */
// Tone now drives a thin left accent stripe instead of a decorative icon box —
// keeps the visual rhythm without adding generic glyphs to every metric.
export function StatCard({ label, value, sub, tone = "navy", delta }) {
  const stripe = {
    navy: "bg-navy-900/60",
    teal: "bg-teal-500",
    indigo: "bg-slaice-500",
  }[tone] || "bg-slate-300";
  return (
    <Card hover className="p-4 relative overflow-hidden">
      <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${stripe}`} />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-navy-900 tnum font-display tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-slate-600 flex items-center gap-1">{delta}{sub}</div>}
    </Card>
  );
}

/* ---------- Future banner (Roadmap preview heads-up) ---------- */
export function FutureBanner({ children = "Preview · Roadmap 2027–2029 — fully clickable mockup, not part of the MVP." }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-orange-50 ring-1 ring-orange-500/20 px-3 py-2 text-[12px] text-orange-700">
      <Icon.bolt size={14} className="shrink-0 text-orange-500" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* ---------- Context panel (used on sparse forms) ---------- */
export function ContextPanel({ title, items = [], footer }) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-24 h-max">
      {title && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 px-1">{title}</div>
      )}
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 backdrop-blur p-4 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2.5">
            {it.icon && <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">{<it.icon size={14} />}</span>}
            <div className="min-w-0 flex-1">
              {it.title && <div className="text-[13px] font-semibold text-navy-900 leading-tight">{it.title}</div>}
              {it.body && <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{it.body}</div>}
            </div>
          </div>
        ))}
        {footer && <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">{footer}</div>}
      </div>
    </aside>
  );
}

/* ---------- PageHead ---------- */
// Title/sub/badge intentionally suppressed app-wide — only actions remain.
export function PageHead({ actions }) {
  if (!actions) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mb-5">
      {actions}
    </div>
  );
}

/* ---------- Table ---------- */
export function Table({ cols, rows, right = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
            {cols.map((c, i) => (
              <th key={i} className={`py-2.5 px-3 font-semibold ${right.includes(i) ? "text-right" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, ri) => (
            <tr key={ri} className="hover:bg-slate-50/70">
              {r.map((cell, ci) => (
                <td key={ci} className={`py-2.5 px-3 ${right.includes(ci) ? "text-right tnum" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Field / inputs ---------- */
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      {label && <div className="text-[12px] font-semibold text-slate-700 mb-1">{label}</div>}
      {children}
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}
export function Input(props) {
  return <input {...props} className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow outline-none placeholder:text-slate-400 ${props.className || ""}`} />;
}
export function Select({ options = [], ...props }) {
  return (
    <select {...props} className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow outline-none cursor-pointer ${props.className || ""}`}>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>))}
    </select>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({ on, onChange, label }) {
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
export function Stepper({ value, onChange, min = 0 }) {
  return (
    <div className="flex items-center gap-3">
      <button aria-label="Decrease" onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-lg ring-1 ring-slate-300 grid place-items-center text-slate-600 transition hover:bg-slate-50 hover:ring-slate-400 active:scale-90 disabled:opacity-40" disabled={value <= min}><Icon.minus size={15} /></button>
      <span className="w-6 text-center font-semibold tnum tabular-nums">{value}</span>
      <button aria-label="Increase" onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-lg ring-1 ring-slate-300 grid place-items-center text-slate-600 transition hover:bg-slate-50 hover:ring-slate-400 active:scale-90"><Icon.plus size={15} /></button>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] grid place-items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-xl" />
      <div onClick={(e) => e.stopPropagation()} className={`glass-card relative rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} animate-pop max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/40">
          <div className="font-display font-bold text-navy-900 text-lg">{title}</div>
          <button aria-label="Close" onClick={onClose} className="text-slate-500 hover:text-slate-800 hover:bg-white/40 p-1.5 rounded-lg transition"><Icon.x size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-white/40 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Confirm dialog ----------
   Error-prevention pattern for destructive/irreversible actions. */
export function ConfirmModal({ open, onClose, onConfirm, title = "Are you sure?", body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = true, icon: IconC }) {
  const Glyph = IconC || (danger ? Icon.alert : Icon.info);
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>{cancelLabel}</Btn>
        <Btn variant={danger ? "danger" : "primary"} icon={IconC} onClick={() => { onConfirm?.(); onClose(); }}>{confirmLabel}</Btn>
      </>}>
      <div className="flex gap-3">
        <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${danger ? "bg-rose-100 text-rose-600" : "bg-teal-100 text-teal-700"}`}><Glyph size={20} /></span>
        <div className="text-sm text-slate-600 leading-relaxed pt-1.5">{body}</div>
      </div>
    </Modal>
  );
}

/* ---------- Tabs ----------
   Tab entries: [key, label] or [key, label, IconComponent] */
export function Tabs({ tabs, value, onChange, className = "", scroll = false }) {
  return (
    <div className={`flex gap-1.5 ${scroll ? "overflow-x-auto no-scrollbar" : "flex-wrap"} ${className}`}>
      {tabs.map(([k, t, IconC]) => {
        const active = value === k;
        return (
          <button key={k} onClick={() => onChange(k)}
            className={`px-3.5 h-9 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all duration-150 inline-flex items-center gap-1.5 ${active ? "bg-navy-900 text-white shadow-sm" : "glass text-slate-700 hover:text-navy-900"}`}>
            {IconC && <IconC size={14} className={active ? "" : "text-slate-500"} />}
            {t}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Empty / placeholder ---------- */
export function FeatureChip({ status }) {
  return status === "MVP" ? <Badge tone="mvp">MVP</Badge> : <Badge tone="future">Future</Badge>;
}

/* ---------- DatePickerRow ----------
   Multi-select date picker used across Sunbed, Ticket, Locker, Parking flows.
   `value` is an array of ISO YYYY-MM-DD strings. Shows the next 7 days as quick
   pills + any extra picks as chips + a "Pick dates" tile that opens a calendar
   modal for any future date. Always keeps at least one date selected. */
export function DatePickerRow({ value = [], onChange, quickDays = 7, className = "" }) {
  const [picker, setPicker] = useState(false);
  const strip = useMemo(() => dateStrip(quickDays), [quickDays]);
  const stripSet = useMemo(() => new Set(strip.map((d) => d.iso)), [strip]);
  const extras = useMemo(() => value.filter((iso) => !stripSet.has(iso)).sort(), [value, stripSet]);
  const toggle = (iso) => {
    const has = value.includes(iso);
    if (has && value.length === 1) return; // keep at least one
    onChange(has ? value.filter((x) => x !== iso) : [...value, iso].sort());
  };
  return (
    <div className={className}>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {strip.map((d) => {
          const on = value.includes(d.iso);
          return (
            <DatePill key={d.iso} on={on} label={d.label} sub={d.sub} onClick={() => toggle(d.iso)} />
          );
        })}
        {extras.map((iso) => {
          const lbl = chipLabel(iso);
          return <DatePill key={iso} on label={lbl.label} sub={lbl.sub} onClick={() => toggle(iso)} />;
        })}
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="px-3 py-2 min-h-[44px] rounded-xl min-w-[78px] ring-1 ring-dashed ring-slate-300 text-slate-600 hover:ring-teal-400 hover:text-teal-700 transition shrink-0 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold"
          aria-label="Pick dates from calendar"
        >
          <Icon.calendar size={14} /> Pick dates
        </button>
      </div>
      {picker && (
        <DateCalendarModal value={value} onChange={onChange} onClose={() => setPicker(false)} />
      )}
    </div>
  );
}

function DatePill({ on, label, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative px-3.5 py-2 min-h-[44px] rounded-xl text-center min-w-[78px] ring-1 transition shrink-0 ${
        on ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 hover:ring-teal-400"
      }`}
    >
      <div className="text-[13px] font-semibold leading-tight">{label}</div>
      <div className={`text-[11px] ${on ? "text-white/80" : "text-slate-600"}`}>{sub}</div>
      {on && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-teal-500 text-white grid place-items-center ring-2 ring-white">
          <Icon.check size={10} />
        </span>
      )}
    </button>
  );
}

function DateCalendarModal({ value, onChange, onClose }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const todayIso = todayISO();
  const today = fromISO(todayIso);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startWeekday = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const out = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let i = 1; i <= last.getDate(); i++) {
      const d = new Date(month.getFullYear(), month.getMonth(), i);
      out.push({ iso: toISO(d), day: i, past: d < today });
    }
    return out;
  }, [month, today]);
  const toggle = (iso) => {
    const has = value.includes(iso);
    if (has && value.length === 1) return;
    onChange(has ? value.filter((x) => x !== iso) : [...value, iso].sort());
  };
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canPrev = monthStart > todayMonth;
  const title = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return createPortal((
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-xl" />
      <div onClick={(e) => e.stopPropagation()} className="glass-card-solid relative rounded-2xl w-full max-w-sm animate-pop">
        <div className="px-4 py-3 border-b border-white/40 flex items-center justify-between">
          <div className="font-display font-bold text-navy-900 inline-flex items-center gap-2"><Icon.calendar size={16} /> Pick dates</div>
          <button aria-label="Close" onClick={onClose} className="text-slate-500 hover:text-navy-900 hover:bg-white/40 p-1.5 rounded-lg"><Icon.x size={18} /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} disabled={!canPrev}
              className="w-9 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous month"><Icon.arrowL size={15} /></button>
            <div className="font-semibold text-navy-900">{title}</div>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="w-9 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Next month"><Icon.arrowR size={15} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={`b-${i}`} />;
              const sel = value.includes(c.iso);
              const isToday = c.iso === todayIso;
              return (
                <button key={c.iso} type="button" disabled={c.past} onClick={() => toggle(c.iso)}
                  className={`relative aspect-square rounded-lg text-sm font-medium transition ${
                    c.past
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
            <span><b className="text-navy-900 tnum">{value.length}</b> date{value.length !== 1 ? "s" : ""} selected</span>
            <button onClick={onClose} className="font-semibold text-teal-700 hover:text-teal-800">Done</button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
