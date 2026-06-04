import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Btn } from "./primitives";

/* ---------- Skeleton ---------- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/* Simulate a short data fetch so screens can show loading state (Nielsen:
   visibility of system status). Returns true while "loading". */
export function useMockLoad(ms = 650): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

/* Table-shaped skeleton matching the Table component's padding. */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
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
export function CardGridSkeleton({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-busy="true" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

/* ---------- StickyActionBar ----------
   Mobile-only bar pinned above the bottom tab bar (and the iOS home indicator). */
export function StickyActionBar({ children, show = "lg:hidden" }: { children?: ReactNode; show?: string }) {
  return (
    <div className={`${show} fixed left-3 right-3 z-30 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]`}>
      <div className="glass-card-solid rounded-2xl shadow-float px-3 py-2.5">{children}</div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon: IconC = Icon.inbox, title, body, action, compact = false, className = "" }: {
  icon?: IconRenderer;
  title?: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
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

/* ---------- ErrorState ----------
   The error half of the async state matrix: explain what failed and offer a
   way forward (retry). Pair with useAsync's `error`/`refetch`. */
export function ErrorState({ title = "Couldn't load this", body = "Something went wrong fetching the data. Please try again.", onRetry, compact = false, className = "" }: {
  title?: ReactNode;
  body?: ReactNode;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center text-center ${compact ? "py-7 px-4" : "py-12 px-6"} ${className}`}>
      <span className={`${compact ? "w-11 h-11" : "w-14 h-14"} rounded-2xl bg-rose-50 text-rose-500 grid place-items-center mb-3`}>
        <Icon.alert size={compact ? 20 : 26} />
      </span>
      <div className="font-semibold text-navy-900">{title}</div>
      {body && <div className="text-[13px] text-slate-500 mt-1 max-w-xs leading-relaxed">{body}</div>}
      {onRetry && (
        <div className="mt-4">
          <Btn variant="outline" size="sm" icon={Icon.refund} onClick={onRetry}>Try again</Btn>
        </div>
      )}
    </div>
  );
}

/* ---------- Future banner (Roadmap preview heads-up) ---------- */
export function FutureBanner({ children = "Preview · Roadmap 2027–2029 — fully clickable mockup, not part of the MVP." }: { children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
      <Icon.info size={14} className="shrink-0 text-slaice-600" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* ---------- Back to top ---------- */
export function BackToTop({ threshold = 600 }: { threshold?: number }) {
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
    document.body,
  );
}
