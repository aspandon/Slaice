import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, PageHead, PeriodPicker, Select, Toggle } from "../../components/ui";
import { SunbedMap } from "../../components/SunbedMap";
import { Sunbed } from "../../components/Beach";
import { useApp } from "../../app/store";
import { readHashQuery } from "../../app/router";
import { ZONES } from "../../data/beach";
import { summarize } from "../../data/analytics";
import { DEMO_TODAY, addDays, rangeLabel, resolveRange } from "../../domain/period";
import { NO_SHOW_CUTOFF, OPS_LABEL, type OpsStatus } from "../../domain/sunbedOps";
import { usePeriod } from "../../lib/usePeriod";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useBeachState } from "../../lib/useBeachState";
import type { SunbedSlot } from "../../domain/types";

import { useUndoToast } from "../../lib/useUndo";
import { DEFAULT_RULES } from "../../domain/bookingOps";
/* ============ Admin › Live beach (AENR-580) ============
   The manager runs the beach from the map: every set with its code and live
   state (free, booked, checked in, unpaid, held, out of service, no-show), a
   heatmap of occupancy or revenue for a period, multi-select to move guests
   between sets, and "Release no-show" to resell a set after the cut-off.
   Every change goes through the shared set status, so the booking, both sets
   and every other map (wizard, till, controller) follow at once. */

type View = "live" | "heat";
type Metric = "occupancy" | "revenue";
type LegendKey = "free" | "booked" | "occupied" | "unpaid" | "held" | "oos" | "noshow";
const LEGEND: { k: LegendKey; label: string; text: string; cls: string }[] = [
  { k: "free", label: "Free", text: "", cls: "bg-white ring-1 ring-slate-300" },
  { k: "booked", label: "Booked", text: "", cls: "bg-sky-500" },
  { k: "occupied", label: "Checked in", text: "✓", cls: "bg-teal-600 text-white" },
  { k: "unpaid", label: "Unpaid", text: "€", cls: "bg-amber-400 text-navy-900" },
  { k: "noshow", label: "No-show", text: "N", cls: "bg-violet-600 text-white" },
  { k: "held", label: "Held", text: "H", cls: "bg-slate-600 text-white" },
  { k: "oos", label: "Out of service", text: "✕", cls: "bg-rose-600 text-white" },
];
const unit = (key: string) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

export function AdminLiveBeach() {
  const { sunbedOps, bookingOps, setSunbedOps, setBookingOps } = useApp();
  // Moves and releases are reversible: they happen at once with Undo (AENR-615).
  const undo = useUndoToast();
  const snapshot = () => {
    const prev = { s: sunbedOps, b: bookingOps };
    return () => { setSunbedOps(() => prev.s); setBookingOps(() => prev.b); };
  };
  const [date, setDate] = useState(DEMO_TODAY);
  // ?zone=&set= open a zone with a set selected (deep links from ⌘K, AENR-553).
  const [zoneId, setZoneId] = useState(() => readHashQuery().get("zone") ?? "central");
  const [view, setView] = useState<View>("live");
  const [metric, setMetric] = useState<Metric>("occupancy");
  const [period, setPeriod] = usePeriod({ kind: "preset", preset: "season", offset: 0 });
  const [sel, setSel] = useState<Set<string>>(() => new Set(readHashQuery().get("set") ? [readHashQuery().get("set") as string] : []));
  const [moveTo, setMoveTo] = useState("");
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const liveSlots = useLiveSlots("walkin");
  const slots = useMemo(() => liveSlots(zone, [date]), [liveSlots, zone, date]);
  const { statusOf, bookingOf, exOf, ops } = useBeachState(date);

  /** One legend state per set (the most urgent one). */
  const keyOf = (s: SunbedSlot): LegendKey => {
    const st = statusOf(s);
    const ex = exOf(s);
    if (st === "blocked") return "oos";
    if (st === "hold") return "held";
    if (ex.includes("noshow")) return "noshow";
    if (ex.includes("unpaid")) return "unpaid";
    if (st === "occupied") return "occupied";
    return st === "booked" ? "booked" : "free";
  };
  const counts = LEGEND.reduce<Record<LegendKey, number>>(
    (a, l) => ({ ...a, [l.k]: slots.filter((s) => keyOf(s) === l.k).length }),
    {} as Record<LegendKey, number>,
  );
  const marker = (s: SunbedSlot) => {
    const l = LEGEND.find((x) => x.k === keyOf(s));
    return l && l.text ? { text: l.text, cls: l.cls } : undefined;
  };
  const describe = (s: SunbedSlot) => {
    const b = bookingOf(s);
    return `${LEGEND.find((x) => x.k === keyOf(s))?.label.toLowerCase()}${b ? `, ${b.guest}` : ""}`;
  };

  // Heatmap: the zone's occupancy for the period, shaped by row and set.
  const range =
    resolveRange(period) ?? resolveRange({ kind: "preset", preset: "season", offset: 0 })!;
  const summary = useMemo(() => summarize(range), [range]);
  const zoneOcc = summary.occupancyByZone[zoneId] ?? 0;
  const occOf = (s: SunbedSlot) =>
    Math.max(
      0,
      Math.min(
        1,
        zoneOcc * (s.kind === "front" ? 1.18 : s.y > 80 ? 0.84 : 1) +
          (unit(`${s.id}`) - 0.5) * 0.18,
      ),
    );
  const revOf = (s: SunbedSlot) => occOf(s) * s.price * summary.openDays;
  const maxRev = Math.max(1, ...slots.map(revOf));
  const heat = (s: SunbedSlot) => (metric === "occupancy" ? occOf(s) : revOf(s) / maxRev);

  const selList = slots.filter((s) => sel.has(s.id));
  const sources = selList.filter((s) => bookingOf(s));
  const targets = selList.filter((s) => statusOf(s) === "available" && !bookingOf(s));
  const free = slots.filter(
    (s) => statusOf(s) === "available" && s.state === "a" && !sel.has(s.id),
  );
  const noShows = selList.filter((s) => exOf(s).includes("noshow"));
  const allNoShows = slots.filter((s) => exOf(s).includes("noshow"));

  const moveOne = (from: SunbedSlot, to: string) => {
    const b = bookingOf(from);
    if (b?.booking) ops.move(b.booking, from.id, to, "Moved on the live map");
    else ops.moveSet(date, from.id, to, "Moved on the live map");
  };
  const movePairs = () => {
    const restore = snapshot();
    sources.forEach((s, i) => moveOne(s, targets[i].id));
    undo(`${sources.map((s, i) => `${s.id} → ${targets[i].id}`).join(", ")} — bookings and both sets updated everywhere.`, restore);
    setSel(new Set(targets.map((t) => t.id)));
  };
  const moveSingle = () => {
    if (!moveTo || sources.length !== 1) return;
    const restore = snapshot();
    moveOne(sources[0], moveTo);
    undo(`${sources[0].id} → ${moveTo} — booking and both sets updated everywhere.`, restore);
    setSel(new Set([moveTo]));
    setMoveTo("");
  };
  const releaseNoShows = (list: SunbedSlot[]) => {
    const restore = snapshot();
    list.forEach((s) =>
      ops.release(
        s.id,
        date,
        `No-show after ${NO_SHOW_CUTOFF} — released for resale`,
        bookingOf(s)?.booking?.id,
      ),
    );
    undo(`${list.map((s) => s.id).join(", ")} released — sellable now online, at the till and on the beach.`, restore);
    setSel(new Set());
  };
  const toggle = (s: SunbedSlot) =>
    setSel((cur) => {
      const n = new Set(cur);
      if (n.has(s.id)) n.delete(s.id);
      else n.add(s.id);
      return n;
    });

  return (
    <div className="animate-fade-up">
      <PageHead
        title="Live beach"
        sub="Run the beach from the map — who is where, what needs action, and where demand is."
        badge={<Badge tone="mvp">MVP</Badge>}
      />
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div
          role="radiogroup"
          aria-label="Date"
          className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden"
        >
          {[
            [DEMO_TODAY, "Today"],
            [addDays(DEMO_TODAY, 1), "Tomorrow"],
          ].map(([d, l]) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={date === d}
              onClick={() => {
                setDate(d);
                setSel(new Set());
              }}
              className={`px-3.5 min-h-[44px] text-sm font-semibold ${date === d ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="w-40">
          <Select
            aria-label="Zone"
            value={zoneId}
            onChange={(e) => {
              setZoneId(e.target.value);
              setSel(new Set());
            }}
            options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
          />
        </div>
        <div
          role="radiogroup"
          aria-label="View"
          className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden"
        >
          {(
            [
              ["live", "Live state"],
              ["heat", "Heatmap"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`px-3.5 min-h-[44px] text-sm font-semibold ${view === v ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <Card className="p-4 min-w-0">
          {view === "live" ? (
            <ul
              aria-label="Legend"
              className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-[12.5px] text-slate-700"
            >
              {LEGEND.map((l) => (
                <li key={l.k} className="inline-flex items-center gap-1.5">
                  {l.k === "free" || l.k === "booked" ? (
                    <Sunbed state={l.k === "free" ? "a" : "u"} size={16} readOnly />
                  ) : (
                    <span
                      aria-hidden
                      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center ${l.cls}`}
                    >
                      {l.text}
                    </span>
                  )}
                  {l.label} <b className="tnum text-navy-900">{counts[l.k]}</b>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div
                role="radiogroup"
                aria-label="Heatmap measure"
                className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden"
              >
                {(
                  [
                    ["occupancy", "Occupancy"],
                    ["revenue", "Revenue"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={metric === v}
                    onClick={() => setMetric(v)}
                    className={`px-3 min-h-[40px] text-[13px] font-semibold ${metric === v ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <PeriodPicker
                value={period}
                onChange={setPeriod}
                presets={["week", "month", "season"]}
              />
              <span className="text-[12px] text-slate-500 flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="w-16 h-2.5 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, rgba(20,184,166,.35), rgba(240,64,46,.75))",
                  }}
                />
                low → high · {zone.name} {Math.round(zoneOcc * 100)}% · {rangeLabel(range)}
              </span>
            </div>
          )}
          <SunbedMap
            pickAny
            showCodes
            label={`${zone.name} live map`}
            slots={slots}
            selected={sel}
            onToggle={toggle}
            describe={describe}
            marker={view === "live" ? marker : undefined}
            heat={view === "heat" ? heat : undefined}
          />
          <p className="mt-2 text-[11.5px] text-slate-500">
            Tap sets to select — several at once to move guests (pick the booked sets, then as many
            free ones).
          </p>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-4">
          {allNoShows.length > 0 && date === DEMO_TODAY && (
            <Card className="p-4">
              <div className="font-semibold text-navy-900">
                {allNoShows.length} no-show{allNoShows.length === 1 ? "" : "s"} in {zone.name}
              </div>
              <p className="text-[12.5px] text-slate-600 mt-0.5">
                Booked for today, not checked in by {NO_SHOW_CUTOFF}:{" "}
                {allNoShows.map((s) => s.id).join(", ")}.
              </p>
              <Btn
                size="sm"
                variant="primary"
                icon={Icon.bolt}
                className="mt-2"
                onClick={() => releaseNoShows(allNoShows)}
              >
                Release all for resale
              </Btn>
            </Card>
          )}
          {date === DEMO_TODAY && <AutoReleaseCard />}
          <Card className="p-4 space-y-3">
            {selList.length === 0 ? (
              <p className="text-[13px] text-slate-600">
                Select a set to see who is on it. Select booked sets plus the same number of free
                sets to move guests; select no-shows to release them.
              </p>
            ) : (
              <>
                <div className="font-semibold text-navy-900">{selList.length} selected</div>
                <ul className="divide-y divide-slate-100 text-[13px]">
                  {selList.map((s) => {
                    const b = bookingOf(s);
                    const st: OpsStatus = statusOf(s);
                    return (
                      <li key={s.id} className="py-1.5 flex items-center gap-2">
                        <span className="font-mono font-semibold w-14">{s.id}</span>
                        <span className="flex-1 min-w-0 truncate text-slate-600">
                          {b ? `${b.ref} · ${b.guest}${b.paid ? "" : " · unpaid"}` : OPS_LABEL[st]}
                        </span>
                        <Badge
                          tone={
                            keyOf(s) === "free"
                              ? "green"
                              : keyOf(s) === "oos"
                                ? "red"
                                : keyOf(s) === "booked" || keyOf(s) === "occupied"
                                  ? "blue"
                                  : "amber"
                          }
                        >
                          {LEGEND.find((l) => l.k === keyOf(s))?.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
                {sources.length > 0 && targets.length === sources.length && (
                  <Btn variant="primary" icon={Icon.arrowR} onClick={movePairs}>
                    Move {sources.length} guest{sources.length === 1 ? "" : "s"}:{" "}
                    {sources.map((s, i) => `${s.id} → ${targets[i].id}`).join(", ")}
                  </Btn>
                )}
                {sources.length === 1 && targets.length === 0 && (
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      moveSingle();
                    }}
                  >
                    <div className="flex-1">
                      <Field label={`Move ${sources[0].id} to`}>
                        <Select
                          value={moveTo}
                          onChange={(e) => setMoveTo(e.target.value)}
                          options={[
                            { v: "", l: "Pick a free set" },
                            ...free.map((s) => ({ v: s.id, l: s.id })),
                          ]}
                        />
                      </Field>
                    </div>
                    <Btn type="submit" variant="primary" disabled={!moveTo}>
                      Move
                    </Btn>
                  </form>
                )}
                {sources.length > 0 && targets.length > 0 && targets.length !== sources.length && (
                  <p className="text-[12.5px] text-amber-800">
                    Select as many free sets as booked ones ({sources.length}) to move the guests.
                  </p>
                )}
                {noShows.length > 0 && date === DEMO_TODAY && (
                  <Btn variant="outline" icon={Icon.bolt} onClick={() => releaseNoShows(noShows)}>
                    Release {noShows.length} no-show{noShows.length === 1 ? "" : "s"} for resale
                  </Btn>
                )}
                <Btn variant="ghost" size="sm" onClick={() => setSel(new Set())}>
                  Clear selection
                </Btn>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* No-shows go back on sale by themselves at the set time (AENR-623). */
function AutoReleaseCard() {
  const { bookingOps, setBookingOps } = useApp();
  const rules = bookingOps.rules ?? DEFAULT_RULES;
  const nr = rules.noShow;
  const set = (p: Partial<typeof nr>) => setBookingOps((o) => ({ ...o, rules: { ...(o.rules ?? DEFAULT_RULES), noShow: { ...(o.rules ?? DEFAULT_RULES).noShow, ...p } } }));
  const ran = nr.lastRun === DEMO_TODAY;
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-navy-900">Release no-shows automatically</div>
          <div className="text-[12.5px] text-slate-600">
            {!nr.on
              ? "Off — release them by hand above."
              : ran
                ? nr.last
                  ? `Done today at ${new Date(nr.last.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — ${nr.last.sets.length} set${nr.last.sets.length === 1 ? "" : "s"} back on sale.`
                  : "Done today."
                : `Today at ${nr.time}; Today shows a summary you can undo for an hour.`}
          </div>
        </div>
        <Toggle label={nr.on ? "On" : "Off"} on={nr.on} onChange={(v) => set({ on: v })} />
      </div>
      {nr.on && (
        <label className="flex items-center gap-2 text-[12.5px] text-slate-700">
          At
          <input type="time" value={nr.time} onChange={(e) => set({ time: e.target.value || "11:00" })}
            className="rounded-lg ring-1 ring-slate-200 px-2 py-1 tnum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label="Release time" />
          every day
        </label>
      )}
    </Card>
  );
}
