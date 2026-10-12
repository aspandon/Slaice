import { Suspense, useEffect, useMemo, useState } from "react";
import { lazyWithReload } from "../../lib/staleChunk";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, Spinner, Table, Toggle } from "../../components/ui";
import { SunbedMap } from "../../components/SunbedMap";
import { useApp } from "../../app/store";
import { ZONES, zoneLayout } from "../../data/beach";
import { CATEGORY_COLORS, LANDMARK_LABEL } from "../../data/pricing";
import { resolvePrice } from "../../domain/pricing";
import { fileToBackgroundSrc } from "../../lib/image";
import type { BeachPricing, Landmark, LandmarkKind, PriceCategory, PriceRuleDays, SunbedKind, SunbedSlot, SunbedState } from "../../domain/types";

const BeachCanvas = lazyWithReload(() => import("../../components/BeachCanvas").then((m) => ({ default: m.BeachCanvas })));

/* ============ Beach workspace (AENR-469) ============
   One canvas to arrange and price every store. All edits land in a draft
   (layouts + categories + date overrides + landmarks) with undo/redo; the
   price view follows a chosen date; "Preview as customer" shows the draft as
   guests will see it; Publish makes it live for the wizard, the Cashier and
   the display in one step. */

interface Draft {
  layouts: Record<string, SunbedSlot[]>;
  pricing: BeachPricing;
}
type Mode = "select" | "paint" | "landmark";
const STATES: { v: SunbedState; l: string }[] = [{ v: "a", l: "Available" }, { v: "h", l: "On hold" }, { v: "u", l: "Blocked" }];
const KINDS: { v: SunbedKind; l: string }[] = [{ v: "standard", l: "Standard" }, { v: "front", l: "Front row" }, { v: "cabana", l: "Cabana" }, { v: "daybed", l: "Daybed" }, { v: "vip", l: "VIP" }];
const DAYS: { v: PriceRuleDays; l: string }[] = [{ v: "all", l: "Every day" }, { v: "weekday", l: "Weekdays" }, { v: "weekend", l: "Weekends" }];
const LM_KINDS = Object.keys(LANDMARK_LABEL) as LandmarkKind[];
const MIXED = "__mixed";
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${++seq}`;
const same = <T,>(vals: T[]): T | typeof MIXED | undefined => (vals.length === 0 ? undefined : vals.every((v) => v === vals[0]) ? vals[0] : MIXED);
/** Group values that sit within 2% of each other (rows by y, columns by x). */
function bands(vals: number[]): number[] {
  const out: number[] = [];
  [...vals].sort((a, b) => a - b).forEach((v) => { if (!out.length || v - out[out.length - 1] > 2) out.push(v); });
  return out;
}
const rowLetter = (i: number) => String.fromCharCode(65 + (i % 26));

export function SunbedWorkspace() {
  const { toast, beachLayout, setZoneLayout, beachPricing, setBeachPricing, priceRules, zoneLogos, setZoneLogo } = useApp();
  const published = (): Draft => ({ layouts: Object.fromEntries(ZONES.map((z) => [z.id, beachLayout[z.id] ?? zoneLayout(z)])), pricing: beachPricing });
  const [draft, setDraft] = useState<Draft>(published);
  const [past, setPast] = useState<Draft[]>([]);
  const [future, setFuture] = useState<Draft[]>([]);
  const [zoneId, setZoneId] = useState(ZONES[1].id);
  const [date, setDate] = useState("2026-08-05");
  const [mode, setMode] = useState<Mode>("select");
  const [paintCat, setPaintCat] = useState<string>("");
  const [lmKind, setLmKind] = useState<LandmarkKind>("bar");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lmSel, setLmSel] = useState<string | null>(null);
  const [view, setView] = useState<"canvas" | "list" | "preview">("canvas");
  const [snapOn, setSnapOn] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const slots = draft.layouts[zoneId] ?? [];
  const cats = draft.pricing.categories.filter((c) => c.zoneId === zoneId);
  const overrides = draft.pricing.overrides.filter((o) => o.zoneId === zoneId);
  const landmarks = draft.pricing.landmarks.filter((l) => l.zoneId === zoneId);
  const selList = slots.filter((s) => sel.has(s.id));
  const priceOf = (s: SunbedSlot) => resolvePrice(s, zoneId, date, draft.pricing, priceRules);

  /* ---- Draft + history ---- */
  const commit = (fn: (d: Draft) => Draft) => {
    setPast((p) => [...p.slice(-49), draft]);
    setFuture([]);
    setDraft(fn(draft));
  };
  const undo = () => { if (!past.length) return; setFuture((f) => [draft, ...f]); setDraft(past[past.length - 1]); setPast((p) => p.slice(0, -1)); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, draft]); setDraft(future[0]); setFuture((f) => f.slice(1)); };
  const setSlots = (fn: (ss: SunbedSlot[]) => SunbedSlot[], z = zoneId) => commit((d) => ({ ...d, layouts: { ...d.layouts, [z]: fn(d.layouts[z] ?? []) } }));
  const setPricing = (fn: (p: BeachPricing) => BeachPricing) => commit((d) => ({ ...d, pricing: fn(d.pricing) }));
  const patchSel = (p: Partial<SunbedSlot>) => setSlots((ss) => ss.map((s) => (sel.has(s.id) ? { ...s, ...p } : s)));

  // Unsaved changes: count zones / pricing objects that differ from what's live.
  const live = useMemo(published, [beachLayout, beachPricing]);
  const changes = ZONES.filter((z) => JSON.stringify(draft.layouts[z.id]) !== JSON.stringify(live.layouts[z.id])).length
    + (["categories", "overrides", "landmarks"] as const).filter((k) => JSON.stringify(draft.pricing[k]) !== JSON.stringify(live.pricing[k])).length;
  useEffect(() => {
    if (!changes) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [changes]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const publish = () => {
    setPublishing(true);
    window.setTimeout(() => {
      ZONES.forEach((z) => { if (JSON.stringify(draft.layouts[z.id]) !== JSON.stringify(live.layouts[z.id])) setZoneLayout(z.id, draft.layouts[z.id]); });
      setBeachPricing(draft.pricing);
      setPast([]);
      setFuture([]);
      setPublishing(false);
      toast("Published — the booking wizard, Cashier and display now use this beach.", { tone: "success" });
    }, 900);
  };
  const discard = () => { setDraft(live); setPast([]); setFuture([]); setSel(new Set()); toast("Draft discarded."); };

  /* ---- Selection tools ---- */
  const rows = bands(slots.map((s) => s.y));
  const cols = bands(slots.map((s) => s.x));
  const rowOf = (s: SunbedSlot) => rows.findIndex((r) => Math.abs(r - s.y) <= 2);
  const colOf = (s: SunbedSlot) => cols.findIndex((c) => Math.abs(c - s.x) <= 2);
  const selectBy = (v: string) => {
    if (!v) return;
    const [k, arg] = v.split(":");
    const pick = (f: (s: SunbedSlot) => boolean) => setSel(new Set(slots.filter(f).map((s) => s.id)));
    if (k === "row") pick((s) => rowOf(s) === Number(arg));
    if (k === "col") pick((s) => colOf(s) === Number(arg));
    if (k === "cat") pick((s) => (s.cat ?? "") === arg);
    if (k === "kind") pick((s) => (s.kind ?? "standard") === arg);
    if (k === "state") pick((s) => s.state === arg);
    if (k === "access") pick((s) => !!s.access);
    if (k === "all") pick(() => true);
    if (k === "invert") setSel((cur) => new Set(slots.filter((s) => !cur.has(s.id)).map((s) => s.id)));
  };
  const toggle = (id: string, additive: boolean) => setSel((s) => { if (!additive) return new Set([id]); const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const catsInSel = new Set(selList.map((s) => s.cat ?? ""));

  /* ---- Categories ---- */
  const addCat = () => {
    const used = new Set(cats.map((c) => c.color));
    const c: PriceCategory = { id: uid(`${zoneId}-cat`), zoneId, name: "New category", code: `C${cats.length + 1}`, color: CATEGORY_COLORS.find((x) => !used.has(x)) ?? CATEGORY_COLORS[0], price: zone.from };
    setPricing((p) => ({ ...p, categories: [...p.categories, c] }));
  };
  const patchCat = (id: string, patch: Partial<PriceCategory>) => setPricing((p) => ({ ...p, categories: p.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const removeCat = (id: string) => commit((d) => ({ layouts: { ...d.layouts, [zoneId]: (d.layouts[zoneId] ?? []).map((s) => (s.cat === id ? { ...s, cat: undefined } : s)) }, pricing: { ...d.pricing, categories: d.pricing.categories.filter((c) => c.id !== id) } }));
  const paint = (id: string) => { if (paintCat) setSlots((ss) => ss.map((s) => (s.id === id && s.cat !== paintCat ? { ...s, cat: paintCat } : s))); };

  /* ---- Date overrides ---- */
  const [ov, setOv] = useState({ from: "2026-08-01", to: "2026-08-15", days: "all" as PriceRuleDays, price: "", label: "" });
  const ovErr = !ov.price ? "" : Number(ov.price) <= 0 ? "Price must be above €0." : ov.to < ov.from ? "End date must be on or after the start." : "";
  const clashes = overrides.filter((o) => o.setIds.some((id) => sel.has(id)) && !(o.to < ov.from || o.from > ov.to));
  const applyOverride = () => {
    const o = { id: uid("ov"), zoneId, setIds: [...sel], from: ov.from, to: ov.to, days: ov.days, price: Number(ov.price), label: ov.label.trim() || `€${ov.price} · ${ov.from} → ${ov.to}` };
    setPricing((p) => ({ ...p, overrides: [...p.overrides, o] }));
    toast(`€${o.price} for ${o.setIds.length} set${o.setIds.length === 1 ? "" : "s"} · ${o.from} → ${o.to}${clashes.length ? ` — overlaps ${clashes.length} earlier override${clashes.length === 1 ? "" : "s"}; the newest wins` : ""}.`, { tone: clashes.length ? "warn" : "success" });
    setOv((x) => ({ ...x, price: "", label: "" }));
  };

  /* ---- Layout tools ---- */
  const nextNum = (list: SunbedSlot[]) => Math.max(0, ...list.map((s) => parseInt(s.id.split("-").pop() || "0", 10)).filter((n) => !Number.isNaN(n))) + 1;
  const addBed = () => { const id = `${zone.prefix}-${String(nextNum(slots)).padStart(2, "0")}`; setSlots((ss) => [...ss, { id, x: 50, y: 50, state: "a", price: zone.from, cat: cats[1]?.id }]); setSel(new Set([id])); };
  const duplicate = () => {
    let n = nextNum(slots);
    const clones = selList.map((s) => ({ ...s, id: `${zone.prefix}-${String(n++).padStart(2, "0")}`, x: Math.min(96, s.x + 5), y: Math.min(96, s.y + 5) }));
    setSlots((ss) => [...ss, ...clones]);
    setSel(new Set(clones.map((c) => c.id)));
  };
  const removeSel = () => { setSlots((ss) => ss.filter((s) => !sel.has(s.id))); setSel(new Set()); };
  const [grid, setGrid] = useState({ count: 48, cols: 8, pattern: "prefix" as "prefix" | "row" });
  const generate = () => {
    const c = Math.max(1, Math.min(16, grid.cols));
    const count = Math.max(1, Math.min(120, grid.count));
    const rowsN = Math.ceil(count / c);
    const next = zoneLayout(zone, c, rowsN).slice(0, count).map((s, i) => (grid.pattern === "row" ? { ...s, id: `${zone.prefix}-${rowLetter(Math.floor(i / c))}${(i % c) + 1}` } : s));
    setSlots(() => next);
    setSel(new Set());
    toast(`Generated ${count} sets · ${c} per row (${grid.pattern === "row" ? "A1, A2… numbering" : `${zone.prefix}-01… numbering`}).`, { tone: "success" });
  };
  const [copyTo, setCopyTo] = useState("");
  const copyLayout = () => {
    const target = ZONES.find((z) => z.id === copyTo);
    if (!target) return;
    commit((d) => {
      const map = new Map<string, string>();
      const newCats = d.pricing.categories.filter((c) => c.zoneId === zoneId).map((c) => { const id = c.id.replace(zoneId, target.id); map.set(c.id, id); return { ...c, id, zoneId: target.id }; });
      const layout = (d.layouts[zoneId] ?? []).map((s) => ({ ...s, id: s.id.replace(zone.prefix, target.prefix), cat: s.cat ? map.get(s.cat) : undefined }));
      return { layouts: { ...d.layouts, [target.id]: layout }, pricing: { ...d.pricing, categories: [...d.pricing.categories.filter((c) => c.zoneId !== target.id), ...newCats] } };
    });
    toast(`Copied ${zone.name}'s layout, numbering and categories to ${target.name} (draft).`, { tone: "success" });
    setCopyTo("");
  };

  /* ---- Landmarks ---- */
  const dropLandmark = (x: number, y: number) => {
    if (mode !== "landmark") { setSel(new Set()); setLmSel(null); return; }
    const l: Landmark = { id: uid("lm"), zoneId, kind: lmKind, x, y };
    setPricing((p) => ({ ...p, landmarks: [...p.landmarks, l] }));
    setLmSel(l.id);
  };
  const patchLm = (id: string, patch: Partial<Landmark>) => setPricing((p) => ({ ...p, landmarks: p.landmarks.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const lm = landmarks.find((l) => l.id === lmSel);

  /* ---- Logo ---- */
  const [logoBusy, setLogoBusy] = useState(false);
  const onLogo = async (file?: File) => {
    if (!file) return;
    setLogoBusy(true);
    try { setZoneLogo(zoneId, await fileToBackgroundSrc(file, { maxW: 256, maxH: 256, quality: 0.9 })); toast(`Logo set for ${zone.name}.`, { tone: "success" }); }
    catch (e) { toast(e instanceof Error ? e.message : "That image could not be used.", { tone: "error" }); }
    finally { setLogoBusy(false); }
  };

  const mixedCat = same(selList.map((s) => s.cat ?? ""));
  const mixedKind = same(selList.map((s) => s.kind ?? "standard"));
  const mixedState = same(selList.map((s) => s.state));
  const mixedAccess = same(selList.map((s) => !!s.access));
  const catCount = (id: string) => slots.filter((s) => s.cat === id).length;

  return (
    <div className="space-y-4">
      {changes > 0 && (
        <div role="status" className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-2xl bg-navy-900 text-white px-4 py-2.5 shadow-float">
          <Icon.edit size={15} />
          <span className="text-sm"><b>Draft</b> — {changes} unsaved change{changes === 1 ? "" : "s"}, not visible to customers yet.</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={discard} disabled={publishing} className="rounded-[14px] px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">Discard</button>
            <Btn size="sm" variant="teal" icon={Icon.check} loading={publishing} onClick={publish}>Publish</Btn>
          </div>
        </div>
      )}
      <div className="lg:hidden flex items-start gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
        <Icon.info size={14} className="shrink-0 mt-0.5 text-slaice-600" /> Best on a larger screen. On phones, use the List view to select and edit sets.
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <Card className="p-4 min-w-0">
          {/* Store + date + mode */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3" role="radiogroup" aria-label="Store">
            {ZONES.map((z) => (
              <button key={z.id} type="button" role="radio" aria-checked={zoneId === z.id} onClick={() => { setZoneId(z.id); setSel(new Set()); setLmSel(null); setPaintCat(""); }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold ring-1 transition ${zoneId === z.id ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-700 hover:ring-teal-400"}`}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} /> {z.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <label className="text-[12px] font-semibold text-slate-700">Prices on
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="block mt-1 rounded-lg ring-1 ring-slate-200 px-2 py-1.5 text-[13px]" />
            </label>
            <div role="radiogroup" aria-label="Tool" className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden">
              {([["select", "Select & move"], ["paint", "Paint category"], ["landmark", "Add landmark"]] as [Mode, string][]).map(([m, l]) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); if (m === "paint" && !paintCat) setPaintCat(cats[0]?.id ?? ""); }}
                  className={`px-3 py-1.5 text-[12.5px] font-semibold ${mode === m ? "bg-navy-900 text-white" : "bg-white text-navy-900 hover:bg-slate-50"}`}>{l}</button>
              ))}
            </div>
            <div role="radiogroup" aria-label="View" className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden">
              {([["canvas", "Canvas"], ["list", "List"], ["preview", "Preview as customer"]] as ["canvas" | "list" | "preview", string][]).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-[12.5px] font-semibold ${view === v ? "bg-navy-900 text-white" : "bg-white text-navy-900 hover:bg-slate-50"}`}>{l}</button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              <Btn size="sm" variant="ghost" icon={Icon.arrowL} disabled={!past.length} onClick={undo}>Undo</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.arrowR} disabled={!future.length} onClick={redo}>Redo</Btn>
            </div>
          </div>

          {mode === "paint" && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="font-semibold text-slate-700">Paint with</span>
              {cats.map((c) => (
                <button key={c.id} type="button" aria-pressed={paintCat === c.id} onClick={() => setPaintCat(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ring-1 font-semibold ${paintCat === c.id ? "ring-2 ring-navy-900 bg-white" : "ring-slate-200 bg-white/70"}`}>
                  <i className="w-3 h-3 rounded-sm" style={{ background: c.color }} />{c.code} · {c.name}
                </button>
              ))}
              <span className="text-slate-500">Press and sweep over sets.</span>
            </div>
          )}
          {mode === "landmark" && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="font-semibold text-slate-700">Click the sand to add</span>
              {LM_KINDS.map((k) => (
                <button key={k} type="button" aria-pressed={lmKind === k} onClick={() => setLmKind(k)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ring-1 font-semibold ${lmKind === k ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 bg-white/70"}`}>
                  <span aria-hidden>{LANDMARK_LABEL[k].icon}</span>{LANDMARK_LABEL[k].label}
                </button>
              ))}
            </div>
          )}

          {/* Selection toolbar */}
          {view !== "preview" && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
              <div className="w-48">
                <Select aria-label="Select sets by" value="" onChange={(e) => selectBy(e.target.value)} options={[
                  { v: "", l: "Select…" }, { v: "all:", l: "All sets" }, { v: "invert:", l: "Invert selection" },
                  ...rows.map((_, i) => ({ v: `row:${i}`, l: `Row ${rowLetter(i)}${i === 0 ? " (front)" : ""}` })),
                  ...cols.map((_, i) => ({ v: `col:${i}`, l: `Column ${i + 1}` })),
                  ...cats.map((c) => ({ v: `cat:${c.id}`, l: `Category ${c.code} · ${c.name}` })),
                  ...KINDS.map((k) => ({ v: `kind:${k.v}`, l: `Type: ${k.l}` })),
                  ...STATES.map((s) => ({ v: `state:${s.v}`, l: `State: ${s.l}` })),
                  { v: "access:", l: "Step-free (accessible)" },
                ]} />
              </div>
              <Btn size="sm" variant="ghost" disabled={!sel.size} onClick={() => setSel(new Set())}>Clear</Btn>
              <span className="text-slate-600" aria-live="polite">{sel.size ? <><b className="text-navy-900">{sel.size}</b> set{sel.size === 1 ? "" : "s"} selected · {catsInSel.size} categor{catsInSel.size === 1 ? "y" : "ies"}</> : "Nothing selected — drag on the sand to box-select, ⇧/⌘-click to add"}</span>
              {view === "canvas" && <span className="ml-auto"><Toggle on={snapOn} onChange={setSnapOn} label="Snap" /></span>}
            </div>
          )}

          {view === "canvas" && (
            <Suspense fallback={<div className="w-full rounded-2xl bg-gradient-to-b from-sky-100 to-amber-100/60 animate-pulse" style={{ height: 420 }} />}>
              <BeachCanvas slots={slots} editable selectedIds={sel} onSelect={(id, add) => { setLmSel(null); toggle(id, add); }} onMove={(id, x, y) => setSlots((ss) => ss.map((s) => (s.id === id ? { ...s, x, y } : s)))}
                snap={snapOn ? 5 : 0} maxHeight={560} paint={mode === "paint"} onPaint={paint}
                onBoxSelect={(ids, add) => setSel((cur) => new Set(add ? [...cur, ...ids] : ids))}
                catOf={(s) => { const c = cats.find((x) => x.id === s.cat); return c ? { color: c.color, code: c.code } : undefined; }}
                priceOf={(s) => priceOf(s).price}
                landmarks={landmarks} selectedLandmark={lmSel} onLandmarkSelect={(id) => { setLmSel(id); setSel(new Set()); }}
                onLandmarkMove={(id, x, y) => patchLm(id, { x, y })} onCanvasClick={dropLandmark} />
            </Suspense>
          )}
          {view === "list" && (
            <div className="max-h-[560px] overflow-auto rounded-xl ring-1 ring-slate-200">
              <Table dense cols={[<label key="all" className="inline-flex items-center gap-1.5"><input type="checkbox" className="w-4 h-4 accent-teal-600" checked={sel.size === slots.length && slots.length > 0} onChange={(e) => setSel(new Set(e.target.checked ? slots.map((s) => s.id) : []))} aria-label="Select all sets" /> Set</label>, "Row", "Category", "Type", "State", "Step-free", `Price ${date}`]} right={[6]}
                rows={slots.map((s) => {
                  const c = cats.find((x) => x.id === s.cat);
                  return [
                    <label className="inline-flex items-center gap-1.5 font-mono text-[12px]"><input type="checkbox" className="w-4 h-4 accent-teal-600" checked={sel.has(s.id)} onChange={() => toggle(s.id, true)} aria-label={`Select ${s.id}`} />{s.id}</label>,
                    rowLetter(Math.max(0, rowOf(s))),
                    c ? <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />{c.code} · {c.name}</span> : "—",
                    KINDS.find((k) => k.v === (s.kind ?? "standard"))?.l, STATES.find((x) => x.v === s.state)?.l, s.access ? "Yes" : "—",
                    <span className="tnum font-semibold">€{priceOf(s).price}</span>,
                  ];
                })} />
            </div>
          )}
          {view === "preview" && (
            <div>
              <div className="mb-2 text-[12.5px] text-slate-600 flex items-center gap-2"><Badge tone="amber">Draft preview</Badge> What guests will see for {zone.name} on {date} after you publish.</div>
              <SunbedMap label={`${zone.name} preview`} slots={slots} landmarks={landmarks} readOnly priceOf={(s) => priceOf(s).price} />
            </div>
          )}

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-slate-600">
            {cats.map((c) => <span key={c.id} className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm" style={{ background: c.color }} /><b className="text-navy-900">{c.code}</b> {c.name} · €{c.price} · {catCount(c.id)} sets</span>)}
            <span className="inline-flex items-center gap-1.5">♿ step-free</span>
            <span className="ml-auto">Price on each set = for {date}</span>
          </div>
        </Card>

        {/* Inspector */}
        <div className="space-y-4">
          {lm ? (
            <Card className="p-4 space-y-3">
              <div className="font-semibold text-navy-900">Landmark</div>
              <Field label="Type"><Select value={lm.kind} onChange={(e) => patchLm(lm.id, { kind: e.target.value as LandmarkKind })} options={LM_KINDS.map((k) => ({ v: k, l: LANDMARK_LABEL[k].label }))} /></Field>
              <Field label="Label (optional)"><Input value={lm.label ?? ""} onChange={(e) => patchLm(lm.id, { label: e.target.value })} placeholder={LANDMARK_LABEL[lm.kind].label} /></Field>
              <Btn variant="ghost" size="sm" icon={Icon.trash} className="text-rose-600" onClick={() => { setPricing((p) => ({ ...p, landmarks: p.landmarks.filter((x) => x.id !== lm.id) })); setLmSel(null); }}>Remove landmark</Btn>
            </Card>
          ) : selList.length > 0 ? (
            <Card className="p-4 space-y-3">
              <div className="font-semibold text-navy-900">{selList.length === 1 ? `Set ${selList[0].id}` : `${selList.length} sets`}</div>
              <Field label="Price category">
                <Select value={mixedCat === MIXED ? MIXED : mixedCat ?? ""} onChange={(e) => e.target.value !== MIXED && patchSel({ cat: e.target.value || undefined })}
                  options={[...(mixedCat === MIXED ? [{ v: MIXED, l: "— mixed —" }] : []), { v: "", l: "None (set default price)" }, ...cats.map((c) => ({ v: c.id, l: `${c.code} · ${c.name} · €${c.price}` }))]} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type"><Select value={mixedKind === MIXED ? MIXED : mixedKind ?? "standard"} onChange={(e) => e.target.value !== MIXED && patchSel({ kind: e.target.value as SunbedKind })} options={[...(mixedKind === MIXED ? [{ v: MIXED, l: "— mixed —" }] : []), ...KINDS.map((k) => ({ v: k.v, l: k.l }))]} /></Field>
                <Field label="State"><Select value={mixedState === MIXED ? MIXED : mixedState ?? "a"} onChange={(e) => e.target.value !== MIXED && patchSel({ state: e.target.value as SunbedState })} options={[...(mixedState === MIXED ? [{ v: MIXED, l: "— mixed —" }] : []), ...STATES.map((s) => ({ v: s.v, l: s.l }))]} /></Field>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Toggle on={mixedAccess === true} onChange={(v) => patchSel({ access: v })} label={mixedAccess === MIXED ? "Step-free (mixed)" : "Step-free / accessible"} />
                <label className="text-[12px] text-slate-600 inline-flex items-center gap-1.5">Persons
                  <input type="number" min={1} max={12} value={same(selList.map((s) => s.cap ?? 2)) === MIXED ? "" : selList[0].cap ?? 2} placeholder="mixed" onChange={(e) => patchSel({ cap: Math.max(1, Number(e.target.value) || 2) })} className="w-14 rounded-md ring-1 ring-slate-200 px-1.5 py-1 text-[12.5px]" />
                </label>
              </div>
              {selList.length === 1 && (
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12px] text-slate-600">
                  <div className="font-semibold text-navy-900 mb-0.5">€{priceOf(selList[0]).price} on {date}</div>
                  <ul className="space-y-0.5">{priceOf(selList[0]).steps.map((st, i) => <li key={i}>{i ? "→ " : ""}{st}</li>)}</ul>
                </div>
              )}
              <form className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (ov.price && !ovErr) applyOverride(); }}>
                <div className="text-[12.5px] font-semibold text-navy-900">Price for dates</div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From"><Input type="date" value={ov.from} onChange={(e) => setOv((x) => ({ ...x, from: e.target.value }))} /></Field>
                  <Field label="To"><Input type="date" value={ov.to} onChange={(e) => setOv((x) => ({ ...x, to: e.target.value }))} /></Field>
                  <Field label="Days"><Select value={ov.days} onChange={(e) => setOv((x) => ({ ...x, days: e.target.value as PriceRuleDays }))} options={DAYS.map((d) => ({ v: d.v, l: d.l }))} /></Field>
                  <Field label="€ / day"><Input type="number" min={1} value={ov.price} onChange={(e) => setOv((x) => ({ ...x, price: e.target.value }))} /></Field>
                </div>
                <Field label="Label (optional)"><Input value={ov.label} onChange={(e) => setOv((x) => ({ ...x, label: e.target.value }))} placeholder="e.g. August peak" /></Field>
                {ovErr && <div role="alert" className="text-[12px] text-rose-700">{ovErr}</div>}
                {ov.price && !ovErr && <div className="text-[12px] text-slate-600">Before → after on {ov.from}: {selList.slice(0, 3).map((s) => `${s.id} €${resolvePrice(s, zoneId, ov.from, draft.pricing, priceRules).price} → €${ov.price}`).join(" · ")}{selList.length > 3 ? " …" : ""}</div>}
                {clashes.length > 0 && <div className="text-[12px] text-amber-700">Overlaps {clashes.length} existing override{clashes.length === 1 ? "" : "s"} — the newest wins.</div>}
                <Btn type="submit" size="sm" variant="primary" disabled={!ov.price || !!ovErr}>Apply to {selList.length} set{selList.length === 1 ? "" : "s"}</Btn>
              </form>
              <div className="flex gap-2">
                <Btn size="sm" variant="ghost" icon={Icon.layers} onClick={duplicate}>Duplicate</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.trash} className="text-rose-600" onClick={removeSel}>Remove</Btn>
              </div>
            </Card>
          ) : (
            <Card className="p-4 text-[12.5px] text-slate-600">Select sets on the canvas or in the list to edit category, type, state, accessibility or date prices. Use “Paint category” to assign categories by sweeping.</Card>
          )}

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2"><div className="font-semibold text-navy-900">Price categories · {zone.name}</div><Btn size="sm" variant="ghost" icon={Icon.plus} onClick={addCat}>Add</Btn></div>
            <ul className="space-y-2">
              {cats.map((c) => (
                <li key={c.id} className="rounded-xl ring-1 ring-slate-200 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">{CATEGORY_COLORS.map((col) => <button key={col} type="button" aria-label={`Colour ${col}`} aria-pressed={c.color === col} onClick={() => patchCat(c.id, { color: col })} className={`w-4 h-4 rounded ${c.color === col ? "ring-2 ring-offset-1 ring-navy-900" : ""}`} style={{ background: col }} />)}</div>
                    <span className="ml-auto text-[11.5px] text-slate-500">{catCount(c.id)} sets</span>
                    <button type="button" aria-label={`Remove ${c.name}`} onClick={() => removeCat(c.id)} className="text-slate-400 hover:text-rose-600"><Icon.trash size={13} /></button>
                  </div>
                  <div className="grid grid-cols-[1fr_56px_70px] gap-1.5">
                    <Input aria-label="Category name" value={c.name} onChange={(e) => patchCat(c.id, { name: e.target.value })} />
                    <Input aria-label="Code" value={c.code} maxLength={3} onChange={(e) => patchCat(c.id, { code: e.target.value.toUpperCase() })} />
                    <Input aria-label="€ per day" type="number" min={0} value={c.price} onChange={(e) => patchCat(c.id, { price: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[11.5px] text-slate-500">Precedence: date override › seasonal rule › category › set default.</div>
          </Card>

          <Card className="p-4">
            <div className="font-semibold text-navy-900 mb-2">Date overrides · {zone.name}</div>
            {overrides.length === 0 ? <div className="text-[12.5px] text-slate-500">None — select sets and use “Price for dates”.</div> : (
              <ul className="space-y-1.5 text-[12.5px]">
                {overrides.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5">
                    <div className="min-w-0 flex-1"><b className="text-navy-900">€{o.price}</b> · {o.label}<div className="text-[11.5px] text-slate-500">{o.setIds.length} sets · {o.from} → {o.to} · {DAYS.find((d) => d.v === o.days)?.l}</div></div>
                    <button type="button" className="text-teal-700 font-semibold" onClick={() => setSel(new Set(o.setIds))}>Select</button>
                    <button type="button" aria-label={`Remove override ${o.label}`} className="text-slate-400 hover:text-rose-600" onClick={() => setPricing((p) => ({ ...p, overrides: p.overrides.filter((x) => x.id !== o.id) }))}><Icon.trash size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="font-semibold text-navy-900">Layout tools</div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Sets"><Input type="number" min={1} max={120} value={grid.count} onChange={(e) => setGrid((g) => ({ ...g, count: Number(e.target.value) || 1 }))} /></Field>
              <Field label="Per row"><Input type="number" min={1} max={16} value={grid.cols} onChange={(e) => setGrid((g) => ({ ...g, cols: Number(e.target.value) || 1 }))} /></Field>
              <Field label="Numbering"><Select value={grid.pattern} onChange={(e) => setGrid((g) => ({ ...g, pattern: e.target.value as "prefix" | "row" }))} options={[{ v: "prefix", l: `${zone.prefix}-01` }, { v: "row", l: "A1, A2…" }]} /></Field>
            </div>
            <div className="flex gap-2"><Btn size="sm" variant="tint" icon={Icon.grid} onClick={generate}>Generate grid</Btn><Btn size="sm" variant="ghost" icon={Icon.plus} onClick={addBed}>Add a set</Btn></div>
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Field label="Copy this layout to"><Select value={copyTo} onChange={(e) => setCopyTo(e.target.value)} options={[{ v: "", l: "Choose a store…" }, ...ZONES.filter((z) => z.id !== zoneId).map((z) => ({ v: z.id, l: z.name }))]} /></Field></div>
              <Btn size="sm" variant="outline" disabled={!copyTo} onClick={copyLayout}>Copy</Btn>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl ring-1 ring-slate-200 bg-slate-50 p-2.5">
              <span className="w-10 h-10 rounded-lg bg-white ring-1 ring-slate-200 grid place-items-center overflow-hidden shrink-0">
                {zoneLogos[zoneId] ? <img src={zoneLogos[zoneId]} alt={`${zone.name} logo`} className="w-full h-full object-contain" /> : <Icon.image size={16} className="text-slate-300" />}
              </span>
              <div className="min-w-0 flex-1 text-[12px]"><b className="text-navy-900">Store logo</b><div className="text-slate-500">Shown under the store name on the beach.</div></div>
              <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ring-slate-200 bg-white hover:ring-teal-400">
                <input type="file" accept="image/*" aria-label={`Upload a logo for ${zone.name}`} className="sr-only" disabled={logoBusy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onLogo(f); }} />
                {logoBusy ? <Spinner size={12} /> : <Icon.upload size={12} />} {zoneLogos[zoneId] ? "Replace" : "Upload"}
              </label>
              {zoneLogos[zoneId] && <button type="button" className="text-[11px] text-slate-500 hover:text-rose-600" onClick={() => setZoneLogo(zoneId, null)}>Remove</button>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
