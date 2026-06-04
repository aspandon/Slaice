import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons";
import { useCountUp, prefersReducedMotion } from "../lib/motion";
import { chipLabel, dateStrip, fromISO, todayISO, toISO } from "../data/beach";

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
export function Card({ className = "", children, onClick, hover, press }) {
  return (
    <div onClick={onClick}
      className={`glass-card rounded-3xl ${hover ? "transition duration-300 ease-spring hover:-translate-y-1 hover:shadow-lift" : ""} ${press ? "pressable cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Button ----------
   Apple-style hierarchy: filled (primary/teal/dark/indigo/danger), tinted
   (tint — light-accent fill), and quiet (ghost/outline). Springy press. */
export function Btn({ children, variant = "primary", size = "md", onClick, icon: IconC, full, disabled, loading, className = "", type = "button" }) {
  const base = "relative inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-all duration-150 ease-spring active:scale-[.96] disabled:pointer-events-none select-none";
  // min-heights enforce a comfortable touch target (≈ Apple HIG 44pt for md/lg)
  // without shrinking any existing layout.
  const sizes = { sm: "px-3 py-1.5 text-[13px] min-h-[36px]", md: "px-4 py-2.5 text-sm min-h-[44px]", lg: "px-5 py-3 text-[15px] min-h-[48px]" };
  // When disabled, every variant collapses to the same quiet slate ghost so a
  // disabled CTA never looks like a heavy navy slab. Loading keeps the active
  // variant so the spinner appears on the live colour.
  const off = "!bg-slate-100 !text-slate-400 !ring-0 !shadow-none";
  const variants = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-btn-primary hover:shadow-lift",
    teal: "bg-teal-600 text-white hover:bg-teal-500 shadow-btn-teal hover:shadow-lift",
    coral: "bg-coral-600 text-white hover:bg-coral-500 shadow-lift",
    dark: "bg-navy-950 text-white hover:bg-navy-900 shadow-btn-primary hover:shadow-lift",
    indigo: "bg-slaice-600 text-white hover:bg-slaice-500 shadow-lift",
    // Tinted secondary — Apple's light-accent button.
    tint: "bg-teal-50 text-teal-700 hover:bg-teal-100 ring-1 ring-teal-600/15",
    ghost: "bg-slate-100/80 text-navy-900 hover:bg-slate-200/90",
    outline: "ring-1 ring-slate-200 text-navy-900 hover:bg-slate-50 hover:ring-slate-300 bg-white/80",
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

/* ---------- StickyActionBar ----------
   Mobile-only bar pinned above the bottom tab bar (and the iOS home indicator).
   Used by the Locker / Parking / Ticket flows so the primary CTA isn't stranded
   below a tall selection grid on phones. Pair with bottom padding on the page so
   the last row of content clears it. */
export function StickyActionBar({ children, show = "lg:hidden" }) {
  return (
    <div className={`${show} fixed left-3 right-3 z-30 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]`}>
      <div className="glass-card-solid rounded-2xl shadow-float px-3 py-2.5">{children}</div>
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

/* ---------- StatCard ----------
   Tone drives a thin left accent stripe. When `value` is a plain number (or a
   number with a leading €/% wrapper via numPrefix/numSuffix) the figure counts
   up on first view for a lively, Apple-like dashboard. `trend` shows a small
   up/down delta chip. */
export function StatCard({ label, value, sub, tone = "navy", delta, trend, sparkline, instant = false }) {
  const stripe = {
    navy: "bg-navy-900/60",
    teal: "bg-teal-500",
    indigo: "bg-slaice-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }[tone] || "bg-slate-300";
  // Parse "€33.4k", "1,284", "71%" → animate the numeric part, keep affixes.
  // `instant` skips the count-up (operational dashboards show the real figure
  // immediately rather than ticking up from zero).
  const parsed = useMemo(() => parseMetric(value), [value]);
  const { ref, display } = useCountUp(parsed ? parsed.n : 0, {
    duration: 1000,
    instant,
    format: (n) => parsed ? parsed.fmt(n) : "",
  });
  const trendUp = trend && !String(trend).trim().startsWith("-") && !String(trend).trim().startsWith("−");
  return (
    <Card hover className="p-4 relative overflow-hidden">
      <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tnum rounded-full px-1.5 py-0.5 ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            <Icon.trend size={11} className={trendUp ? "" : "-scale-y-100"} />{trend}
          </span>
        )}
      </div>
      <div ref={ref} className="mt-1.5 text-[26px] leading-none font-bold text-navy-900 tnum font-display tracking-tight">
        {parsed ? display : value}
      </div>
      {sparkline && <div className="mt-2 -mb-1">{sparkline}</div>}
      {sub && <div className="mt-1.5 text-[12px] text-slate-600 flex items-center gap-1">{delta}{sub}</div>}
    </Card>
  );
}

// Split a metric string into { numeric value, formatter that re-applies the
// affixes }. Returns null for non-numeric values so IDs ("#CS-204"), times
// ("09:14"), ranges ("40 / 60") and dates ("Sun, 19 Jul") are shown as-is.
function parseMetric(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value);
  // Skip anything that isn't a clean metric: IDs/codes (# /), times (:),
  // or a prefix that contains letters (e.g. "CS-204").
  if (/[#/:]/.test(s)) return null;
  const m = s.match(/^([^\d-−]*)(-?−?[\d,]*\.?\d+)([a-zA-Z%€£$]*)$/);
  if (!m) return null;
  const [, pre, numRaw, suf] = m;
  if (/[a-zA-Z]/.test(pre)) return null;
  const neg = /^[-−]/.test(numRaw);
  const clean = numRaw.replace(/[,−-]/g, "");
  const decimals = (clean.split(".")[1] || "").length;
  const n = parseFloat(clean) * (neg ? -1 : 1);
  if (!isFinite(n)) return null;
  const fmt = (v) => {
    const fixed = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${pre}${v < 0 ? "−" : ""}${fixed}${suf}`;
  };
  return { n, fmt };
}

/* ---------- Future banner (Roadmap preview heads-up) ----------
   Indigo "info" styling (not amber) so it reads as a roadmap note rather than
   a warning/error — it ties to the Slaice platform brand colour. */
export function FutureBanner({ children = "Preview · Roadmap 2027–2029 — fully clickable mockup, not part of the MVP." }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
      <Icon.info size={14} className="shrink-0 text-slaice-600" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* ---------- Back to top ----------
   Floating affordance for long scrollable pages (e.g. the Feature Inventory /
   User Journeys lists). Appears once the user has scrolled past `threshold`. */
export function BackToTop({ threshold = 600 }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  if (!show) return null;
  return createPortal(
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"
      className="fixed z-40 right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-5 w-11 h-11 rounded-full glass-card-solid shadow-float ring-1 ring-slate-200 grid place-items-center text-navy-900 hover:-translate-y-0.5 transition animate-fade-in">
      <Icon.chevD size={20} className="rotate-180" />
    </button>,
    document.body
  );
}

/* ---------- Context panel (used on sparse forms) ----------
   Title renders INSIDE the card as a header strip rather than as a label
   above it, so the panel reads as a single self-contained surface. */
export function ContextPanel({ title, items = [], footer }) {
  return (
    <aside className="lg:sticky lg:top-24 h-max">
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 backdrop-blur p-4 space-y-3">
        {title && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">{title}</div>
        )}
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

/* ---------- Table ----------
   Airier rows, hairline dividers and a sticky frosted header on `sm`+.
   Under `sm` the same data reflows into stacked "label: value" cards so wide
   tables never force a sideways scroll on a phone. Column headers double as
   the field labels in the card view. */
export function Table({ cols, rows, right = [] }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-2.5">
        {rows.map((r, ri) => {
          // First non-empty cell is the card's heading; the rest become rows.
          const headIdx = cols.findIndex((c) => c);
          return (
            <div key={ri} className="rounded-2xl ring-1 ring-slate-200 bg-white/80 p-3.5">
              {headIdx > -1 && <div className="font-semibold text-navy-900 text-[15px] mb-2">{r[headIdx]}</div>}
              <div className="space-y-1.5">
                {r.map((cell, ci) =>
                  ci === headIdx ? null : (
                    <div key={ci} className="flex items-center justify-between gap-3 text-[13px]">
                      {cols[ci] ? <span className="text-slate-500 shrink-0">{cols[ci]}</span> : <span />}
                      <span className={`min-w-0 text-right ${right.includes(ci) ? "tnum" : ""}`}>{cell}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* sm+ : real table with a sticky frosted header */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              {cols.map((c, i) => (
                <th key={i} className={`sticky top-0 z-10 bg-white/85 backdrop-blur-sm py-3 px-3.5 font-semibold border-b border-slate-200/80 ${right.includes(i) ? "text-right" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="transition-colors hover:bg-slate-50/80">
                {r.map((cell, ci) => (
                  <td key={ci} className={`py-3.5 px-3.5 border-b border-slate-100/80 ${right.includes(ci) ? "text-right tnum" : ""}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
// text-base on mobile (16px) prevents iOS Safari's focus-zoom; tightens to
// text-sm from the `sm` breakpoint up.
export function Input(props) {
  return <input {...props} className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow outline-none placeholder:text-slate-400 ${props.className || ""}`} />;
}
export function Select({ options = [], ...props }) {
  return (
    <select {...props} className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm transition focus:ring-2 focus:ring-teal-500/70 focus:shadow-glow outline-none cursor-pointer ${props.className || ""}`}>
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

/* ---------- Stepper (quantity) ----------
   `label` names what's being counted so screen readers announce e.g. "Decrease
   Adult tickets" rather than four identical "Decrease" buttons on one page. */
export function Stepper({ value, onChange, min = 0, label }) {
  const what = label ? ` ${label}` : "";
  return (
    <div className="flex items-center gap-3">
      <button aria-label={`Decrease${what}`} onClick={() => onChange(Math.max(min, value - 1))} className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg ring-1 ring-slate-300 grid place-items-center text-slate-600 transition hover:bg-slate-50 hover:ring-slate-400 active:scale-90 disabled:opacity-40" disabled={value <= min}><Icon.minus size={16} /></button>
      <span className="w-6 text-center font-semibold tnum tabular-nums" aria-live="polite" aria-label={label ? `${value} ${label}` : undefined}>{value}</span>
      <button aria-label={`Increase${what}`} onClick={() => onChange(value + 1)} className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg ring-1 ring-slate-300 grid place-items-center text-slate-600 transition hover:bg-slate-50 hover:ring-slate-400 active:scale-90"><Icon.plus size={16} /></button>
    </div>
  );
}

/* Dialog focus management (WCAG 2.4.3 + ARIA dialog pattern): when a dialog
   opens, move focus into it and trap Tab inside; on close, restore focus to
   whatever was focused before (usually the trigger). */
function useDialogFocus(open, panelRef) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const prev = document.activeElement;
    const focusables = () =>
      Array.from(panel.querySelectorAll(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter((el) => el.offsetParent !== null || el === document.activeElement);
    // Initial focus: first interactive element, else the panel itself.
    const first = focusables()[0];
    (first || panel).focus?.();
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) { e.preventDefault(); return; }
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    panel.addEventListener("keydown", onKey);
    return () => {
      panel.removeEventListener("keydown", onKey);
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open]);
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  useDialogFocus(open, panelRef);
  if (!open) return null;
  // Bottom-sheet on phones (items-end + slide-up + rounded top), centered
  // dialog from `sm` up. dvh keeps it within the *visible* viewport on iOS
  // Safari where the toolbar makes 100vh too tall.
  // Portaled to <body> so `position: fixed` is relative to the viewport — many
  // screens wrap content in `animate-fade-up`, whose lingering `transform`
  // would otherwise become the containing block and push the panel off-screen.
  return createPortal((
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-xl" />
      <div ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} className={`glass-card-solid relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-pop max-h-[92dvh] sm:max-h-[90dvh] flex flex-col pb-safe sm:pb-0 outline-none`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70">
          <div id={titleId} className="font-display font-bold text-navy-900 text-lg">{title}</div>
          <button aria-label="Close" onClick={onClose} className="w-10 h-10 grid place-items-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"><Icon.x size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-200/70 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  ), document.body);
}

/* ---------- Sheet (bottom sheet with drag-to-dismiss) ----------
   Slides up from the bottom; a grabber lets the user drag it down to close.
   Centred + width-capped on desktop so it works on every viewport. */
export function Sheet({ open, onClose, title, children, footer }) {
  const panelRef = useRef(null);
  const drag = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  useDialogFocus(open, panelRef);
  if (!open) return null;
  const onDown = (e) => {
    const panel = panelRef.current;
    drag.current = { startY: e.clientY, dy: 0 };
    panel.classList.add("sheet-dragging");
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    panelRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    const panel = panelRef.current;
    if (!panel || !drag.current) return;
    panel.classList.remove("sheet-dragging");
    if (drag.current.dy > 120) { onClose(); }
    else { panel.style.transform = ""; }
    drag.current = null;
  };
  return createPortal((
    <div role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-xl" />
      <div ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        className="glass-card-solid relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-pop max-h-[92dvh] flex flex-col transition-transform duration-300 ease-spring pb-safe sm:pb-0 outline-none">
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          className="pt-2.5 pb-1 grid place-items-center cursor-grab active:cursor-grabbing touch-none">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200/70">
            <div id={titleId} className="font-display font-bold text-navy-900 text-lg">{title}</div>
            <button aria-label="Close" onClick={onClose} className="w-10 h-10 grid place-items-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"><Icon.x size={20} /></button>
          </div>
        )}
        <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-200/70 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  ), document.body);
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

/* ---------- Tabs (iOS segmented control) ----------
   Tab entries: [key, label] or [key, label, IconComponent]. A white pill
   slides under the active tab with a spring; the track is a soft inset. */
export function Tabs({ tabs, value, onChange, className = "", scroll = false }) {
  const trackRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState(null);
  const [mask, setMask] = useState("none");
  useEffect(() => {
    const btn = btnRefs.current[value];
    const track = trackRef.current;
    if (!btn || !track) return;
    const measure = () => {
      const b = btn.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      setPill({ left: b.left - t.left + track.scrollLeft, width: b.width, top: b.top - t.top, height: b.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track); ro.observe(btn);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [value, tabs]);
  // Scrollable tab rows: fade the overflowing edge(s) so it's clear there are
  // more tabs than fit, and keep the active tab scrolled into view.
  useEffect(() => {
    if (!scroll) return;
    const el = trackRef.current;
    if (!el) return;
    const F = 22;
    const update = () => {
      const l = el.scrollLeft > 2;
      const r = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2;
      const left = l ? `transparent, black ${F}px` : "black, black";
      const right = r ? `black calc(100% - ${F}px), transparent` : "black, black";
      setMask(l || r ? `linear-gradient(to right, ${left}, ${right})` : "none");
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); window.removeEventListener("resize", update); };
  }, [scroll, tabs]);
  useEffect(() => {
    if (scroll) btnRefs.current[value]?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [value, scroll]);
  return (
    <div ref={trackRef}
      style={scroll ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
      className={`relative inline-flex gap-1 p-1 rounded-2xl bg-slate-100/80 ring-1 ring-slate-200/60 ${scroll ? "overflow-x-auto no-scrollbar max-w-full" : "flex-wrap"} ${className}`}>
      {pill && (
        <span aria-hidden className="absolute rounded-xl bg-white shadow-soft transition-all duration-300 ease-spring"
          style={{ left: pill.left, width: pill.width, top: pill.top, height: pill.height }} />
      )}
      {tabs.map(([k, t, IconC]) => {
        const active = value === k;
        return (
          <button key={k} ref={(el) => (btnRefs.current[k] = el)} onClick={() => onChange(k)}
            className={`relative z-10 px-3.5 h-9 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 inline-flex items-center gap-1.5 ${active ? "text-navy-900" : "text-slate-500 hover:text-navy-900"}`}>
            {IconC && <IconC size={14} className={active ? "text-teal-600" : "text-slate-400"} />}
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
  const scrollRef = useRef(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const strip = useMemo(() => dateStrip(quickDays), [quickDays]);
  const stripSet = useMemo(() => new Set(strip.map((d) => d.iso)), [strip]);
  const extras = useMemo(() => value.filter((iso) => !stripSet.has(iso)).sort(), [value, stripSet]);
  const toggle = (iso) => {
    const has = value.includes(iso);
    if (has && value.length === 1) return; // keep at least one
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
  const nudge = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(140, el.clientWidth * 0.7), behavior: "smooth" });
  };
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Scroll dates left"
          onClick={() => nudge(-1)}
          disabled={!canL}
          className="shrink-0 w-7 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:text-navy-900 hover:ring-teal-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon.arrowL size={14} />
        </button>
        <div ref={scrollRef} className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
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
            className="px-3 py-2.5 min-h-[64px] rounded-xl min-w-[78px] ring-1 ring-dashed ring-slate-300 text-slate-600 hover:ring-teal-400 hover:text-teal-700 transition shrink-0 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold"
            aria-label="Pick dates from calendar"
          >
            <Icon.calendar size={14} /> Pick dates
          </button>
        </div>
        <button
          type="button"
          aria-label="Scroll dates right"
          onClick={() => nudge(1)}
          disabled={!canR}
          className="shrink-0 w-7 h-9 grid place-items-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:text-navy-900 hover:ring-teal-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon.arrowR size={14} />
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
      className={`relative px-3.5 py-2.5 min-h-[64px] rounded-xl min-w-[78px] ring-1 transition shrink-0 inline-flex flex-col items-center justify-center gap-1 ${
        on ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 hover:ring-teal-400"
      }`}
    >
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
