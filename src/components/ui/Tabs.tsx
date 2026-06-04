import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { IconRenderer } from "../../lib/icons";

/* ---------- Tabs (iOS segmented control) ----------
   Tab entries: [key, label] or [key, label, IconComponent]. */
export type TabEntry = [string, ReactNode] | [string, ReactNode, IconRenderer];
export function Tabs({ tabs, value, onChange, className = "", scroll = false }: {
  tabs: TabEntry[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  scroll?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number; top: number; height: number } | null>(null);
  const [mask, setMask] = useState("none");
  useEffect(() => {
    const btn = btnRefs.current[value];
    const track = trackRef.current;
    if (!btn || !track) return;
    const measure = () => {
      const b = btn.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      setPill({ left: b.left - t.left + track.scrollLeft, width: b.width, top: b.top - t.top, height: b.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track); ro.observe(btn);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [value, tabs]);
  useEffect(() => {
    if (!scroll) return;
    const el = trackRef.current;
    if (!el) return;
    const F = 22;
    const update = () => {
      const l = el.scrollLeft > 2;
      const r = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2;
      const left = l ? `transparent, black ${F}px` : "black, black";
      const right = r ? `black calc(100% - ${F}px), transparent` : "black, black";
      setMask(l || r ? `linear-gradient(to right, ${left}, ${right})` : "none");
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); window.removeEventListener("resize", update); };
  }, [scroll, tabs]);
  useEffect(() => {
    if (scroll) btnRefs.current[value]?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [value, scroll]);
  return (
    <div ref={trackRef}
      style={scroll ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
      className={`relative inline-flex gap-1 p-1 rounded-2xl bg-slate-100/80 ring-1 ring-slate-200/60 ${scroll ? "overflow-x-auto no-scrollbar max-w-full" : "flex-wrap"} ${className}`}>
      {pill && (
        <span aria-hidden className="absolute rounded-xl bg-white shadow-soft transition-all duration-300 ease-spring"
          style={{ left: pill.left, width: pill.width, top: pill.top, height: pill.height }} />
      )}
      {tabs.map(([k, t, IconC]) => {
        const active = value === k;
        return (
          <button key={k} ref={(el) => { btnRefs.current[k] = el; }} onClick={() => onChange(k)}
            className={`relative z-10 px-3.5 h-9 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 inline-flex items-center gap-1.5 ${active ? "text-navy-900" : "text-slate-500 hover:text-navy-900"}`}>
            {IconC && <IconC size={14} className={active ? "text-teal-600" : "text-slate-400"} />}
            {t}
          </button>
        );
      })}
    </div>
  );
}
