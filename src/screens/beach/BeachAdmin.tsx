import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Badge, Table, Modal, Field, Input, Select, Tabs, Toggle, EmptyState, NotMvpBadge } from "../../components/ui";
import { BeachBackdrop } from "../../components/Beach";
import { BackgroundPicker } from "../../components/BackgroundPicker";
import { ZONES, WEATHER_KINDS, WEATHER_DEMO, DAY_MIN, DAY_MAX, fmtHour } from "../../data/beach";
import type { ZoneMapItem, PriceRule, PriceRuleDays, PriceRuleMode } from "../../domain/types";
import { effectivePrice, ruleEffectLabel, dayMatches } from "../../domain/pricing";
import { useApp } from "../../app/store";
import { SunbedWorkspace } from "./Workspace";
import { LockersAdmin, TicketsAdmin } from "./Extras";
import { PricingCalendar } from "./Calendar";

/* ============ AVAILABILITY & PRICING ============ */
/* ---- Seasonal / day-of-week pricing helpers ---- */
const DAY_OPTS: { v: PriceRuleDays; label: string; short: string }[] = [
  { v: "all", label: "Every day", short: "Every day" },
  { v: "weekday", label: "Weekdays (Mon–Fri)", short: "Weekdays" },
  { v: "weekend", label: "Weekends (Sat & Sun)", short: "Weekends" },
];
const MODE_OPTS: { v: PriceRuleMode; label: string; unit: string }[] = [
  { v: "set", label: "Set price to", unit: "€" },
  { v: "addAbs", label: "Increase by", unit: "€" },
  { v: "addPct", label: "Change by", unit: "%" },
];
const MON_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WK_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isoToLocal = (iso: string) => new Date(`${iso}T12:00:00`);
const fmtFullDate = (iso: string) => { const d = isoToLocal(iso); return `${WK_ABBR[d.getDay()]} ${d.getDate()} ${MON_ABBR[d.getMonth()]} ${d.getFullYear()}`; };
const isWeekendISO = (iso: string) => { const d = isoToLocal(iso).getDay(); return d === 0 || d === 6; };
const dayShortFor = (v: PriceRuleDays) => DAY_OPTS.find((d) => d.v === v)?.short ?? "";
// "August" for a whole month, else "1 Jul – 15 Aug".
function periodLabel(from: string, to: string): string {
  const f = isoToLocal(from), t = isoToLocal(to);
  const lastOfMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const wholeMonth = f.getDate() === 1 && f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear() && t.getDate() === lastOfMonth;
  if (wholeMonth) return MON_FULL[f.getMonth()];
  return `${f.getDate()} ${MON_ABBR[f.getMonth()]} – ${t.getDate()} ${MON_ABBR[t.getMonth()]}`;
}
const MONTH_PRESETS: { label: string; from: string; to: string }[] = [
  { label: "June", from: "2026-06-01", to: "2026-06-30" },
  { label: "July", from: "2026-07-01", to: "2026-07-31" },
  { label: "August", from: "2026-08-01", to: "2026-08-31" },
  { label: "September", from: "2026-09-01", to: "2026-09-30" },
  { label: "Whole season", from: "2026-05-01", to: "2026-09-30" },
];
// First date on/after `from` whose weekday matches `days` — for the live preview.
function firstMatchingDate(from: string, days: PriceRuleDays): string {
  const d = isoToLocal(from);
  for (let i = 0; i < 14 && !dayMatches(days, d); i++) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---- Create / edit one pricing rule ---- */
function RuleEditorModal({ open, rule, onClose, onSave }: {
  open: boolean; rule: PriceRule | null; onClose: () => void; onSave: (r: PriceRule) => void;
}) {
  const [label, setLabel] = useState("");
  const [zone, setZone] = useState("all");
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-31");
  const [days, setDays] = useState<PriceRuleDays>("weekend");
  const [mode, setMode] = useState<PriceRuleMode>("addAbs");
  const [amount, setAmount] = useState(10);
  const [kind, setKind] = useState<NonNullable<PriceRule["kind"]>>("standard");
  const [lead, setLead] = useState(14);
  const [afterTime, setAfterTime] = useState("15:00");
  const [minDays, setMinDays] = useState(3);
  // (Re)seed the form whenever the modal opens — for a new rule or an edit.
  useEffect(() => {
    if (!open) return;
    setLabel(rule?.label ?? "");
    setZone(rule?.zone ?? "all");
    setFrom(rule?.from ?? "2026-08-01");
    setTo(rule?.to ?? "2026-08-31");
    setDays(rule?.days ?? "weekend");
    setMode(rule?.mode ?? "addAbs");
    setAmount(rule?.amount ?? 10);
    setKind(rule?.kind ?? "standard");
    setLead(rule?.lead ?? 14);
    setAfterTime(rule?.after ?? "15:00");
    setMinDays(rule?.minDays ?? 3);
  }, [open, rule]);

  const unit = MODE_OPTS.find((m) => m.v === mode)?.unit ?? "€";
  const rangeBad = from > to;
  const amountBad = mode === "set" ? amount <= 0 : amount === 0;
  const valid = !rangeBad && !amountBad;
  const zoneName = zone === "all" ? "All zones" : ZONES.find((z) => z.id === zone)?.name ?? "All zones";
  const autoLabel = `${periodLabel(from, to)}${days === "all" ? "" : " " + dayShortFor(days).toLowerCase()}`;

  // Live "before → after" on a representative zone + a matching date.
  const sampleZone = zone === "all" ? ZONES[0] : ZONES.find((z) => z.id === zone) ?? ZONES[0];
  const sampleDate = firstMatchingDate(from, days);
  const draft: PriceRule = { id: "draft", label: "", zone, from, to, days, mode, amount, enabled: true };
  const after = effectivePrice(sampleZone.from, sampleZone.id, sampleDate, [draft]);

  const submit = () => {
    if (!valid) return;
    const cond = kind === "earlybird" ? { lead } : kind === "lastminute" ? { after: afterTime } : kind === "multiday" ? { minDays } : {};
    onSave({ ...(rule ?? {}), id: rule?.id ?? `r-${Date.now().toString(36)}`, label: label.trim() || autoLabel, zone, from, to, days, mode, amount, enabled: rule?.enabled ?? true, kind, lead: undefined, after: undefined, minDays: undefined, ...cond });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={rule ? "Edit pricing rule" : "New pricing rule"} wide
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.check} disabled={!valid} onClick={submit}>{rule ? "Save rule" : "Add rule"}</Btn></>}>
      <div className="space-y-3">
        <Field label="Rule name"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={autoLabel || "e.g. August weekends"} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Rule type" hint={kind === "standard" ? "Applies on the dates below." : "Applies on the dates below only when the booking condition is met."}>
            <Select value={kind} onChange={(e) => setKind(e.target.value as NonNullable<PriceRule["kind"]>)} options={[{ v: "standard", l: "Standard (season / weekday)" }, { v: "earlybird", l: "Early-bird (booked ahead)" }, { v: "lastminute", l: "Last-minute (same day)" }, { v: "multiday", l: "Multi-day stay discount" }]} />
          </Field>
          {kind === "earlybird" && <Field label="Booked at least (days ahead)"><Input type="number" min={1} value={lead} onChange={(e) => setLead(Math.max(1, Number(e.target.value) || 1))} /></Field>}
          {kind === "lastminute" && <Field label="Same day, from"><Input type="time" value={afterTime} onChange={(e) => setAfterTime(e.target.value)} /></Field>}
          {kind === "multiday" && <Field label="Stay of at least (consecutive days)"><Input type="number" min={2} value={minDays} onChange={(e) => setMinDays(Math.max(2, Number(e.target.value) || 2))} /></Field>}
        </div>
        {rule?.dates?.length ? <div className="text-[12px] text-slate-500">Applies to {rule.dates.length} specific day{rule.dates.length === 1 ? "" : "s"} chosen on the calendar.</div> : null}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Apply to">
            <Select value={zoneName} options={["All zones", ...ZONES.map((z) => z.name)]}
              onChange={(e) => { const v = e.target.value; setZone(v === "All zones" ? "all" : ZONES.find((z) => z.name === v)?.id ?? "all"); }} />
          </Field>
          <Field label="Days">
            <Select value={DAY_OPTS.find((d) => d.v === days)?.label ?? DAY_OPTS[0].label} options={DAY_OPTS.map((d) => d.label)}
              onChange={(e) => setDays(DAY_OPTS.find((d) => d.label === e.target.value)?.v ?? "all")} />
          </Field>
        </div>
        <Field label="Period">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
            <span className="text-slate-400">→</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MONTH_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 transition ${from === p.from && to === p.to ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-600 hover:ring-teal-400"}`}>{p.label}</button>
            ))}
          </div>
          {rangeBad && <div className="text-[11px] text-rose-600 mt-1">The end date can’t be before the start date.</div>}
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Price change">
            <Select value={MODE_OPTS.find((m) => m.v === mode)?.label ?? MODE_OPTS[0].label} options={MODE_OPTS.map((m) => m.label)}
              onChange={(e) => setMode(MODE_OPTS.find((m) => m.label === e.target.value)?.v ?? "addAbs")} />
          </Field>
          <Field label={`Amount (${unit})`}>
            <Input type="number" value={amount} onChange={(e) => setAmount(Math.round(+e.target.value) || 0)} className={amountBad ? "ring-2 ring-rose-400 focus:ring-rose-400" : ""} />
          </Field>
        </div>
        {/* Live effect on a representative zone + a matching date. */}
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-600 min-w-0 flex items-center gap-1.5"><Icon.tag size={12} className="text-teal-600 shrink-0" /> {sampleZone.name} · {fmtFullDate(sampleDate)}</div>
          <div className="text-[13px] tnum shrink-0"><span className="text-slate-400 line-through mr-1.5">€{sampleZone.from}</span><span className="font-semibold text-teal-700">€{after}</span></div>
        </div>
      </div>
    </Modal>
  );
}

/* ---- One rule in the list ---- */
function RuleRow({ rule, onEdit, onRemove, onToggle }: { rule: PriceRule; onEdit: () => void; onRemove: () => void; onToggle: (v: boolean) => void }) {
  const zoneName = rule.zone === "all" ? "All zones" : ZONES.find((z) => z.id === rule.zone)?.name ?? rule.zone;
  return (
    <div className={`rounded-xl ring-1 px-3 py-2.5 flex items-center gap-2.5 transition ${rule.enabled ? "ring-slate-200 bg-white" : "ring-slate-100 bg-slate-50/60"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-[13.5px] truncate ${rule.enabled ? "text-navy-900" : "text-slate-400"}`}>{rule.label}</span>
          <Badge tone={rule.mode === "set" ? "indigo" : rule.amount < 0 ? "green" : "amber"}>{ruleEffectLabel(rule)}</Badge>
        </div>
        <div className="text-[12px] text-slate-500 mt-0.5 truncate">{zoneName} · {dayShortFor(rule.days)} · {periodLabel(rule.from, rule.to)}</div>
      </div>
      <Toggle on={rule.enabled} onChange={onToggle} ariaLabel={`Enable rule “${rule.label}”`} />
      <button onClick={onEdit} aria-label={`Edit ${rule.label}`} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition"><Icon.edit size={15} /></button>
      <button onClick={onRemove} aria-label={`Remove ${rule.label}`} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"><Icon.trash size={15} /></button>
    </div>
  );
}

/* ---- Pricing-rules tab: the rule list + a date-driven effective-price preview ---- */
function PricingRulesPanel({ rules, previewDate, setPreviewDate, onAdd, onEdit, onRemove, onToggle }: {
  rules: PriceRule[]; previewDate: string; setPreviewDate: (d: string) => void;
  onAdd: () => void; onEdit: (r: PriceRule) => void; onRemove: (id: string) => void; onToggle: (id: string, v: boolean) => void;
}) {
  const weekend = isWeekendISO(previewDate);
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="font-semibold text-navy-900">Pricing rules</div>
            <div className="text-[12.5px] text-slate-500">Override base prices by period and weekday — peak weekends, quiet weekdays, whole months.</div>
          </div>
          <Btn variant="primary" size="sm" icon={Icon.plus} onClick={onAdd}>Add rule</Btn>
        </div>
        {rules.length === 0 ? (
          <EmptyState icon={Icon.cash} title="No pricing rules yet" body="Base prices apply on every day. Add a rule to charge more on weekends or in peak months." />
        ) : (
          <div className="space-y-2">{rules.map((r) => <RuleRow key={r.id} rule={r} onEdit={() => onEdit(r)} onRemove={() => onRemove(r.id)} onToggle={(v) => onToggle(r.id, v)} />)}</div>
        )}
      </Card>
      <Card className="p-4 h-max">
        <div className="font-semibold text-navy-900 mb-0.5">Price preview</div>
        <div className="text-[12.5px] text-slate-500 mb-3">Effective price per zone on a chosen day.</div>
        <Field label="Date"><Input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} /></Field>
        <div className="mt-1.5 mb-3 flex items-center gap-2 text-[12px] text-slate-600">
          <span className="flex items-center gap-1.5"><Icon.calendar size={12} className="text-slate-400" /> {fmtFullDate(previewDate)}</span>
          <Badge tone={weekend ? "amber" : "slate"}>{weekend ? "Weekend" : "Weekday"}</Badge>
        </div>
        <div className="space-y-1.5">
          {ZONES.map((z) => {
            const eff = effectivePrice(z.from, z.id, previewDate, rules);
            const changed = eff !== z.from;
            return (
              <div key={z.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ring-1 ring-slate-100">
                <span className="flex items-center gap-2 text-[13px] text-navy-900"><i className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} />{z.name}</span>
                <span className="text-[13px] tnum">{changed ? <><span className="text-slate-400 line-through mr-1.5">€{z.from}</span><span className="font-semibold text-teal-700">€{eff}</span></> : <span className="text-slate-600">€{z.from}</span>}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============ MAP LAYOUT EDITOR ============ */
function ZoneArrangeEditor() {
  const { toast, zoneMap, setZoneMap } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Working copy, seeded from the persisted store (positions, grid, identity).
  const [zones, setZones] = useState<ZoneMapItem[]>(zoneMap);
  const [selectedId, setSelectedId] = useState(zones[0].id);
  const selected = zones.find((z) => z.id === selectedId) ?? zones[0];
  // Persist every change back to the store (→ localStorage) so the arrangement
  // survives a reload — with no backend, the browser IS the store. Debounced so
  // a drag doesn't write on every frame; skips the initial mount (no change yet).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const t = setTimeout(() => setZoneMap(zones), 300);
    return () => clearTimeout(t);
  }, [zones, setZoneMap]);
  const update = (id: string, patch: Partial<ZoneMapItem>) => setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));
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

  const save = () => {
    setZoneMap(zones);
    toast(`Layout saved to this browser — ${zones.length} zones · ${zones.reduce((a, z) => a + z.rows * z.cols, 0)} beds. It’ll be restored when you return.`, { tone: "success" });
  };

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
                customers see on the booking map). Edit it via "Background".
                Lift the shoreline so the sand fills ~80% of the canvas (zones
                are beach plots) and drop the vegetation belt for clean sand. */}
            <BeachBackdrop pos="absolute" className="inset-0 rounded-none" shoreline={0.2} noVeg />
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

/* Customer-surface atmosphere — the tenant's control over the scene effects:
   master switches for the weather graphics and time-of-day lighting, plus the
   live values themselves (current weather + scene clock), applied identically
   on every customer page. The guests' Home demo pill mirrors the same state;
   at launch that pill goes away and this card is the only control. Purely
   cosmetic; booking always works with everything off. */
function AtmosphereCard() {
  const { sceneFx, setSceneFx, weather, setWeather, dayTime, setDayTime, toast } = useApp();
  return (
    <Card className="p-5 mt-4">
      <div className="font-semibold text-navy-900 mb-1 flex items-center gap-2"><Icon.sun size={15} className="text-gold-600" /> Atmosphere <NotMvpBadge /></div>
      <div className="text-[12px] text-slate-600 mb-4">Weather graphics and daylight on the customer beach. Cosmetic only — booking is unaffected.</div>
      <div className="grid md:grid-cols-3 gap-x-6 gap-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-navy-900">Weather effects</div>
              <div className="text-[11px] text-slate-500">Sea state, rain, cloud cover &amp; scene tint</div>
            </div>
            <Toggle on={sceneFx.weather} onChange={(v) => { setSceneFx({ weather: v }); toast(`Weather effects ${v ? "enabled" : "disabled"}.`, { tone: "success" }); }} ariaLabel="Weather effects" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-navy-900">Time-of-day lighting</div>
              <div className="text-[11px] text-slate-500">Dawn-to-dusk scene clock lighting</div>
            </div>
            <Toggle on={sceneFx.daytime} onChange={(v) => { setSceneFx({ daytime: v }); toast(`Time-of-day lighting ${v ? "enabled" : "disabled"}.`, { tone: "success" }); }} ariaLabel="Time-of-day lighting" />
          </div>
        </div>
        <div className={sceneFx.weather ? "" : "opacity-40 pointer-events-none"}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Current weather</div>
          <div className="grid grid-cols-2 gap-1.5">
            {WEATHER_KINDS.map((k) => {
              const P = WEATHER_DEMO[k];
              const PI = Icon[P.icon] || Icon.sun;
              const active = k === weather;
              return (
                <button key={k} onClick={() => setWeather(k)} aria-pressed={active}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold ring-1 transition ${active ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-slate-200 hover:ring-teal-400"}`}>
                  <PI size={14} className={active ? "" : "text-teal-600"} />
                  <span className="flex-1 leading-tight">{P.label}</span>
                  <span className={`tnum text-[10.5px] ${active ? "text-white/70" : "text-slate-500"}`}>{P.tempC}°</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={sceneFx.daytime ? "" : "opacity-40 pointer-events-none"}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scene clock</span>
            <span className="text-[12px] font-bold text-navy-900 tnum">{fmtHour(dayTime)}</span>
          </div>
          <input type="range" min={DAY_MIN} max={DAY_MAX} step={0.25} value={dayTime} onChange={(e) => setDayTime(parseFloat(e.target.value))} aria-label="Scene clock" className="demo-range w-full" />
          <div className="text-[11px] text-slate-500 mt-1.5">Tip: ~19:30 gives the golden-hour look (sun permitting).</div>
        </div>
      </div>
    </Card>
  );
}

/* ============ BEACH, AVAILABILITY & PRICING (AENR-469) ============
   One page replacing "Availability & Pricing" and "Map Layout Editor":
   the canvas workspace (layout, categories, date prices, landmarks — one
   draft and one Publish), the zone map with open/closed stores, and the
   seasonal / weekday rules that apply on top of category prices. */
export function AdminAvailability() {
  const { toast, priceRules, setPriceRules, closedStores, setClosedStores } = useApp();
  const [tab, setTab] = useState("sunbeds");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [previewDate, setPreviewDate] = useState("2026-08-15");
  const saveRule = (r: PriceRule) => {
    setPriceRules(priceRules.some((x) => x.id === r.id) ? priceRules.map((x) => (x.id === r.id ? r : x)) : [...priceRules, r]);
    toast(`Pricing rule “${r.label}” saved — live for customers and the till.`, { tone: "success" });
  };
  const setOpen = (id: string, open: boolean, reason = "Closed today") => {
    const next = { ...closedStores };
    if (open) delete next[id]; else next[id] = reason;
    setClosedStores(next);
  };
  return (
    <div className="animate-fade-up">
      <div className="mb-4"><Tabs scroll tabs={[["sunbeds", "Sunbeds & pricing"], ["calendar", "Calendar & rules"], ["tickets", "Entry tickets"], ["lockers", "Lockers"], ["zones", "Zones & availability"]]} value={tab} onChange={setTab} /></div>
      {tab === "sunbeds" && <SunbedWorkspace />}
      {tab === "tickets" && <TicketsAdmin />}
      {tab === "lockers" && <LockersAdmin />}
      {tab === "zones" && (
        <div className="space-y-4">
          <Card className="p-2">
            <Table cols={["Store", "Sets", "Open today", "Reason when closed", "Status"]} right={[1]}
              rows={ZONES.map((z) => [
                <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full" style={{ background: z.color }} />{z.name}</span>,
                z.total,
                <Toggle on={!closedStores[z.id]} onChange={(v) => setOpen(z.id, v)} ariaLabel={`${z.name} open today`} />,
                closedStores[z.id] ? <Input aria-label={`Reason ${z.name} is closed`} value={closedStores[z.id]} onChange={(e) => setOpen(z.id, false, e.target.value)} /> : <span className="text-slate-400">—</span>,
                <Badge tone={closedStores[z.id] ? "amber" : "green"}>{closedStores[z.id] ? "Closed" : "Open"}</Badge>,
              ])} />
            <div className="px-3 pb-2 text-[12px] text-slate-500">Applies immediately: a closed store can’t be booked online or sold at the till, and its sets show as unavailable.</div>
          </Card>
          <ZoneArrangeEditor />
          <AtmosphereCard />
        </div>
      )}
      {tab === "calendar" && <PricingCalendar onEditRule={(r) => { setEditing(r); setEditorOpen(true); }} />}
      {tab === "calendar" && (
        <div className="mt-4"><PricingRulesPanel rules={priceRules} previewDate={previewDate} setPreviewDate={setPreviewDate}
          onAdd={() => { setEditing(null); setEditorOpen(true); }} onEdit={(r) => { setEditing(r); setEditorOpen(true); }}
          onRemove={(id) => { setPriceRules(priceRules.filter((r) => r.id !== id)); toast("Pricing rule removed."); }}
          onToggle={(id, v) => setPriceRules(priceRules.map((r) => (r.id === id ? { ...r, enabled: v } : r)))} /></div>
      )}
      <RuleEditorModal open={editorOpen} rule={editing} onClose={() => setEditorOpen(false)} onSave={saveRule} />
    </div>
  );
}
