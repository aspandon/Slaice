import { useRef, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { Card, Btn, Badge, PageHead, Table, StatCard, Modal, Field, Input, Select, Tabs, Toggle, StatusBadge, TableSkeleton, EmptyState, useMockLoad, FutureBanner, ContextPanel } from "../components/ui.jsx";
import { BarChart, LineChartMini, Donut, QR } from "../components/charts.jsx";
import { ZONES } from "../data/beach.js";
import { ADMIN_BOOKINGS, ADMIN_REFUNDS, CUSTOMERS, TOP_CUSTOMERS, REVENUE_TX, REPORTING_TICKETS, DAILY_OPS } from "../data/mock.js";
import { useApp } from "../app/store.jsx";
import { downloadCSV } from "../lib/download.js";

/* ============ DASHBOARD ============ */
export function AdminDashboard() {
  const { go } = useApp();
  const [period, setPeriod] = useState("week");
  const rev = {
    day: [{ l: "8h", v: 400 }, { l: "10h", v: 900 }, { l: "12h", v: 1500, hi: 1 }, { l: "14h", v: 1300 }, { l: "16h", v: 1100 }, { l: "18h", v: 700 }],
    week: [{ l: "Mon", v: 3200 }, { l: "Tue", v: 2950 }, { l: "Wed", v: 3600 }, { l: "Thu", v: 4100 }, { l: "Fri", v: 5200, hi: 1 }, { l: "Sat", v: 7400, hi: 1 }, { l: "Sun", v: 6900, hi: 1 }],
    month: [{ l: "W1", v: 21000 }, { l: "W2", v: 24500 }, { l: "W3", v: 28800, hi: 1 }, { l: "W4", v: 26400 }],
    year: [{ l: "May", v: 48 }, { l: "Jun", v: 121 }, { l: "Jul", v: 198, hi: 1 }, { l: "Aug", v: 241, hi: 1 }, { l: "Sep", v: 96 }],
  }[period];
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
          <div className="flex items-center gap-4">
            <Donut segments={[{ v: 62, c: "#0D9488" }, { v: 28, c: "#0ea5e9" }, { v: 10, c: "#f59e0b" }]} />
            <div className="text-sm space-y-1.5">
              <Leg c="bg-teal-600" t="Sunbeds 62%" /><Leg c="bg-sky-500" t="Tickets 28%" /><Leg c="bg-amber-500" t="Other 10%" />
            </div>
          </div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-1">Occupancy by zone (today)</div>
          <BarChart color="#0ea5e9" data={[{ l: "Akan", v: 67 }, { l: "Cen", v: 83 }, { l: "Mac", v: 91, hi: 1 }, { l: "Best", v: 78 }, { l: "Main", v: 68 }, { l: "Bol", v: 66 }]} />
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
const Leg = ({ c, t }) => <div className="flex items-center gap-2"><i className={`w-3 h-3 rounded-sm ${c} inline-block`} />{t}</div>;

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
export function AdminMapEditor() {
  const { toast } = useApp();
  // Each zone has a name, prefix, colour, rows, cols, and a position in % of the canvas.
  const [zones, setZones] = useState(() => ZONES.map((z, i) => ({
    id: z.id, name: z.name, prefix: z.prefix, color: z.color, total: z.total,
    rows: 8, cols: Math.max(6, Math.round(z.total / 8)),
    x: 6 + (i % 3) * 32, y: 16 + Math.floor(i / 3) * 38,
  })));
  const [selectedId, setSelectedId] = useState(zones[0].id);
  const selected = zones.find((z) => z.id === selectedId);
  const update = (id, patch) => setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  const remove = (id) => setZones((zs) => (zs.length > 1 ? zs.filter((z) => z.id !== id) : zs));
  const add = () => {
    const palette = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#6366f1", "#14b8a6"];
    const used = new Set(zones.map((z) => z.color));
    const color = palette.find((c) => !used.has(c)) || palette[0];
    const id = `z${Date.now().toString(36)}`;
    const z = { id, name: `Zone ${zones.length + 1}`, prefix: `Z${zones.length + 1}`, color, total: 60, rows: 6, cols: 10, x: 30, y: 40 };
    setZones((zs) => [...zs, z]); setSelectedId(id);
  };
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const onPointerDown = (e, id) => {
    setSelectedId(id);
    const r = canvasRef.current.getBoundingClientRect();
    const z = zones.find((x) => x.id === id);
    dragRef.current = { id, dx: e.clientX - (r.left + (z.x / 100) * r.width), dy: e.clientY - (r.top + (z.y / 100) * r.height) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current; if (!d) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - d.dx - r.left) / r.width) * 100;
    const y = ((e.clientY - d.dy - r.top) / r.height) * 100;
    update(d.id, { x: Math.max(0, Math.min(85, x)), y: Math.max(0, Math.min(85, y)) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const save = () => toast(`Demo — layout saved (${zones.length} zones, ${zones.reduce((a, z) => a + z.total, 0)} beds) & published to the customer map.`);

  return (
    <div>
      <PageHead actions={<><Btn variant="outline" icon={Icon.download} onClick={() => toast("Demo — upload aerial background.")}>Background</Btn><Btn variant="primary" icon={Icon.check} onClick={save}>Save layout</Btn></>} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-5">
          <div
            ref={canvasRef}
            className="relative rounded-2xl ring-1 ring-slate-100 overflow-hidden select-none"
            style={{ background: "linear-gradient(180deg,#88c8e8 0%,#a9dceb 35%,#f2dbb0 60%,#e5c688 100%)", height: 560 }}
          >
            {/* shoreline accent */}
            <div className="absolute left-0 right-0" style={{ top: "52%", height: 4, background: "rgba(255,255,255,0.75)" }} />
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
    </div>
  );
}

/* ============ BOOKINGS LIST ============ */
export function AdminBookings() {
  const { toast } = useApp();
  const [q, setQ] = useState("");
  const all = ADMIN_BOOKINGS;
  const loading = useMockLoad();
  const rows = all.filter((r) => (r[0] + r[1] + r[2]).toLowerCase().includes(q.toLowerCase()));
  const chan = (c) => ({ Online: "blue", "Walk-in": "amber", Phone: "indigo", Cashier: "green" }[c] || "slate");
  const exportCSV = () => {
    downloadCSV("bookings.csv", ["Booking", "Customer", "Sunbed", "Date", "Channel", "Status", "Amount (€)"], rows);
    toast(`Exported ${rows.length} bookings to CSV.`, { tone: "success" });
  };
  return (
    <div>
      <PageHead actions={<Btn variant="outline" icon={Icon.download} onClick={exportCSV}>Export</Btn>} />
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 rounded-xl ring-1 ring-slate-200 px-3 py-2 max-w-sm text-slate-600">
          <Icon.search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookings…" className="text-sm outline-none w-full bg-transparent text-ink" />
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Icon.search} title="No matching bookings" body={`Nothing matches “${q}”. Try a different name, sunbed code or booking ID.`} />
        ) : (
          <Table cols={["Booking", "Customer", "Sunbed", "Date", "Channel", "Status", "Amount", ""]} right={[6]}
            rows={rows.map((r) => [r[0], r[1], r[2], r[3], <Badge tone={chan(r[4])}>{r[4]}</Badge>, <StatusBadge status={r[5]} />, `€${r[6]}`,
              <Btn size="sm" variant="ghost" icon={Icon.mail} onClick={() => toast(`QR re-sent for ${r[0]}.`, { tone: "success" })}>Resend QR</Btn>])} />
        )}
      </Card>
    </div>
  );
}

/* ============ MANUAL / PHONE BOOKING ============ */
export function AdminManual() {
  const { toast } = useApp();
  const [done, setDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="animate-fade-up grid lg:grid-cols-[1fr_320px] gap-5">
      <div>
        <PageHead title="Manual / Phone Booking" sub="Reserve and block a sunbed without taking payment (VIP / phone), then send the QR to the customer." badge={<Badge tone="mvp">MVP</Badge>} />
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Customer name"><Input placeholder="e.g. Maria K." defaultValue="Maria K." /></Field>
            <Field label="Customer e-mail"><Input placeholder="maria@example.com" defaultValue="maria@example.com" /></Field>
            <Field label="Zone"><Select options={ZONES.map((z) => z.name)} /></Field>
            <Field label="Sunbed code"><Input placeholder="CE-92" defaultValue="CE-92" /></Field>
            <Field label="Date"><Input type="date" defaultValue={today} /></Field>
            <Field label="Mark as"><Select options={["Unpaid (manual)", "Comp / VIP", "Pay later"]} /></Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn variant="primary" icon={Icon.lock} onClick={() => { setDone(true); toast("Demo — sunbed blocked & QR e-mailed (booking flagged unpaid/manual)."); }}>Reserve & send QR</Btn>
            <Btn variant="outline" icon={Icon.umbrella} onClick={() => toast("Demo — opens the live map to pick a bed.")}>Pick on map</Btn>
          </div>
        </Card>
        {done && (
          <Card className="p-5 mt-4 flex items-center gap-4 animate-fade-up">
            <QR size={96} seed="MANUAL-CE92" />
            <div>
              <div className="font-semibold text-navy-900 flex items-center gap-2">Reserved <Badge tone="amber">Unpaid</Badge></div>
              <div className="text-sm text-slate-600">Central · CE-92 — QR sent to maria@example.com. The customer can pay later or present the QR at the gate.</div>
            </div>
          </Card>
        )}
      </div>
      <ContextPanel title="Manual / phone bookings" items={[
        { icon: Icon.phone, title: "Block without payment", body: "Used for phone bookings, VIP comps, and pay-later guests." },
        { icon: Icon.mail, title: "QR by e-mail", body: "The guest gets the same gate QR as an online booking." },
        { icon: Icon.cash, title: "Settle later", body: "Mark unpaid bookings paid in Bookings when they arrive." },
      ]} footer="Manual bookings appear in Reporting with channel = Phone." />
    </div>
  );
}

/* ============ USERS & SEGMENTS ============ */
export function AdminUsers() {
  const { toast } = useApp();
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const users = CUSTOMERS.map((c) => ({ n: c.name, e: c.email, b: c.bookings, tags: c.tags }));
  const allTags = ["All", "VIP", "Season pass", "Regular", "New"];
  const tagTone = (t) => ({ VIP: "amber", "Season pass": "blue", Regular: "slate", New: "green" }[t] || "slate");
  const rows = users.filter((u) => (tagFilter === "All" || u.tags.includes(tagFilter)) && (u.n + u.e).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="animate-fade-up">
      <PageHead title="Users & Segments" sub="Search, filter and tag customers for CRM & marketing. Interaction filter: admin sees all; a customer sees only their own." badge={<Badge tone="mvp">MVP</Badge>}
        actions={<Btn variant="outline" icon={Icon.tag} onClick={() => toast("Demo — create a tag / segment.")}>New tag</Btn>} />
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 max-w-xs flex-1 text-slate-600">
            <Icon.search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="text-sm outline-none w-full bg-transparent text-ink" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allTags.map((t) => <button key={t} onClick={() => setTagFilter(t)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ring-1 ${tagFilter === t ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{t}</button>)}
          </div>
        </div>
        <Table cols={["Name", "Email", "Bookings", "Tags", ""]} right={[2]}
          rows={rows.map((u) => [u.n, u.e, u.b,
            <span className="flex gap-1 flex-wrap">{u.tags.map((t) => <Badge key={t} tone={tagTone(t)}>{t}</Badge>)}</span>,
            <Btn size="sm" variant="ghost" icon={Icon.eye} onClick={() => toast(`Demo — ${u.n}'s activity (interaction filter).`)}>Activity</Btn>])} />
      </Card>
    </div>
  );
}

/* ============ REPORTING & ANALYTICS ============ */
export function AdminReporting() {
  const { toast } = useApp();
  const [tab, setTab] = useState("exec");
  const tabs = [
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
      <PageHead actions={<><Btn variant="outline" icon={Icon.calendar} onClick={() => toast("Demo — period picker.")}>This season</Btn><Btn variant="primary" icon={Icon.download} onClick={() => { downloadCSV(`reporting-${tab}.csv`, ["Period", "Bookings"], season.map((s) => [s.l, s.v])); toast(`Exported ${tab} report (CSV).`); }}>Export</Btn></>} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" scroll />

      {tab === "exec" && <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Season revenue" value="€704k" sub="+9% vs last yr" tone="teal" icon={Icon.chart} />
          <StatCard label="Total bookings" value="26,040" sub="sets sold" icon={Icon.umbrella} />
          <StatCard label="Avg occupancy" value="68%" icon={Icon.grid} />
          <StatCard label="Online share" value="40%" sub="of sets" icon={Icon.globe} />
          <StatCard label="Refund rate" value="1.4%" icon={Icon.refund} />
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Card className="p-5 lg:col-span-2"><div className="font-semibold text-navy-900 mb-1">Revenue by month (€k)</div><LineChartMini data={season} /></Card>
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-2">Revenue mix</div>
            <div className="flex items-center gap-4"><Donut segments={[{ v: 62, c: "#0D9488" }, { v: 28, c: "#0ea5e9" }, { v: 10, c: "#f59e0b" }]} />
              <div className="text-sm space-y-1.5"><div>Sunbeds 62%</div><div>Tickets 28%</div><div>Other 10%</div></div></div>
          </Card>
        </div>
      </>}

      {tab === "revenue" && <>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Revenue by capability (€k)</div><BarChart data={[{ l: "Sunbed", v: 436, hi: 1 }, { l: "Ticket", v: 197 }, { l: "Locker", v: 31 }, { l: "Support", v: 40 }]} /></Card>
          <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Revenue by zone (€k)</div><BarChart color="#0ea5e9" data={ZONES.map((z) => ({ l: z.name.slice(0, 4), v: Math.round(z.total * 1.1) }))} /></Card>
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-2">All transactions (filterable)</div>
          <Table cols={["Tx", "Capability", "Channel", "Status", "Amount"]} right={[4]}
            rows={REVENUE_TX.map((r) => [r[0], r[1], <Badge tone={r[2].tone}>{r[2].label}</Badge>, <Badge tone={r[3].tone}>{r[3].label}</Badge>, r[4].startsWith("−") ? <span className="text-rose-600 font-medium tnum">{r[4]}</span> : r[4]])} /></Card>
      </>}

      {tab === "occupancy" && <>
        <Card className="p-5"><div className="font-semibold text-navy-900 mb-1">Occupancy by zone (%)</div>
          <BarChart color="#0ea5e9" data={[{ l: "Akan", v: 67 }, { l: "Cen", v: 83 }, { l: "Mac", v: 91, hi: 1 }, { l: "Best", v: 78 }, { l: "Main", v: 68 }, { l: "Bol", v: 66 }]} /></Card>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-3">Utilisation heatmap (week × zone)</div>
          <div className="space-y-1.5">
            {ZONES.map((z) => (<div key={z.id} className="flex items-center gap-2">
              <div className="w-16 text-[12px] text-slate-500">{z.name}</div>
              <div className="flex gap-1">{Array.from({ length: 7 }).map((_, d) => { const v = 0.3 + ((z.total * 7 + d * 13) % 70) / 100; return <div key={d} className="w-7 h-6 rounded" style={{ background: `rgba(13,148,136,${v.toFixed(2)})` }} title={`${Math.round(v * 100)}%`} />; })}</div>
            </div>))}
            <div className="flex gap-1 ml-[72px] pt-1 text-[10px] text-slate-600">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="w-7 text-center">{d}</div>)}</div>
          </div>
        </Card>
      </>}

      {tab === "bookings" && <>
        <div className="grid sm:grid-cols-4 gap-4">
          <StatCard label="Avg lead time" value="2.3d" sub="ahead of date" /><StatCard label="Online vs walk-in" value="40 / 60" sub="% split" /><StatCard label="Cancellation" value="3.1%" /><StatCard label="Sets / booking" value="1.8" />
        </div>
        <Card className="p-5 mt-4"><div className="font-semibold text-navy-900 mb-1">Booking volume by day</div><LineChartMini data={[{ l: "Mon", v: 120 }, { l: "Tue", v: 98 }, { l: "Wed", v: 142 }, { l: "Thu", v: 165 }, { l: "Fri", v: 210 }, { l: "Sat", v: 320 }, { l: "Sun", v: 298 }]} /></Card>
      </>}

      {tab === "channel" && <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <Card className="p-5"><div className="font-semibold text-navy-900 mb-2">Sales by channel & role</div>
          <div className="flex items-center gap-6 flex-wrap"><Donut segments={[{ v: 40, c: "#0ea5e9" }, { v: 45, c: "#f59e0b" }, { v: 15, c: "#0D9488" }]} />
            <div className="text-sm space-y-2">
              <Leg c="bg-sky-500" t="Online (customer) — 40% · €281k" /><Leg c="bg-amber-500" t="Walk-in (controller) — 45% · €317k" /><Leg c="bg-teal-600" t="Cashier (on-site) — 15% · €106k" />
            </div></div>
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
export function AdminRefunds() {
  const { toast } = useApp();
  const [modal, setModal] = useState(null);
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState(ADMIN_REFUNDS);
  const refunded = rows.filter((r) => r.status === "Refunded").reduce((a, b) => a + b.amount, 0);
  const refundedCount = rows.filter((r) => r.status === "Refunded").length;
  const pending = rows.filter((r) => !r.status).length;
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
        <Table cols={["Transaction", "Date", "Customer", "Amount", "Reason", "Status", ""]} right={[3]}
          rows={rows.map((r, i) => [r.tx, r.date || "—", r.cust, `€${r.amount}`, r.reason || "—",
            r.status ? <Badge tone="green">{r.status}</Badge> : <Badge tone="amber">Pending</Badge>,
            r.status ? <span className="text-slate-500 text-sm">done</span> : <Btn size="sm" variant="outline" icon={Icon.refund} onClick={() => setModal(i)}>Refund</Btn>])} />
      </Card>
      <Modal open={modal !== null} onClose={() => setModal(null)} title="Issue refund"
        footer={<><Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="danger" icon={Icon.refund} onClick={() => { setRows((r) => r.map((x, i) => (i === modal ? { ...x, status: "Refunded" } : x))); setModal(null); toast("Demo — Stripe refund issued, credit note (5.1) sent to MyDATA, customer e-mailed."); }}>Refund via Stripe</Btn></>}>
        {modal !== null && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm flex justify-between"><span className="text-slate-500">{rows[modal].tx} · {rows[modal].cust}</span><b className="tnum">€{rows[modal].amount}</b></div>
            <Field label="Refund type"><Select options={["Full refund", "Partial refund"]} /></Field>
            <Field label="Reason"><Select options={["Weather", "Double booking", "Customer request", "Service issue"]} /></Field>
            <div className="text-[12px] text-slate-600 flex items-center gap-1.5"><Icon.shield size={13} /> Reverses the application fee and auto-issues a credit note to MyDATA.</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============ COMMUNICATE (Future) ============ */
export function AdminCommunicate() {
  const { toast } = useApp();
  const [seg, setSeg] = useState("VIP");
  const [msg, setMsg] = useState("☀️ Weekend offer: 20% off front-row sunbeds at Akti tou Iliou. Book now!");
  const reach = seg === "All users" ? "8,420" : seg === "VIP" ? "318" : "1,204";
  return (
    <div className="animate-fade-up">
      <PageHead title="Communicate" sub="Message users or segments with notifications and offers — builds on tags/segmentation." badge={<Badge tone="future">Future</Badge>} />
      <FutureBanner />
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card className="p-5 space-y-3">
          <Field label="Audience segment"><Select value={seg} onChange={(e) => setSeg(e.target.value)} options={["VIP", "Season pass", "Regulars", "New", "All users"]} /></Field>
          <Field label="Channel"><Select options={["Push notification", "E-mail", "SMS", "WhatsApp"]} /></Field>
          <Field label="Message"><textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/70 outline-none" /></Field>
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-slate-600">Est. reach: <b className="text-navy-900">{reach}</b> users</div>
            <Btn variant="primary" icon={Icon.bell} onClick={() => toast("Demo — campaign queued (roadmap feature).")}>Send campaign</Btn>
          </div>
        </Card>
        <aside className="space-y-3 lg:sticky lg:top-24 h-max">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 px-1">Preview</div>
          <div className="rounded-2xl bg-navy-950 text-white p-4 shadow-lift">
            <div className="flex items-center gap-2 text-[11px] text-white/70 mb-2"><Icon.bell size={12} /> Akti tou Iliou · now</div>
            <div className="font-semibold text-sm">Weekend at the beach</div>
            <div className="text-[12px] text-white/80 leading-snug mt-0.5 line-clamp-3">{msg}</div>
          </div>
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
    </div>
  );
}
