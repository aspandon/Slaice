import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";

interface ToastItem { id: number; msg: ReactNode; action?: { label: string; onClick?: () => void }; tone?: string; duration?: number }

/* ---------- Toasts ---------- */
export function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss?: (id: number) => void }) {
  const tones: Record<string, { ic: string; chip: string; bar: string }> = {
    success: { ic: "checkCircle", chip: "bg-teal-500/20 text-teal-300", bar: "bg-teal-400/70" },
    error: { ic: "alert", chip: "bg-rose-500/20 text-rose-300", bar: "bg-rose-400/70" },
    info: { ic: "info", chip: "bg-sky-500/20 text-sky-300", bar: "bg-sky-400/70" },
    default: { ic: "bolt", chip: "bg-gold-500/20 text-gold-400", bar: "bg-gold-400/70" },
  };
  return (
    <div className="fixed right-4 z-[80] space-y-2.5 w-[340px] max-w-[calc(100vw-2rem)] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4">
      {items.map((t) => {
        const tn = tones[t.tone || "default"] || tones.default;
        const IC = Icon[tn.ic];
        return (
          <div key={t.id} role="status" className="glass-dark text-white rounded-xl pl-3 pr-3 py-3 text-sm shadow-float ring-1 ring-white/15 animate-slide-in-right flex items-start gap-2.5 overflow-hidden relative">
            <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${tn.chip}`}><IC size={15} /></span>
            <span className="flex-1 leading-snug pt-0.5">{t.msg}</span>
            {t.action && (
              <button onClick={() => { t.action?.onClick?.(); onDismiss?.(t.id); }}
                className="shrink-0 self-center text-[12px] font-bold text-gold-300 hover:text-gold-200 underline underline-offset-2 px-1">
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" onClick={() => onDismiss?.(t.id)} className="shrink-0 self-start text-white/50 hover:text-white p-0.5 -mr-1"><Icon.x size={14} /></button>
            <span className={`absolute bottom-0 left-0 h-0.5 w-full ${tn.bar}`} style={{ animation: `toastprogress ${(t.duration || 4200) / 1000}s linear forwards`, transformOrigin: "left" }} />
          </div>
        );
      })}
    </div>
  );
}
