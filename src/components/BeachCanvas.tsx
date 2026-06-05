import { useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Group, Rect, Path, Text, Line } from "react-konva";
import type { SunbedSlot, SunbedState } from "../domain/types";

/* ---------- Shared Konva beach renderer ----------
   Draws a zone's umbrella-set layout (the SunbedSlot[] the admin authors and the
   customer wizard renders) on a single canvas: a sea band up top, sand below,
   and one tappable umbrella per set. Selection + availability are colour-coded.
   The umbrella silhouette is the same glyph as the SVG <Sunbed>, re-expressed as
   Konva paths so the canvas and the rest of the app stay visually consistent. */

const CANOPY_L = "M12 13 L3 9 A10 10 0 0 1 12 4 Z";
const CANOPY_R = "M12 13 L21 9 A10 10 0 0 0 12 4 Z";

function palette(state: SunbedState, sel: boolean) {
  if (sel) return { a: "#e2552f", b: "#fb8a63", pole: "#e2552f", plot: "rgba(226,85,47,0.20)", ring: "#e2552f", dim: false };
  if (state === "u") return { a: "#cbd5e1", b: "#e2e8f0", pole: "#cbd5e1", plot: "rgba(148,163,184,0.14)", ring: "rgba(148,163,184,0.3)", dim: true };
  if (state === "h") return { a: "#f5b54a", b: "#fcd98a", pole: "#c79248", plot: "rgba(245,181,74,0.18)", ring: "rgba(245,181,74,0.4)", dim: false };
  return { a: "#5cc0f0", b: "#ffffff", pole: "#7c8a99", plot: "rgba(255,255,255,0.32)", ring: "rgba(255,255,255,0.45)", dim: false };
}

export interface BeachCanvasProps {
  slots: SunbedSlot[];
  /** Currently-selected slot ids. */
  selected: Set<string>;
  onToggle: (slot: SunbedSlot) => void;
  seaLabel?: string;
  backLabel?: string;
  /** Cap the rendered height (px); width always fills the parent. */
  maxHeight?: number;
}

export function BeachCanvas({ slots, selected, onToggle, seaLabel = "Sea · front row", backLabel = "Promenade", maxHeight = 420 }: BeachCanvasProps) {
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
            <Line points={[0, seaH + 1, w, seaH + 1]} stroke="rgba(255,255,255,0.75)" strokeWidth={2} />
            <Text x={12} y={Math.max(2, seaH / 2 - 6)} text={seaLabel.toUpperCase()} fontSize={10} fontStyle="bold" fill="rgba(255,255,255,0.95)" letterSpacing={1.6} />
            <Text x={12} y={h - 16} text={backLabel.toUpperCase()} fontSize={9} fontStyle="bold" fill="rgba(120,90,50,0.7)" letterSpacing={1.2} />
          </Layer>

          {/* Umbrella sets. */}
          <Layer>
            {slots.map((b) => {
              const sel = selected.has(b.id);
              const c = palette(b.state, sel);
              const cx = (b.x / 100) * w;
              const cy = seaH + (b.y / 100) * (h - seaH);
              const s = size / 24;
              const plot = size * 0.94;
              return (
                <Group
                  key={b.id}
                  x={cx}
                  y={cy}
                  onClick={() => !c.dim && onToggle(b)}
                  onTap={() => !c.dim && onToggle(b)}
                  onMouseEnter={(e) => setCursor(e, c.dim ? "not-allowed" : "pointer")}
                  onMouseLeave={(e) => setCursor(e, "default")}
                >
                  {/* Plot = visible tap pad (a real fill, so Konva hit-tests it). */}
                  <Rect
                    x={-plot / 2} y={-plot / 2} width={plot} height={plot}
                    cornerRadius={plot * 0.24}
                    fill={c.plot}
                    stroke={c.ring}
                    strokeWidth={sel ? 2 : 1}
                  />
                  <Group scaleX={s} scaleY={s} offsetX={12} offsetY={12} y={-size * 0.03}>
                    <Path data={CANOPY_L} fill={c.a} />
                    <Path data={CANOPY_R} fill={c.b} stroke={sel ? c.a : "#e7eef5"} strokeWidth={0.6} />
                    <Rect x={11.4} y={12} width={1.2} height={7} cornerRadius={0.5} fill={c.pole} />
                    <Rect x={8} y={18} width={8} height={2.4} cornerRadius={1.2} fill={c.pole} />
                  </Group>
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
