import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { QR } from "./charts";
import type { PassDesign, CardText } from "../domain/types";

// The card is authored at this design size; previews scale from it, so every
// px (font size, QR width) stays meaningful while the card itself is fluid.
export const DW = 360;
export const DH = 227; // ≈ credit-card ratio (1.586:1)

/** Elements that can be selected + dragged on the card face. */
export type TextKey = "title" | "subtitle" | "holder" | "number" | "validUntil";
export type DragKey = TextKey | "logo" | "qr";
export const TEXT_KEYS: TextKey[] = ["title", "subtitle", "holder", "number", "validUntil"];
export const TEXT_LABELS: Record<string, string> = { title: "Title", subtitle: "Subtitle", holder: "Holder name", number: "Card number", validUntil: "Valid until", logo: "Logo", qr: "QR code" };

const resolveLogo = (src: string | null) => (!src ? null : src.startsWith("data:") ? src : import.meta.env.BASE_URL + src);
const alignTransform = (a?: string) => (a === "center" ? "translate(-50%, -50%)" : a === "right" ? "translate(-100%, -50%)" : "translate(0, -50%)");

/* The card face at design size. `editable` makes each element selectable +
   draggable (pointer drag, % positions); otherwise it's a static render used in
   the previews and the wallet frames. */
export function CardFace({ design, selected, onSelect, onMove, editable = false, qrSeed = "PASS-0042" }: {
  design: PassDesign;
  selected?: DragKey | null;
  onSelect?: (k: DragKey) => void;
  onMove?: (k: DragKey, x: number, y: number) => void;
  editable?: boolean;
  qrSeed?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ k: DragKey; dx: number; dy: number } | null>(null);
  const xyOf = (k: DragKey) => design[k] as { x: number; y: number };
  const down = (e: ReactPointerEvent<HTMLElement>, k: DragKey) => {
    if (!editable || !ref.current) return;
    onSelect?.(k);
    const r = ref.current.getBoundingClientRect();
    const el = xyOf(k);
    drag.current = { k, dx: e.clientX - (r.left + (el.x / 100) * r.width), dy: e.clientY - (r.top + (el.y / 100) * r.height) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - d.dx - r.left) / r.width) * 100;
    const y = ((e.clientY - d.dy - r.top) / r.height) * 100;
    onMove?.(d.k, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };
  const up = () => { drag.current = null; };
  const logo = resolveLogo(design.logo.src);

  const renderText = (k: DragKey, t: CardText) => (
    <button
      key={k} type="button" disabled={!editable}
      onPointerDown={(e) => down(e, k)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      className={`absolute whitespace-nowrap leading-none select-none ${editable ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"} ${selected === k && editable ? "ring-2 ring-teal-400 ring-offset-1 rounded-sm" : ""}`}
      style={{ left: `${t.x}%`, top: `${t.y}%`, transform: alignTransform(t.align), color: t.color, fontSize: t.size, fontWeight: t.weight ?? 600, letterSpacing: `${t.tracking ?? 0}px`, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      {t.text || (editable ? "—" : "")}
    </button>
  );

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl shadow-lift ring-1 ring-black/10" style={{ width: DW, height: DH, background: `linear-gradient(155deg, ${design.bg[0]}, ${design.bg[1]})` }}>
      {/* Decorative wave band at the foot. */}
      <svg viewBox="0 0 360 227" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden="true">
        <path d={`M0 188 C 70 176 120 200 180 188 S 300 174 360 190 L360 227 L0 227 Z`} fill={design.wave} opacity="0.85" />
        <path d={`M0 202 C 80 192 130 212 190 202 S 310 190 360 204 L360 227 L0 227 Z`} fill={design.wave} opacity="0.6" />
      </svg>

      {logo && (
        <button type="button" disabled={!editable} onPointerDown={(e) => down(e, "logo")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          className={`absolute ${editable ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"} ${selected === "logo" && editable ? "ring-2 ring-teal-400 ring-offset-1 rounded" : ""}`}
          style={{ left: `${design.logo.x}%`, top: `${design.logo.y}%`, width: `${design.logo.scale}%` }}>
          <img src={logo} alt="Card logo" className="w-full h-auto block pointer-events-none" draggable={false} />
        </button>
      )}

      {design.qr.show && (
        <button type="button" disabled={!editable} onPointerDown={(e) => down(e, "qr")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          className={`absolute ${editable ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"} ${selected === "qr" && editable ? "ring-2 ring-teal-400 ring-offset-1 rounded-lg" : ""}`}
          style={{ left: `${design.qr.x}%`, top: `${design.qr.y}%`, width: `${design.qr.scale}%` }}>
          <span className="block bg-white rounded-md p-1 shadow-sm"><QR size={Math.round((design.qr.scale / 100) * DW) - 8} seed={qrSeed} /></span>
        </button>
      )}

      {TEXT_KEYS.map((k) => renderText(k, design[k]))}
    </div>
  );
}

/* Responsive wrapper — scales the design-size card to fit its container width,
   so the same card reads crisply in the editor, list and wallet previews. */
export function ScaledCard({ design, maxWidth = DW, qrSeed, className = "" }: { design: PassDesign; maxWidth?: number; qrSeed?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(Math.min(maxWidth, el.clientWidth) / DW);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);
  return (
    <div ref={ref} className={className} style={{ height: DH * scale }}>
      <div style={{ width: DW, height: DH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <CardFace design={design} qrSeed={qrSeed} />
      </div>
    </div>
  );
}

/* ---- Wallet renditions ----
   The published design shown inside an Apple Wallet / Google Wallet frame, so the
   admin sees the *same* card as it lands on a guest's phone. */
function AppleMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" className={className} aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>;
}

export function WalletRendition({ design, platform, qrSeed }: { design: PassDesign; platform: "apple" | "google"; qrSeed?: string }) {
  const apple = platform === "apple";
  return (
    <div className="rounded-[26px] bg-neutral-900 p-3 w-[240px] shadow-float ring-1 ring-black/20">
      <div className="flex items-center justify-between px-1 pb-2 text-white/80">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
          {apple ? <><AppleMark /> Wallet</> : <><span className="w-3.5 h-3.5 rounded-full bg-white grid place-items-center text-[8px] font-bold text-neutral-900">G</span> Google Wallet</>}
        </span>
        <span className="text-[10px] text-white/40">{apple ? "iPhone" : "Android"}</span>
      </div>
      <div className="rounded-2xl bg-white p-2.5 shadow-inner">
        <ScaledCard design={design} qrSeed={qrSeed} />
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Scan at the gate
        </div>
      </div>
    </div>
  );
}
