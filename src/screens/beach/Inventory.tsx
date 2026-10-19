import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, Toggle, DateInput } from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES } from "../../data/beach";
import { addDays } from "../../domain/period";
import { CHANNEL_LABEL, HOLD_REASONS, allocationLive, holdActive, invStatus, type AllocationChannel, type InventoryState } from "../../domain/inventory";
import { tillSetStatus } from "../../domain/till";
import { useDemoNow } from "../../lib/useLiveSlots";
import type { SunbedSlot } from "../../domain/types";

/* ============ Inventory controls (AENR-512) ============
   Live operations on today's (or any date's) inventory — applied at once, not
   part of the layout draft: hold sets with a reason and expiry, keep sets for
   a sales channel with automatic release, stop selling a zone online, and see
   who can sell what. A demo clock fast-forwards to expiry / release times. */

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${++seq}`;
const fmt = (ms: number) => new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dateList = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to && out.length < 120; d = addDays(d, 1)) out.push(d); return out; };

function useInv() {
  const { inventory, setInventory, viewAs } = useApp();
  const who = viewAs?.name ?? "Manager / Admin";
  const update = (fn: (i: InventoryState) => InventoryState, text: string) =>
    setInventory((i) => ({ ...fn(i), log: [{ at: new Date(Date.now() + i.clockOffset * 60000).toISOString(), text: `${text} · ${who}` }, ...i.log].slice(0, 60) }));
  return { inventory, update, who };
}

/** Actions for the sets selected on the canvas. */
export function InventoryActions({ zoneId, sel, date }: { zoneId: string; sel: SunbedSlot[]; date: string }) {
  const { toast } = useApp();
  const { update, who } = useInv();
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(date);
  const [reason, setReason] = useState<string>(HOLD_REASONS[0]);
  const [note, setNote] = useState("");
  const [until, setUntil] = useState("");
  const [channel, setChannel] = useState<AllocationChannel>("walkin");
  const [rel, setRel] = useState({ on: true, daysBefore: "1", time: "10:00" });
  const dates = to >= from ? dateList(from, to) : [];
  const ids = sel.map((s) => s.id);
  const hold = () => {
    update((i) => ({ ...i, holds: [...i.holds, { id: uid("hold"), zoneId, setIds: ids, dates, reason, note: note.trim() || undefined, until: until ? new Date(until).toISOString() : undefined, by: who, at: new Date().toISOString() }] }), `Held ${ids.length} set${ids.length === 1 ? "" : "s"} (${reason}) ${from}${to !== from ? ` → ${to}` : ""}${until ? ` until ${until.replace("T", " ")}` : ""}`);
    toast(`${ids.length} set${ids.length === 1 ? "" : "s"} held — not bookable by guests.`, { tone: "success" });
    setNote("");
  };
  const allocate = () => {
    update((i) => ({ ...i, allocations: [...i.allocations, { id: uid("alloc"), zoneId, setIds: ids, dates, channel, release: rel.on && channel !== "online" ? { daysBefore: Number(rel.daysBefore) || 0, time: rel.time } : undefined, at: new Date().toISOString() }] }), `${CHANNEL_LABEL[channel]}: ${ids.length} sets ${from}${to !== from ? ` → ${to}` : ""}`);
    toast(`${ids.length} set${ids.length === 1 ? "" : "s"}: ${CHANNEL_LABEL[channel]}.`, { tone: "success" });
  };
  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <div className="text-[12.5px] font-semibold text-navy-900">Inventory · {ids.length} set{ids.length === 1 ? "" : "s"}</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From"><DateInput value={from} onChange={(v) => setFrom(v)} /></Field>
        <Field label="To"><DateInput value={to} onChange={(v) => setTo(v)} /></Field>
      </div>
      {!dates.length && <div role="alert" className="text-[12px] text-rose-700">End date must be on or after the start.</div>}
      <form className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (dates.length) hold(); }}>
        <div className="text-[12px] font-semibold text-navy-900 flex items-center gap-1.5"><Icon.lock size={12} /> Hold</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} options={HOLD_REASONS.map((r) => ({ v: r, l: r }))} /></Field>
          <Field label="Release at (optional)"><div className="flex gap-2"><DateInput aria-label="Release date" value={until.slice(0, 10)} onChange={(v) => setUntil(v ? `${v}T${until.slice(11, 16) || "18:00"}` : "")} /><Input type="time" lang="en-GB" aria-label="Release time" className="w-28" value={until.slice(11, 16)} disabled={!until} onChange={(e) => setUntil(`${until.slice(0, 10)}T${e.target.value}`)} /></div></Field>
        </div>
        <Field label={reason === "Other" ? "Note (required)" : "Note (optional)"}><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Wedding party, row repairs" /></Field>
        <Btn type="submit" size="sm" variant="outline" icon={Icon.lock} disabled={!dates.length || (reason === "Other" && !note.trim())}>Hold</Btn>
      </form>
      <form className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (dates.length) allocate(); }}>
        <div className="text-[12px] font-semibold text-navy-900">Sales channel status</div>
        <Field label="Status"><Select value={channel} onChange={(e) => setChannel(e.target.value as AllocationChannel)} options={[{ v: "staff", l: "Not available online (walk-in & phone)" }, { v: "online", l: "Available online only" }, { v: "walkin", l: "Available walk-in only (Cashier)" }, { v: "phone", l: "Phone only (Call Center)" }]} /></Field>
        {channel !== "online" && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
            <Toggle on={rel.on} onChange={(v) => setRel((r) => ({ ...r, on: v }))} label="Release unsold to everyone" />
            {rel.on && <><input aria-label="Days before" type="number" min={0} value={rel.daysBefore} onChange={(e) => setRel((r) => ({ ...r, daysBefore: e.target.value }))} className="w-14 rounded-md ring-1 ring-slate-200 px-1.5 py-1" /> day(s) before at <input aria-label="Release time" type="time" value={rel.time} onChange={(e) => setRel((r) => ({ ...r, time: e.target.value }))} className="rounded-md ring-1 ring-slate-200 px-1.5 py-1" /></>}
          </div>
        )}
        <Btn type="submit" size="sm" variant="outline" disabled={!dates.length}>Apply</Btn>
      </form>
    </div>
  );
}

/** Zone-level panel: summary for the date, stop-sell, active controls, log, demo clock. */
export function InventoryPanel({ zoneId, slots, date }: { zoneId: string; slots: SunbedSlot[]; date: string }) {
  const { toast, till, beachPricing } = useApp();
  const { inventory, update } = useInv();
  const now = useDemoNow(5000);
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const sold = tillSetStatus(till, date, now);
  const counts = { total: slots.length, held: 0, booked: 0, walkin: 0, phone: 0, staff: 0, onlineOnly: 0, freeOnline: 0, stop: 0 };
  slots.forEach((s) => {
    if (s.state === "u" || sold[s.id] === "sold") return void counts.booked++;
    const st = invStatus(inventory, zoneId, s.id, s.cat, date, "online", now);
    if (st.kind === "held") counts.held++;
    else if (st.kind === "stopsell") counts.stop++;
    else if (st.kind === "allocated") counts[st.channel === "online" ? "onlineOnly" : st.channel]++;
    else counts.freeOnline++;
  });
  const [ss, setSs] = useState({ from: date, to: date, reason: "", cat: "" });
  const holds = inventory.holds.filter((h) => h.zoneId === zoneId && !h.releasedAt);
  const allocs = inventory.allocations.filter((a) => a.zoneId === zoneId);
  const stops = inventory.stopSells.filter((s) => s.zoneId === zoneId);
  const cats = beachPricing.categories.filter((c) => c.zoneId === zoneId);
  // Holds whose release time has passed (demo clock) are released and logged.
  useEffect(() => {
    const due = inventory.holds.filter((h) => !h.releasedAt && h.until && new Date(h.until).getTime() <= now);
    if (!due.length) return;
    update((i) => ({ ...i, holds: i.holds.map((h) => (due.some((d) => d.id === h.id) ? { ...h, releasedAt: h.until, releasedBy: "auto" } : h)) }), `Hold expired — ${due.map((d) => `${d.setIds.length} sets (${d.reason})`).join(", ")} released automatically`);
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between"><div className="font-semibold text-navy-900">Inventory · {zone.name}</div><Badge tone="slate">{date}</Badge></div>
      <div className="text-[12.5px] text-slate-700 leading-relaxed" aria-live="polite">
        <b>{counts.total}</b> total · <b>{counts.held}</b> held · <b>{counts.walkin + counts.staff}</b> walk-in / staff · <b>{counts.phone}</b> phone · <b>{counts.booked}</b> booked/blocked · <b>{counts.freeOnline + counts.onlineOnly}</b> free online{counts.stop ? ` · ${counts.stop} stop-sold` : ""}
      </div>
      {stops.some((s) => s.active && date >= s.from && date <= s.to) && <div className="rounded-lg bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2 text-[12px] text-amber-800 flex gap-1.5"><Icon.alert size={13} className="shrink-0 mt-0.5" /> Online sales stopped for this date — Cashier and phone can still sell.</div>}

      <form className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!ss.reason.trim() || ss.to < ss.from) return; update((i) => ({ ...i, stopSells: [...i.stopSells, { id: uid("stop"), zoneId, catId: ss.cat || undefined, from: ss.from, to: ss.to, reason: ss.reason.trim(), active: true }] }), `Stop-sell online ${zone.name}${ss.cat ? ` (${cats.find((c) => c.id === ss.cat)?.code})` : ""} ${ss.from} → ${ss.to}`); setSs((x) => ({ ...x, reason: "" })); toast(`Online sales stopped for ${zone.name}.`, { tone: "success" }); }}>
        <div className="text-[12px] font-semibold text-navy-900">Stop-sell online</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From"><DateInput value={ss.from} onChange={(v) => setSs((x) => ({ ...x, from: v }))} /></Field>
          <Field label="To"><DateInput value={ss.to} onChange={(v) => setSs((x) => ({ ...x, to: v }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Scope"><Select value={ss.cat} onChange={(e) => setSs((x) => ({ ...x, cat: e.target.value }))} options={[{ v: "", l: "Whole zone" }, ...cats.map((c) => ({ v: c.id, l: `${c.code} · ${c.name}` }))]} /></Field>
          <Field label="Reason"><Input value={ss.reason} onChange={(e) => setSs((x) => ({ ...x, reason: e.target.value }))} placeholder="e.g. Festival — on-site only" /></Field>
        </div>
        <Btn type="submit" size="sm" variant="outline" disabled={!ss.reason.trim() || ss.to < ss.from}>Stop online sales</Btn>
      </form>

      {(holds.length > 0 || allocs.length > 0 || stops.length > 0) && (
        <ul className="space-y-1.5 text-[12px]">
          {holds.map((h) => (
            <li key={h.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5">
              <Icon.lock size={12} className="text-slate-500 shrink-0" />
              <div className="min-w-0 flex-1"><b className="text-navy-900">Held · {h.reason}</b>{h.note ? ` — ${h.note}` : ""}<div className="text-slate-500">{h.setIds.length} sets · {h.dates[0]}{h.dates.length > 1 ? ` → ${h.dates[h.dates.length - 1]}` : ""}{h.until ? ` · until ${fmt(new Date(h.until).getTime())}` : ""}{!holdActive(h, now) ? " · expired" : ""}</div></div>
              <button type="button" className="font-semibold text-teal-700" onClick={() => { update((i) => ({ ...i, holds: i.holds.map((x) => (x.id === h.id ? { ...x, releasedAt: new Date().toISOString() } : x)) }), `Released hold (${h.reason}, ${h.setIds.length} sets)`); toast("Hold released."); }}>Release</button>
            </li>
          ))}
          {allocs.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5">
              <div className="min-w-0 flex-1"><b className="text-navy-900">{CHANNEL_LABEL[a.channel]}</b><div className="text-slate-500">{a.setIds.length} sets · {a.dates[0]}{a.dates.length > 1 ? ` → ${a.dates[a.dates.length - 1]}` : ""}{a.release ? ` · releases ${a.release.daysBefore} day(s) before at ${a.release.time}` : ""}{a.dates.every((d) => !allocationLive(a, d, now)) ? " · released" : ""}</div></div>
              <button type="button" aria-label="Remove allocation" className="text-slate-400 hover:text-rose-600" onClick={() => update((i) => ({ ...i, allocations: i.allocations.filter((x) => x.id !== a.id) }), `Removed ${CHANNEL_LABEL[a.channel]} (${a.setIds.length} sets)`)}><Icon.trash size={12} /></button>
            </li>
          ))}
          {stops.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5">
              <div className="min-w-0 flex-1"><b className="text-navy-900">Stop-sell online</b> — {s.reason}<div className="text-slate-500">{s.catId ? `${cats.find((c) => c.id === s.catId)?.code} · ` : ""}{s.from} → {s.to}</div></div>
              <Toggle on={s.active} onChange={(v) => update((i) => ({ ...i, stopSells: i.stopSells.map((x) => (x.id === s.id ? { ...x, active: v } : x)) }), `${v ? "Resumed stop-sell" : "Lifted stop-sell"} ${zone.name}`)} ariaLabel={`Stop-sell ${s.reason} active`} />
            </li>
          ))}
        </ul>
      )}

      {inventory.clockOffset !== 0 && (
        <div className="text-[12px] text-slate-600 flex items-center gap-1.5"><Icon.clock size={12} /> Demo clock <b className="text-navy-900">{fmt(now)}</b> <Badge tone="amber">+{Math.round(inventory.clockOffset / 60)}h</Badge> — set it in the Demo menu.</div>
      )}
      {inventory.log.length > 0 && (
        <details className="text-[12px]">
          <summary className="cursor-pointer font-semibold text-navy-900">Activity ({inventory.log.length})</summary>
          <ul className="mt-1 space-y-0.5 text-slate-600 max-h-40 overflow-auto">{inventory.log.map((l, i) => <li key={i}><span className="tnum text-slate-400">{fmt(new Date(l.at).getTime())}</span> · {l.text}</li>)}</ul>
        </details>
      )}
    </Card>
  );
}
