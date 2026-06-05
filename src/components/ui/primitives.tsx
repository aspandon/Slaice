import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";

/* ---------- Badge ---------- */
export function Badge({ tone = "slate", children, className = "" }: { tone?: string; children?: ReactNode; className?: string }) {
  const tones: Record<string, string> = {
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
const STATUS_MAP: Record<string, { tone: string; icon: IconRenderer }> = {
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
export function StatusBadge({ status, label, className = "" }: { status?: string; label?: ReactNode; className?: string }) {
  const text = label ?? status;
  const norm = String(status || "").toLowerCase();
  const key = Object.keys(STATUS_MAP).find((k) => norm.includes(k));
  const meta = (key && STATUS_MAP[key]) || (norm.includes("✓") ? STATUS_MAP.ok : { tone: "slate", icon: Icon.info });
  const IconC = meta.icon;
  return <Badge tone={meta.tone} className={className}><IconC size={11} /> {text}</Badge>;
}

/* ---------- Card ---------- */
export function Card({ className = "", children, hover, press }: { className?: string; children?: ReactNode; hover?: boolean; press?: boolean }) {
  return (
    <div
      className={`glass-card rounded-3xl ${hover ? "transition duration-300 ease-spring hover:-translate-y-1 hover:shadow-lift" : ""} ${press ? "pressable cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Button ----------
   Apple-style hierarchy: filled (primary/teal/dark/indigo/danger), tinted
   (tint — light-accent fill), and quiet (ghost/outline). Springy press. */
export function Btn({ children, variant = "primary", size = "md", onClick, icon: IconC, full, disabled, loading, className = "", type = "button" }: {
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
