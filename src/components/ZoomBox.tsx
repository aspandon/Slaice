import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from "react";
import { Icon } from "../lib/icons";

/* ============ Pan + pinch box for maps on a phone (AENR-647, AENR-660) ============
   Draws its content at `minWidth` (or the box width, if wider) × zoom, inside a
   scrollable box: one finger pans natively, two fingers pinch, −/+ buttons zoom
   for everyone else. It opens centred on `focus` (x/y in % of the content) and
   keeps the centre steady while zooming. `vars` passes CSS custom properties
   that follow the zoom (e.g. a set's size). */
export function ZoomBox({
  minWidth,
  aspect,
  focus,
  vars,
  maxHeight = "min(62vh, 440px)",
  hint = "Drag to move · pinch or −/+ to zoom.",
  className = "",
  children,
}: {
  minWidth: number;
  /** Height ÷ width of the content. */
  aspect: number;
  focus?: { x: number; y: number };
  vars?: (zoom: number) => Record<string, string>;
  maxHeight?: string;
  hint?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(358);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const base = Math.max(cw, minWidth);
  const fit = Math.min(1, cw / base);
  const [zoom, setZoom] = useState(1);
  const w = base * zoom;
  const h = w * aspect;
  const centre = useRef<{ fx: number; fy: number } | null>(null);
  const setZ = (z: number) => {
    const el = box.current;
    if (el)
      centre.current = {
        fx: (el.scrollLeft + el.clientWidth / 2) / w,
        fy: (el.scrollTop + el.clientHeight / 2) / h,
      };
    setZoom(Math.max(fit, Math.min(2, z)));
  };
  const started = useRef(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (centre.current) {
      el.scrollLeft = centre.current.fx * w - el.clientWidth / 2;
      el.scrollTop = centre.current.fy * h - el.clientHeight / 2;
      centre.current = null;
      return;
    }
    if (started.current || cw < 100 || !focus) return;
    started.current = true;
    el.scrollLeft = (focus.x / 100) * w - el.clientWidth / 2;
    el.scrollTop = (focus.y / 100) * h - el.clientHeight / 2;
  }, [w, h, cw, focus]);
  // Two-finger pinch (one finger pans natively).
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const dist = () => {
    const [a, b] = [...pts.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const down = (e: RPointerEvent) => {
    if (e.pointerType !== "touch") return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) pinch.current = { d: dist(), z: zoom };
  };
  const move = (e: RPointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pts.current.size === 2) setZ((pinch.current.z * dist()) / pinch.current.d);
  };
  const up = (e: RPointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
  };
  const btn =
    "w-11 h-11 grid place-items-center rounded-xl bg-white/95 ring-1 ring-slate-300 text-navy-900 shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
  return (
    <div className={`relative ${className}`}>
      <div
        ref={box}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="overflow-auto overscroll-contain rounded-xl ring-1 ring-slate-200"
        style={{ touchAction: "pan-x pan-y", maxHeight }}
      >
        <div className="relative" style={{ width: w, height: h, ...vars?.(zoom) } as CSSProperties}>
          {children}
        </div>
      </div>
      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          className={btn}
          aria-label="Zoom in"
          disabled={zoom >= 2}
          onClick={() => setZ(zoom * 1.25)}
        >
          <Icon.plus size={16} />
        </button>
        <button
          type="button"
          className={btn}
          aria-label="Zoom out"
          disabled={zoom <= fit + 0.01}
          onClick={() => setZ(zoom / 1.25)}
        >
          <Icon.minus size={16} />
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
