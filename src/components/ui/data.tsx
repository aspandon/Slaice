import { useEffect, useMemo, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { useCountUp } from "../../lib/motion";
import { Card } from "./primitives";
import { setPageHelp } from "../../lib/pageHelp";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/* ---------- StatCard ----------
   Tone drives a thin left accent stripe. `instant` skips the count-up. */
export function StatCard({ label, value, valueTitle, sub, tone = "navy", delta, trend, compare, sparkline, instant = false }: {
  label?: ReactNode;
  value: string | number;
  /** The full figure behind an abbreviated value (€733.4k → €733,422.00), on hover (AENR-582). */
  valueTitle?: string;
  sub?: ReactNode;
  tone?: string;
  delta?: ReactNode;
  trend?: string;
  /** What a `trend` compares to ("vs previous week") — every delta says so (AENR-555). */
  compare?: string;
  sparkline?: ReactNode;
  instant?: boolean;
  /** Accepted for call-site compatibility; the current design omits the icon. */
  icon?: IconRenderer;
}) {
  const stripeMap: Record<string, string> = {
    navy: "bg-navy-900/60",
    teal: "bg-teal-500",
    indigo: "bg-slaice-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  const stripe = stripeMap[tone] || "bg-slate-300";
  // Parse "€33.4k", "1,284", "71%" → animate the numeric part, keep affixes.
  const parsed = useMemo(() => parseMetric(value), [value]);
  const { ref, display } = useCountUp(parsed ? parsed.n : 0, {
    duration: 1000,
    instant,
    format: (n) => (parsed ? parsed.fmt(n) : ""),
  });
  const trendUp = trend && !String(trend).trim().startsWith("-") && !String(trend).trim().startsWith("−");
  return (
    <Card hover className="p-4 relative overflow-hidden">
      <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tnum rounded-full px-1.5 py-0.5 ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            <Icon.trend size={11} className={trendUp ? "" : "-scale-y-100"} />{trend}{compare && <span className="sr-only"> {compare}</span>}
          </span>
        )}
      </div>
      <div ref={ref as RefObject<HTMLDivElement>} title={valueTitle} className="mt-1.5 text-[26px] leading-none font-bold text-navy-900 tnum font-display tracking-tight">
        {parsed ? display : value}
      </div>
      {sparkline && <div className="mt-2 -mb-1">{sparkline}</div>}
      {sub && <div className="mt-1.5 text-[12px] text-slate-600 flex items-center gap-1">{delta}{sub}</div>}
      {trend && compare && compare !== sub && <div className="mt-0.5 text-[11.5px] text-slate-500">{compare}</div>}
    </Card>
  );
}

// Split a metric string into { numeric value, formatter that re-applies the
// affixes }. Returns null for non-numeric values so IDs/times/ranges/dates pass through.
function parseMetric(value: unknown): { n: number; fmt: (v: number) => string } | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value);
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
  const fmt = (v: number) => {
    const fixed = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${pre}${v < 0 ? "−" : ""}${fixed}${suf}`;
  };
  return { n, fmt };
}

/* ---------- Context panel (used on sparse forms) ---------- */
export function ContextPanel({ title, items = [], footer }: {
  title?: ReactNode;
  items?: { icon?: IconRenderer; title?: ReactNode; body?: ReactNode }[];
  footer?: ReactNode;
}) {
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
/* ---------- PageHead (AENR-550) ----------
   One header pattern on every page: the page title lives in the top bar; here
   the page says what it is (`sub`), with an optional back link, controls that
   shape the view (`actions` — period pickers, toggles), up to three secondary
   actions in a "More" menu and at most ONE primary action, always last. */
export interface PageAction {
  label: string;
  icon?: IconRenderer;
  onClick: () => void;
  disabled?: boolean;
}
export function PageHead({ sub, back, lead, actions, primary, secondary = [], daily = false }: {
  /** A screen used every day (AENR-661): the sentence moves behind "?" by the title. */
  daily?: boolean;
  /** Kept for call sites; the title shows in the top bar. */
  title?: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
  back?: { label: string; onClick: () => void };
  /** At the start of the row, e.g. the page's view tabs (AENR-701) — actions stay on the right. */
  lead?: ReactNode;
  /** Controls that shape the view (not actions). */
  actions?: ReactNode;
  /** The page's one primary action (a Btn). */
  primary?: ReactNode;
  /** Up to three secondary actions, in the overflow menu. */
  secondary?: PageAction[];
}) {
  const helpText = daily && typeof sub === "string" ? sub : null;
  useEffect(() => {
    if (!helpText) return;
    setPageHelp(helpText);
    return () => setPageHelp(null);
  }, [helpText]);
  if (daily) sub = undefined;
  if (!sub && !back && !lead && !actions && !primary && secondary.length === 0) return null;
  const more = secondary.slice(0, 3);
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1 basis-64">
        {back && (
          <button type="button" onClick={back.onClick} className="mb-0.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">
            <Icon.chevL size={14} /> {back.label}
          </button>
        )}
        {lead}
        {sub && <p className="text-[13px] text-slate-600 leading-snug max-w-3xl">{sub}</p>}
      </div>
      {(actions || primary || more.length > 0) && (
        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
          {actions}
          {more.length > 0 && (
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-[14px] px-3.5 min-h-[44px] text-sm font-semibold text-navy-900 ring-1 ring-slate-200 bg-white hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                  <Icon.more size={16} /> More
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-[60] w-60 rounded-xl bg-white p-1.5 shadow-overlay ring-1 ring-slate-200 text-ink">
                  {more.map((a) => {
                    const I = a.icon;
                    return (
                      <DropdownMenu.Item key={a.label} disabled={a.disabled} onSelect={a.onClick}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] outline-none cursor-pointer data-[highlighted]:bg-slate-100 data-[disabled]:opacity-40">
                        {I && <I size={15} className="text-slate-500" />} {a.label}
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          {primary}
        </div>
      )}
    </div>
  );
}

/* ---------- SaveBar (AENR-550) ----------
   Pages with edits that aren't live until saved show this sticky bar — only
   while there are unsaved changes. */
export function SaveBar({ dirty, errors = [], onSave, onDiscard, note = "Unsaved changes — nothing changes for guests or staff until you save." }: {
  dirty: boolean;
  errors?: string[];
  onSave: () => void;
  onDiscard: () => void;
  note?: string;
}) {
  if (!dirty) return null;
  return (
    <div role="status" className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-navy-900 text-white px-4 py-2.5 shadow-overlay">
      <Icon.edit size={15} />
      <span className="text-sm">{errors.length ? <><b>Can’t save yet</b> — {errors[0]}</> : note}</span>
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onDiscard} className="rounded-[14px] px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">Discard</button>
        <button type="button" onClick={onSave} disabled={errors.length > 0} className="inline-flex items-center gap-1.5 rounded-[14px] px-3.5 py-1.5 text-[13px] font-semibold bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"><Icon.check size={14} /> Save</button>
      </div>
    </div>
  );
}

/* ---------- Table ----------
   Airier rows, hairline dividers and a sticky frosted header on `sm`+; reflows
   into stacked label:value cards under `sm`. */
// `dense` tightens cell padding for wide tables (many columns).
/* `rowLink`: rows open something — a cell holds a button with the
   "row-link" class whose hit area stretches over the whole row (other
   controls in the row sit above it), so Enter on that button opens the row. */
/* Index-table standard (AENR-551): every table follows the shared density
   (compact by default on desktop, toggled with <DensityToggle/>), long lists
   scroll inside a bounded region so the header stays in view, and `rowLink`
   rows open their record (Enter on the row's button). */
export function Table({ cols, rows, right = [], dense = false, rowLink = false }: { cols: ReactNode[]; rows: ReactNode[][]; right?: number[]; dense?: boolean; rowLink?: boolean }) {
  const [density] = useDensity();
  const compact = dense || density === "compact";
  const pad = compact ? "px-2.5" : "px-3.5";
  const padY = compact ? "py-2.5" : "py-3.5";
  const long = rows.length > 12;
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-2.5">
        {rows.map((r, ri) => {
          const headIdx = cols.findIndex((c) => c);
          return (
            <div key={ri} className={`rounded-2xl ring-1 ring-slate-200 bg-white p-3.5 ${rowLink ? "relative hover:ring-teal-400 transition" : ""}`}>
              {headIdx > -1 && <div className="font-semibold text-navy-900 text-[15px] mb-2">{r[headIdx]}</div>}
              <div className="space-y-1.5">
                {r.map((cell, ci) =>
                  ci === headIdx ? null : (
                    <div key={ci} className="flex items-center justify-between gap-3 text-[13px]">
                      {cols[ci] ? <span className="text-slate-500 shrink-0">{cols[ci]}</span> : <span />}
                      <span className={`min-w-0 text-right ${right.includes(ci) ? "tnum" : ""}`}>{cell}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* sm+ : real table with a sticky frosted header */}
      <div className={`hidden sm:block overflow-auto ${long ? "max-h-[72vh] overscroll-contain" : ""}`} tabIndex={long ? 0 : undefined} role={long ? "region" : undefined} aria-label={long ? "Scrollable table" : undefined}>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              {cols.map((c, i) => (
                <th key={i} className={`sticky top-0 z-[2] bg-white py-3 ${pad} font-semibold border-b border-slate-200/80 ${right.includes(i) ? "text-right" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className={`transition-colors hover:bg-slate-50/80 ${rowLink ? "relative cursor-pointer" : ""}`}>
                {r.map((cell, ci) => (
                  <td key={ci} className={`${padY} ${pad} border-b border-slate-100/80 ${right.includes(ci) ? "text-right tnum" : ""}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Density (AENR-551) ----------
   One preference for every index table, remembered on this device. */
type Density = "compact" | "comfortable";
const DENSITY_KEY = "slaice.density";
const densityListeners = new Set<(d: Density) => void>();
function readDensity(): Density {
  try {
    return localStorage.getItem(DENSITY_KEY) === "comfortable" ? "comfortable" : "compact";
  } catch {
    return "compact";
  }
}
export function useDensity(): [Density, (d: Density) => void] {
  const [d, setD] = useState<Density>(readDensity);
  useEffect(() => {
    densityListeners.add(setD);
    return () => { densityListeners.delete(setD); };
  }, []);
  const set = (v: Density) => {
    try { localStorage.setItem(DENSITY_KEY, v); } catch { /* per-session only */ }
    densityListeners.forEach((f) => f(v));
  };
  return [d, set];
}
export function DensityToggle() {
  const [d, set] = useDensity();
  return (
    <div role="radiogroup" aria-label="Row density" className="hidden sm:inline-flex rounded-xl ring-1 ring-slate-200 overflow-hidden">
      {(["compact", "comfortable"] as const).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={d === v} onClick={() => set(v)} title={v === "compact" ? "Compact rows" : "Comfortable rows"}
          className={`px-2.5 min-h-[36px] text-[12px] font-semibold ${d === v ? "bg-navy-900 text-white" : "bg-white text-slate-600 hover:text-navy-900"}`}>
          {v === "compact" ? "Compact" : "Comfortable"}
        </button>
      ))}
    </div>
  );
}
