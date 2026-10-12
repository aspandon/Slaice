import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Input, Toggle } from "../../components/ui";
import { useApp } from "../../app/store";
import { ZONES, zoneLayout } from "../../data/beach";
import { dayStats } from "../../data/analytics";
import { DEMO_TODAY, addDays, fmtDay } from "../../domain/period";
import { resolvePrice, suggestPrice, type DemandSuggestion } from "../../domain/pricing";
import { tillSetStatus } from "../../domain/till";
import type {
  BeachPricing,
  DemandBand,
  DemandLogEntry,
  PriceCategory,
  PriceOverride,
} from "../../domain/types";

/* ============ Demand pricing suggestions (AENR-513) ============
   Per price category the manager sets a weekday and a weekend band; the
   panel suggests a price for each of the next 14 days from occupancy on the
   books, days to go and booking pace (sample data). Nothing changes until a
   suggestion is accepted — or the manager opts into the daily auto-apply run.
   An accepted suggestion becomes a one-day override (source "Suggestion") on
   the category's sets that aren't booked yet, so existing bookings keep their
   price; a lock on a date/category keeps it out of every run. */

const HORIZON = 14;
const lockKey = (date: string, catId: string) => `${date}|${catId}`;
const isWeekend = (d: string) => [0, 6].includes(new Date(`${d}T00:00:00`).getDay());
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Booking pace vs usual for the weekday — deterministic sample data (0.8–1.35). */
const paceOf = (d: string, catId: string) => 0.8 + (hash(d + catId) % 56) / 100;
let seq = 0;

type Row = {
  date: string;
  cat: PriceCategory;
  current: number;
  s: DemandSuggestion;
  free: string[];
  locked: boolean;
};

export function defaultBand(c: PriceCategory): DemandBand {
  return {
    catId: c.id,
    enabled: false,
    wkMin: Math.round(c.price * 0.85),
    wkMax: Math.round(c.price * 1.15),
    weMin: c.price,
    weMax: Math.round(c.price * 1.3),
    step: 1,
  };
}

export function DemandPanel({ zoneId }: { zoneId: string }) {
  const { toast, beachPricing, setBeachPricing, priceRules, beachLayout, till } = useApp();
  const [start, setStart] = useState(DEMO_TODAY);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const cats = beachPricing.categories.filter((c) => c.zoneId === zoneId);
  const slots = beachLayout[zoneId] ?? zoneLayout(zone);
  const bands = beachPricing.demand ?? [];
  const bandOf = (c: PriceCategory) => bands.find((b) => b.catId === c.id) ?? defaultBand(c);
  const locks = new Set(beachPricing.demandLocks ?? []);
  const log = beachPricing.demandLog ?? [];
  const update = (fn: (p: BeachPricing) => BeachPricing) => setBeachPricing(fn(beachPricing));
  const setBand = (c: PriceCategory, patch: Partial<DemandBand>) =>
    update((p) => ({
      ...p,
      demand: [...(p.demand ?? []).filter((b) => b.catId !== c.id), { ...bandOf(c), ...patch }],
    }));

  // One row per enabled category and upcoming date.
  const rows: Row[] = [];
  for (let i = 1; i <= HORIZON; i++) {
    const date = addDays(start, i);
    const st = dayStats(date);
    const sold = tillSetStatus(till, date, Date.now());
    for (const c of cats) {
      const band = bandOf(c);
      if (!band.enabled) continue;
      const catSlots = slots.filter((s) => s.cat === c.id);
      if (!catSlots.length) continue;
      // Front rows sell first; what's on the books grows as the date nears.
      const lift = c.code === "FR" ? 0.12 : c.code === "BK" ? -0.1 : 0;
      const final = st.open
        ? Math.min(0.99, Math.max(0, (st.setsSold[zoneId] ?? 0) / zone.total + lift))
        : 0;
      const occupancy = final * Math.min(1, Math.max(0.4, 1 - i * 0.03));
      const s = suggestPrice(band, {
        occupancy,
        daysOut: i,
        pace: paceOf(date, c.id),
        weekend: isWeekend(date),
      });
      const current = resolvePrice(catSlots[0], zoneId, date, beachPricing, priceRules).price;
      const free = catSlots.filter((x) => sold[x.id] !== "sold").map((x) => x.id);
      rows.push({ date, cat: c, current, s, free, locked: locks.has(lockKey(date, c.id)) });
    }
  }
  const open = rows.filter(
    (r) => r.s.price !== r.current && !r.locked && !rejected.has(lockKey(r.date, r.cat.id)),
  );

  /** Apply suggestions as one-day overrides and log them. */
  const apply = (list: Row[], mode: DemandLogEntry["mode"]) => {
    if (!list.length) return;
    const at = new Date().toISOString();
    const ovs: PriceOverride[] = [];
    const entries: DemandLogEntry[] = [];
    for (const r of list) {
      const id = `ov-sg-${Date.now().toString(36)}-${++seq}`;
      ovs.push({
        id,
        zoneId,
        setIds: r.free,
        from: r.date,
        to: r.date,
        days: "all",
        price: r.s.price,
        label: `Suggestion · ${r.cat.name}`,
        source: "suggestion",
        catId: r.cat.id,
      });
      entries.push({
        id: `dl-${seq}`,
        at,
        date: r.date,
        zoneId,
        catId: r.cat.id,
        from: r.current,
        to: r.s.price,
        reason: r.s.reason,
        overrideId: id,
        mode,
      });
    }
    update((p) => ({
      ...p,
      overrides: [...p.overrides, ...ovs],
      demandLog: [...entries, ...(p.demandLog ?? [])].slice(0, 80),
    }));
    toast(
      `${mode === "auto" ? "Daily run applied" : "Applied"} ${list.length} price${list.length === 1 ? "" : "s"} for ${zone.name} — bookings already made keep their price.`,
      { tone: "success" },
    );
  };
  const revert = (e: DemandLogEntry) => {
    update((p) => ({
      ...p,
      overrides: p.overrides.filter((o) => o.id !== e.overrideId),
      demandLog: (p.demandLog ?? []).map((x) => (x.id === e.id ? { ...x, reverted: true } : x)),
    }));
    toast(`Reverted ${fmtDay(e.date)} to €${e.from}.`);
  };
  const toggleLock = (r: Row) =>
    update((p) => {
      const k = lockKey(r.date, r.cat.id);
      const cur = new Set(p.demandLocks ?? []);
      if (cur.has(k)) cur.delete(k);
      else cur.add(k);
      return { ...p, demandLocks: [...cur] };
    });
  const runDaily = () => {
    setRunning(true);
    window.setTimeout(() => {
      setRunning(false);
      if (!open.length) return toast("Daily run: every price is already where the demand says.");
      apply(open, "auto");
    }, 1200);
  };
  const catName = (id: string) => beachPricing.categories.find((c) => c.id === id)?.name ?? id;
  const zoneLog = log.filter((e) => e.zoneId === zoneId);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display font-bold text-navy-900">Demand pricing · {zone.name}</h2>
        <Badge tone="slate">Suggestions only — you approve</Badge>
        <label className="ml-auto text-[12px] font-semibold text-slate-700 flex items-center gap-2">
          From
          <input
            type="date"
            value={start}
            onChange={(e) => e.target.value && setStart(e.target.value)}
            className="rounded-lg ring-1 ring-slate-200 px-2 py-1.5 text-[13px]"
          />
        </label>
      </div>

      {/* Bands per category */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Demand pricing bands per category</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-1 pr-2">Category</th>
              <th className="pr-2">On</th>
              <th className="pr-2">Weekday min–max €</th>
              <th className="pr-2">Weekend min–max €</th>
              <th>Step €</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => {
              const b = bandOf(c);
              const bad = b.wkMin > b.wkMax || b.weMin > b.weMax;
              const num = (k: keyof DemandBand, label: string) => (
                <Input
                  type="number"
                  min={0}
                  aria-label={`${c.name} ${label}`}
                  value={b[k] as number}
                  onChange={(e) => setBand(c, { [k]: Number(e.target.value) })}
                  className="!w-20 !py-1.5"
                />
              );
              return (
                <tr key={c.id} className="border-t border-slate-100 align-middle">
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                      <b>{c.code}</b> {c.name} <span className="text-slate-500">· €{c.price}</span>
                    </span>
                  </td>
                  <td className="pr-2">
                    <Toggle
                      on={b.enabled}
                      onChange={(v) => setBand(c, { enabled: v })}
                      ariaLabel={`Demand pricing for ${c.name}`}
                    />
                  </td>
                  <td className="pr-2">
                    <span className="flex items-center gap-1">
                      {num("wkMin", "weekday minimum")}–{num("wkMax", "weekday maximum")}
                    </span>
                  </td>
                  <td className="pr-2">
                    <span className="flex items-center gap-1">
                      {num("weMin", "weekend minimum")}–{num("weMax", "weekend maximum")}
                    </span>
                  </td>
                  <td>
                    {num("step", "step")}
                    {bad && (
                      <div role="alert" className="text-[11px] text-rose-700">
                        Min is above max.
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Suggestions */}
      <section aria-labelledby="sg-h">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 id="sg-h" className="font-semibold text-navy-900">
            Suggestions · next {HORIZON} days
          </h3>
          <span className="text-[12px] text-slate-500">{open.length} to review</span>
          <Btn
            size="sm"
            variant="primary"
            icon={Icon.check}
            className="ml-auto"
            disabled={!open.length}
            onClick={() => apply(open, "accepted")}
          >
            Accept all
          </Btn>
        </div>
        {!bands.some((b) => b.enabled && cats.some((c) => c.id === b.catId)) ? (
          <div className="rounded-xl bg-slate-50 ring-1 ring-dashed ring-slate-300 px-3 py-4 text-[13px] text-slate-600 text-center">
            Switch demand pricing on for a category and set its band — suggestions appear here.
          </div>
        ) : rows.length === 0 ? null : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const k = lockKey(r.date, r.cat.id);
              const same = r.s.price === r.current;
              const effect = Math.round(
                (r.s.price - r.current) * r.free.length * Math.max(0.2, r.s.pressure),
              );
              return (
                <li key={k} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="w-28 font-semibold text-navy-900">
                    {fmtDay(r.date)}
                    {isWeekend(r.date) && (
                      <span className="ml-1 text-[10.5px] text-indigo-600">WE</span>
                    )}
                  </span>
                  <span className="w-24 text-slate-600">{r.cat.name}</span>
                  <span className="tnum w-28">
                    {same ? (
                      <b className="text-navy-900">€{r.current}</b>
                    ) : (
                      <>
                        €{r.current} →{" "}
                        <b
                          className={r.s.price > r.current ? "text-emerald-700" : "text-amber-700"}
                        >
                          €{r.s.price}
                        </b>
                      </>
                    )}
                  </span>
                  <span className="flex-1 min-w-[12rem] text-[12px] text-slate-600">
                    {r.s.reason}
                    {!same && (
                      <>
                        {" "}
                        · expected {effect >= 0 ? "+" : "−"}€{Math.abs(effect)}
                      </>
                    )}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      aria-pressed={r.locked}
                      aria-label={`${r.locked ? "Unlock" : "Lock"} ${r.cat.name} on ${fmtDay(r.date)}`}
                      onClick={() => toggleLock(r)}
                      className={`w-9 h-9 grid place-items-center rounded-lg ring-1 ${r.locked ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200 text-slate-500 hover:ring-teal-400"}`}
                    >
                      <Icon.lock size={14} />
                    </button>
                    {r.locked ? (
                      <Badge tone="slate">Locked</Badge>
                    ) : same ? (
                      <Badge tone="green">At suggestion</Badge>
                    ) : rejected.has(k) ? (
                      <Badge tone="slate">Rejected</Badge>
                    ) : (
                      <>
                        <Btn size="sm" variant="teal" onClick={() => apply([r], "accepted")}>
                          Accept
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejected((s) => new Set(s).add(k))}
                        >
                          Reject
                        </Btn>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Auto-apply + log */}
      <section className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Toggle
            on={!!beachPricing.demandAuto}
            onChange={(v) => update((p) => ({ ...p, demandAuto: v }))}
            label="Auto-apply once a day"
          />
          <Btn
            size="sm"
            variant="outline"
            icon={Icon.bolt}
            loading={running}
            disabled={!beachPricing.demandAuto}
            onClick={runDaily}
          >
            Run today’s update (demo)
          </Btn>
          <span className="text-[11.5px] text-slate-500">
            Never outside a band, never on booked sets, never on a locked date.
          </span>
        </div>
        {zoneLog.length > 0 && (
          <ul className="text-[12.5px] divide-y divide-slate-100">
            {zoneLog.map((e) => (
              <li key={e.id} className="py-1.5 flex flex-wrap items-center gap-2">
                <span className="w-24 font-semibold text-navy-900">{fmtDay(e.date)}</span>
                <span className="w-24">{catName(e.catId)}</span>
                <span className="tnum">
                  €{e.from} → €{e.to}
                </span>
                <Badge tone={e.mode === "auto" ? "indigo" : "blue"}>
                  {e.mode === "auto" ? "Auto" : "Accepted"}
                </Badge>
                <span className="flex-1 min-w-[10rem] text-slate-500">{e.reason}</span>
                {e.reverted ? (
                  <Badge tone="slate">Reverted</Badge>
                ) : (
                  <Btn size="sm" variant="ghost" icon={Icon.arrowL} onClick={() => revert(e)}>
                    Revert
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
