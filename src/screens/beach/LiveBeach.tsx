import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Flip, motionOK, EASE } from "../../lib/fx";
import { useClosure } from "../../lib/useLiveSlots";
import { ZoneChips } from "../../components/ZoneChips";
import { prefersReducedMotion } from "../../lib/motion";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, PageHead, PeriodPicker, Select, Toggle } from "../../components/ui";
import { SunbedMap, StaffSet } from "../../components/SunbedMap";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { ZONES } from "../../data/beach";
import { summarize } from "../../data/analytics";
import { DEMO_TODAY, addDays, rangeLabel, resolveRange } from "../../domain/period";
import { NO_SHOW_CUTOFF, OPS_LABEL, type OpsStatus } from "../../domain/sunbedOps";
import { usePeriod } from "../../lib/usePeriod";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useBeachState } from "../../lib/useBeachState";
import type { SunbedSlot } from "../../domain/types";

import { useUndoToast } from "../../lib/useUndo";
import { ActionsMenu } from "../../components/ui/ActionsMenu";
import type { SetBooking } from "../../lib/useBeachState";
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
  const { sunbedOps, bookingOps, setSunbedOps, setBookingOps, go } = useApp();
  // Moves and releases are reversible: they happen at once with Undo (AENR-615).
  const undo = useUndoToast();
  const snapshot = () => {
    const prev = { s: sunbedOps, b: bookingOps };
    return () => { setSunbedOps(() => prev.s); setBookingOps(() => prev.b); };
  };
  const [date, setDate] = useState(DEMO_TODAY);
  // ?zone=&set= open a zone with a set selected (deep links from ⌘K, AENR-553).
  // No ?zone= → the whole beach first (AENR-650).
  const [zoneId, setZoneId] = useState(() => readHashQuery().get("zone") ?? "all");
  const overview = zoneId === "all";
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
    // Booked but not here yet: a small clock (AENR-663).
    if (keyOf(s) === "booked") return { text: <Icon.clock size={11} />, cls: "bg-sky-600 text-white grid place-items-center" };
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
  // One set selected → its card acts on it (AENR-651). Every action is undoable.
  const act = (msg: string, fn: () => void) => {
    const restore = snapshot();
    fn();
    undo(msg, restore);
  };
  const [moveOpen, setMoveOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // The whole beach (AENR-650): every zone with its counts; tap one to zoom in.
  const closure = useClosure();
  const stats = ZONES.map((z) => {
    const sl = liveSlots(z, [date]);
    const keys = sl.map((x) => [x, keyOf(x)] as const);
    const n = (k: LegendKey) => keys.filter(([, kk]) => kk === k).length;
    return { zone: z, slots: keys, closed: closure(z.id, date), free: n("free"), booked: n("booked") + n("unpaid") + n("noshow"), inUse: n("occupied"), action: n("unpaid") + n("noshow") };
  });
  const flipRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const pickZone = (id: string) => {
    if (id !== "all" && overview && motionOK()) flipRef.current = Flip.getState(`[data-flip-id="zone-${id}"]`);
    setZoneId(id);
    setSel(new Set());
    if (id === "all") writeHashQuery({}, ["zone", "set"]);
    else writeHashQuery({ zone: id }, ["set"]);
  };
  useLayoutEffect(() => {
    const st = flipRef.current;
    if (!st) return;
    flipRef.current = null;
    Flip.from(st, { targets: `[data-flip-id="zone-${zoneId}"]`, duration: 0.55, ease: EASE.inOut, scale: true });
  }, [zoneId]);
  const toggle = (s: SunbedSlot) => {
    // On a phone the card sits under the map: bring it into view on the first pick.
    if (!sel.size && window.matchMedia("(max-width: 1023px)").matches)
      requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" }));
    setSel((cur) => {
      const n = new Set(cur);
      if (n.has(s.id)) n.delete(s.id);
      else n.add(s.id);
      setMoveOpen(false);
      return n;
    });
  };

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
        <ZoneChips value={zoneId} onChange={pickZone} className="w-full" all={{ sub: `${stats.reduce((a, x) => a + (x.closed ? 0 : x.free), 0)} free` }}
          info={(id) => { const x = stats.find((z) => z.zone.id === id); return !x ? {} : x.closed ? { sub: "Closed", off: true } : { sub: `${x.free} free · ${x.booked + x.inUse} booked`, off: x.free === 0 }; }} />
        {!overview && (
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
        )}
      </div>

      {overview ? (
        <BeachOverview stats={stats} onPick={pickZone} />
      ) : (
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div data-flip-id={`zone-${zone.id}`} className="min-w-0">
        <Card className="p-4 min-w-0">
          {view === "live" ? (
            <ul
              aria-label="Legend"
              className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-[12.5px] text-slate-700"
            >
              {LEGEND.map((l) => (
                <li key={l.k} className="inline-flex items-center gap-1.5">
                  {l.k === "free" || l.k === "booked" ? (
                    <span className="relative inline-block">
                      <StaffSet state={l.k === "free" ? "a" : "u"} size={18} />
                      {l.k === "booked" && <span aria-hidden className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-sky-600 text-white grid place-items-center ring-1 ring-white"><Icon.clock size={9} /></span>}
                    </span>
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
            staff
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
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
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
          <div ref={cardRef} className={`scroll-mt-4 ${selList.length ? "order-first" : ""}`}>
          <Card className="p-4 space-y-3">
            {selList.length === 1 ? (
              <SetCard
                s={selList[0]}
                zoneName={zone.name}
                b={bookingOf(selList[0])}
                st={statusOf(selList[0])}
                legend={keyOf(selList[0])}
                isToday={date === DEMO_TODAY}
                onCheckIn={(s, b) => act(`${s.id} checked in — ${b.guest} is on the sand.`, () => ops.checkIn(s.id, date, b.ref))}
                onPay={(_s, b, how) => act(`${b.ref} paid €${(b.due ?? 0).toFixed(2)} by ${how.toLowerCase()} — Today and Bookings updated.`, () => ops.takePayment(b.ref, b.due ?? 0, how))}
                onRelease={(s) => releaseNoShows([s])}
                onStatus={(s, from, to, why) => act(`${s.id} → ${OPS_LABEL[to]}.`, () => ops.setSetStatus(s.id, date, from, to, why))}
                onSell={(s) => go("admin", "newbooking", { setId: s.id, ts: Date.now() })}
                onMove={() => setMoveOpen(true)}
                onOpenBooking={(b) => { window.location.hash = `#/admin/bookings?booking=${encodeURIComponent(b.ref)}`; }}
              />
            ) : null}
            {selList.length === 0 ? (
              <p className="text-[13px] text-slate-600">
                Select a set to see who is on it. Select booked sets plus the same number of free
                sets to move guests; select no-shows to release them.
              </p>
            ) : (
              <>
                {selList.length > 1 && <div className="font-semibold text-navy-900">{selList.length} selected</div>}
                {selList.length > 1 && <ul className="divide-y divide-slate-100 text-[13px]">
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
                </ul>}
                {sources.length > 0 && targets.length === sources.length && (
                  <Btn variant="primary" icon={Icon.arrowR} onClick={movePairs}>
                    Move {sources.length} guest{sources.length === 1 ? "" : "s"}:{" "}
                    {sources.map((s, i) => `${s.id} → ${targets[i].id}`).join(", ")}
                  </Btn>
                )}
                {sources.length === 1 && targets.length === 0 && (selList.length > 1 || moveOpen) && (
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
                {noShows.length > 0 && date === DEMO_TODAY && selList.length > 1 && (
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
      )}
    </div>
  );
}

/* The whole beach at a glance (AENR-650): each zone as a small map with its
   counts — free, booked, in use, needing action, closed. Tap to zoom in. */
type ZoneStat = { zone: (typeof ZONES)[number]; slots: (readonly [SunbedSlot, LegendKey])[]; closed?: string; free: number; booked: number; inUse: number; action: number };
const DOT: Record<LegendKey, string> = {
  free: "bg-white ring-1 ring-slate-400",
  booked: "bg-sky-500",
  occupied: "bg-teal-600",
  unpaid: "bg-amber-400",
  noshow: "bg-violet-600",
  held: "bg-slate-600",
  oos: "bg-rose-600",
};
function BeachOverview({ stats, onPick }: { stats: ZoneStat[]; onPick: (id: string) => void }) {
  return (
    <section aria-label="Whole beach" className="space-y-3">
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((x) => (
          <button
            key={x.zone.id}
            type="button"
            data-flip-id={`zone-${x.zone.id}`}
            onClick={() => onPick(x.zone.id)}
            aria-label={`${x.zone.name}: ${x.closed ? `closed (${x.closed})` : `${x.free} free, ${x.booked} booked, ${x.inUse} in use${x.action ? `, ${x.action} need action` : ""}`}. Open the zone.`}
            className="text-left rounded-2xl bg-white/80 ring-1 ring-slate-200 p-3 hover:ring-teal-400 hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-2 font-display font-bold text-navy-900">
                <i aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ background: x.zone.color }} />
                {x.zone.name}
              </span>
              {x.closed ? <Badge tone="neutral">Closed</Badge> : x.action > 0 ? <Badge tone="amber">{x.action} to act on</Badge> : null}
            </div>
            <div aria-hidden className={`relative rounded-xl aspect-[16/8] bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100/70 ring-1 ring-slate-200 overflow-hidden ${x.closed ? "opacity-50 grayscale" : ""}`}>
              <div className="absolute inset-x-0 top-0 h-[7%] bg-sky-300/50" />
              {x.slots.map(([s, k]) => (
                <span key={s.id} className={`absolute w-[7px] h-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${DOT[k]}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-slate-600 tnum">
              {x.closed ? (
                <span>{x.closed}</span>
              ) : (
                <>
                  <span><b className="text-emerald-700">{x.free}</b> free</span>
                  <span><b className="text-navy-900">{x.booked}</b> booked</span>
                  <span><b className="text-navy-900">{x.inUse}</b> in use</span>
                </>
              )}
            </div>
          </button>
        ))}
      </div>
      <p className="text-[12px] text-slate-500">Dots: white free · blue booked · green in use · amber unpaid · violet no-show · grey held · red out of service. Tap a zone to work on its sets.</p>
    </section>
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

/* The set card (AENR-651): who is on the set and the one action that fits —
   Check in, Take payment, Release, or Sell — like tapping a device in Find My.
   Move, Hold and Out of service wait in "…". */
function SetCard({ s, zoneName, b, st, legend, isToday, onCheckIn, onPay, onRelease, onStatus, onSell, onMove, onOpenBooking }: {
  s: SunbedSlot;
  zoneName: string;
  b: SetBooking | null;
  st: OpsStatus;
  legend: LegendKey;
  isToday: boolean;
  onCheckIn: (s: SunbedSlot, b: SetBooking) => void;
  onPay: (s: SunbedSlot, b: SetBooking, how: "Card" | "Cash") => void;
  onRelease: (s: SunbedSlot) => void;
  onStatus: (s: SunbedSlot, from: OpsStatus, to: OpsStatus, why: string) => void;
  onSell: (s: SunbedSlot) => void;
  onMove: () => void;
  onOpenBooking: (b: SetBooking) => void;
}) {
  const [paying, setPaying] = useState(false);
  const l = LEGEND.find((x) => x.k === legend);
  const arrived = st === "occupied";
  type Primary = { label: string; icon: typeof Icon.check; run: () => void } | null;
  const primary: Primary =
    legend === "noshow" && isToday && b
      ? { label: "Release for resale", icon: Icon.bolt, run: () => onRelease(s) }
      : st === "booked" && b && isToday
        ? { label: `Check in ${b.guest.split(" ")[0]}`, icon: Icon.checkCircle, run: () => onCheckIn(s, b) }
        : b && !b.paid
          ? { label: `Take payment · €${(b.due ?? 0).toFixed(2)}`, icon: Icon.card, run: () => setPaying(true) }
          : st === "available"
            ? { label: "Sell this set", icon: Icon.plus, run: () => onSell(s) }
            : st === "hold"
              ? { label: "Release hold", icon: Icon.refresh, run: () => onStatus(s, st, "available", "Hold released on the live map") }
              : st === "blocked"
                ? { label: "Back in service", icon: Icon.refresh, run: () => onStatus(s, st, "available", "Back in service") }
                : null;
  const tone = legend === "free" ? "green" : legend === "oos" ? "red" : legend === "booked" || legend === "occupied" ? "blue" : "amber";
  return (
    <section aria-label={`Set ${s.id}`} className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-lg text-navy-900">{s.id}</span>
            <Badge tone={tone}>{l?.label}</Badge>
          </div>
          <div className="text-[12px] text-slate-500">{zoneName} · €{s.price} a day</div>
        </div>
        <ActionsMenu
          size="sm"
          label={`More actions for ${s.id}`}
          actions={[
            b && !b.paid && primary?.label.startsWith("Take payment") === false && { id: "pay", label: "Take payment", icon: Icon.card, onSelect: () => setPaying(true), hint: `€${(b.due ?? 0).toFixed(2)} due` },
            b && { id: "move", label: "Move to another set…", icon: Icon.arrowR, onSelect: onMove },
            b?.booking && { id: "open", label: "Open booking", icon: Icon.doc, onSelect: () => onOpenBooking(b) },
            st === "available" && { id: "hold", label: "Hold", icon: Icon.lock, onSelect: () => onStatus(s, st, "hold", "Held on the live map") },
            (st === "available" || st === "hold") && { id: "oos", label: "Out of service", icon: Icon.x, destructive: true, onSelect: () => onStatus(s, st, "blocked", "Out of service — set on the live map") },
          ]}
        />
      </div>

      {b ? (
        <div className="space-y-2">
          <div>
            <div className="font-semibold text-navy-900">{b.guest}</div>
            {b.phone && (
              <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-[13px] text-teal-700 font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                <Icon.phone size={13} /> {b.phone}
              </a>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-2 text-[12px]">
            <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 px-2 py-1.5">
              <dt className="text-slate-500">Party</dt>
              <dd className="font-semibold text-navy-900">{b.guests} guest{b.guests === 1 ? "" : "s"}</dd>
            </div>
            <div className={`rounded-lg px-2 py-1.5 ring-1 ${b.paid ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-300"}`}>
              <dt className="text-slate-500">Payment</dt>
              <dd className={`font-semibold ${b.paid ? "text-emerald-800" : "text-amber-800"}`}>{b.paid ? "Paid" : `€${(b.due ?? 0).toFixed(2)} due`}</dd>
            </div>
            <div className={`rounded-lg px-2 py-1.5 ring-1 ${arrived ? "bg-teal-50 ring-teal-200" : legend === "noshow" ? "bg-violet-50 ring-violet-200" : "bg-slate-50 ring-slate-200"}`}>
              <dt className="text-slate-500">Arrival</dt>
              <dd className="font-semibold text-navy-900">{arrived ? "Arrived ✓" : legend === "noshow" ? `No-show (${NO_SHOW_CUTOFF})` : b.expectedAt && isToday ? `Expected ${b.expectedAt}` : "Expected"}</dd>
            </div>
          </dl>
          <div className="text-[12px] text-slate-500">{b.ref} · {b.channel}</div>
          {b.notes.length > 0 && (
            <ul aria-label="Notes" className="rounded-lg bg-amber-50 ring-1 ring-amber-200 px-2.5 py-1.5 text-[12.5px] text-amber-900 space-y-0.5">
              {b.notes.map((n, i) => <li key={i} className="flex gap-1.5"><Icon.info size={13} className="shrink-0 mt-0.5" />{n}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-slate-600">
          {st === "available" ? "Free — nobody is booked here." : st === "hold" ? "Held — not on sale until released." : st === "blocked" ? "Out of service — not on sale." : OPS_LABEL[st]}
        </p>
      )}

      {paying && b ? (
        <div role="group" aria-label={`Take €${(b.due ?? 0).toFixed(2)} from ${b.guest}`} className="rounded-xl ring-1 ring-slate-200 p-2.5 space-y-2">
          <div className="text-[12.5px] font-semibold text-navy-900">Take €{(b.due ?? 0).toFixed(2)} — how is the guest paying?</div>
          <div className="flex gap-2">
            <Btn variant="primary" icon={Icon.card} onClick={() => { onPay(s, b, "Card"); setPaying(false); }}>Card</Btn>
            <Btn variant="outline" icon={Icon.cash} onClick={() => { onPay(s, b, "Cash"); setPaying(false); }}>Cash</Btn>
            <Btn variant="ghost" onClick={() => setPaying(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        primary && <Btn variant="primary" full icon={primary.icon} onClick={primary.run}>{primary.label}</Btn>
      )}
    </section>
  );
}
