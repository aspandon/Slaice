import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons";
import { PERSONAS, NAV } from "../data/personas";
import type { PersonaId } from "../domain/types";
import { useApp } from "../app/store";

/* ⌘K / Ctrl-K command palette — fast navigation across every persona's screens.
   Opens on the keyboard shortcut or a `slaice:cmdk` window event (dispatched by
   the top-bar search button). Arrow keys move, Enter navigates, Esc closes. */

interface CmdItem {
  persona: PersonaId;
  personaLabel: string;
  personaColor: string;
  page: string;
  label: string;
  icon: string;
  account: boolean;
  future: boolean;
}

// Flatten every destination across all personas into one searchable list.
function buildIndex(): CmdItem[] {
  const out: CmdItem[] = [];
  PERSONAS.forEach((p) => {
    (NAV[p.id] || []).forEach((it) => {
      out.push({
        persona: p.id,
        personaLabel: p.label,
        personaColor: p.color,
        page: it.k,
        label: it.label,
        icon: it.icon,
        account: it.area === "account",
        future: it.badge === "Future",
      });
    });
  });
  return out;
}

export function CommandPalette() {
  const { go, persona } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const index = useMemo(buildIndex, []);

  // Global open triggers: ⌘K / Ctrl-K and the custom event from the top bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("slaice:cmdk", onEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("slaice:cmdk", onEvt);
    };
  }, []);

  // Rank: current-persona destinations first, then a simple substring match.
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = index.filter((d) =>
      !term ||
      d.label.toLowerCase().includes(term) ||
      d.personaLabel.toLowerCase().includes(term),
    );
    return match
      .sort((a, b) => (a.persona === persona ? -1 : 0) - (b.persona === persona ? -1 : 0))
      .slice(0, 14);
  }, [q, index, persona]);

  useEffect(() => { setActive(0); }, [q, open]);
  useEffect(() => {
    if (open) { setQ(""); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const choose = (d: CmdItem) => { setOpen(false); go(d.persona, d.page); };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) choose(results[active]); }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;
  return createPortal((
    <div role="dialog" aria-modal="true" aria-label="Command palette"
      className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh] animate-fade-in" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" />
      <div onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}
        className="glass-card-solid relative w-full max-w-xl rounded-2xl shadow-float animate-pop overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200/70">
          <Icon.search size={18} className="text-slate-400 shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search screens — try “reporting”, “gate”, “refunds”…"
            className="flex-1 bg-transparent outline-none text-base sm:text-sm text-navy-900 placeholder:text-slate-400" />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-400 bg-slate-100 ring-1 ring-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-slate-500">No screens match “{q}”.</div>
          ) : results.map((d, i) => {
            const IconC = Icon[d.icon] || Icon.grid;
            return (
              <button key={`${d.persona}.${d.page}`} data-i={i}
                onMouseMove={() => setActive(i)} onClick={() => choose(d)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${i === active ? "bg-navy-900 text-white" : "hover:bg-slate-100 text-navy-900"}`}>
                <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${i === active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}><IconC size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-sm truncate">{d.label}</span>
                  <span className={`block text-[11px] truncate ${i === active ? "text-white/65" : "text-slate-500"}`}>{d.personaLabel}{d.account ? " · Account" : ""}{d.future ? " · Future" : ""}</span>
                </span>
                <Icon.arrowR size={15} className={i === active ? "text-white/70" : "text-slate-300"} />
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-slate-200/70 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><kbd className="bg-slate-100 ring-1 ring-slate-200 rounded px-1">↑↓</kbd> navigate</span>
          <span className="inline-flex items-center gap-1"><kbd className="bg-slate-100 ring-1 ring-slate-200 rounded px-1">↵</kbd> open</span>
          <span className="ml-auto inline-flex items-center gap-1"><kbd className="bg-slate-100 ring-1 ring-slate-200 rounded px-1">⌘K</kbd> anytime</span>
        </div>
      </div>
    </div>
  ), document.body);
}
