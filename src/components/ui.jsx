import { useEffect } from "react";
import { Icon } from "../lib/icons.jsx";

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

/* ---------- Card ---------- */
export function Card({ className = "", children, onClick }) {
  return (
    <div onClick={onClick} className={`rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Button ---------- */
export function Btn({ children, variant = "primary", size = "md", onClick, icon: IconC, full, disabled, className = "", type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-[15px]" };
  const variants = {
    primary: "bg-navy-900 text-white hover:bg-navy-800",
    teal: "bg-teal-600 text-white hover:bg-teal-500",
    coral: "bg-coral-600 text-white hover:bg-coral-500",
    dark: "bg-navy-950 text-white hover:bg-navy-900",
    indigo: "bg-slaice-600 text-white hover:bg-slaice-500",
    ghost: "bg-slate-100 text-navy-900 hover:bg-slate-200",
    outline: "ring-1 ring-slate-300 text-navy-900 hover:bg-slate-50 bg-white",
    light: "bg-white/15 text-white hover:bg-white/25 ring-1 ring-white/20",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}>
      {IconC && <IconC size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({ label, value, sub, tone = "navy", icon: IconC, delta }) {
  const ring = { navy: "ring-navy-900/10", teal: "ring-teal-600/15", indigo: "ring-slaice-600/15" }[tone] || "ring-slate-200";
  return (
    <Card className={`p-4 ${ring}`}>
      <div className="flex items-start justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        {IconC && <div className="text-teal-600"><IconC size={18} /></div>}
      </div>
      <div className="mt-1 text-2xl font-bold text-navy-900 tnum font-display">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-slate-500 flex items-center gap-1">{delta}{sub}</div>}
    </Card>
  );
}

/* ---------- PageHead ---------- */
export function PageHead({ title, sub, actions, badge }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-navy-900 font-display">{title}</h1>
          {badge}
        </div>
        {sub && <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/* ---------- Table ---------- */
export function Table({ cols, rows, right = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
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
      {label && <div className="text-[12px] font-semibold text-slate-500 mb-1">{label}</div>}
      {children}
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </label>
  );
}
export function Input(props) {
  return <input {...props} className={`w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 outline-none ${props.className || ""}`} />;
}
export function Select({ options = [], ...props }) {
  return (
    <select {...props} className={`w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-400 outline-none ${props.className || ""}`}>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>))}
    </select>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({ on, onChange, label }) {
  return (
    <button onClick={() => onChange(!on)} className="inline-flex items-center gap-2">
      <span className={`w-10 h-6 rounded-full transition relative ${on ? "bg-teal-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </button>
  );
}

/* ---------- Stepper (quantity) ---------- */
export function Stepper({ value, onChange, min = 0 }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-lg ring-1 ring-slate-300 grid place-items-center hover:bg-slate-50"><Icon.minus size={15} /></button>
      <span className="w-6 text-center font-semibold tnum">{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-lg ring-1 ring-slate-300 grid place-items-center hover:bg-slate-50"><Icon.plus size={15} /></button>
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
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className={`relative bg-white rounded-2xl shadow-float ring-1 ring-slate-200 w-full ${wide ? "max-w-2xl" : "max-w-md"} animate-pop max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="font-display font-bold text-navy-900 text-lg">{title}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><Icon.x size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      {tabs.map(([k, t]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition ${value === k ? "bg-navy-900 text-white" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------- Empty / placeholder ---------- */
export function FeatureChip({ status }) {
  return status === "MVP" ? <Badge tone="mvp">MVP</Badge> : <Badge tone="future">Future</Badge>;
}
