import { useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { useCountUp } from "../../lib/motion";
import { Card } from "./primitives";

/* ---------- StatCard ----------
   Tone drives a thin left accent stripe. `instant` skips the count-up. */
export function StatCard({ label, value, sub, tone = "navy", delta, trend, sparkline, instant = false }: {
  label?: ReactNode;
  value: string | number;
  sub?: ReactNode;
  tone?: string;
  delta?: ReactNode;
  trend?: string;
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
            <Icon.trend size={11} className={trendUp ? "" : "-scale-y-100"} />{trend}
          </span>
        )}
      </div>
      <div ref={ref as RefObject<HTMLDivElement>} className="mt-1.5 text-[26px] leading-none font-bold text-navy-900 tnum font-display tracking-tight">
        {parsed ? display : value}
      </div>
      {sparkline && <div className="mt-2 -mb-1">{sparkline}</div>}
      {sub && <div className="mt-1.5 text-[12px] text-slate-600 flex items-center gap-1">{delta}{sub}</div>}
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
export function PageHead({ actions }: { actions?: ReactNode; title?: ReactNode; sub?: ReactNode; badge?: ReactNode }) {
  if (!actions) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mb-5">
      {actions}
    </div>
  );
}

/* ---------- Table ----------
   Airier rows, hairline dividers and a sticky frosted header on `sm`+; reflows
   into stacked label:value cards under `sm`. */
export function Table({ cols, rows, right = [] }: { cols: ReactNode[]; rows: ReactNode[][]; right?: number[] }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-2.5">
        {rows.map((r, ri) => {
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
                  ),
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
