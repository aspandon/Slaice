import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { lazyWithReload } from "../lib/staleChunk";
import { SortHeader, Pager, dateVal, cmpVal, type SortState } from "../components/TableTools";
import { Icon, type IconRenderer } from "../lib/icons";
import { Card, Btn, Badge, PageHead, Table, StatCard, Modal, Field, Input, Select, Tabs, Toggle, StatusBadge, TableSkeleton, EmptyState, ErrorState, useMockLoad, FutureBanner, ContextPanel, Spinner } from "../components/ui";
import type { TabEntry } from "../components/ui";
import { BarChart, HBarChart, LineChartMini, Donut, QR, Sparkline } from "../components/charts";
import { BeachBackdrop, SunbedMark } from "../components/Beach";

// Lazy so konva only loads when the Sunbed-layout tab is opened. lazyWithReload
// recovers if a redeploy has renamed this chunk under an already-open tab.
const BeachCanvas = lazyWithReload(() => import("../components/BeachCanvas").then((m) => ({ default: m.BeachCanvas })));
import { BackgroundPicker } from "../components/BackgroundPicker";
import { fileToBackgroundSrc } from "../lib/image";
import { ZONES, zoneLayout } from "../data/beach";
import { LOYALTY_REWARDS, BUILTIN_SCHEMES, makeCustomScheme, schemeDefaults } from "../data/loyalty";
import type { LoyaltyScheme, SchemeValues, SchemeField } from "../data/loyalty";
import type { SunbedSlot, SunbedState, SunbedKind, Customer } from "../domain/types";
import { ADMIN_BOOKINGS, ADMIN_REFUNDS, TOP_CUSTOMERS, REVENUE_TX, REPORTING_TICKETS, DAILY_OPS, personByFirst, CUSTOMERS, type AdminBooking } from "../data/mock";
import { DSAR_QUEUE, ROPA, RETENTION, CONSENT_PURPOSES } from "../data/gdpr";
import { useApp } from "../app/store";
import { downloadCSV } from "../lib/download";
import { listCustomers } from "../api";
import { useAsync } from "../lib/useAsync";

/* ============ DASHBOARD ============ */
export function AdminDashboard() {
  const { go } = useApp();
  const [period, setPeriod] = useState("week");
  const rev = ({
    day: [{ l: "8h", v: 400 }, { l: "10h", v: 900 }, { l: "12h", v: 1500, hi: 1 }, { l: "14h", v: 1300 }, { l: "16h", v: 1100 }, { l: "18h", v: 700 }],
    week: [{ l: "Mon", v: 3200 }, { l: "Tue", v: 2950 }, { l: "Wed", v: 3600 }, { l: "Thu", v: 4100 }, { l: "Fri", v: 5200, hi: 1 }, { l: "Sat", v: 7400, hi: 1 }, { l: "Sun", v: 6900, hi: 1 }],
    month: [{ l: "W1", v: 21000 }, { l: "W2", v: 24500 }, { l: "W3", v: 28800, hi: 1 }, { l: "W4", v: 26400 }],
    year: [{ l: "May", v: 48 }, { l: "Jun", v: 121 }, { l: "Jul", v: 198, hi: 1 }, { l: "Aug", v: 241, hi: 1 }, { l: "Sep", v: 96 }],
  } as Record<string, { l: string; v: number; hi?: number }[]>)[period];
  return (
    <div className="animate-fade-up">
      <PageHead title="Dashboard" sub="Akti tou Iliou · bookings & revenue overview" badge={<Badge tone="mvp">MVP</Badge>}
        actions={<Tabs tabs={[["day", "Day"], ["week", "Week"], ["month", "Month"], ["year", "Year"]]} value={period} onChange={setPeriod} />} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue (7d)" value="€33.4k" sub="vs prev week" tone="teal" trend="+12%" />
        <StatCard label="Bookings (7d)" value="1,284" sub="online + walk-in" trend="+8%" />
        <StatCard label="Occupancy" value="71%" sub="avg across zones" trend="+3pp" />
        <StatCard label="Avg basket" value="€41" sub="sunbed + entries" trend="+€2" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><div className="font-semibold text-navy-900">Revenue · this {period}</div><Badge tone="green"><Icon.trend size={11} /> +12%</Badge></div>
          <BarChart data={rev} />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-2">Revenue by capability</div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <Donut segments={[{ v: 62, c: "#0D9488" }, { v: 28, c: "#0ea5e9" }, { v: 10, c: "#f59e0b" }]} size={180} />
            <div className="text-sm space-y-2">
              <Leg c="bg-teal-600" t="Sunbeds 62%" /><Leg c="bg-sky-500" t="Tickets 28%" /><Leg c="bg-amber-500" t="Other 10%" />
            </div>
          </div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-1">Occupancy by zone (today)</div>
          <HBarChart color="#0ea5e9" unit="%" max={100} data={[{ l: "Akanthus", v: 67 }, { l: "Central", v: 83 }, { l: "Macaw", v: 91, hi: 1 }, { l: "Bestbuy", v: 78 }, { l: "Main", v: 68 }, { l: "Bolivar", v: 66 }]} />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2"><div className="font-semibold text-navy-900">Latest bookings</div><Btn size="sm" variant="ghost" onClick={() => go("admin", "bookings")}>View all</Btn></div>
          <Table cols={["Booking", "Zone", "Channel", "Amount"]} right={[3]} rows={[
            ["#BK-10428", "Central", <Badge tone="blue">Online</Badge>, "€30"],
            ["#BK-10427", "Macaw", <Badge tone="amber">Walk-in</Badge>, "€35"],
            ["#BK-10426", "Bestbuy", <Badge tone="blue">Online</Badge>, "€44"],
            ["#BK-10425", "Akanthus", <Badge tone="blue">Online</Badge>, "€30"],
          ]} />
        </Card>
      </div>
    </div>
  );
}
const Leg = ({ c, t }: { c: string; t: ReactNode }) => <div className="flex items-center gap-2"><i className={`w-3 h-3 rounded-sm ${c} inline-block`} />{t}</div>;

/* ============ AVAILABILITY & PRICING ============ */
export function AdminAvailability() {
  const { toast } = useApp();
  const [bulk, setBulk] = useState(false);
  const [rows, setRows] = useState(ZONES.map((z) => ({ ...z, open: z.avail / z.total > 0.3 })));
  return (
    <div className="animate-fade-up">
      <PageHead title="Availability & Pricing" sub="Single or bulk updates to availability and per-sunbed pricing." badge={<Badge tone="mvp">MVP</Badge>}
        actions={<><Btn variant="outline" icon={Icon.cog} onClick={() => setBulk(true)}>Bulk pricing</Btn><Btn variant="primary" icon={Icon.check} onClick={() => toast("Demo — availability published to the live map.")}>Publish</Btn></>} />
      <Card className="p-2">
        <Table cols={["Zone", "Sunbeds", "Available", "Base price", "Open", "Status"]} right={[1, 2]}
          rows={rows.map((z, i) => [
            <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full" style={{ background: z.color }} />{z.name}</span>,
            z.total, z.avail, `€${z.from}`,
            <Toggle on={z.open} onChange={(v) => setRows((r) => r.map((x, xi) => (xi === i ? { ...x, open: v } : x)))} />,
            <Badge tone={z.open ? "green" : "amber"}>{z.open ? "Open" : "Closed"}</Badge>,
          ])} />
      </Card>
      <Modal open={bulk} onClose={() => setBulk(false)} title="Bulk pricing" wide
        footer={<><Btn variant="ghost" onClick={() => setBulk(false)}>Cancel</Btn><Btn variant="primary" icon={Icon.check} onClick={() => { setBulk(false); toast("Demo — bulk price applied to the selection."); }}>Apply</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Apply to"><Select options={["All zones", ...ZONES.map((z) => z.name)]} /></Field>
          <Field label="Sunbed type"><Select options={["All", "Front row", "Standard", "Cabana"]} /></Field>
          <Field label="New price (€)"><Input type="number" defaultValue={25} /></Field>
          <Field label="Date range"><Select options={["Today", "This weekend", "Whole season"]} /></Field>
        </div>
        <div className="mt-3 text-[12px] text-slate-600">Bulk updates write to the inventory/availability store and feed booking + invoicing.</div>
      </Modal>
    </div>
  );
}

/* ============ MAP LAYOUT EDITOR ============ */
interface EditorZone { id: string; name: string; prefix: string; color: string; total: number; rows: number; cols: number; x: number; y: number; }
function ZoneArrangeEditor() {
  const { toast } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Each zone has a name, prefix, colour, rows, cols, and a position in % of the canvas.
  const [zones, setZones] = useState<EditorZone[]>(() => ZONES.map((z, i) => ({
    id: z.id, name: z.name, prefix: z.prefix, color: z.color, total: z.total,
    rows: 8, cols: Math.max(6, Math.round(z.total / 8)),
    x: 6 + (i % 3) * 32, y: 16 + Math.floor(i / 3) * 38,
  })));
  const [selectedId, setSelectedId] = useState(zones[0].id);
  const selected = zones.find((z) => z.id === selectedId) ?? zones[0];
  const update = (id: string, patch: Partial<EditorZone>) => setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  const remove = (id: string) => setZones((zs) => (zs.length > 1 ? zs.filter((z) => z.id !== id) : zs));
  const add = () => {
    const palette = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#6366f1", "#14b8a6"];
    const used = new Set(zones.map((z) => z.color));
    const color = palette.find((c) => !used.has(c)) || palette[0];
    const id = `z${Date.now().toString(36)}`;
    const z = { id, name: `Zone ${zones.length + 1}`, prefix: `Z${zones.length + 1}`, color, total: 60, rows: 6, cols: 10, x: 30, y: 40 };
    setZones((zs) => [...zs, z]); setSelectedId(id);
  };
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    setSelectedId(id);
    const canvas = canvasRef.current;
    const z = zones.find((x) => x.id === id);
    if (!canvas || !z) return;
    const r = canvas.getBoundingClientRect();
    dragRef.current = { id, dx: e.clientX - (r.left + (z.x / 100) * r.width), dy: e.clientY - (r.top + (z.y / 100) * r.height) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - d.dx - r.left) / r.width) * 100;
    const y = ((e.clientY - d.dy - r.top) / r.height) * 100;
    update(d.id, { x: Math.max(0, Math.min(85, x)), y: Math.max(0, Math.min(85, y)) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const save = () => toast(`Demo — layout saved (${zones.length} zones, ${zones.reduce((a, z) => a + z.total, 0)} beds) & published to the customer map.`);

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <Btn variant="outline" icon={Icon.image} onClick={() => setPickerOpen(true)}>Background</Btn>
        <Btn variant="primary" icon={Icon.check} onClick={save}>Save layout</Btn>
      </div>
      <div className="lg:hidden mb-3 flex items-start gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
        <Icon.info size={14} className="shrink-0 mt-0.5 text-slaice-600" /> The map editor is best on a larger screen — drag-to-position zones is easier with a mouse.
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-5">
          <div
            ref={canvasRef}
            className="relative rounded-2xl ring-1 ring-slate-100 overflow-hidden select-none"
            style={{ height: 560 }}
          >
            {/* Live preview of the tenant's chosen beach background (what
                customers see on the booking map). Edit it via "Background". */}
            <BeachBackdrop pos="absolute" className="inset-0 rounded-none" />
            {zones.map((z) => {
              const active = z.id === selectedId;
              return (
                <div
                  key={z.id}
                  onPointerDown={(e) => onPointerDown(e, z.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className={`absolute rounded-xl px-3 py-2 backdrop-blur cursor-grab active:cursor-grabbing shadow-md text-[12px] font-semibold transition ${active ? "ring-2 ring-offset-2 ring-offset-transparent" : "ring-1"}`}
                  style={{
                    left: `${z.x}%`, top: `${z.y}%`, minWidth: 110,
                    background: "rgba(255,255,255,0.92)", color: z.color,
                    boxShadow: active ? `0 0 0 2px ${z.color}` : "0 6px 18px -8px rgba(0,0,0,.35)",
                    borderColor: z.color,
                  }}
                >
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} />{z.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium tnum">{z.prefix} · {z.rows}×{z.cols} · {z.rows * z.cols} beds</div>
                </div>
              );
            })}
            <div className="absolute bottom-3 left-3 text-[11px] text-white bg-navy-900/65 backdrop-blur rounded-lg px-2.5 py-1">Drag zones to reposition · click to edit on the right</div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
            <span>{zones.length} zone{zones.length !== 1 ? "s" : ""} · {zones.reduce((a, z) => a + z.rows * z.cols, 0)} beds total</span>
            <button onClick={add}
              className="group inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-teal-400 text-teal-700 hover:bg-teal-50 hover:border-teal-600 active:bg-teal-100 px-3 py-1.5 text-[12px] font-semibold transition shadow-sm">
              <span className="w-5 h-5 rounded-md bg-teal-500 text-white grid place-items-center group-hover:bg-teal-600 transition"><Icon.plus size={13} /></span>
              Add zone
            </button>
          </div>
        </Card>

        <Card className="p-5 h-max">
          <div className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: selected.color }} /> Zone properties
          </div>
          <div className="space-y-3">
            <Field label="Zone name"><Input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} /></Field>
            <Field label="Code prefix"><Input value={selected.prefix} onChange={(e) => update(selected.id, { prefix: e.target.value.toUpperCase().slice(0, 4) })} className="uppercase tnum" /></Field>
            <Field label="Rows × Columns">
              <div className="flex gap-2">
                <Input type="number" min={1} max={30} value={selected.rows} onChange={(e) => update(selected.id, { rows: Math.max(1, +e.target.value || 1) })} />
                <Input type="number" min={1} max={30} value={selected.cols} onChange={(e) => update(selected.id, { cols: Math.max(1, +e.target.value || 1) })} />
              </div>
            </Field>
            <Field label="Colour">
              <div className="flex gap-1.5 flex-wrap">
                {["#6366f1", "#0ea5e9", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899"].map((c) => (
                  <button key={c} aria-label={c} onClick={() => update(selected.id, { color: c })}
                    className={`w-7 h-7 rounded-lg ring-2 shadow transition ${selected.color === c ? "ring-navy-900 scale-110" : "ring-white hover:scale-110"}`} style={{ background: c }} />
                ))}
              </div>
            </Field>
            <div className="text-[11px] text-slate-600">Position: <span className="tnum">{selected.x.toFixed(0)}%, {selected.y.toFixed(0)}%</span></div>
            <div className="flex gap-2">
              <Btn variant="ghost" full icon={Icon.plus} onClick={add}>Add</Btn>
              <Btn variant="ghost" full icon={Icon.trash} onClick={() => remove(selected.id)} className="text-rose-600 hover:bg-rose-50" disabled={zones.length <= 1}>Remove</Btn>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Zones</div>
            <div className="space-y-1">
              {zones.map((z) => (
                <button key={z.id} onClick={() => setSelectedId(z.id)} className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px] ${selectedId === z.id ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} /><span className="font-semibold text-navy-900">{z.name}</span></span>
                  <span className="text-slate-600 tnum">{z.rows * z.cols}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <BackgroundPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}

/* ---- Sunbed-level layout editor ----
   Drag/place individual umbrellas for a zone on the shared Konva canvas, set
   each one's availability/price, then publish. The saved SunbedSlot[] lands in
   the app store and the booking wizard renders that exact arrangement. */
function SunbedLayoutEditor() {
  const { toast, beachLayout, setZoneLayout, zoneLogos, setZoneLogo } = useApp();
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  // Working copy: the published layout if any, otherwise the default grid.
  const [slots, setSlots] = useState<SunbedSlot[]>(() => beachLayout[zoneId] ?? zoneLayout(zone));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [snapOn, setSnapOn] = useState(true);
  // Grid generator — total sets + columns per row (rows derive from the two).
  const [gridCount, setGridCount] = useState(() => (beachLayout[ZONES[0].id] ?? zoneLayout(ZONES[0])).length);
  const [gridCols, setGridCols] = useState(8);
  const [logoBusy, setLogoBusy] = useState(false);
  const logo = zoneLogos[zoneId];
  const onLogo = async (file?: File) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      // Small max dims — a logo only needs to read at ~thumbnail size and is
      // persisted to localStorage alongside the rest of the saved state.
      const src = await fileToBackgroundSrc(file, { maxW: 256, maxH: 256, quality: 0.9 });
      setZoneLogo(zoneId, src);
      toast(`Logo set for ${zone.name}.`, { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "That image could not be used.", { tone: "error" });
    } finally {
      setLogoBusy(false);
    }
  };

  const selList = slots.filter((s) => sel.has(s.id));
  const one = selList.length === 1 ? selList[0] : null;
  const first = selList[0];
  const curState = first && selList.every((s) => s.state === first.state) ? first.state : undefined;
  const curKind = first && selList.every((s) => (s.kind ?? "standard") === (first.kind ?? "standard")) ? (first.kind ?? "standard") : undefined;

  const switchZone = (id: string) => {
    const z = ZONES.find((x) => x.id === id) ?? ZONES[0];
    const next = beachLayout[id] ?? zoneLayout(z);
    setZoneId(id);
    setSlots(next);
    setGridCount(next.length);
    setSel(new Set());
  };
  // Lay out `count` sets in a grid `cols` wide (last row fills left-to-right).
  const generateGrid = () => {
    const cols = Math.max(1, Math.min(16, gridCols));
    const count = Math.max(1, Math.min(120, gridCount));
    const next = zoneLayout(zone, cols, Math.ceil(count / cols)).slice(0, count);
    setSlots(next);
    setSel(new Set());
    toast(`Generated ${count} sets · ${cols} per row for ${zone.name}.`, { tone: "success" });
  };
  const select = (id: string, additive: boolean) =>
    setSel((s) => {
      if (!additive) return new Set([id]);
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const move = (id: string, x: number, y: number) => setSlots((ss) => ss.map((s) => (s.id === id ? { ...s, x, y } : s)));
  const patchSel = (p: Partial<SunbedSlot>) => setSlots((ss) => ss.map((s) => (sel.has(s.id) ? { ...s, ...p } : s)));
  const nextNum = (list: SunbedSlot[]) => {
    const nums = list.map((s) => parseInt(s.id.split("-")[1] || "0", 10)).filter((n) => !Number.isNaN(n));
    return (nums.length ? Math.max(...nums) : 0) + 1;
  };
  const addBed = () => {
    const id = `${zone.prefix}-${String(nextNum(slots)).padStart(2, "0")}`;
    setSlots((ss) => [...ss, { id, x: 50, y: 50, state: "a", price: zone.from }]);
    setSel(new Set([id]));
  };
  const duplicate = () => {
    if (!selList.length) return;
    let n = nextNum(slots);
    const clones: SunbedSlot[] = selList.map((s) => ({ ...s, id: `${zone.prefix}-${String(n++).padStart(2, "0")}`, x: Math.min(96, s.x + 6), y: Math.min(96, s.y + 6) }));
    setSlots((ss) => [...ss, ...clones]);
    setSel(new Set(clones.map((c) => c.id)));
  };
  const removeSel = () => { if (!sel.size) return; setSlots((ss) => ss.filter((s) => !sel.has(s.id))); setSel(new Set()); };
  const reset = () => { setSlots(zoneLayout(zone)); setSel(new Set()); toast(`Reset ${zone.name} to the default grid.`); };
  const save = () => { setZoneLayout(zoneId, slots); toast(`Published ${zone.name} — ${slots.length} sets now live in the booking wizard.`, { tone: "success" }); };

  const states: { v: SunbedState; label: string }[] = [{ v: "a", label: "Available" }, { v: "h", label: "On hold" }, { v: "u", label: "Blocked" }];
  const kinds: { v: SunbedKind; label: string }[] = [{ v: "standard", label: "Standard" }, { v: "front", label: "Front row" }, { v: "cabana", label: "Cabana" }];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <Card className="p-5">
        <div className="lg:hidden mb-3 flex items-start gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
          <Icon.info size={14} className="shrink-0 mt-0.5 text-slaice-600" /> Best on a larger screen — arranging sunbeds wants a mouse; ⇧/⌘-click selects several.
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {ZONES.map((z) => (
            <button key={z.id} onClick={() => switchZone(z.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold ring-1 transition ${zoneId === z.id ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-700 hover:ring-teal-400"}`}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} /> {z.name}
              {beachLayout[z.id] && <Icon.check size={12} className={zoneId === z.id ? "text-teal-300" : "text-teal-600"} />}
            </button>
          ))}
          <div className="ml-auto inline-flex items-center">
            <Toggle on={snapOn} onChange={setSnapOn} label="Snap to grid" />
          </div>
        </div>
        <Suspense fallback={<div className="w-full rounded-2xl bg-gradient-to-b from-sky-100 to-amber-100/60 ring-1 ring-white/50 animate-pulse" style={{ height: 360 }} />}>
          <BeachCanvas slots={slots} editable selectedIds={sel} onSelect={select} onMove={move} snap={snapOn ? 5 : 0} maxHeight={520} />
        </Suspense>
        <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
          <span className="tnum">{slots.length} sets · {slots.filter((s) => s.state === "a").length} available{sel.size > 0 ? ` · ${sel.size} selected` : ""}</span>
          <span className="hidden sm:inline">Drag to arrange · click to select · ⇧/⌘-click for many</span>
        </div>
      </Card>

      <Card className="p-5 h-max">
        <div className="font-semibold text-navy-900 mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: zone.color }} /> {zone.name} · sunbeds</div>

        {/* Optional store logo — shown under the store name on the customer beach. */}
        <div className="mb-3 rounded-xl ring-1 ring-slate-200 bg-slate-50 p-2.5 flex items-center gap-2.5">
          <span className="w-12 h-12 rounded-lg bg-white ring-1 ring-slate-200 grid place-items-center overflow-hidden shrink-0">
            {logo ? <img src={logo} alt={`${zone.name} logo`} className="w-full h-full object-contain" /> : <Icon.image size={18} className="text-slate-300" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-navy-900">Store logo</div>
            <div className="text-[11px] text-slate-500 leading-tight">Optional · shown under the store name on the beach.</div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <label className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 bg-white transition ${logoBusy ? "ring-teal-300 text-teal-700" : "ring-slate-200 text-slate-700 hover:ring-teal-400"}`}>
              <input type="file" accept="image/*" aria-label={`Upload a logo for ${zone.name}`} className="sr-only" disabled={logoBusy}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onLogo(f); }} />
              {logoBusy ? <Spinner size={12} /> : <Icon.upload size={12} />} {logo ? "Replace" : "Upload"}
            </label>
            {logo && <button onClick={() => setZoneLogo(zoneId, null)} className="text-[11px] text-slate-500 hover:text-rose-600">Remove</button>}
          </div>
        </div>

        {/* Grid generator — set the number of sets + columns per row, then lay
            out a fresh grid (rows are derived). Fine-tune individual sets below. */}
        <div className="mb-3 rounded-xl ring-1 ring-slate-200 bg-slate-50 p-2.5">
          <div className="text-[12.5px] font-semibold text-navy-900 mb-2 flex items-center gap-1.5"><Icon.grid size={13} /> Grid generator</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Umbrella sets">
              <Input type="number" min={1} max={120} value={gridCount} onChange={(e) => setGridCount(Math.max(1, Math.min(120, Math.round(+e.target.value) || 1)))} />
            </Field>
            <Field label="Columns / row">
              <Input type="number" min={1} max={16} value={gridCols} onChange={(e) => setGridCols(Math.max(1, Math.min(16, Math.round(+e.target.value) || 1)))} />
            </Field>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 tnum">{gridCols} × {Math.ceil(gridCount / gridCols)} rows</span>
            <Btn variant="tint" size="sm" icon={Icon.grid} onClick={generateGrid}>Generate</Btn>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <Btn variant="tint" size="sm" icon={Icon.plus} onClick={addBed}>Add</Btn>
          <Btn variant="ghost" size="sm" icon={Icon.grid} onClick={duplicate} disabled={!sel.size}>Copy</Btn>
          <Btn variant="ghost" size="sm" icon={Icon.refund} onClick={reset}>Reset</Btn>
        </div>
        {selList.length > 0 ? (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {one ? <>Selected · <span className="tnum text-navy-900">{one.id}</span></> : <><span className="text-navy-900">{selList.length}</span> selected</>}
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1">Availability</div>
              <div className="grid grid-cols-3 gap-1.5">
                {states.map((b) => (
                  <button key={b.v} onClick={() => patchSel({ state: b.v })}
                    className={`rounded-lg px-2 py-1.5 text-[12px] font-semibold ring-1 transition ${curState === b.v ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{b.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1">Type</div>
              <div className="grid grid-cols-3 gap-1.5">
                {kinds.map((k) => (
                  <button key={k.v} onClick={() => patchSel({ kind: k.v })}
                    className={`rounded-lg px-2 py-1.5 text-[12px] font-semibold ring-1 transition ${curKind === k.v ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{k.label}</button>
                ))}
              </div>
            </div>
            {one && (
              <>
                <Field label="Price (€ / day)">
                  <Input type="number" min={0} value={one.price} onChange={(e) => patchSel({ price: Math.max(0, +e.target.value || 0) })} />
                </Field>
                <div className="text-[11px] text-slate-500 tnum">Position: {one.x.toFixed(0)}%, {one.y.toFixed(0)}%</div>
              </>
            )}
            <Btn variant="ghost" full size="sm" icon={Icon.trash} onClick={removeSel} className="text-rose-600 hover:bg-rose-50">Remove {selList.length > 1 ? `${selList.length} sets` : "sunbed"}</Btn>
          </div>
        ) : (
          <div className="rounded-xl ring-1 ring-dashed ring-slate-300 bg-slate-50 px-3 py-6 text-center text-[12.5px] text-slate-500">
            Click an umbrella to edit its availability, type, price or position. ⇧/⌘-click to select several at once.
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <Btn variant="primary" full icon={Icon.check} onClick={save}>Publish to wizard</Btn>
          <div className="mt-2 text-[11px] text-slate-500 leading-snug">Customers see this exact arrangement when they open <b>{zone.name}</b> in “Plan my visit”.</div>
        </div>
      </Card>
    </div>
  );
}

export function AdminMapEditor() {
  const [tab, setTab] = useState("sunbeds");
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <Tabs tabs={[["zones", "Zone map"], ["sunbeds", "Sunbed layout"]]} value={tab} onChange={setTab} />
        <div className="text-[12px] text-slate-500 hidden sm:block">Arrange zones, then place each zone&apos;s sunbeds in detail.</div>
      </div>
      {tab === "zones" ? <ZoneArrangeEditor /> : <SunbedLayoutEditor />}
    </div>
  );
}

/* ============ BOOKINGS LIST ============ */
/* ---- Shared send-channel picker — QR / offers via Email · Viber · SMS ---- */
type SendChannel = "Email" | "Viber" | "SMS";
const SEND_CHANNELS: { key: SendChannel; icon: IconRenderer; color: string }[] = [
  { key: "Email", icon: Icon.mail, color: "#0d9488" },
  { key: "Viber", icon: Icon.chat, color: "#7360f2" },
  { key: "SMS", icon: Icon.phone, color: "#16a34a" },
];

function SendModal({ open, onClose, title, intro, email, phone, sendLabel = "Send", onSend }: {
  open: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  email?: string;
  phone?: string;
  sendLabel?: string;
  onSend: (channel: SendChannel, dest: string) => void;
}) {
  const [channel, setChannel] = useState<SendChannel>("Email");
  useEffect(() => { if (open) setChannel("Email"); }, [open]);
  const destOf = (c: SendChannel) => (c === "Email" ? email : phone) || "—";
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon={Icon.check} onClick={() => { onSend(channel, destOf(channel)); onClose(); }}>{sendLabel} via {channel}</Btn></>}>
      <div className="space-y-3">
        {intro && <p className="text-[13px] text-slate-600 -mt-1">{intro}</p>}
        <div className="grid grid-cols-3 gap-2">
          {SEND_CHANNELS.map((c) => {
            const CIcon = c.icon;
            const on = channel === c.key;
            return (
              <button key={c.key} type="button" onClick={() => setChannel(c.key)} aria-pressed={on}
                className={`rounded-xl p-3 text-center ring-1 transition ${on ? "ring-2 ring-teal-500 bg-teal-50/50" : "ring-slate-200 bg-white hover:ring-teal-400"}`}>
                <span className="mx-auto mb-1.5 w-10 h-10 rounded-xl grid place-items-center text-white shadow-sm" style={{ background: c.color }}><CIcon size={18} /></span>
                <div className="text-[13px] font-semibold text-navy-900">{c.key}</div>
                <div className="text-[10.5px] text-slate-500 truncate">{destOf(c.key)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* Items of one booking, stacked — a customer who reserved several sunbeds plus
   parking / a locker / tickets sees them all together under their booking id. */
function BookingItems({ items }: { items: string[] }) {
  if (items.length <= 1) return <span className="whitespace-nowrap">{items[0] ?? "—"}</span>;
  return (
    <div className="space-y-0.5 min-w-[170px]">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
          <span>{it}</span>
        </div>
      ))}
      <div className="text-[11px] text-slate-400 pt-0.5">{items.length} items · one booking</div>
    </div>
  );
}

type EnrichedBooking = AdminBooking & { surname: string; phone: string; email: string };

export function AdminBookings() {
  const { toast } = useApp();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState>(null);
  const [sendFor, setSendFor] = useState<EnrichedBooking | null>(null);
  const loading = useMockLoad();
  const PAGE = 30;
  const chan = (c: string) => ({ Online: "blue", "Walk-in": "amber", Phone: "indigo", Cashier: "green" }[c] || "slate");
  const enriched: EnrichedBooking[] = ADMIN_BOOKINGS.map((b) => {
    const p = personByFirst(b.who);
    return { ...b, surname: p?.last ?? "", phone: p?.phone ?? "", email: p?.email ?? "" };
  });
  const filtered = enriched.filter((b) => (b.id + b.who + b.surname + b.phone + b.items.join(" ")).toLowerCase().includes(q.toLowerCase()));
  const sortVal = (b: EnrichedBooking): string | number => {
    switch (sort?.key) {
      case "id": return b.id;
      case "name": return b.who;
      case "surname": return b.surname;
      case "amount": return b.amount;
      case "date": return dateVal(b.date);
      default: return 0;
    }
  };
  const sorted = sort ? [...filtered].sort((a, b) => cmpVal(sortVal(a), sortVal(b)) * sort.dir) : filtered;
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const onSort = (k: string) => { setSort((s) => (s?.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: 1 })); setPage(0); };
  const exportCSV = () => {
    downloadCSV("bookings.csv", ["Booking", "Name", "Surname", "Phone", "Items", "Date", "Channel", "Status", "Amount (€)"],
      sorted.map((b) => [b.id, b.who, b.surname || "—", b.phone || "—", b.items.join(" + "), b.date, b.channel, b.status, b.amount]));
    toast(`Exported ${sorted.length} bookings to CSV.`, { tone: "success" });
  };
  return (
    <div>
      <Card className="p-4">
        {/* Search + Export sit on the same row inside the card so the header
            doesn't add a separate strip above. Export hugs the right edge. */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 max-w-sm flex-1 min-w-[200px] text-slate-600">
            <Icon.search size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search bookings…" className="text-sm outline-none w-full bg-transparent text-ink" />
          </div>
          <Btn variant="outline" icon={Icon.download} onClick={exportCSV} className="ml-auto">Export</Btn>
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={9} />
        ) : sorted.length === 0 ? (
          <EmptyState icon={Icon.search} title="No matching bookings" body={`Nothing matches “${q}”. Try a different name, sunbed code or booking ID.`} />
        ) : (
          <>
            <Table cols={[
              <SortHeader label="Booking" k="id" sort={sort} onSort={onSort} />,
              <SortHeader label="Name" k="name" sort={sort} onSort={onSort} />,
              <SortHeader label="Surname" k="surname" sort={sort} onSort={onSort} />,
              "Phone", "Items",
              <SortHeader label="Date" k="date" sort={sort} onSort={onSort} />,
              "Channel", "Status",
              <SortHeader label="Amount" k="amount" sort={sort} onSort={onSort} align="right" />,
              "",
            ]} right={[8]}
              rows={pageRows.map((b) => [
                b.id,
                b.who,
                b.surname || <span className="text-slate-400">—</span>,
                b.phone ? <span className="tnum whitespace-nowrap">{b.phone}</span> : <span className="text-slate-400">—</span>,
                <BookingItems items={b.items} />,
                b.date,
                <Badge tone={chan(b.channel)}>{b.channel}</Badge>,
                <StatusBadge status={b.status} />,
                `€${b.amount}`,
                <Btn size="sm" variant="ghost" icon={Icon.mail} onClick={() => setSendFor(b)}>Resend QR</Btn>,
              ])} />
            {pageCount > 1 && <Pager page={safePage} pageCount={pageCount} total={sorted.length} pageSize={PAGE} onPage={setPage} />}
          </>
        )}
      </Card>
      <SendModal
        open={sendFor !== null}
        onClose={() => setSendFor(null)}
        title="Resend QR"
        intro={sendFor ? `Send the gate QR for ${sendFor.id} (${sendFor.who}${sendFor.surname ? " " + sendFor.surname : ""}) again.` : undefined}
        email={sendFor?.email}
        phone={sendFor?.phone}
        sendLabel="Resend"
        onSend={(ch, dest) => toast(`QR for ${sendFor?.id} re-sent via ${ch} to ${dest}.`, { tone: "success" })}
      />
    </div>
  );
}

/* Compact live beach coverage for the manual booking — the same umbrella sets the
   customer sees, scaled into the form. Available sets are tappable (fill the
   code); taken sets are dimmed. */
function ManualCoverage({ zone, slots, selectedCode, onPick }: {
  zone: { name: string };
  slots: SunbedSlot[];
  selectedCode: string;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ w: r.width, h: r.height }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const size = useMemo(() => {
    const base = Math.min(40, box.w * 0.07);
    if (slots.length < 2 || box.w === 0) return Math.max(16, base);
    let min = Infinity;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const dx = ((slots[i].x - slots[j].x) / 100) * box.w;
        const dy = ((slots[i].y - slots[j].y) / 100) * box.h;
        min = Math.min(min, Math.hypot(dx, dy));
      }
    }
    return Math.max(14, Math.min(base, min * 0.82));
  }, [slots, box]);
  const free = slots.filter((s) => s.state === "a").length;
  const want = selectedCode.trim().toUpperCase();
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Icon.umbrella size={12} /> Live beach coverage · {zone.name}</div>
        <div className="text-[11px] text-slate-500 tnum">{free} free · {slots.length} sets</div>
      </div>
      <div ref={ref} className="relative w-full rounded-xl ring-1 ring-slate-200 overflow-hidden" style={{ aspectRatio: "16 / 6", background: "linear-gradient(to bottom, #bfe6f5 0%, #cdebf6 16%, #f1ddb4 30%, #ecd3a1 100%)" }}>
        {slots.map((s) => {
          const sel = !!want && s.id.toUpperCase() === want;
          const taken = s.state !== "a";
          return (
            <button
              key={s.id}
              type="button"
              disabled={taken}
              onClick={() => onPick(s.id)}
              title={`${s.id} · ${taken ? "taken" : "available"}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${taken ? "opacity-35 cursor-not-allowed" : "hover:scale-110 hover:z-10 cursor-pointer"}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: size, height: size }}
            >
              <SunbedMark state={s.state} sel={sel} fill />
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">Tap an available set to fill the code · taken sets are dimmed.</div>
    </div>
  );
}

/* ============ MANUAL / PHONE BOOKING ============ */
export function AdminManual() {
  const { toast, beachLayout } = useApp();
  const [done, setDone] = useState(false);
  const [zoneName, setZoneName] = useState(ZONES[0].name);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("maria@example.com");
  const [mphone, setMphone] = useState("+30 694 100 0001");
  const [sendOpen, setSendOpen] = useState(false);
  const [sentVia, setSentVia] = useState<SendChannel>("Email");
  const [sentTo, setSentTo] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const zone = ZONES.find((z) => z.name === zoneName) ?? ZONES[0];
  const slots = beachLayout[zone.id] ?? zoneLayout(zone);
  const reserve = () => {
    if (!code.trim()) { toast("Pick a set on the map (or type a code) first.", { tone: "error" }); return; }
    setSendOpen(true);
  };
  return (
    <>
      <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
        <div>
          <PageHead title="Manual / Phone Booking" sub="Reserve and block a sunbed without taking payment (VIP / phone), then send the QR to the customer." badge={<Badge tone="mvp">MVP</Badge>} />
          <Card className="p-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Customer name"><Input placeholder="e.g. Maria K." defaultValue="Maria K." /></Field>
              <Field label="Customer e-mail"><Input placeholder="maria@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Customer phone"><Input placeholder="+30 694 …" value={mphone} onChange={(e) => setMphone(e.target.value)} /></Field>
              <Field label="Zone"><Select value={zoneName} onChange={(e) => { setZoneName(e.target.value); setCode(""); }} options={ZONES.map((z) => z.name)} /></Field>
              <Field label="Sunbed code"><Input placeholder="CE-92" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field>
              <Field label="Date"><Input type="date" defaultValue={today} /></Field>
              <Field label="Mark as"><Select options={["Unpaid (manual)", "Comp / VIP", "Pay later"]} /></Field>
            </div>
            <ManualCoverage zone={zone} slots={slots} selectedCode={code} onPick={(id) => setCode(id)} />
            <div className="mt-4">
              <Btn variant="primary" full className="sm:w-auto" icon={Icon.lock} onClick={reserve}>Reserve &amp; send QR</Btn>
            </div>
          </Card>
          {done && (
            <Card className="p-5 mt-4 flex items-center gap-4 animate-fade-up">
              <QR size={96} seed={`MANUAL-${code}`} />
              <div>
                <div className="font-semibold text-navy-900 flex items-center gap-2">Reserved <Badge tone="amber">Unpaid</Badge></div>
                <div className="text-sm text-slate-600">{zone.name} · {code} — QR sent via <b>{sentVia}</b> to {sentTo}. The customer can pay later or present the QR at the gate.</div>
              </div>
            </Card>
          )}
        </div>
        <ContextPanel title="Manual / phone bookings" items={[
          { icon: Icon.phone, title: "Block without payment", body: "Used for phone bookings, VIP comps, and pay-later guests." },
          { icon: Icon.mail, title: "QR by e-mail / Viber / SMS", body: "The guest gets the same gate QR as an online booking, on the channel you pick." },
          { icon: Icon.cash, title: "Settle later", body: "Mark unpaid bookings paid in Bookings when they arrive." },
        ]} footer="Manual bookings appear in Reporting with channel = Phone." />
      </div>
      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Reserve & send QR"
        intro={`Block ${zone.name} · ${code} and send the gate QR to the customer.`}
        email={email}
        phone={mphone}
        sendLabel="Reserve & send"
        onSend={(ch, dest) => { setSentVia(ch); setSentTo(dest); setDone(true); toast(`Demo — ${zone.name} · ${code} blocked & QR sent via ${ch} to ${dest}.`, { tone: "success" }); }}
      />
    </>
  );
}

/* ============ USERS & SEGMENTS ============
   Segments are partly automatic: every guest is "New" by default and is promoted
   to "Regular" once they pass the visit threshold. VIP and Season pass stay
   manually assigned, so we keep only those on the record and derive New/Regular
   from the visit count — one rule, no drift. */
const REGULAR_AFTER = 15; // strictly more than this many visits → Regular
const MANUAL_TAGS = ["VIP", "Season pass"];
// "Elena V." stands in for the signed-in customer, so a pass she buys shows here.
const DEMO_CUSTOMER_ID = 3;
const autoSegment = (visits: number): "New" | "Regular" => (visits > REGULAR_AFTER ? "Regular" : "New");
const manualOf = (tags: string[]) => tags.filter((t) => MANUAL_TAGS.includes(t));
// Display tags = the auto segment first, then any manual badges.
const displayTags = (u: Customer) => [autoSegment(u.bookings), ...manualOf(u.tags)];
const tagTone = (t: string) => ({ VIP: "amber", "Season pass": "blue", Regular: "slate", New: "green" }[t] || "slate");

export function AdminUsers() {
  const { toast, passes } = useApp();
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const customersQ = useAsync(listCustomers);
  // Editable copy of the roster (mockup: edits live in component state). Seed once
  // loaded, keeping only manual tags — New/Regular come from autoSegment.
  const [users, setUsers] = useState<Customer[] | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [activityId, setActivityId] = useState<number | null>(null);
  useEffect(() => {
    if (customersQ.status === "success" && users === null) {
      setUsers(customersQ.data.map((c) => ({ ...c, tags: manualOf(c.tags) })));
    }
  }, [customersQ.status, customersQ.data, users]);

  const allTags = ["All", "VIP", "Season pass", "Regular", "New"];
  const list = users ?? [];
  // The signed-in customer reflects any pass she holds as an automatic tag
  // (marked with a wallet glyph so it reads as pass-derived, not hand-assigned).
  const passTags = [passes.vip ? "VIP" : null, passes.season ? "Season pass" : null].filter(Boolean) as string[];
  const tagsFor = (u: Customer): { t: string; pass: boolean }[] => {
    const base = displayTags(u).map((t) => ({ t, pass: false }));
    if (u.id !== DEMO_CUSTOMER_ID || passTags.length === 0) return base;
    passTags.forEach((pt) => {
      const hit = base.find((b) => b.t === pt);
      if (hit) hit.pass = true;
      else base.push({ t: pt, pass: true });
    });
    return base;
  };
  const rows = list.filter((u) => (tagFilter === "All" || tagsFor(u).some((x) => x.t === tagFilter)) && (u.first + u.last + u.email + u.phone).toLowerCase().includes(q.toLowerCase()));
  const editUser = editId !== null ? list.find((u) => u.id === editId) ?? null : null;
  const activityUser = activityId !== null ? list.find((u) => u.id === activityId) ?? null : null;
  const loading = customersQ.status === "loading" || (customersQ.status !== "error" && users === null);

  const saveUser = (patch: Customer) => {
    setUsers((us) => (us ? us.map((u) => (u.id === patch.id ? patch : u)) : us));
    setEditId(null);
    toast(`Saved ${patch.first} ${patch.last}.`, { tone: "success" });
  };

  return (
    <div className="animate-fade-up">
      <Card className="p-4">
        {/* Search · tag filters · New tag — all in one row inside the card. */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 max-w-xs flex-1 min-w-[180px] text-slate-600">
            <Icon.search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="text-sm outline-none w-full bg-transparent text-ink" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allTags.map((t) => <button key={t} onClick={() => setTagFilter(t)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ring-1 ${tagFilter === t ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{t}</button>)}
          </div>
          <Btn variant="outline" icon={Icon.tag} onClick={() => toast("Demo — create a tag / segment.")} className="ml-auto">New tag</Btn>
        </div>
        {/* The auto-segmentation rule, stated for the demo. */}
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-slaice-100 ring-1 ring-slaice-600/20 px-3 py-2 text-[12px] text-slaice-700">
          <Icon.info size={14} className="shrink-0 mt-0.5 text-slaice-600" />
          <span>Segments update automatically: every guest starts <b>New</b> and becomes <b>Regular</b> after {REGULAR_AFTER} visits. <b>VIP</b> and <b>Season pass</b> are assigned by hand on a user.</span>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : customersQ.status === "error" ? (
          <ErrorState compact body="We couldn't load the customer list." onRetry={customersQ.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState compact icon={Icon.users} title="No users match" body="Try a different search or tag filter." />
        ) : (
          <Table cols={["Name", "Surname", "Phone", "Email", "Visits", "Tags", ""]} right={[4]}
            rows={rows.map((u) => [u.first, u.last, <span className="tnum whitespace-nowrap">{u.phone}</span>, u.email, u.bookings,
              <span className="flex gap-1 flex-wrap">{tagsFor(u).map(({ t, pass }) => <Badge key={t} tone={tagTone(t)}>{pass && <Icon.wallet size={9} />}{t}</Badge>)}</span>,
              <div className="flex items-center justify-end gap-1">
                <Btn size="sm" variant="ghost" icon={Icon.edit} onClick={() => setEditId(u.id)}>Edit</Btn>
                <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setActivityId(u.id)}>Activity</Btn>
              </div>])} />
        )}
      </Card>
      {editUser && <UserEditModal user={editUser} onClose={() => setEditId(null)} onSave={saveUser} />}
      {activityUser && <UserActivityModal user={activityUser} onClose={() => setActivityId(null)} onEdit={(id) => { setActivityId(null); setEditId(id); }} />}
    </div>
  );
}

/* ---- Edit a user: contact details, visit count and the manual segment badges.
   Editing visits re-derives New/Regular live, demonstrating the auto-rule. ---- */
function UserEditModal({ user, onClose, onSave }: { user: Customer; onClose: () => void; onSave: (u: Customer) => void }) {
  const [first, setFirst] = useState(user.first);
  const [last, setLast] = useState(user.last);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [visits, setVisits] = useState(user.bookings);
  const [vip, setVip] = useState(user.tags.includes("VIP"));
  const [seasonPass, setSeasonPass] = useState(user.tags.includes("Season pass"));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = first.trim().length > 0 && last.trim().length > 0;
  const valid = emailOk && nameOk;
  const seg = autoSegment(visits);

  const save = () => {
    const f = first.trim(), l = last.trim();
    const tags = [...(vip ? ["VIP"] : []), ...(seasonPass ? ["Season pass"] : [])];
    onSave({ ...user, first: f, last: l, phone: phone.trim(), email: email.trim(), bookings: visits, tags, name: `${f} ${l.charAt(0)}.` });
  };

  return (
    <Modal open onClose={onClose} wide title="Edit user"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} disabled={!valid} onClick={save}>Save changes</Btn></>}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" /></Field>
          <Field label="Surname"><Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Surname" /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+30 694 …" className="tnum" /></Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={email && !emailOk ? "ring-2 ring-rose-400 focus:ring-rose-400" : ""} />
            {email && !emailOk && <div className="text-[11px] text-rose-600 mt-1">Enter a valid email address.</div>}
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 items-start">
          <Field label="Visits this season">
            <div className="flex items-center gap-2">
              <Input type="number" min={0} value={visits} onChange={(e) => setVisits(Math.max(0, Math.round(+e.target.value) || 0))} />
              <span className="text-[12px] text-slate-500 shrink-0">visits</span>
            </div>
          </Field>
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-1">Segment (automatic)</div>
            <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2.5 flex items-center gap-2">
              <Badge tone={tagTone(seg)}>{seg}</Badge>
              <span className="text-[11px] text-slate-500">{seg === "New" ? `${REGULAR_AFTER + 1 - visits} more visit${REGULAR_AFTER + 1 - visits !== 1 ? "s" : ""} → Regular` : `Over ${REGULAR_AFTER} visits`}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Manual segments</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
              <span className="flex items-center gap-2"><Badge tone="amber">VIP</Badge><span className="text-[12px] text-slate-500">High-value guest perks</span></span>
              <Toggle on={vip} onChange={setVip} />
            </div>
            <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
              <span className="flex items-center gap-2"><Badge tone="blue">Season pass</Badge><span className="text-[12px] text-slate-500">Unlimited entry this season</span></span>
              <Toggle on={seasonPass} onChange={setSeasonPass} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---- Activity: a CRM-style customer-360 — segment progress, key stats and a
   synthesized recent-activity timeline. A demo of what "Activity" opens. ---- */
const ACT_BG: Record<string, string> = { teal: "bg-teal-600", slate: "bg-slate-400", indigo: "bg-slaice-600", amber: "bg-amber-500" };
function userActivity(u: Customer): { icon: IconRenderer; tone: string; title: string; detail: string; when: string }[] {
  const each = Math.max(10, Math.round(u.spend / Math.max(1, u.bookings)));
  const ev = [
    { icon: Icon.scan, tone: "teal", title: "Checked in at the gate", detail: "QR validated · Central", when: u.lastVisit },
    { icon: Icon.umbrella, tone: "teal", title: "Sunbed booking", detail: `Central · 2 sets · €${each}`, when: u.lastVisit },
    { icon: Icon.card, tone: "slate", title: "Payment received", detail: `€${each} · Visa ···· 4242`, when: u.lastVisit },
    { icon: Icon.ticket, tone: "slate", title: "Entry tickets", detail: "Adult ×2", when: u.lastVisit },
    { icon: Icon.mail, tone: "indigo", title: "Opened a campaign", detail: "“Weekend offer” · E-mail", when: "2 weeks ago" },
  ];
  if (u.bookings >= 10) ev.push({ icon: Icon.gift, tone: "amber", title: "Loyalty stamp earned", detail: `${Math.min(10, u.bookings)}/10 toward a free sunbed`, when: "3 weeks ago" });
  ev.push({ icon: Icon.users, tone: "slate", title: "Account created", detail: "Tagged New by default", when: `Joined ${["Apr", "May", "Jun"][u.id % 3]} 2026` });
  return ev;
}

function UserActivityModal({ user, onClose, onEdit }: { user: Customer; onClose: () => void; onEdit: (id: number) => void }) {
  const { toast } = useApp();
  const seg = autoSegment(user.bookings);
  const avg = Math.round(user.spend / Math.max(1, user.bookings));
  const toRegular = Math.max(0, REGULAR_AFTER + 1 - user.bookings);
  const pct = Math.min(100, Math.round((user.bookings / (REGULAR_AFTER + 1)) * 100));
  const events = userActivity(user);
  const stats = [
    { label: "Visits", value: String(user.bookings) },
    { label: "Total spend", value: `€${user.spend.toLocaleString()}` },
    { label: "Avg / visit", value: `€${avg}` },
    { label: "Last visit", value: user.lastVisit },
  ];
  return (
    <Modal open onClose={onClose} wide title="Customer activity"
      footer={<><Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn variant="outline" icon={Icon.mail} onClick={() => toast(`Demo — message ${user.first} ${user.last} (opens Communicate).`)}>Message</Btn>
        <Btn variant="primary" icon={Icon.edit} onClick={() => onEdit(user.id)}>Edit profile</Btn></>}>
      <div className="space-y-4">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slaice-600 to-teal-600 text-white grid place-items-center font-display font-bold text-lg shrink-0">{user.first.charAt(0)}{user.last.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-navy-900 text-[15px] truncate">{user.first} {user.last}</div>
            <div className="text-[12px] text-slate-500 truncate">{user.email} · <span className="tnum">{user.phone}</span></div>
          </div>
          <div className="flex gap-1 flex-wrap justify-end shrink-0">{displayTags(user).map((t) => <Badge key={t} tone={tagTone(t)}>{t}</Badge>)}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{s.label}</div>
              <div className="font-display text-lg font-bold text-navy-900 tnum leading-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Segment progress — ties back to the auto-rule */}
        <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50/70 px-3 py-2.5">
          {seg === "Regular" ? (
            <div className="flex items-center gap-2 text-[13px] text-navy-900"><Icon.checkCircle size={15} className="text-teal-600" /> <b>Regular</b> — past {REGULAR_AFTER} visits this season.</div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-slate-600"><b className="text-navy-900">{toRegular}</b> more visit{toRegular !== 1 ? "s" : ""} to <b className="text-navy-900">Regular</b></span>
                <span className="text-slate-500 tnum">{user.bookings}/{REGULAR_AFTER + 1}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-slaice-500 to-teal-500" style={{ width: `${pct}%` }} /></div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Recent activity</div>
          <ol className="space-y-1">
            {events.map((e, i) => {
              const EIcon = e.icon;
              return (
                <li key={i} className="flex items-start gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50 transition">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center text-white shrink-0 ${ACT_BG[e.tone] || ACT_BG.slate}`}><EIcon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-navy-900 leading-tight">{e.title}</div>
                    <div className="text-[11.5px] text-slate-500 leading-snug">{e.detail}</div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap pt-0.5">{e.when}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Modal>
  );
}

/* ============ REPORTING & ANALYTICS ============ */
export function AdminReporting() {
  const { toast } = useApp();
  const [tab, setTab] = useState("exec");
  const tabs: TabEntry[] = [
    ["exec", "Executive", Icon.chart],
    ["revenue", "Revenue", Icon.cash],
    ["occupancy", "Occupancy", Icon.umbrella],
    ["bookings", "Bookings", Icon.grid],
    ["channel", "Channels", Icon.globe],
    ["customers", "Customers", Icon.users],
    ["tickets", "Tickets", Icon.ticket],
    ["daily", "Daily ops", Icon.clock],
  ];
  const season = [{ l: "May", v: 48 }, { l: "Jun", v: 121 }, { l: "Jul", v: 198 }, { l: "Aug", v: 241 }, { l: "Sep", v: 96 }];
  return (
    <div className="animate-fade-up">
      {/* Tabs and the period / export actions share one row. Tabs take the
          natural width on the left, actions hug the right edge. */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Tabs tabs={tabs} value={tab} onChange={setTab} scroll />
        <div className="flex gap-2 ml-auto">
          <Btn variant="outline" icon={Icon.calendar} onClick={() => toast("Demo — period picker.")}>This season</Btn>
          <Btn variant="primary" icon={Icon.download} onClick={() => { downloadCSV(`reporting-${tab}.csv`, ["Period", "Bookings"], season.map((s) => [s.l, s.v])); toast(`Exported ${tab} report (CSV).`); }}>Export</Btn>
        </div>
      </div>

      {tab === "exec" && <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard instant label="Season revenue" value="€704k" sub="vs last yr" tone="teal" trend="+9%" sparkline={<Sparkline data={[48,121,198,241,96]} />} />
          <StatCard instant label="Total bookings" value="26,040" sub="sets sold" trend="+7%" sparkline={<Sparkline data={[120,98,142,165,210,320,298]} color="#0ea5e9" />} />
          <StatCard instant label="Avg occupancy" value="68%" sub="across zones" trend="+3pp" />
          <StatCard instant label="Online share" value="40%" sub="of sets" trend="+5pp" />
          <StatCard instant label="Refund rate" value="1.4%" sub="of revenue" trend="-0.3pp" tone="teal" />
        </div>
        {/* Leisure-industry KPIs (RevPATB ≈ RevPAR for sunbeds). */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <StatCard instant label="RevPATB" value="€18.4" sub="rev / available sunbed" tone="indigo" trend="+6%" />
          <StatCard instant label="ADR" value="€27.1" sub="avg daily rate / set" trend="+4%" />
          <StatCard instant label="Ancillary attach" value="0.7" sub="extras per booking" trend="+0.1" />
          <StatCard instant label="No-show rate" value="2.8%" sub="of reservations" trend="-0.4pp" tone="teal" />
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Card className="p-5 lg:col-span-2"><div className="font-semibold text-navy-900 mb-1">Revenue by month (€k)</div><LineChartMini data={season} /></Card>
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-2">Revenue mix</div>
            <div className="flex items-center gap-4"><Donut segments={[{ v: 62, c: "#0D9488" }, { v: 28, c: "#0ea5e9" }, { v: 10, c: "#f59e0b" }]} />
              <div className="text-sm space-y-1.5"><Leg c="bg-teal-600" t="Sunbeds 62%" /><Leg c="bg-sky-500" t="Tickets 28%" /><Leg c="bg-amber-500" t="Other 10%" /></div></div>
          </Card>
        </div>
        {/* Pace / pickup + an actionable insight callout. */}
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Card className="p-5 lg:col-span-2">
            <div className="font-semibold text-navy-900 mb-1">Booking pace · on the books vs same time last year</div>
            <BarChart color="#3a47cc" data={[{ l: "Jun", v: 121 }, { l: "Jul", v: 210, hi: 1 }, { l: "Aug", v: 198, hi: 1 }, { l: "Sep", v: 86 }, { l: "Oct", v: 22 }]} />
          </Card>
          <div className="rounded-3xl bg-gradient-to-br from-slaice-600 to-slaice-500 text-white p-5 shadow-lift flex flex-col">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/80"><Icon.sparkles size={14} /> Insight</div>
            <div className="mt-2 font-display font-bold text-lg leading-snug">Saturdays run 23% hotter than weekdays.</div>
            <p className="text-[13px] text-white/85 mt-1 leading-snug">Macaw hits 91% by noon. Consider dynamic weekend pricing on front-row sets to lift RevPATB.</p>
            <Btn variant="light" size="sm" className="mt-auto self-start" icon={Icon.trend} onClick={() => toast("Demo — open dynamic pricing rules.")}>Set a rule</Btn>
          </div>
        </div>
      </>}

      {tab === "revenue" && <>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Revenue by capability (€k)</div><BarChart data={[{ l: "Sunbed", v: 436, hi: 1 }, { l: "Ticket", v: 197 }, { l: "Locker", v: 31 }, { l: "Support", v: 40 }]} /></Card>
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Revenue by zone (€k)</div><HBarChart color="#0ea5e9" data={ZONES.map((z) => ({ l: z.name, v: Math.round(z.total * 1.1) }))} /></Card>
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-2">All transactions (filterable)</div>
          <Table cols={["Tx", "Capability", "Channel", "Status", "Amount"]} right={[4]}
            rows={REVENUE_TX.map((r) => [r[0], r[1], <Badge tone={r[2].tone}>{r[2].label}</Badge>, <Badge tone={r[3].tone}>{r[3].label}</Badge>, r[4].startsWith("−") ? <span className="text-rose-600 font-medium tnum">{r[4]}</span> : r[4]])} /></Card>
      </>}

      {tab === "occupancy" && <>
        <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Occupancy by zone (%)</div>
          <HBarChart color="#0ea5e9" unit="%" max={100} data={[{ l: "Akanthus", v: 67 }, { l: "Central", v: 83 }, { l: "Macaw", v: 91, hi: 1 }, { l: "Bestbuy", v: 78 }, { l: "Main", v: 68 }, { l: "Bolivar", v: 66 }]} /></Card>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-3">Utilisation heatmap (week × zone)</div>
          {/* Sequential 5-step palette common in hospitality / yield reports:
              cool light = capacity to sell, warm = approaching peak. Matches
              what STR / RMS dashboards typically show for occupancy. */}
          {(() => {
            const buckets = [
              { max: 0.20, color: "#dbeafe", label: "0–20%",   tone: "Empty" },
              { max: 0.40, color: "#99f6e4", label: "20–40%",  tone: "Low" },
              { max: 0.60, color: "#5eead4", label: "40–60%",  tone: "Moderate" },
              { max: 0.80, color: "#fbbf24", label: "60–80%",  tone: "Busy" },
              { max: 1.01, color: "#ef4444", label: "80–100%", tone: "Peak" },
            ];
            const colorFor = (v: number) => (buckets.find((b) => v <= b.max) || buckets[buckets.length - 1]).color;
            return (
              <>
                <div className="space-y-1.5">
                  {ZONES.map((z) => (<div key={z.id} className="flex items-center gap-2">
                    <div className="w-16 text-[12px] text-slate-500">{z.name}</div>
                    <div className="flex gap-1">{Array.from({ length: 7 }).map((_, d) => { const v = 0.3 + ((z.total * 7 + d * 13) % 70) / 100; return <div key={d} className="w-7 h-6 rounded ring-1 ring-white/60" style={{ background: colorFor(v) }} title={`${Math.round(v * 100)}%`} />; })}</div>
                  </div>))}
                  <div className="flex gap-1 ml-[72px] pt-1 text-[10px] text-slate-600">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="w-7 text-center">{d}</div>)}</div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap text-[11.5px] text-slate-600">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">Occupancy</span>
                  {buckets.map((b) => (
                    <span key={b.label} className="inline-flex items-center gap-1.5">
                      <i className="w-4 h-4 rounded ring-1 ring-white/60 inline-block" style={{ background: b.color }} />
                      <span className="tnum">{b.label}</span>
                      <span className="text-slate-400">· {b.tone}</span>
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </Card>
      </>}

      {tab === "bookings" && <>
        <div className="grid sm:grid-cols-4 gap-4">
          <StatCard label="Avg lead time" value="2.3d" sub="ahead of date" /><StatCard label="Online vs walk-in" value="40 / 60" sub="% split" /><StatCard label="Cancellation" value="3.1%" /><StatCard label="Sets / booking" value="1.8" />
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-1">Booking volume by day</div><LineChartMini data={[{ l: "Mon", v: 120 }, { l: "Tue", v: 98 }, { l: "Wed", v: 142 }, { l: "Thu", v: 165 }, { l: "Fri", v: 210 }, { l: "Sat", v: 320 }, { l: "Sun", v: 298 }]} /></Card>
      </>}

      {tab === "channel" && <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <Card className="p-5"><div className="font-semibold text-navy-900 mb-3">Sales by channel & role</div>
          <div className="flex items-center justify-center gap-7 flex-wrap py-3">
            <Donut segments={[{ v: 40, c: "#0ea5e9" }, { v: 45, c: "#f59e0b" }, { v: 15, c: "#0D9488" }]} size={200} />
            <div className="text-[14px] space-y-3">
              <Leg c="bg-sky-500" t="Online (customer) — 40% · €281k" /><Leg c="bg-amber-500" t="Walk-in (controller) — 45% · €317k" /><Leg c="bg-teal-600" t="Cashier (on-site) — 15% · €106k" />
            </div>
          </div>
        </Card>
        <Card className="p-5"><div className="font-semibold text-navy-900 mb-2">Channel by week (€k)</div>
          <BarChart color="#0ea5e9" data={[{ l: "W1", v: 48 }, { l: "W2", v: 56 }, { l: "W3", v: 71, hi: 1 }, { l: "W4", v: 64 }, { l: "W5", v: 78 }, { l: "W6", v: 82, hi: 1 }]} />
        </Card>
      </div>}

      {tab === "customers" && <>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="New vs returning" value="38 / 62" sub="% this season" /><StatCard label="VIP segment rev" value="€118k" sub="17% of total" /><StatCard label="Season-pass holders" value="412" />
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-2">Top customers</div>
          <Table cols={["Customer", "Segment", "Visits", "Spend"]} right={[2, 3]}
            rows={TOP_CUSTOMERS.map((c) => [c.name, <Badge tone={c.segment.tone}>{c.segment.label}</Badge>, c.visits, c.spend])} /></Card>
      </>}

      {tab === "tickets" && <Card className="p-5"><div className="flex items-center justify-between mb-2"><div className="font-semibold text-navy-900">Ticket history</div><Btn size="sm" variant="outline" icon={Icon.download} onClick={() => toast("Demo — CSV export.")}>CSV</Btn></div>
        <Table cols={["Ticket", "Category", "Issuer", "Date", "Customer type", "Revenue", "Status"]} right={[5]}
          rows={REPORTING_TICKETS.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], <Badge tone={r[6].tone}>{r[6].label}</Badge>])} /></Card>}

      {tab === "daily" && <Card className="p-5"><div className="flex items-center justify-between mb-2"><div className="font-semibold text-navy-900">Daily operations · 19 Jul 2026</div><Btn size="sm" variant="outline" icon={Icon.download} onClick={() => toast("Demo — export end-of-day report.")}>Export</Btn></div>
        <Table cols={["Capability", "Count", "Gross", "Refunds", "Net"]} right={[1, 2, 3, 4]} rows={(() => {
          const totals = DAILY_OPS.reduce((a, r) => ({ c: a.c + r[1], g: a.g + parseFloat(r[2].replace(/[^0-9.]/g, "")), rf: a.rf + parseFloat(r[3].replace(/[^0-9.−-]/g, "").replace("−", "-")), n: a.n + parseFloat(r[4].replace(/[^0-9.]/g, "")) }), { c: 0, g: 0, rf: 0, n: 0 });
          return [
            ...DAILY_OPS.map((r) => [r[0], r[1], r[2], r[3] === "€0" ? "€0" : <span className="text-rose-600 font-medium tnum">{r[3]}</span>, r[4]]),
            [<b>Total</b>, <b>{totals.c}</b>, <b>€{totals.g.toLocaleString()}</b>, <b className="text-rose-600">€{totals.rf.toLocaleString()}</b>, <b>€{totals.n.toLocaleString()}</b>],
          ];
        })()} />
        <div className="mt-3 text-[12px] text-slate-600">Documents issued: 726 ΑΠΥ · 12 ΤΠΥ · all transmitted to MyDATA ✓</div></Card>}
    </div>
  );
}

/* ============ REFUNDS ============ */
// Stripe refund demo steps — shown one-by-one after "Refund via Stripe".
const STRIPE_STEPS: { label: string; icon: IconRenderer }[] = [
  { label: "Authorizing with Stripe", icon: Icon.lock },
  { label: "Reversing the charge & application fee", icon: Icon.refund },
  { label: "Issuing MyDATA credit note (5.1)", icon: Icon.shield },
  { label: "E-mailing the customer", icon: Icon.mail },
];

function StripeProgress({ step }: { step: number }) {
  return (
    <div className="py-1 space-y-2.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><Spinner size={14} /> Processing refund via Stripe…</div>
      <div className="space-y-1.5">
        {STRIPE_STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          const StepIcon = s.icon;
          return (
            <div key={i} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 transition ${state === "done" ? "ring-teal-200 bg-teal-50/60" : state === "active" ? "ring-slate-200 bg-white shadow-soft" : "ring-slate-100 bg-slate-50/50 opacity-55"}`}>
              <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${state === "done" ? "bg-teal-600 text-white" : state === "active" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-400"}`}>
                {state === "done" ? <Icon.check size={13} /> : state === "active" ? <Spinner size={12} /> : <StepIcon size={12} />}
              </span>
              <span className={`text-[13px] ${state === "todo" ? "text-slate-400" : "text-navy-900"}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RefundDone({ amount, type, reason, tx }: { amount: number; type: string; reason: string; tx: string }) {
  return (
    <div className="py-2 text-center space-y-2 animate-pop">
      <span className="mx-auto w-12 h-12 rounded-full bg-teal-600 text-white grid place-items-center shadow"><Icon.check size={22} /></span>
      <div className="font-semibold text-navy-900">Refunded €{amount}</div>
      <div className="text-[13px] text-slate-600 max-w-xs mx-auto">{type} · {reason}. Stripe charge reversed, credit note (5.1) filed with MyDATA, and a confirmation e-mailed to the customer.</div>
      <div className="text-[11px] text-slate-400 tnum">{tx} · re_3PqA2k…f4d</div>
    </div>
  );
}

export function AdminRefunds() {
  const { toast } = useApp();
  const [modal, setModal] = useState<number | null>(null);
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState(ADMIN_REFUNDS);
  const [stage, setStage] = useState<"form" | "processing" | "done">("form");
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("Weather");
  const [rtype, setRtype] = useState("Full refund");
  // Partial-refund amount the operator types; `committed` freezes it at submit
  // so the processing/done stages and the row update agree on one figure.
  const [amount, setAmount] = useState(0);
  const [committed, setCommitted] = useState(0);
  const refunded = rows.filter((r) => r.status === "Refunded").reduce((a, b) => a + (b.refundAmount ?? b.amount), 0);
  const refundedCount = rows.filter((r) => r.status === "Refunded").length;
  const pending = rows.filter((r) => !r.status).length;
  const active = modal !== null ? rows[modal] : null;
  const activeLast = active ? personByFirst(active.who)?.last ?? "" : "";
  const total = active?.amount ?? 0;
  const partial = rtype === "Partial refund";
  // A partial refund must be a positive amount no larger than the charge.
  const validAmount = !partial || (amount > 0 && amount <= total);

  const openRefund = (i: number) => { setStage("form"); setStep(0); setReason("Weather"); setRtype("Full refund"); setAmount(rows[i].amount); setModal(i); };

  // Walk through the Stripe steps once processing starts, then mark refunded.
  useEffect(() => {
    if (stage !== "processing") return;
    if (step < STRIPE_STEPS.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 850);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setRows((r) => r.map((x, i) => (i === modal ? { ...x, status: "Refunded", reason: x.reason || reason, refundAmount: committed } : x)));
      setStage("done");
      toast(`Stripe refund of €${committed} issued · credit note (5.1) sent to MyDATA · customer e-mailed.`, { tone: "success" });
    }, 600);
    return () => clearTimeout(t);
  }, [stage, step, modal, reason, committed, toast]);

  return (
    <div className="animate-fade-up">
      <PageHead title="Refunds" sub="Partial or full refunds via Stripe, with reason logging and auto credit-note (MyDATA)." badge={<Badge tone="mvp">MVP</Badge>}
        actions={<>
          <Tabs tabs={[["week", "Week"], ["month", "Month"], ["season", "Season"]]} value={period} onChange={setPeriod} />
          <Btn variant="outline" icon={Icon.download} onClick={() => toast("Demo — refund history CSV.")}>Export</Btn>
        </>} />
      <div className="grid sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Refunded · this month" value={`€${refunded}`} sub={`${refundedCount} transaction${refundedCount !== 1 ? "s" : ""}`} tone="teal" />
        <StatCard label="Pending review" value={pending} sub="awaiting decision" />
        <StatCard label="Refund rate" value="1.4%" sub="of total sales" />
        <StatCard label="Top reason" value="Double booking" sub="33% of refunds" tone="indigo" />
      </div>
      <Card className="p-2">
        <Table cols={["Transaction", "Date", "Name", "Surname", "Phone", "Amount", "Reason", "Status", ""]} right={[5]}
          rows={rows.map((r, i) => {
            const p = personByFirst(r.who);
            return [r.tx, r.date || "—", r.who, p?.last || "—", p?.phone ? <span className="tnum whitespace-nowrap">{p.phone}</span> : "—",
              r.refundAmount != null && r.refundAmount < r.amount
                ? <div className="leading-tight"><span className="tnum">€{r.amount}</span><div className="text-[11px] text-rose-600 tnum">−€{r.refundAmount} refunded</div></div>
                : `€${r.amount}`,
              r.reason || "—",
              r.status ? <Badge tone="green">{r.status}</Badge> : <Badge tone="amber">Pending</Badge>,
              r.status ? <span className="text-slate-500 text-sm">done</span> : <Btn size="sm" variant="outline" icon={Icon.refund} onClick={() => openRefund(i)}>Refund</Btn>];
          })} />
      </Card>
      <Modal open={modal !== null} onClose={() => setModal(null)} title={stage === "done" ? "Refund complete" : "Issue refund"}
        footer={
          stage === "form" ? (<><Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" icon={Icon.refund} disabled={!validAmount} onClick={() => { setCommitted(partial ? amount : total); setStep(0); setStage("processing"); }}>Refund €{partial ? (validAmount ? amount : 0) : total} via Stripe</Btn></>)
          : stage === "done" ? (<Btn variant="primary" icon={Icon.check} onClick={() => setModal(null)}>Done</Btn>)
          : undefined
        }>
        {active && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm flex justify-between"><span className="text-slate-500">{active.tx} · {active.who} {activeLast}</span><b className="tnum">€{active.amount}</b></div>
            {stage === "form" && (
              <>
                <Field label="Refund type"><Select value={rtype} onChange={(e) => setRtype(e.target.value)} options={["Full refund", "Partial refund"]} /></Field>
                {partial && (
                  <Field label="Refund amount (€)">
                    <Input type="number" min={1} max={total} step={1} value={amount}
                      onChange={(e) => setAmount(Math.max(0, Math.min(total, Math.round(+e.target.value) || 0)))}
                      className={!validAmount ? "ring-2 ring-rose-400 focus:ring-rose-400" : ""} />
                    {!validAmount ? (
                      <div className="text-[11px] text-rose-600 mt-1">Enter an amount between €1 and €{total}.</div>
                    ) : amount < total ? (
                      <div className="text-[11px] text-slate-500 mt-1 tnum">Up to €{total} · €{amount} returned, €{total - amount} stays charged.</div>
                    ) : (
                      <div className="text-[11px] text-slate-500 mt-1 tnum">Refunding the full €{total} — switch to “Full refund” if intended.</div>
                    )}
                  </Field>
                )}
                <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} options={["Weather", "Double booking", "Customer request", "Service issue"]} /></Field>
                <div className="text-[12px] text-slate-600 flex items-center gap-1.5"><Icon.shield size={13} /> Reverses the application fee and auto-issues a credit note to MyDATA.</div>
              </>
            )}
            {stage === "processing" && <StripeProgress step={step} />}
            {stage === "done" && <RefundDone amount={committed} type={rtype} reason={reason} tx={active.tx} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============ COMMUNICATE (Future) ============ */
/* Campaign channels — same Email/Viber/SMS family as the QR send-picker, plus
   Push (the in-app notification the preview mocks up). */
const CAMPAIGN_CHANNELS: { key: string; label: string; icon: IconRenderer; color: string }[] = [
  { key: "Push notification", label: "Push", icon: Icon.bell, color: "#3a47cc" },
  { key: "E-mail", label: "E-mail", icon: Icon.mail, color: "#0d9488" },
  { key: "Viber", label: "Viber", icon: Icon.chat, color: "#7360f2" },
  { key: "SMS", label: "SMS", icon: Icon.phone, color: "#16a34a" },
];

/* A channel-true preview of the message, so the operator sees what lands. */
function CampaignPreview({ channel, msg }: { channel: string; msg: string }) {
  if (channel === "E-mail")
    return (
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4 shadow-lift">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2"><Icon.mail size={12} /> Akti tou Iliou &lt;hello@aktitouiliou.gr&gt;</div>
        <div className="font-semibold text-navy-900 text-sm">Weekend at the beach</div>
        <div className="text-[12px] text-slate-600 leading-snug mt-1 line-clamp-4">{msg}</div>
        <span className="inline-flex items-center mt-3 bg-navy-900 text-white text-[11px] font-semibold rounded-lg px-2.5 py-1">Book now</span>
      </div>
    );
  if (channel === "Viber")
    return (
      <div className="rounded-2xl bg-[#f4f2fb] ring-1 ring-[#7360f2]/25 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7360f2] mb-1.5"><Icon.chat size={12} /> Viber · Akti tou Iliou</div>
        <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-3 py-2 text-[12.5px] text-navy-900 leading-snug">{msg}</div>
      </div>
    );
  if (channel === "SMS")
    return (
      <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mb-1.5"><Icon.phone size={12} /> SMS · Akti tou Iliou</div>
        <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-sm shadow-sm px-3 py-2 text-[12.5px] leading-snug ml-auto max-w-[92%]">{msg}</div>
      </div>
    );
  return (
    <div className="rounded-2xl bg-navy-950 text-white p-4 shadow-lift">
      <div className="flex items-center gap-2 text-[11px] text-white/70 mb-2"><Icon.bell size={12} /> Akti tou Iliou · now</div>
      <div className="font-semibold text-sm">Weekend at the beach</div>
      <div className="text-[12px] text-white/80 leading-snug mt-0.5 line-clamp-3">{msg}</div>
    </div>
  );
}

/* Review → send → sent confirmation, so "Send campaign" is a deliberate journey
   (who · which channel · what), not a one-click fire. */
function CampaignReviewModal({ open, onClose, channel, seg, reach, msg, onSend }: {
  open: boolean; onClose: () => void; channel: string; seg: string; reach: string; msg: string; onSend: () => void;
}) {
  const [stage, setStage] = useState<"review" | "sent">("review");
  useEffect(() => { if (open) setStage("review"); }, [open]);
  const ch = CAMPAIGN_CHANNELS.find((c) => c.key === channel) ?? CAMPAIGN_CHANNELS[0];
  const CIcon = ch.icon;
  return (
    <Modal open={open} onClose={onClose} title={stage === "sent" ? "Campaign sent" : "Review campaign"}
      footer={stage === "review"
        ? <><Btn variant="ghost" onClick={onClose}>Back</Btn><Btn variant="primary" icon={CIcon} onClick={() => { onSend(); setStage("sent"); }}>Send to {reach} users</Btn></>
        : <Btn variant="primary" icon={Icon.check} onClick={onClose}>Done</Btn>}>
      {stage === "review" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
            <span className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm shrink-0" style={{ background: ch.color }}><CIcon size={16} /></span>
            <div className="min-w-0"><div className="text-[11px] text-slate-500">Channel</div><div className="text-[13px] font-semibold text-navy-900">{ch.key}</div></div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl grid place-items-center bg-slaice-100 text-slaice-700 shrink-0"><Icon.users size={16} /></span>
              <div className="min-w-0"><div className="text-[11px] text-slate-500">Audience</div><div className="text-[13px] font-semibold text-navy-900 truncate">{seg}</div></div>
            </div>
            <div className="text-right shrink-0"><div className="text-[11px] text-slate-500">Est. reach</div><div className="text-[13px] font-semibold text-navy-900 tnum">{reach}</div></div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-1">Message</div>
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5 text-[13px] text-navy-900 leading-snug whitespace-pre-wrap">{msg || <span className="text-slate-400">No message.</span>}</div>
          </div>
        </div>
      ) : (
        <div className="py-2 text-center space-y-2 animate-pop">
          <span className="mx-auto w-12 h-12 rounded-full bg-teal-600 text-white grid place-items-center shadow"><Icon.check size={22} /></span>
          <div className="font-semibold text-navy-900">Sent to {reach} {seg} guests</div>
          <div className="text-[13px] text-slate-600 max-w-xs mx-auto">Delivered via <b>{ch.key}</b>. Opens and clicks will appear in Reporting → Channels.</div>
        </div>
      )}
    </Modal>
  );
}

export function AdminCommunicate() {
  const { toast } = useApp();
  const [seg, setSeg] = useState("VIP");
  const [msg, setMsg] = useState("☀️ Weekend offer: 20% off front-row sunbeds at Akti tou Iliou. Book now!");
  const [channel, setChannel] = useState("Push notification");
  const [review, setReview] = useState(false);
  const reach = seg === "All users" ? "8,420" : seg === "VIP" ? "318" : "1,204";
  return (
    <div className="animate-fade-up">
      <PageHead title="Communicate" sub="Message users or segments with notifications and offers — builds on tags/segmentation." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card className="p-5 space-y-3">
          <Field label="Audience segment"><Select value={seg} onChange={(e) => setSeg(e.target.value)} options={["VIP", "Season pass", "Regulars", "New", "All users"]} /></Field>
          <Field label="Channel">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAMPAIGN_CHANNELS.map((c) => {
                const on = channel === c.key;
                const CIcon = c.icon;
                return (
                  <button key={c.key} type="button" onClick={() => setChannel(c.key)} aria-pressed={on}
                    className={`rounded-xl p-2.5 text-center ring-1 transition ${on ? "ring-2 ring-teal-500 bg-teal-50/50" : "ring-slate-200 bg-white hover:ring-teal-400"}`}>
                    <span className="mx-auto mb-1.5 w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm" style={{ background: c.color }}><CIcon size={16} /></span>
                    <div className="text-[12.5px] font-semibold text-navy-900">{c.label}</div>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Message"><textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/70 outline-none" /></Field>
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-slate-600">Est. reach: <b className="text-navy-900">{reach}</b> users · via {channel}</div>
            <Btn variant="primary" icon={Icon.bell} disabled={!msg.trim()} onClick={() => setReview(true)}>Send campaign</Btn>
          </div>
        </Card>
        <aside className="space-y-3 lg:sticky lg:top-24 h-max">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 px-1">Preview</div>
          <CampaignPreview channel={channel} msg={msg} />
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 backdrop-blur p-4 space-y-3 text-[12px] text-slate-600">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.users size={14} /> Audience</div>
              <Badge tone="indigo">{seg}</Badge>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span>Est. reach</span>
                <b className="text-navy-900 tnum">{reach}</b>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-slaice-500 to-teal-500" style={{ width: `${Math.min(100, (parseInt(reach.replace(/,/g, ""), 10) / 8420) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span>0</span>
                <span>8,420 total</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
              {["VIP", "Season pass", "Regulars", "New"].map((t) => (
                <button key={t} onClick={() => setSeg(t === "Regulars" ? "Regulars" : t)} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 transition ${seg === t ? "bg-slaice-600 text-white ring-slaice-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-slaice-400"}`}>{t}</button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500">Built on Users & Segments — change tags to grow the reach.</div>
          </div>
        </aside>
      </div>
      <CampaignReviewModal
        open={review}
        onClose={() => setReview(false)}
        channel={channel}
        seg={seg}
        reach={reach}
        msg={msg}
        onSend={() => toast(`Demo — campaign sent to ${reach} ${seg} guests via ${channel}.`, { tone: "success" })}
      />
    </div>
  );
}

/* ============ LOYALTY (Future) ============
   A handful of proven loyalty patterns (stamp cards, happy hours, tiers, bundles,
   referrals, birthday treats) — each one configurable via a typed field schema,
   plus a way to add your own. Below sit two working demo builders: a timed public
   offer and a visit-milestone email campaign whose audience comes from the real
   roster. Schemes are data-driven (fields + a summary builder), so the config
   modal and the card both render from one source — no per-scheme forms. */

/* Scheme model + built-in schemes live in data/loyalty.ts (shared with the
   customer Home). The config modal + admin UI stay here. */

/* One control per field type — keeps the config modal declarative. */
function SchemeFieldControl({ field, value, onChange }: { field: SchemeField; value: string | number; onChange: (v: string | number) => void }) {
  if (field.type === "select") return <Select value={String(value)} onChange={(e) => onChange(e.target.value)} options={field.options} />;
  if (field.type === "time") return <Input type="time" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "number")
    return (
      <div className="flex items-center gap-2">
        <Input type="number" min={field.min} max={field.max} value={Number(value)}
          onChange={(e) => onChange(Math.max(field.min ?? 0, Math.min(field.max ?? 9999, Math.round(+e.target.value) || field.min || 0)))} />
        {field.suffix && <span className="text-[12px] text-slate-500 shrink-0">{field.suffix}</span>}
      </div>
    );
  return <Input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
}

/* Configure a scheme's parameters. Mounted only while open, so it always seeds
   fresh from the saved values (or the scheme defaults for a first set-up). */
function SchemeConfigModal({ scheme, initial, configured, onSave, onClose }: {
  scheme: LoyaltyScheme; initial: SchemeValues; configured: boolean; onSave: (v: SchemeValues) => void; onClose: () => void;
}) {
  const [values, setValues] = useState<SchemeValues>(initial);
  const SIcon = scheme.icon;
  const heading = scheme.custom ? String(values.title || "Custom scheme") : scheme.title;
  return (
    <Modal open onClose={onClose} wide
      title={<span className="inline-flex items-center gap-2"><SIcon size={18} className="text-slaice-600" /> Configure · {heading}</span>}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon={Icon.check} onClick={() => onSave(values)}>{configured ? "Save changes" : "Save & activate"}</Btn></>}>
      <div className="space-y-3">
        <p className="text-[13px] text-slate-600 -mt-1">{scheme.blurb}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {scheme.fields.map((f) => (
            <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
              <Field label={f.label}>
                <SchemeFieldControl field={f} value={values[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
              </Field>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-teal-50/70 ring-1 ring-teal-200 px-3 py-2 text-[12.5px] text-navy-900"><b>Preview:</b> {scheme.summarize(values)}</div>
      </div>
    </Modal>
  );
}

export function AdminLoyalty() {
  const { toast, loyalty, setLoyalty } = useApp();
  const [reward, setReward] = useState("20% off sunbeds");
  const [store, setStore] = useState("All stores");
  const [schedule, setSchedule] = useState("Weekday mornings");
  const [offers, setOffers] = useState<{ id: number; reward: string; store: string; schedule: string }[]>([]);
  const [send, setSend] = useState<{ off: string; count: number } | null>(null);
  const idRef = useRef(0);
  const tier = (min: number) => CUSTOMERS.filter((c) => c.bookings >= min).length;

  // Scheme lifecycle: a scheme is "configured" once it has saved values; the
  // `enabled` flag then turns it live/paused without losing the config. Custom
  // schemes are added at runtime and removable.
  const config = loyalty.config;
  const customs = useMemo(() => loyalty.customIds.map(makeCustomScheme), [loyalty.customIds]);
  const [editing, setEditing] = useState<string | null>(null);
  const allSchemes = useMemo(() => [...BUILTIN_SCHEMES, ...customs], [customs]);
  const activeCount = Object.values(config).filter((c) => c.enabled).length;
  const editScheme = editing ? allSchemes.find((s) => s.id === editing) ?? null : null;

  const saveConfig = (id: string, values: SchemeValues) => {
    setLoyalty((s) => ({ ...s, config: { ...s.config, [id]: { enabled: true, values } } }));
    const sch = allSchemes.find((s) => s.id === id);
    const name = sch?.custom ? String(values.title || "Custom scheme") : sch?.title;
    toast(`Enabled “${name}” — now live for guests.`, { tone: "success" });
    setEditing(null);
  };
  const closeConfig = () => {
    // Drop a brand-new custom card if its first set-up was cancelled.
    if (editing && !config[editing]) setLoyalty((s) => ({ ...s, customIds: s.customIds.filter((c) => c !== editing) }));
    setEditing(null);
  };
  const toggleEnabled = (id: string) => {
    const willEnable = !config[id]?.enabled;
    setLoyalty((s) => (s.config[id] ? { ...s, config: { ...s.config, [id]: { ...s.config[id], enabled: willEnable } } } : s));
    const sch = allSchemes.find((s) => s.id === id);
    const name = sch?.custom ? String(config[id]?.values.title || "Custom scheme") : sch?.title;
    toast(willEnable ? `Resumed “${name}”.` : `Paused “${name}”.`, willEnable ? { tone: "success" } : {});
  };
  const addCustom = () => {
    const id = `custom-${Date.now().toString(36)}`;
    setLoyalty((s) => ({ ...s, customIds: [...s.customIds, id] }));
    setEditing(id);
  };
  const removeCustom = (id: string) => {
    setLoyalty((s) => { const cfg = { ...s.config }; delete cfg[id]; return { ...s, customIds: s.customIds.filter((c) => c !== id), config: cfg }; });
    toast("Removed scheme.");
  };

  const publish = () => {
    setOffers((o) => [{ id: ++idRef.current, reward, store, schedule }, ...o]);
    toast(`Published offer: ${reward} (${store} · ${schedule}).`, { tone: "success" });
  };
  const tiers = [
    { min: 5, off: "10% off", tone: "slate" },
    { min: 10, off: "15% off + free coffee", tone: "blue" },
    { min: 20, off: "VIP: front row + free parking", tone: "amber" },
  ];

  return (
    <div className="animate-fade-up">
      <PageHead title="Loyalty" sub="Reward repeat guests and fill the quiet hours — schemes, timed offers and visit-based campaigns." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />

      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2 px-1">Pick a scheme to set up{activeCount > 0 && <span className="text-teal-600"> · {activeCount} active</span>}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allSchemes.map((s) => {
            const SIcon = s.icon;
            const st = config[s.id];
            const configured = !!st;
            const on = !!st?.enabled;
            const title = s.custom ? String(st?.values.title ?? s.title) : s.title;
            return (
              <Card key={s.id} className={`p-4 flex flex-col gap-2 transition ${on ? "ring-2 ring-teal-500" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${on ? "bg-teal-600 text-white" : "bg-slaice-100 text-slaice-700"}`}><SIcon size={18} /></span>
                  <div className="font-semibold text-navy-900 flex-1 min-w-0 truncate">{title}</div>
                  {configured && <Toggle on={on} onChange={() => toggleEnabled(s.id)} />}
                </div>
                <div className="text-[13px] text-slate-600 leading-snug">{s.blurb}</div>
                {configured ? (
                  <div className="text-[12.5px] text-navy-900 rounded-lg bg-teal-50/70 ring-1 ring-teal-200 px-2.5 py-1.5 flex items-start gap-1.5">
                    <Icon.check size={13} className="text-teal-600 shrink-0 mt-0.5" /><span>{s.summarize(st.values)}</span>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-500 rounded-lg bg-slate-50 ring-1 ring-slate-100 px-2.5 py-1.5">e.g. {s.eg}</div>
                )}
                <div className="mt-auto flex gap-2 pt-0.5">
                  {configured ? (
                    <>
                      <Btn variant="outline" size="sm" full icon={Icon.edit} onClick={() => setEditing(s.id)}>Edit configuration</Btn>
                      {s.custom && (
                        <button type="button" onClick={() => removeCustom(s.id)} aria-label={`Remove ${title}`}
                          className="shrink-0 w-9 h-9 rounded-[14px] grid place-items-center ring-1 ring-slate-200 text-rose-600 hover:bg-rose-50 hover:ring-rose-300 transition"><Icon.trash size={15} /></button>
                      )}
                    </>
                  ) : (
                    <Btn variant="tint" size="sm" full icon={Icon.plus} onClick={() => setEditing(s.id)}>Set up</Btn>
                  )}
                </div>
              </Card>
            );
          })}
          <button type="button" onClick={addCustom}
            className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/40 transition grid place-items-center p-6 text-center min-h-[176px] group">
            <span className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-teal-700">
              <span className="w-11 h-11 rounded-2xl bg-white ring-1 ring-slate-200 group-hover:ring-teal-300 grid place-items-center shadow-sm transition"><Icon.plus size={20} /></span>
              <span className="text-[13px] font-semibold">Add a custom scheme</span>
              <span className="text-[11.5px] text-slate-400 group-hover:text-teal-600">Name it, pick a reward, choose when.</span>
            </span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Timed public offer builder */}
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.clock size={16} /> Timed public offer</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Run a deal for everyone, on the dates and hours you choose.</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Reward"><Select value={reward} onChange={(e) => setReward(e.target.value)} options={LOYALTY_REWARDS} /></Field>
            <Field label="Applies to"><Select value={store} onChange={(e) => setStore(e.target.value)} options={["All stores", ...ZONES.map((z) => z.name)]} /></Field>
            <Field label="When"><Select value={schedule} onChange={(e) => setSchedule(e.target.value)} options={["Weekday mornings", "Weekends", "Specific date range", "All month", "Happy hour 17:00–19:00"]} /></Field>
            <Field label="Time window"><div className="flex items-center gap-2"><Input type="time" defaultValue="09:00" /><span className="text-slate-400">–</span><Input type="time" defaultValue="11:00" /></div></Field>
          </div>
          <div className="rounded-xl bg-teal-50/70 ring-1 ring-teal-200 px-3 py-2 text-[12.5px] text-navy-900"><b>Preview:</b> {reward} · {store} · {schedule}.</div>
          <div className="flex justify-end">
            <Btn variant="primary" icon={Icon.check} onClick={publish}>Publish offer</Btn>
          </div>
          {offers.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 pt-2">Live offers · {offers.length}</div>
              {offers.map((o) => (
                <div key={o.id} className="flex items-center gap-2 rounded-lg ring-1 ring-teal-200 bg-teal-50/50 px-3 py-2 text-[12.5px] animate-pop">
                  <Icon.clock size={13} className="text-teal-600 shrink-0" />
                  <span className="flex-1 min-w-0 text-navy-900"><b>{o.reward}</b> · {o.store} · {o.schedule}</span>
                  <button type="button" onClick={() => setOffers((x) => x.filter((y) => y.id !== o.id))} className="text-slate-400 hover:text-rose-600 shrink-0" aria-label="Remove offer"><Icon.x size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Visit-milestone campaign — audience from the real roster */}
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.mail size={16} /> Reward your regulars</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Message guests who keep coming back this season — the audience comes from Users &amp; Segments.</div>
          <div className="space-y-2">
            {tiers.map((t) => (
              <div key={t.min} className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <span className="w-10 h-10 rounded-lg bg-slaice-100 text-slaice-700 grid place-items-center font-bold tnum text-[13px] shrink-0">{t.min}+</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-navy-900 flex items-center gap-1.5 flex-wrap">Visited {t.min}+ times → <Badge tone={t.tone}>{t.off}</Badge></div>
                  <div className="text-[11px] text-slate-500"><b className="tnum">{tier(t.min)}</b> guests qualify this season</div>
                </div>
                <Btn size="sm" variant="outline" icon={Icon.mail} onClick={() => setSend({ off: t.off, count: tier(t.min) })}>Send</Btn>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Icon.info size={13} /> Thresholds and rewards here are examples — tell me which you like and I’ll wire them up.</div>
        </Card>
      </div>

      {editScheme && (
        <SchemeConfigModal
          scheme={editScheme}
          configured={!!config[editScheme.id]}
          initial={config[editScheme.id]?.values ?? schemeDefaults(editScheme)}
          onSave={(v) => saveConfig(editScheme.id, v)}
          onClose={closeConfig}
        />
      )}

      <SendModal
        open={send !== null}
        onClose={() => setSend(null)}
        title="Send offer to regulars"
        intro={send ? `Send “${send.off}” to the ${send.count} guests who qualify.` : undefined}
        email={send ? `${send.count} guests` : undefined}
        phone={send ? `${send.count} guests` : undefined}
        sendLabel="Send"
        onSend={(ch) => toast(`Sent “${send?.off}” to ${send?.count} guests via ${ch}.`, { tone: "success" })}
      />
    </div>
  );
}

/* ============ PASSES (Future) ============
   VIP credit packs and Season-pass pricing — the prices guests see when buying a
   pass on the customer app. Editable here, read live by the purchase flow. */
export function AdminPasses() {
  const { toast, passPricing, setPassPricing } = useApp();
  const [tiers, setTiers] = useState<number[]>(passPricing.vipTiers);
  const [disc, setDisc] = useState(Math.round(passPricing.vipDiscount * 100));
  const [monthly, setMonthly] = useState(passPricing.seasonMonthly);
  const [summer, setSummer] = useState(passPricing.seasonSummer);
  const setTier = (i: number, v: number) => setTiers((ts) => ts.map((x, j) => (j === i ? v : x)));
  const addTier = () => setTiers((ts) => [...ts, 250]);
  const removeTier = (i: number) => setTiers((ts) => (ts.length > 1 ? ts.filter((_, j) => j !== i) : ts));
  const spendsLike = (amt: number) => Math.round(amt / (1 - Math.min(95, Math.max(0, disc)) / 100));
  const save = () => {
    setPassPricing({
      vipTiers: tiers.map((n) => Math.max(0, Math.round(n))).filter((n) => n > 0),
      vipDiscount: Math.min(95, Math.max(0, disc)) / 100,
      seasonMonthly: Math.max(0, Math.round(monthly)),
      seasonSummer: Math.max(0, Math.round(summer)),
    });
    toast("Saved — pass pricing is live on the customer app.", { tone: "success" });
  };
  return (
    <div className="animate-fade-up">
      <PageHead title="Passes" sub="VIP credit packs and Season-pass pricing — what guests see when buying a pass." badge={<Badge tone="future">Future</Badge>}
        actions={<Btn variant="primary" icon={Icon.check} onClick={save}>Save pricing</Btn>} />
      <FutureBanner />
      <div className="grid lg:grid-cols-2 gap-5">
        {/* VIP credit */}
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.sparkles size={16} className="text-slaice-600" /> VIP credit</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Prepaid credit guests spend at checkout — the discount applies to whatever the credit pays for.</div>
          <Field label="Spend discount">
            <div className="flex items-center gap-2 max-w-[10rem]">
              <Input type="number" min={0} max={95} value={disc} onChange={(e) => setDisc(Math.max(0, Math.min(95, Math.round(+e.target.value) || 0)))} />
              <span className="text-[12px] text-slate-500">% off</span>
            </div>
          </Field>
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Credit packs</div>
            <div className="space-y-2">
              {tiers.map((amt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">€</span>
                  <div className="w-28"><Input type="number" min={0} value={amt} onChange={(e) => setTier(i, Math.max(0, Math.round(+e.target.value) || 0))} /></div>
                  <span className="text-[12px] text-slate-500 flex-1">credit · spends like <b className="text-navy-900 tnum">€{spendsLike(amt).toLocaleString()}</b></span>
                  <button type="button" onClick={() => removeTier(i)} aria-label="Remove pack" disabled={tiers.length <= 1}
                    className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition"><Icon.trash size={15} /></button>
                </div>
              ))}
            </div>
            <Btn variant="ghost" size="sm" icon={Icon.plus} className="mt-2" onClick={addTier}>Add pack</Btn>
          </div>
          <div className="rounded-xl bg-slaice-50 ring-1 ring-slaice-600/15 px-3 py-2 text-[12px] text-slaice-700">Valid to the end of the season · spent on any service · the {disc}% applies to the card-paid share.</div>
        </Card>

        {/* Season pass */}
        <Card className="p-5 space-y-3">
          <div className="font-semibold text-navy-900 flex items-center gap-2"><Icon.ticket size={16} className="text-teal-600" /> Season pass</div>
          <div className="text-[12.5px] text-slate-600 -mt-1">Covers one entry ticket per visit while valid. Two plans for guests to choose:</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Monthly (€)"><Input type="number" min={0} value={monthly} onChange={(e) => setMonthly(Math.max(0, Math.round(+e.target.value) || 0))} /></Field>
            <Field label="Whole summer (€)"><Input type="number" min={0} value={summer} onChange={(e) => setSummer(Math.max(0, Math.round(+e.target.value) || 0))} /></Field>
          </div>
          <div className="rounded-xl bg-teal-50 ring-1 ring-teal-600/15 px-3 py-2 text-[12px] text-teal-700">At checkout, one entry per visit is auto-covered for pass holders.</div>
        </Card>
      </div>
      <div className="mt-4 text-[12px] text-slate-500 flex items-center gap-1.5"><Icon.info size={13} /> Changes apply instantly to the customer’s VIP / Season-pass purchase screens.</div>
    </div>
  );
}

/* ---- DSAR handling journey ---- */
type DsarRow = (typeof DSAR_QUEUE)[number];

const DSAR_TYPE_DONE: Record<string, string> = {
  Access: "Data package compiled and a secure download link e-mailed to the verified address.",
  Portability: "A portable copy (JSON + receipts) was compiled and a secure link e-mailed.",
  Erasure: "Personal data erased. Invoices are kept under Greek tax law (5 years) and were excluded.",
  Rectification: "The record was corrected and any affected receipt re-issued; the subject was notified.",
  Objection: "Marketing and profiling were restricted for this subject; a confirmation was e-mailed.",
};

interface DsarStep { label: string; detail: string; icon: IconRenderer; action: string }
function dsarSteps(type: string): DsarStep[] {
  const verify: DsarStep = { label: "Verify identity", detail: "Confirm the requester owns the account (e-mail / ID match).", icon: Icon.shieldCheck, action: "Identity verified" };
  const locate: DsarStep = { label: "Locate personal data", detail: "Gather across bookings, invoices, consents and support history.", icon: Icon.search, action: "Data located" };
  switch (type) {
    case "Access":
    case "Portability":
      return [verify, locate,
        { label: "Compile export", detail: "Build a machine-readable package (JSON + PDF receipts).", icon: Icon.database, action: "Package built" },
        { label: "Send secure download", detail: "E-mail a time-limited link to the verified address.", icon: Icon.mail, action: "Link sent" }];
    case "Erasure":
      return [verify, locate,
        { label: "Apply legal holds", detail: "Invoices (ΑΠΥ/ΤΠΥ) are kept 5 years by Greek tax law — excluded from erasure.", icon: Icon.shield, action: "Holds applied" },
        { label: "Erase the rest", detail: "Delete profile, marketing history and non-retained records.", icon: Icon.trash, action: "Data erased" },
        { label: "Confirm to subject", detail: "E-mail confirmation of what was erased and what was retained.", icon: Icon.mail, action: "Confirmation sent" }];
    case "Rectification":
      return [verify,
        { label: "Locate the record", detail: "Find the field(s) the subject asked to correct.", icon: Icon.search, action: "Record found" },
        { label: "Apply correction", detail: "Update name / e-mail / phone and re-issue any affected receipt.", icon: Icon.edit, action: "Correction applied" },
        { label: "Confirm to subject", detail: "E-mail confirmation of the change.", icon: Icon.mail, action: "Confirmation sent" }];
    default: // Objection / Restriction
      return [verify,
        { label: "Identify processing", detail: "Find the marketing / profiling the subject objects to.", icon: Icon.sliders, action: "Processing identified" },
        { label: "Restrict processing", detail: "Pause marketing consents and flag the account.", icon: Icon.lock, action: "Processing restricted" },
        { label: "Confirm to subject", detail: "E-mail confirmation that processing is restricted.", icon: Icon.mail, action: "Confirmation sent" }];
  }
}

const dsarTone = (type: string) => (type === "Erasure" ? "red" : type === "Access" ? "blue" : "slate");

function DsarHandleModal({ request, onClose, onComplete }: { request: DsarRow | null; onClose: () => void; onComplete: () => void }) {
  const [stage, setStage] = useState<"work" | "done">("work");
  const [step, setStep] = useState(0);
  // Reset only when a *different* request opens (keyed by id, so completing —
  // which swaps the row object but keeps the id — doesn't bounce back to step 0).
  useEffect(() => { setStage("work"); setStep(0); }, [request?.id]);
  const steps = request ? dsarSteps(request.type) : [];
  const allDone = step >= steps.length;
  return (
    <Modal open={request !== null} onClose={onClose} title={stage === "done" ? "Request completed" : request ? `Handle ${request.id}` : "Handle request"}
      footer={!request ? undefined : stage === "done"
        ? <Btn variant="primary" icon={Icon.check} onClick={onClose}>Close</Btn>
        : <><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon={Icon.shieldCheck} disabled={!allDone} onClick={() => { onComplete(); setStage("done"); }}>Complete request</Btn></>}>
      {request && (
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">{request.first} {request.last} <Badge tone={dsarTone(request.type)}>{request.type}</Badge></div>
              <div className="text-[12px] text-slate-500 truncate">{request.email} · {request.phone}</div>
            </div>
            <div className="text-right shrink-0 text-[11px] text-slate-500"><div className="font-mono">{request.id}</div><div>received {request.received}</div></div>
          </div>
          {stage === "done" ? (
            <div className="py-2 text-center space-y-2 animate-pop">
              <span className="mx-auto w-12 h-12 rounded-full bg-teal-600 text-white grid place-items-center shadow"><Icon.check size={22} /></span>
              <div className="font-semibold text-navy-900">{request.type} request fulfilled</div>
              <div className="text-[13px] text-slate-600 max-w-sm mx-auto">{DSAR_TYPE_DONE[request.type] ?? DSAR_TYPE_DONE.Objection} Logged to the audit trail, within the 30-day SLA.</div>
            </div>
          ) : (
            <>
              <div className="text-[12px] text-slate-500">Work through each step — the request closes once every step is done (GDPR Art. 12 · 30-day clock).</div>
              <ol className="space-y-1.5">
                {steps.map((s, i) => {
                  const stt = i < step ? "done" : i === step ? "active" : "todo";
                  const SIcon = s.icon;
                  return (
                    <li key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition ${stt === "done" ? "ring-teal-200 bg-teal-50/60" : stt === "active" ? "ring-slaice-300 bg-white shadow-soft" : "ring-slate-100 bg-slate-50/50 opacity-60"}`}>
                      <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${stt === "done" ? "bg-teal-600 text-white" : stt === "active" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-400"}`}>
                        {stt === "done" ? <Icon.check size={14} /> : <SIcon size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-navy-900">{s.label}</div>
                        <div className="text-[11px] text-slate-500 leading-snug">{s.detail}</div>
                      </div>
                      {stt === "active" && <Btn size="sm" variant="tint" onClick={() => setStep((x) => x + 1)}>{s.action}</Btn>}
                      {stt === "done" && <span className="text-[11px] font-semibold text-teal-700 shrink-0 inline-flex items-center gap-1"><Icon.check size={11} /> {s.action}</span>}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ============ PRIVACY & GDPR (Admin / controller side) ============ */
export function AdminPrivacy() {
  const { toast } = useApp();
  const [tab, setTab] = useState("requests");
  const [dsar, setDsar] = useState(DSAR_QUEUE);
  const [handle, setHandle] = useState<number | null>(null);
  // Editable retention schedule — numeric terms split into value + unit; legal
  // (tax-mandated) and open-ended terms stay fixed.
  const [retention, setRetention] = useState(() => RETENTION.map((r) => {
    const m = r.period.match(/^(\d+)\s+(hours|days|months|years)$/i);
    return { data: r.data, basis: r.basis, legal: !!r.legal, num: m ? parseInt(m[1], 10) : null, unit: m ? m[2].toLowerCase() : "", text: m ? "" : r.period };
  }));
  const tabs: TabEntry[] = [
    ["requests", "Data requests", Icon.inbox],
    ["consent", "Consent audit", Icon.sliders],
    ["retention", "Retention", Icon.clock],
    ["ropa", "Processing register", Icon.database],
  ];
  const slaTone = (d: number) => d < 0 ? "slate" : d <= 10 ? "red" : d <= 20 ? "amber" : "green";
  const open = dsar.filter((r) => r.status !== "Completed");
  return (
    <div className="animate-fade-up">
      <PageHead actions={<><Btn variant="outline" icon={Icon.download} onClick={() => { downloadCSV("dsar-requests.csv", ["ID", "Type", "Name", "Surname", "Email", "Phone", "Received", "Due (days)", "Status"], dsar.map((r) => [r.id, r.type, r.first, r.last, r.email, r.phone, r.received, r.dueDays, r.status])); toast("Exported DSAR log (CSV)."); }}>Export log</Btn><Btn variant="primary" icon={Icon.shieldCheck} onClick={() => toast("Demo — privacy settings saved.")}>Save policy</Btn></>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Open requests" value={String(open.length)} sub="awaiting action" tone="indigo" />
        <StatCard label="Due ≤ 10 days" value={String(dsar.filter((r) => r.dueDays >= 0 && r.dueDays <= 10 && r.status !== "Completed").length)} sub="30-day statutory SLA" tone="rose" />
        <StatCard label="Consent rate" value="64%" sub="marketing opt-in" trend="+3pp" />
        <StatCard label="Avg resolution" value="6.2d" sub="well within SLA" tone="teal" />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" scroll />

      {tab === "requests" && (
        <Card className="p-2">
          <div className="px-3 pt-2 pb-1 text-[12px] text-slate-500">Data Subject Access Requests — GDPR Art. 15–20, 30-day clock.</div>
          <Table cols={["Request", "Type", "Name", "Surname", "Email", "Phone", "Received", "Due", "Status", ""]} right={[9]}
            rows={dsar.map((r, i) => [
              <span className="font-mono text-[12px] text-navy-900">{r.id}</span>,
              <Badge tone={dsarTone(r.type)}>{r.type}</Badge>,
              <span className="font-semibold text-[13px] text-navy-900">{r.first}</span>,
              <span className="font-semibold text-[13px] text-navy-900">{r.last}</span>,
              <span className="text-[12px] text-slate-600">{r.email}</span>,
              <span className="text-[12px] text-slate-600 tnum whitespace-nowrap">{r.phone}</span>,
              r.received,
              r.status === "Completed" ? <Badge tone="green"><Icon.check size={11} /> Done</Badge> : <Badge tone={slaTone(r.dueDays)}>{r.dueDays}d left</Badge>,
              <Badge tone={r.status === "Completed" ? "green" : r.status === "Awaiting ID" ? "amber" : "slate"}>{r.status}</Badge>,
              r.status === "Completed"
                ? <span className="text-slate-400 text-sm">done</span>
                : <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => setHandle(i)}>Handle</Btn>,
            ])} />
        </Card>
      )}

      {tab === "consent" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="font-semibold text-navy-900 mb-3">Consent opt-in rates</div>
            <div className="space-y-3">
              {[["Analytics", 71], ["Marketing — e-mail", 64], ["Marketing — SMS", 38], ["Marketing — push", 52]].map(([l, v]) => (
                <div key={l}>
                  <div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-600">{l}</span><b className="text-navy-900 tnum">{v}%</b></div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600" style={{ width: `${v}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="font-semibold text-navy-900 mb-3">Consent purposes</div>
            <div className="space-y-2">
              {CONSENT_PURPOSES.map((p) => (
                <div key={p.key} className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                  <div className="flex items-center gap-2 font-semibold text-[13px] text-navy-900">{p.label}{p.required && <Badge tone="slate">Always on</Badge>}</div>
                  <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{p.desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-slate-500">Withdrawals are honoured immediately and logged with a timestamp.</div>
          </Card>
        </div>
      )}

      {tab === "retention" && (
        <Card className="p-2">
          <div className="px-3 pt-2 pb-1.5 text-[12px] text-slate-500">Data retention schedule — set how long each category is kept before it’s auto-anonymised or deleted. Tax-mandated and open-ended terms are fixed.</div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <div>Data category · legal basis</div><div className="text-right">Retention</div>
          </div>
          <div className="divide-y divide-slate-100">
            {retention.map((r, i) => (
              <div key={r.data} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-navy-900">{r.data}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">{r.legal && <Icon.lock size={11} className="text-amber-600" />}<span className={r.legal ? "text-amber-700" : ""}>{r.basis}</span></div>
                </div>
                {r.num !== null ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-[4.5rem]"><Input type="number" min={1} value={r.num} disabled={r.legal} className="disabled:opacity-60 disabled:cursor-not-allowed"
                      onChange={(e) => setRetention((rs) => rs.map((x, j) => j === i ? { ...x, num: Math.max(1, Math.round(+e.target.value) || 1) } : x))} /></div>
                    <div className="w-28"><Select value={r.unit} disabled={r.legal} className="disabled:opacity-60 disabled:cursor-not-allowed"
                      onChange={(e) => setRetention((rs) => rs.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} options={["hours", "days", "months", "years"]} /></div>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-500 italic shrink-0 text-right">{r.text}</div>
                )}
              </div>
            ))}
          </div>
          <div className="px-3 py-3 flex justify-between items-center gap-2 flex-wrap">
            <Btn size="sm" variant="outline" icon={Icon.database} onClick={() => toast("Demo — anonymised 1,204 customers older than the set term.")}>Run anonymisation</Btn>
            <Btn size="sm" variant="primary" icon={Icon.check} onClick={() => toast("Demo — retention policy saved. New terms apply to the nightly anonymisation job.", { tone: "success" })}>Save retention policy</Btn>
          </div>
        </Card>
      )}

      {tab === "ropa" && (
        <Card className="p-2">
          <div className="px-3 pt-2 pb-1 text-[12px] text-slate-500">Records of Processing Activities — GDPR Art. 30.</div>
          <Table cols={["Activity", "Purpose", "Data categories", "Basis", "Retention"]}
            rows={ROPA.map((r) => [<b className="text-navy-900">{r.activity}</b>, r.purpose, r.categories, <Badge tone="slate">{r.basis}</Badge>, r.retention])} />
        </Card>
      )}

      <DsarHandleModal
        request={handle !== null ? dsar[handle] : null}
        onClose={() => setHandle(null)}
        onComplete={() => setDsar((rows) => rows.map((x, i) => (i === handle ? { ...x, status: "Completed" } : x)))}
      />
    </div>
  );
}
