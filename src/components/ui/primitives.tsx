import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { usePointerGlow } from "../../lib/motion";
import { textOf, useGuardReason } from "./guard";

/* ---------- Badge ---------- */
export function Badge({ tone = "slate", children, className = "" }: { tone?: string; children?: ReactNode; className?: string }) {
  const tones: Record<string, string> = {
    mvp: "bg-teal-100 text-teal-600 ring-teal-600/20",
    future: "bg-orange-50 text-orange-600 ring-orange-500/20",
    // Roadmap features shown inside MVP screens (NotMvpBadge) — purple.
    roadmap: "bg-purple-50 text-purple-700 ring-purple-600/25",
    slate: "bg-slate-100 text-slate-600 ring-slate-400/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    // Semantic status tones (AENR-557): the same meaning gets the same tone in every module.
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
    critical: "bg-rose-50 text-rose-700 ring-rose-600/20",
    info: "bg-sky-50 text-sky-700 ring-sky-600/20",
    neutral: "bg-slate-100 text-slate-600 ring-slate-400/20",
    // Legacy alias — indigo was off-brand; it now reads as info.
    indigo: "bg-sky-50 text-sky-700 ring-sky-600/20",
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
// Order matters: the first key the status contains wins, so "unpaid" must
// come before "paid" (AENR defect: Unpaid showed as a green success badge).
const STATUS_MAP: Record<string, { tone: string; icon: IconRenderer }> = {
  unpaid: { tone: "warning", icon: Icon.clock },
  expired: { tone: "neutral", icon: Icon.clock },
  confirmed: { tone: "success", icon: Icon.checkCircle },
  paid: { tone: "success", icon: Icon.checkCircle },
  active: { tone: "success", icon: Icon.checkCircle },
  live: { tone: "success", icon: Icon.checkCircle },
  ok: { tone: "success", icon: Icon.checkCircle },
  used: { tone: "neutral", icon: Icon.check },
  pending: { tone: "warning", icon: Icon.clock },
  awaiting: { tone: "warning", icon: Icon.clock },
  issued: { tone: "info", icon: Icon.doc },
  refunded: { tone: "critical", icon: Icon.refund },
  cancelled: { tone: "critical", icon: Icon.x },
  canceled: { tone: "critical", icon: Icon.x },
  failed: { tone: "critical", icon: Icon.alert },
};
export function StatusBadge({ status, label, className = "" }: { status?: string; label?: ReactNode; className?: string }) {
  const text = label ?? status;
  const norm = String(status || "").toLowerCase();
  const key = Object.keys(STATUS_MAP).find((k) => norm.includes(k));
  const meta = (key && STATUS_MAP[key]) || (norm.includes("✓") ? STATUS_MAP.ok : { tone: "slate", icon: Icon.info });
  const IconC = meta.icon;
  return <Badge tone={meta.tone} className={className}><IconC size={11} /> {text}</Badge>;
}

/* ---------- Card ----------
   `hover` lifts on hover, `press` adds the springy tap scale, and `sheen` adds
   the cursor-tracking "lit glass" highlight (usePointerGlow). Sheen defaults to
   `hover`, so interactive cards light up automatically; pass sheen={false} to
   opt out, or sheen on an otherwise-static card. */
/** `surface="raised"`: a solid card for data — forms and lists (AENR-549); tables get it automatically. */
export function Card({ className = "", children, hover, press, sheen, surface = "glass" }: { className?: string; children?: ReactNode; hover?: boolean; press?: boolean; sheen?: boolean; surface?: "glass" | "raised" }) {
  const showSheen = sheen ?? hover;
  const ref = usePointerGlow<HTMLDivElement>(!!showSheen);
  return (
    <div
      ref={ref}
      className={`glass-card ${surface === "raised" ? "surface-raised" : ""} rounded-3xl ${hover ? "transition duration-300 ease-spring hover:-translate-y-1 hover:shadow-lift" : ""} ${press ? "pressable cursor-pointer" : ""} ${showSheen ? "relative isolate" : ""} ${className}`}>
      {showSheen && <span aria-hidden className="sheen" />}
      {children}
    </div>
  );
}

/* ---------- Button ----------
   Apple-style hierarchy: filled (primary/teal/dark/indigo/danger), tinted
   (tint — light-accent fill), and quiet (ghost/outline). Springy press. */
export function Btn({ children, variant = "primary", size = "md", onClick, icon: IconC, full, disabled, loading, className = "", type = "button", form, title, "aria-label": ariaLabel }: {
  children?: ReactNode;
  variant?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  icon?: IconRenderer;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  /** Submits a form outside the button (e.g. a modal footer for a form in the body). */
  form?: string;
  /** Tooltip — e.g. why the button is disabled. A View-as guard reason wins. */
  title?: string;
  /** Accessible name for icon-only buttons. */
  "aria-label"?: string;
}) {
  const base = "relative inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-all duration-150 ease-spring active:scale-[.96] disabled:pointer-events-none select-none";
  // min-heights enforce a comfortable touch target (≈ Apple HIG 44pt for md/lg)
  // without shrinking any existing layout.
  const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-[13px] min-h-[36px]", md: "px-4 py-2.5 text-sm min-h-[44px]", lg: "px-5 py-3 text-[15px] min-h-[48px]" };
  // When disabled, every variant collapses to the same quiet slate ghost so a
  // disabled CTA never looks like a heavy navy slab. Loading keeps the active
  // variant so the spinner appears on the live colour.
  const off = "!bg-slate-100 !text-slate-400 !ring-0 !shadow-none";
  const variants: Record<string, string> = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-btn-primary hover:shadow-lift",
    teal: "bg-teal-600 text-white hover:bg-teal-700 shadow-btn-teal hover:shadow-lift",
    coral: "bg-coral-600 text-white hover:bg-coral-500 shadow-lift",
    dark: "bg-navy-950 text-white hover:bg-navy-900 shadow-btn-primary hover:shadow-lift",
    // One palette across personas (AENR-557): the old indigo primary is brand navy now.
    indigo: "bg-navy-900 text-white hover:bg-navy-800 shadow-btn-primary hover:shadow-lift",
    // Tinted secondary — Apple's light-accent button.
    tint: "bg-teal-50 text-teal-700 hover:bg-teal-100 ring-1 ring-teal-600/15",
    ghost: "bg-slate-100/80 text-navy-900 hover:bg-slate-200/90",
    outline: "ring-1 ring-slate-200 text-navy-900 hover:bg-slate-50 hover:ring-slate-300 bg-white/80",
    light: "bg-white/15 text-white hover:bg-white/25 ring-1 ring-white/20 backdrop-blur-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-lift",
  };
  // View-as guard: a read-only session or a blocked action turns the button off, with the reason.
  const guarded = useGuardReason(textOf(children));
  const isDisabled = (disabled || !!guarded) && !loading;
  return (
    <button type={type} form={form} disabled={disabled || loading || !!guarded} onClick={onClick} title={guarded || title} aria-label={ariaLabel}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${isDisabled ? off : ""} ${className}`}>
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : IconC && <IconC size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-block rounded-full border-2 border-current/25 border-t-current animate-spin ${className}`}
      style={{ width: size, height: size, borderTopColor: "currentColor" }} />
  );
}

/* ---------- FeatureChip ---------- */
export function FeatureChip({ status }: { status?: string }) {
  return status === "MVP" ? <Badge tone="mvp">MVP</Badge> : <Badge tone="future">Future</Badge>;
}
