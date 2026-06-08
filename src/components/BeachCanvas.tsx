import { useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Group, Rect, Path, Text, Line, Circle } from "react-konva";
import type { SunbedSlot, SunbedState } from "../domain/types";
import { BEDS, CANOPY, CANOPY_PATH, FIN, GLYPH_CONTENT, LITE_PATH, sunbedPalette } from "./sunbedGlyph";

/* ---------- Shared Konva beach renderer ----------
   Draws a zone's umbrella-set layout (the SunbedSlot[] the admin authors and the
   customer wizard renders) on a single canvas: a sea band up top, sand below,
   one umbrella-set per slot. Two modes, one render path:
     • book  (customer)  — multi-select to book; unavailable beds aren't tappable.
     • edit  (admin)     — drag to arrange, single/▶multi-select, optional grid
                           snap; every bed is movable.
   The set glyph is the same one the SVG <Sunbed> draws (sunbedGlyph.ts),
   re-expressed as Konva nodes so the canvas and the rest of the app match. */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const isAdditive = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
  const ev = e.evt as MouseEvent;
  return !!(ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey));
};

// Glyph colours come from the shared palette; the tap-pad tint + ring are a
// canvas-only affordance, tuned to the same per-state hues.
function palette(state: SunbedState, sel: boolean) {
  const g = sunbedPalette(state, sel);
  const plot = sel ? "rgba(239,106,79,0.20)" : state === "u" ? "rgba(154,166,178,0.14)" : state === "h" ? "rgba(232,162,58,0.16)" : "rgba(255,255,255,0.30)";
  const ring = sel ? g.c : state === "u" ? "rgba(154,166,178,0.45)" : state === "h" ? "rgba(232,162,58,0.5)" : "rgba(255,255,255,0.55)";
  return { ...g, plot, ring };
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
              // Fit the 72-unit glyph so its content height fills ~90% of the pad.
              const gs = (size * 0.9) / GLYPH_CONTENT.h;
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
                  {/* scaleY is negated to present the set loungers-up — a vertical
                      mirror about the content centre (offsetY). */}
                  <Group scaleX={gs} scaleY={-gs} offsetX={GLYPH_CONTENT.cx} offsetY={GLYPH_CONTENT.cy}>
                    {/* Twin loungers. */}
                    {BEDS.map((bed, i) => (
                      <Group key={i}>
                        <Rect x={bed.frame.x} y={bed.frame.y} width={bed.frame.w} height={bed.frame.h} cornerRadius={bed.frame.r} fill={c.bed} />
                        <Rect x={bed.cushion.x} y={bed.cushion.y} width={bed.cushion.w} height={bed.cushion.h} cornerRadius={bed.cushion.r} fill={c.cushion} />
                        <Path data={bed.slats} stroke={c.slat} strokeWidth={1.3} lineCap="round" />
                      </Group>
                    ))}
                    {/* Pinwheel parasol — gores merged by colour into one path each. */}
                    <Path data={CANOPY_PATH} fill={c.c} />
                    <Path data={LITE_PATH} fill={c.lite} />
                    <Circle x={CANOPY.cx} y={CANOPY.cy} radius={CANOPY.r} stroke={c.edge} strokeWidth={1.2} />
                    <Circle x={FIN.cx} y={FIN.cy} radius={FIN.r} fill={c.fin} />
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
