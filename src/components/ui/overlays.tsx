import { useEffect, useId, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../lib/icons";
import type { IconRenderer } from "../../lib/icons";
import { Btn } from "./primitives";

/* Dialog focus management (WCAG 2.4.3 + ARIA dialog pattern). */
function useDialogFocus(open: boolean, panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )).filter((el) => el.offsetParent !== null || el === document.activeElement);
    const first = focusables()[0];
    (first || panel).focus?.();
    const onKey = (e: KeyboardEvent) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: {
  open?: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  useDialogFocus(!!open, panelRef);
  if (!open) return null;
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

/* ---------- Sheet (bottom sheet with drag-to-dismiss) ---------- */
export function Sheet({ open, onClose, title, children, footer }: {
  open?: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  useDialogFocus(!!open, panelRef);
  if (!open) return null;
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    drag.current = { startY: e.clientY, dy: 0 };
    panel.classList.add("sheet-dragging");
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panelRef.current) return;
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

/* ---------- Confirm dialog ---------- */
export function ConfirmModal({ open, onClose, onConfirm, title = "Are you sure?", body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = true, icon: IconC }: {
  open?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  danger?: boolean;
  icon?: IconRenderer;
}) {
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
