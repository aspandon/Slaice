import { useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Group, Rect, Path, Text, Line, Circle } from "react-konva";
import type { SunbedSlot, SunbedState } from "../domain/types";

/* ---------- Shared Konva beach renderer ----------
   Draws a zone's umbrella-set layout (the SunbedSlot[] the admin authors and the
   customer wizard renders) on a single canvas: a sea band up top, sand below,
   one umbrella per set. Two modes, one render path:
     • book  (customer)  — multi-select to book; unavailable beds aren't tappable.
     • edit  (admin)     — drag to arrange, single/▶multi-select, optional grid
                           snap; every bed is movable.
   The umbrella silhouette is the same glyph as the SVG <Sunbed>, re-expressed as
   Konva paths so the canvas and the rest of the app stay visually consistent. */

const CANOPY_L = "M12 13 L3 9 A10 10 0 0 1 12 4 Z";
const CANOPY_R = "M12 13 L21 9 A10 10 0 0 0 12 4 Z";
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const isAdditive = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
  const ev = e.evt as MouseEvent;
  return !!(ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey));
};

function palette(state: SunbedState, sel: boolean) {
  if (sel) return { a: "#e2552f", b: "#fb8a63", pole: "#e2552f", plot: "rgba(226,85,47,0.20)", ring: "#e2552f", dim: false };
  if (state === "u") return { a: "#cbd5e1", b: "#e2e8f0", pole: "#cbd5e1", plot: "rgba(148,163,184,0.14)", ring: "rgba(148,163,184,0.3)", dim: true };
  if (state === "h") return { a: "#f5b54a", b: "#fcd98a", pole: "#c79248", plot: "rgba(245,181,74,0.18)", ring: "rgba(245,181,74,0.4)", dim: false };
  return { a: "#5cc0f0", b: "#ffffff", pole: "#7c8a99", plot: "rgba(255,255,255,0.32)", ring: "rgba(255,255,255,0.45)", dim: false };
}

export interface BeachCanvasProps {
  slots: SunbedSlot[];
  seaLabel?: string;
  backLabel?: string;
  /** Cap the rendered height (px); width always fills the parent. */
  maxHeight?: number;
  /* — book mode (customer) — */
  selected?: Set<string>;
  onToggle?: (slot: SunbedSlot) => void;
  /* — edit mode (admin) — */
  editable?: boolean;
  selectedIds?: Set<string>;
  /** additive = true when a modifier key (shift/⌘/ctrl) is held. */
  onSelect?: (id: string, additive: boolean) => void;
  /** Called on drag end with the bed's new normalized (0–100) position. */
  onMove?: (id: string, x: number, y: number) => void;
  /** Grid step in % (0 / undefined = free placement). Draws faint guides. */
  snap?: number;
}

export function BeachCanvas({
  slots, seaLabel = "Sea · front row", backLabel = "Promenade", maxHeight = 420,
  selected, onToggle, editable = false, selectedIds, onSelect, onMove, snap = 0,
}: BeachCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setW(Math.round(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const h = Math.max(200, Math.min(maxHeight, Math.round(w * 0.6)));
  const seaH = Math.round(h * 0.15);
  const size = Math.max(20, Math.min(56, w * 0.085));
  const snapPct = (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v);
  const setCursor = (e: KonvaEventObject<MouseEvent>, c: string) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = c;
  };

  return (
    <div ref={wrapRef} className="w-full rounded-2xl overflow-hidden ring-1 ring-white/50 shadow-soft" style={{ minHeight: 200 }}>
      {w > 0 && (
        <Stage width={w} height={h}>
          {/* Backdrop: sand + sea band + orientation labels (non-interactive). */}
          <Layer listening={false}>
            <Rect
              x={0} y={0} width={w} height={h}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: h }}
              fillLinearGradientColorStops={[0, "#f7e4c4", 0.55, "#f0d4a3", 1, "#e6c08a"]}
            />
            <Rect
              x={0} y={0} width={w} height={seaH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: seaH }}
              fillLinearGradientColorStops={[0, "#0c6e8e", 1, "#22d3ee"]}
            />
            {/* Grid guides while snapping (edit only). */}
            {editable && snap > 0 && Array.from({ length: Math.floor(100 / snap) - 1 }).map((_, i) => {
              const gx = ((i + 1) * snap / 100) * w;
              const gy = seaH + ((i + 1) * snap / 100) * (h - seaH);
              return (
                <Group key={i} listening={false}>
                  <Line points={[gx, seaH, gx, h]} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
                  {gy < h && <Line points={[0, gy, w, gy]} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />}
                </Group>
              );
            })}
            <Line points={[0, seaH + 1, w, seaH + 1]} stroke="rgba(255,255,255,0.75)" strokeWidth={2} />
            <Text x={12} y={Math.max(2, seaH / 2 - 6)} text={seaLabel.toUpperCase()} fontSize={10} fontStyle="bold" fill="rgba(255,255,255,0.95)" letterSpacing={1.6} />
            <Text x={12} y={h - 16} text={backLabel.toUpperCase()} fontSize={9} fontStyle="bold" fill="rgba(120,90,50,0.7)" letterSpacing={1.2} />
          </Layer>

          {/* Umbrella sets. */}
          <Layer>
            {slots.map((b) => {
              const sel = editable ? !!selectedIds?.has(b.id) : !!selected?.has(b.id);
              const c = palette(b.state, sel);
              const cx = (b.x / 100) * w;
              const cy = seaH + (b.y / 100) * (h - seaH);
              const s = size / 24;
              const plot = size * 0.94;
              const front = b.kind === "front";
              const handle = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
                if (editable) onSelect?.(b.id, isAdditive(e));
                else if (!c.dim) onToggle?.(b);
              };
              return (
                <Group
                  key={b.id}
                  x={cx}
                  y={cy}
                  draggable={editable}
                  dragBoundFunc={(pos) => {
                    let x = clamp(pos.x, size / 2, w - size / 2);
                    let y = clamp(pos.y, seaH + size / 2, h - size / 2);
                    if (snap > 0) {
                      x = (snapPct((x / w) * 100) / 100) * w;
                      y = seaH + (snapPct(((y - seaH) / (h - seaH)) * 100) / 100) * (h - seaH);
                    }
                    return { x, y };
                  }}
                  onDragStart={() => { if (editable && !selectedIds?.has(b.id)) onSelect?.(b.id, false); }}
                  onDragEnd={(e) => {
                    if (!editable) return;
                    const node = e.target;
                    let nx = clamp((node.x() / w) * 100, 0, 100);
                    let ny = clamp(((node.y() - seaH) / (h - seaH)) * 100, 0, 100);
                    if (snap > 0) { nx = snapPct(nx); ny = snapPct(ny); }
                    onMove?.(b.id, nx, ny);
                  }}
                  onClick={handle}
                  onTap={handle}
                  onMouseEnter={(e) => setCursor(e, editable ? "grab" : c.dim ? "not-allowed" : "pointer")}
                  onMouseLeave={(e) => setCursor(e, "default")}
                >
                  {/* Cabana = a shaded hut backing the umbrella. */}
                  {b.kind === "cabana" && (
                    <Rect x={-plot * 0.64} y={-plot * 0.6} width={plot * 1.28} height={plot * 1.28} cornerRadius={plot * 0.18} fill="rgba(170,120,72,0.26)" stroke="rgba(135,88,48,0.55)" strokeWidth={1} />
                  )}
                  {/* Plot = visible tap pad (a real fill, so Konva hit-tests it). */}
                  <Rect
                    x={-plot / 2} y={-plot / 2} width={plot} height={plot}
                    cornerRadius={plot * 0.24}
                    fill={c.plot}
                    stroke={front && !sel ? "#e0a800" : c.ring}
                    strokeWidth={sel ? 2 : front ? 1.6 : 1}
                    dash={editable && sel ? [5, 3] : undefined}
                  />
                  <Group scaleX={s} scaleY={s} offsetX={12} offsetY={12} y={-size * 0.03}>
                    <Path data={CANOPY_L} fill={c.a} />
                    <Path data={CANOPY_R} fill={c.b} stroke={sel ? c.a : "#e7eef5"} strokeWidth={0.6} />
                    <Rect x={11.4} y={12} width={1.2} height={7} cornerRadius={0.5} fill={c.pole} />
                    <Rect x={8} y={18} width={8} height={2.4} cornerRadius={1.2} fill={c.pole} />
                  </Group>
                  {/* Front-row marker. */}
                  {front && <Circle x={plot * 0.34} y={-plot * 0.34} radius={Math.max(2.5, size * 0.08)} fill="#f2b705" stroke="#fff" strokeWidth={1} />}
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
