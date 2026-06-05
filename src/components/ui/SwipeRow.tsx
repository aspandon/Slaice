import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Icon } from "../../lib/icons";

/* ---------- SwipeRow ----------
   Wraps a list row so it can be removed by swiping right-to-left (touch or
   mouse-drag) in addition to whatever explicit delete control the row renders.
   A red "Delete" affordance sits behind the row and is revealed as you drag; a
   release past the threshold slides the row out and fires `onDelete`.

   `touch-action: pan-y` keeps vertical list scrolling working — we only claim
   the gesture once horizontal intent is clear, so taps on inner buttons (the
   delete icon) still register as clicks. No-op-friendly: a tap never deletes. */
export function SwipeRow({
  onDelete,
  children,
  deleteLabel = "Delete",
  className = "",
  rounded = "rounded-xl",
}: {
  onDelete: () => void;
  children: ReactNode;
  deleteLabel?: string;
  className?: string;
  rounded?: string;
}) {
  const [dx, setDx] = useState(0);
  const [removing, setRemoving] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const MAX = 96; // furthest the row travels while dragging
  const THRESHOLD = 60; // release past this (px left) to delete

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    dragging.current = false;
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!start.current || removing) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (!dragging.current) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
        // Vertical intent — let the list scroll, abandon this gesture.
        start.current = null;
        return;
      }
      if (mx < -8) {
        dragging.current = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* capture unsupported — drag still works without it */
        }
      }
    }
    if (dragging.current) {
      e.preventDefault();
      setDx(Math.max(-MAX, Math.min(0, mx)));
    }
  };
  const settle = () => {
    if (dragging.current && dx <= -THRESHOLD) {
      setRemoving(true);
      window.setTimeout(onDelete, 200);
    } else {
      setDx(0);
    }
    start.current = null;
    dragging.current = false;
  };

  return (
    <div
      className={`relative ${rounded} overflow-hidden ${removing ? "transition-all duration-200 ease-out" : ""} ${className}`}
      style={removing ? { transform: "scaleY(0.6)", opacity: 0, maxHeight: 0, marginTop: 0, marginBottom: 0 } : undefined}
    >
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-end bg-rose-500 text-white pr-4">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
          <Icon.trash size={15} /> {deleteLabel}
        </span>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        className="relative"
        style={{
          transform: `translateX(${removing ? -MAX - 40 : dx}px)`,
          transition: dragging.current ? "none" : "transform .22s cubic-bezier(.22,1,.36,1)",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
