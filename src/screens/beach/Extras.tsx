import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, SaveBar, Select, Spinner, Toggle, DateInput } from "../../components/ui";
import { useApp } from "../../app/store";
import { todayISO } from "../../data/beach";
import { addDays, fmtDay } from "../../domain/period";
import {
  lockerAvail,
  lockerPrice,
  ticketPrice,
  type ExtraRule,
  type ExtrasState,
  type LockerBank,
  type TicketCat,
} from "../../domain/extras";
import type { PriceRuleDays } from "../../domain/types";

/* ============ Entry tickets & lockers (AENR-529 / AENR-530) ============
   The tenant's ticket categories and locker banks with base prices, bulk
   price rules by period and weekday / weekend, an effective-price preview,
   and (lockers) the provider's live availability. Edits are a draft until
   Save; validation blocks bad prices and dates and flags overlaps. The
   wizard, the till, the walk-in sale and pay-by-link read the saved state. */

type Kind = "ticket" | "locker";
const DAYS: { v: PriceRuleDays; l: string }[] = [
  { v: "all", l: "Every day" },
  { v: "weekday", l: "Weekdays (Mon–Fri)" },
  { v: "weekend", l: "Weekends (Sat–Sun)" },
];
const isWe = (d: string) => [0, 6].includes(new Date(`${d}T00:00:00`).getDay());
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${++seq}`;

/** Rules that share an item and overlapping dates and day types — the later one wins. */
function overlaps(rules: readonly ExtraRule[], r: ExtraRule): ExtraRule[] {
  const span = (x: ExtraRule) =>
    x.dates?.length ? [x.dates[0], x.dates[x.dates.length - 1]] : [x.from, x.to];
  const [a0, a1] = span(r);
  return rules.filter((o) => {
    if (o.id === r.id || o.target !== r.target || !o.ids.some((i) => r.ids.includes(i)))
      return false;
    const [b0, b1] = span(o);
    const daysClash = o.days === "all" || r.days === "all" || o.days === r.days;
    return daysClash && a0 <= b1 && b0 <= a1;
  });
}

function useDraft() {
  const { extras, setExtras, toast } = useApp();
  const [draft, setDraft] = useState<ExtrasState>(extras);
  const dirty =
    JSON.stringify({ t: draft.tickets, l: draft.lockers, r: draft.rules }) !==
    JSON.stringify({ t: extras.tickets, l: extras.lockers, r: extras.rules });
  const errors = [
    ...draft.tickets
      .filter((t) => !t.name.trim() || !(t.price >= 0))
      .map((t) => `Ticket “${t.name || "unnamed"}” needs a name and a price ≥ €0.`),
    ...draft.lockers
      .filter((l) => !l.name.trim() || !(l.price >= 0) || !(l.total >= 0))
      .map((l) => `Locker bank “${l.name || "unnamed"}” needs a name, price ≥ €0 and a count.`),
    ...draft.rules
      .filter((r) => !(r.price >= 0) || (!r.dates?.length && r.to < r.from) || !r.ids.length)
      .map(
        (r) => `Rule “${r.label}”: pick at least one item, price ≥ €0, end on or after the start.`,
      ),
  ];
  const save = () => {
    if (errors.length) return;
    setExtras((s) => ({
      ...s,
      tickets: draft.tickets,
      lockers: draft.lockers,
      rules: draft.rules,
    }));
    toast("Saved — the booking wizard, the till and the walk-in sale use these prices now.", {
      tone: "success",
    });
  };
  return { extras, draft, setDraft, dirty, errors, save, discard: () => setDraft(extras) };
}

/* Bulk price rules for tickets or lockers + an effective-price preview. */
function RulesAndPreview({
  kind,
  draft,
  setDraft,
}: {
  kind: Kind;
  draft: ExtrasState;
  setDraft: (f: (s: ExtrasState) => ExtrasState) => void;
}) {
  const items =
    kind === "ticket"
      ? draft.tickets.map((t) => ({ id: t.id, name: t.short }))
      : draft.lockers.map((l) => ({ id: l.id, name: l.name }));
  const year = Number(todayISO().slice(0, 4));
  const [form, setForm] = useState({
    ids: [] as string[],
    mode: "range" as "range" | "days" | "month",
    from: `${year + 1}-08-01`,
    to: `${year + 1}-08-31`,
    days: "all" as PriceRuleDays,
    price: "",
    picked: "",
    month: `${year + 1}-08`,
  });
  const [start, setStart] = useState(`${year + 1}-08-01`);
  const rules = draft.rules.filter((r) => r.target === kind);
  const add = () => {
    const price = Number(form.price);
    const span =
      form.mode === "month"
        ? {
            from: `${form.month}-01`,
            to: `${form.month}-${new Date(Number(form.month.slice(0, 4)), Number(form.month.slice(5)), 0).getDate()}`,
          }
        : form.mode === "days"
          ? { from: "", to: "" }
          : { from: form.from, to: form.to };
    const dates =
      form.mode === "days"
        ? form.picked
            .split(/[\s,]+/)
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
            .sort()
        : undefined;
    const names = form.ids.map((i) => items.find((x) => x.id === i)?.name ?? i).join(", ");
    const where =
      form.mode === "days"
        ? `${dates?.length ?? 0} days`
        : form.mode === "month"
          ? form.month
          : `${fmtDay(span.from)} → ${fmtDay(span.to)}`;
    const r: ExtraRule = {
      id: uid("xr"),
      target: kind,
      ids: form.ids,
      ...span,
      ...(dates ? { from: dates[0] ?? "", to: dates[dates.length - 1] ?? "", dates } : {}),
      days: form.days,
      price,
      label: `${names} · ${where} · ${DAYS.find((d) => d.v === form.days)?.l.split(" ")[0]} €${price}`,
    };
    setDraft((s) => ({ ...s, rules: [...s.rules, r] }));
    setForm((f) => ({ ...f, price: "" }));
  };
  const valid =
    form.ids.length > 0 &&
    form.price !== "" &&
    Number(form.price) >= 0 &&
    (form.mode !== "range" || form.to >= form.from) &&
    (form.mode !== "days" || /\d{4}-\d{2}-\d{2}/.test(form.picked));
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const priceOn = (id: string, d: string) =>
    kind === "ticket" ? ticketPrice(draft, id, d).price : lockerPrice(draft, id, d).price;

  return (
    <div className="grid xl:grid-cols-2 gap-4 items-start">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-navy-900">Prices by period — in bulk</h3>
        <fieldset>
          <legend className="text-[12px] font-semibold text-slate-700 mb-1">Apply to</legend>
          <div className="flex flex-wrap gap-1.5">
            {items.map((x) => (
              <label
                key={x.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 min-h-[40px] text-[13px] ring-1 cursor-pointer ${form.ids.includes(x.id) ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.ids.includes(x.id)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ids: e.target.checked ? [...f.ids, x.id] : f.ids.filter((i) => i !== x.id),
                    }))
                  }
                />
                {x.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Period">
            <Select
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as typeof f.mode }))}
              options={[
                { v: "range", l: "Date range / one day" },
                { v: "days", l: "Several days" },
                { v: "month", l: "Whole month" },
              ]}
            />
          </Field>
          <Field label="Days">
            <Select
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value as PriceRuleDays }))}
              options={DAYS.map((d) => ({ v: d.v, l: d.l }))}
            />
          </Field>
          {form.mode === "range" && (
            <>
              <Field label="From">
                <DateInput
                  
                  value={form.from}
                  onChange={(v) => setForm((f) => ({ ...f, from: v }))}
                />
              </Field>
              <Field label="To">
                <DateInput
                  
                  value={form.to}
                  onChange={(v) => setForm((f) => ({ ...f, to: v }))}
                  aria-invalid={form.to < form.from}
                />
              </Field>
            </>
          )}
          {form.mode === "month" && (
            <Field label="Month">
              <Input
                type="month"
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              />
            </Field>
          )}
          {form.mode === "days" && (
            <div className="sm:col-span-2">
              <Field label="Days (YYYY-MM-DD, comma separated)">
                <Input
                  value={form.picked}
                  onChange={(e) => setForm((f) => ({ ...f, picked: e.target.value }))}
                  placeholder={`${year + 1}-08-15, ${year + 1}-08-16`}
                />
              </Field>
            </div>
          )}
          <Field label="Price €">
            <Input
              type="number"
              min={0}
              step="0.5"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
        </div>
        {form.mode === "range" && form.to < form.from && (
          <div role="alert" className="text-[12px] text-rose-700">
            The end date is before the start.
          </div>
        )}
        <Btn variant="primary" icon={Icon.plus} disabled={!valid} onClick={add}>
          Add price rule
        </Btn>
        {rules.length > 0 && (
          <ol className="space-y-1.5 text-[13px]">
            {rules.map((r) => {
              const clash = overlaps(draft.rules, r);
              return (
                <li
                  key={r.id}
                  className="rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5 flex items-start gap-2"
                >
                  <span className="flex-1">
                    {r.label}
                    {clash.length > 0 && (
                      <span className="block text-[11.5px] text-amber-700">
                        Overlaps “{clash[0].label}” — the rule lower in the list wins.
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove rule ${r.label}`}
                    onClick={() =>
                      setDraft((s) => ({ ...s, rules: s.rules.filter((x) => x.id !== r.id) }))
                    }
                    className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Icon.trash size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
          <h3 className="font-semibold text-navy-900">Effective prices</h3>
          <div className="text-[12px] font-semibold text-slate-700">
            Week from
            <DateInput aria-label="Week from"
              
              value={start}
              onChange={(v) => v && setStart(v)}
              className="block mt-1 rounded-lg ring-1 ring-slate-200 px-2 py-1.5 text-[13px]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] tnum">
            <caption className="sr-only">
              Effective {kind === "ticket" ? "ticket" : "locker"} prices for the week from{" "}
              {fmtDay(start)}
            </caption>
            <thead>
              <tr>
                <th className="text-left py-1 pr-2 font-semibold text-slate-500">
                  {kind === "ticket" ? "Category" : "Bank"}
                </th>
                {week.map((d) => (
                  <th
                    key={d}
                    className={`px-1.5 text-right font-semibold ${isWe(d) ? "text-indigo-700" : "text-slate-500"}`}
                  >
                    {new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2 font-semibold text-navy-900">{x.name}</td>
                  {week.map((d) => (
                    <td key={d} className={`px-1.5 text-right ${isWe(d) ? "bg-indigo-50/60" : ""}`}>
                      €{priceOn(x.id, d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] text-slate-500">
          Weekends shaded. A rule sets the price for its items, period and day type; otherwise the
          base price applies.
        </p>
      </Card>
    </div>
  );
}

export function TicketsAdmin() {
  const d = useDraft();
  const { draft, setDraft } = d;
  const patch = (id: string, p: Partial<TicketCat>) =>
    setDraft((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
  const sorted = [...draft.tickets].sort((a, b) => a.order - b.order);
  const move = (id: string, dir: -1 | 1) => {
    const i = sorted.findIndex((t) => t.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i],
      b = sorted[j];
    setDraft((s) => ({
      ...s,
      tickets: s.tickets.map((t) =>
        t.id === a.id ? { ...t, order: b.order } : t.id === b.id ? { ...t, order: a.order } : t,
      ),
    }));
  };
  return (
    <div className="space-y-4">
      <SaveBar dirty={d.dirty} errors={d.errors} onSave={d.save} onDiscard={d.discard} note="Unsaved changes — guests and staff still see the saved prices." />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-navy-900">Ticket categories</h2>
          <Btn
            size="sm"
            variant="outline"
            icon={Icon.plus}
            onClick={() =>
              setDraft((s) => ({
                ...s,
                tickets: [
                  ...s.tickets,
                  {
                    id: uid("tk"),
                    name: "New category",
                    short: "New",
                    active: true,
                    order: Math.max(0, ...s.tickets.map((t) => t.order)) + 1,
                    price: 0,
                  },
                ],
              }))
            }
          >
            Add category
          </Btn>
        </div>
        <ul className="space-y-2">
          {sorted.map((t, i) => (
            <li
              key={t.id}
              className={`rounded-xl ring-1 ring-slate-200 p-2.5 grid sm:grid-cols-12 gap-2 items-end ${t.active ? "" : "opacity-60"}`}
            >
              <div className="sm:col-span-3">
                <Field label="Name">
                  <Input value={t.name} onChange={(e) => patch(t.id, { name: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Short label">
                  <Input value={t.short} onChange={(e) => patch(t.id, { short: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Eligibility note (shown to guests)">
                  <Input
                    value={t.note ?? ""}
                    onChange={(e) => patch(t.id, { note: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-1">
                <Field label="Base €">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={t.price}
                    onChange={(e) => patch(t.id, { price: Number(e.target.value) })}
                    aria-invalid={!(t.price >= 0)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2 flex items-center gap-1 pb-1">
                <Toggle
                  on={t.active}
                  onChange={(v) => patch(t.id, { active: v })}
                  ariaLabel={`${t.name} active`}
                />
                <button
                  type="button"
                  aria-label={`Move ${t.name} up`}
                  disabled={i === 0}
                  onClick={() => move(t.id, -1)}
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  <Icon.chevD size={14} className="rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${t.name} down`}
                  disabled={i === sorted.length - 1}
                  onClick={() => move(t.id, 1)}
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  <Icon.chevD size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11.5px] text-slate-500">
          Switched-off categories disappear from the booking wizard and the till; past sales keep
          their label.
        </p>
      </Card>
      <RulesAndPreview kind="ticket" draft={draft} setDraft={setDraft} />
    </div>
  );
}

export function LockersAdmin() {
  const d = useDraft();
  const { draft, setDraft } = d;
  const { extras, setExtras, toast } = useApp();
  const [date, setDate] = useState(todayISO());
  const [syncing, setSyncing] = useState(false);
  const patch = (id: string, p: Partial<LockerBank>) =>
    setDraft((s) => ({ ...s, lockers: s.lockers.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const pv = extras.provider;
  const setProvider = (p: Partial<typeof pv>) =>
    setExtras((s) => ({ ...s, provider: { ...s.provider, ...p } }));
  const sync = () => {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      setProvider({ lastSync: new Date().toISOString(), connected: true });
      toast(
        pv.outage
          ? `${pv.name} didn’t answer — locker sales stay paused.`
          : `Synced with ${pv.name}.`,
        { tone: pv.outage ? "warn" : "success" },
      );
    }, 1000);
  };
  const status = !pv.connected ? "Disconnected" : pv.outage ? "Outage" : "Connected";
  return (
    <div className="space-y-4">
      <SaveBar dirty={d.dirty} errors={d.errors} onSave={d.save} onDiscard={d.discard} note="Unsaved changes — guests and staff still see the saved prices." />
      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-navy-900">Locker banks</h2>
            <Btn
              size="sm"
              variant="outline"
              icon={Icon.plus}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  lockers: [
                    ...s.lockers,
                    {
                      id: String.fromCharCode(65 + s.lockers.length),
                      name: `Bank ${String.fromCharCode(65 + s.lockers.length)}`,
                      size: "Standard",
                      price: 5,
                      total: 10,
                      active: true,
                    },
                  ],
                }))
              }
            >
              Add bank
            </Btn>
          </div>
          <ul className="space-y-2">
            {draft.lockers.map((l) => (
              <li
                key={l.id}
                className={`rounded-xl ring-1 ring-slate-200 p-2.5 grid sm:grid-cols-12 gap-2 items-end ${l.active ? "" : "opacity-60"}`}
              >
                <div className="sm:col-span-4">
                  <Field label="Name">
                    <Input value={l.name} onChange={(e) => patch(l.id, { name: e.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label="Type">
                    <Select
                      value={l.size}
                      onChange={(e) => patch(l.id, { size: e.target.value as LockerBank["size"] })}
                      options={["Standard", "Large", "Premium"].map((v) => ({ v, l: v }))}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Base €/day">
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={l.price}
                      onChange={(e) => patch(l.id, { price: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Lockers">
                    <Input
                      type="number"
                      min={0}
                      value={l.total}
                      onChange={(e) => patch(l.id, { total: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-1 pb-1">
                  <Toggle
                    on={l.active}
                    onChange={(v) => patch(l.id, { active: v })}
                    ariaLabel={`${l.name} active`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-navy-900">Locker provider</h2>
            <Badge tone={status === "Connected" ? "green" : status === "Outage" ? "red" : "slate"}>
              {status}
            </Badge>
          </div>
          <div className="text-[12.5px] text-slate-600">
            {pv.name} · last sync{" "}
            {new Date(pv.lastSync).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Lockers offered for sale follow the provider’s live availability.
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn
              size="sm"
              variant="outline"
              icon={Icon.refresh}
              disabled={syncing || !pv.connected}
              onClick={sync}
            >
              {syncing ? (
                <>
                  <Spinner size={12} /> Syncing…
                </>
              ) : (
                "Sync now"
              )}
            </Btn>
            <Toggle
              on={pv.outage}
              onChange={(v) => setProvider({ outage: v })}
              label="Demo: provider outage"
            />
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => setProvider({ connected: !pv.connected })}
            >
              {pv.connected ? "Disconnect" : "Connect"}
            </Btn>
          </div>
          {(!pv.connected || pv.outage) && (
            <div
              role="alert"
              className="rounded-lg bg-amber-50 text-amber-900 ring-1 ring-amber-600/20 px-3 py-2 text-[12.5px]"
            >
              Locker sales are paused in the wizard and the till until {pv.name} is back.
            </div>
          )}
          <div className="block text-[12px] font-semibold text-slate-700">
            Availability on
            <DateInput aria-label="Availability on"
              
              value={date}
              onChange={(v) => v && setDate(v)}
              className="block mt-1 rounded-lg ring-1 ring-slate-200 px-2 py-1.5 text-[13px]"
            />
          </div>
          <table className="w-full text-[13px] tnum">
            <caption className="sr-only">Locker availability on {fmtDay(date)}</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-1">Bank</th>
                <th>Available</th>
                <th>Price</th>
                <th className="text-right">Provider reports (demo)</th>
              </tr>
            </thead>
            <tbody>
              {extras.lockers
                .filter((l) => l.active)
                .map((l) => {
                  const a = lockerAvail(extras, l.id, date);
                  const k = `${l.id}|${date}`;
                  return (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="py-1.5 font-semibold text-navy-900">{l.name}</td>
                      <td>
                        {a === null ? (
                          <Badge tone="amber">Paused</Badge>
                        ) : (
                          <span className={a === 0 ? "text-rose-700 font-semibold" : ""}>
                            {a} / {l.total}
                          </span>
                        )}
                      </td>
                      <td>€{lockerPrice(extras, l.id, date).price}</td>
                      <td className="text-right">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`${l.name} available reported by provider`}
                          value={extras.provider.reported[k] ?? ""}
                          placeholder="feed"
                          onChange={(e) =>
                            setExtras((s) => {
                              const r = { ...s.provider.reported };
                              if (e.target.value === "") delete r[k];
                              else r[k] = Math.max(0, Number(e.target.value));
                              return { ...s, provider: { ...s.provider, reported: r } };
                            })
                          }
                          className="!w-20 !py-1 ml-auto"
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>
      </div>
      <RulesAndPreview kind="locker" draft={draft} setDraft={setDraft} />
    </div>
  );
}
