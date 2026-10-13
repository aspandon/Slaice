import { useEffect, useMemo, useState } from "react";
import { Icon } from "../lib/icons";
import { Badge, Btn, Card, Field, Input, Select, PageHead } from "../components/ui";
import { SunbedMap } from "../components/SunbedMap";
import { SetScanner, type ScanHit } from "../components/SetScanner";
import { useApp, useSpotlight } from "../app/store";
import { ZONES, todayISO } from "../data/beach";
import { addDays } from "../domain/period";
import { resolvePrice } from "../domain/pricing";
import {
  BLOCK_REASONS,
  EXCEPTIONS,
  EXCEPTION_LABEL,
  NO_SHOW_CUTOFF,
  type SetException,
  OPS_LABEL,
  TRANSITIONS,
  needsReason,
  opsKey,
  type OpsStatus,
} from "../domain/sunbedOps";
import { useLiveSlots } from "../lib/useLiveSlots";
import { useBeachState } from "../lib/useBeachState";
import type { SunbedSlot } from "../domain/types";

/* ============ Controller › Beach (AENR-499) ============
   Find a set — scan its QR label, type its code or tap it on the live map —
   and change its status for today or any date: check a guest in, mark the
   day finished, release a no-show for same-day sale (online and at the till),
   put a set on hold or out of service with a reason. Every change is logged
   on the set and reflected everywhere at once. */

const STATUS_TONE: Record<OpsStatus, string> = {
  available: "green",
  booked: "blue",
  occupied: "indigo",
  vacated: "slate",
  hold: "amber",
  blocked: "red",
};
const ACTION_LABEL: Partial<Record<OpsStatus, string>> = {
  occupied: "Check in",
  vacated: "Mark vacated",
  available: "Make available",
  hold: "Put on hold",
  blocked: "Out of service",
};
const hhmm = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ControllerBeach() {
  useSpotlight("controller", "beach");
  const {
    toast,
    go,
    persona,
    sunbedOps,
    setSunbedOps,
    viewAs,
    beachPricing,
    priceRules,
    hint,
    clearHint,
  } = useApp();
  const who = viewAs?.name ?? "Petros Nikolaou";
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [zoneId, setZoneId] = useState("central");
  const [sel, setSel] = useState<Set<string>>(new Set());
  // On a phone the panel sits under the map — bring it into view on a pick.
  useEffect(() => {
    if (sel.size === 1 && window.matchMedia("(max-width: 1023px)").matches)
      document.getElementById("set-panel")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [sel]);
  const [reason, setReason] = useState(BLOCK_REASONS[0]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<OpsStatus | null>(null);
  const liveSlots = useLiveSlots("walkin");
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const slots = useMemo(() => liveSlots(zone, [date]), [liveSlots, zone, date]);
  const selList = slots.filter((s) => sel.has(s.id));
  const one = selList.length === 1 ? selList[0] : null;

  // Deep link from elsewhere (e.g. a scanned label) opens that set.
  useEffect(() => {
    if (hint?.persona === persona && hint.page === "beach" && hint.setId) {
      openSet(hint.setId);
      clearHint();
    }
  }, [hint]); // eslint-disable-line react-hooks/exhaustive-deps

  // Status and booking of a set on the date — shared with the Manager's live map.
  const { statusOf, bookingOf, exOf } = useBeachState(date);
  function openSet(setId: string) {
    const z = ZONES.find((x) => setId.startsWith(x.prefix + "-"));
    if (z) setZoneId(z.id);
    setSel(new Set([setId]));
  }
  const onHit = (h: ScanHit) => {
    if (h.kind === "booking") {
      toast(`${h.code} is a booking QR — validate it at the gate.`, {
        action: { label: "Open gate", onClick: () => go(persona, "scan") },
      });
      return;
    }
    openSet(h.setId);
  };

  const apply = (to: OpsStatus, why?: string) => {
    const targets = selList.filter((s) => TRANSITIONS[statusOf(s)].includes(to));
    if (!targets.length) return;
    const at = new Date().toISOString();
    setSunbedOps((o) => {
      const status = { ...o.status };
      const history = [...o.history];
      targets.forEach((s) => {
        const from = statusOf(s);
        status[opsKey(date, s.id)] = {
          status: to,
          reason: why,
          note: note.trim() || undefined,
          by: who,
          at,
        };
        history.unshift({
          setId: s.id,
          date,
          from,
          to,
          reason: why,
          note: note.trim() || undefined,
          by: who,
          at,
        });
      });
      return { status, history: history.slice(0, 300) };
    });
    toast(
      `${targets.map((s) => s.id).join(", ")} → ${OPS_LABEL[to]}${date !== today ? ` on ${date}` : ""}.`,
      { tone: "success" },
    );
    setNote("");
    setPending(null);
  };
  const tryApply = (to: OpsStatus) => {
    const from = one ? statusOf(one) : undefined;
    if ((from && needsReason(from, to)) || (!one && (to === "blocked" || to === "hold")))
      return setPending(to);
    apply(to);
  };
  const releaseToday = () => {
    if (!one) return;
    const from = statusOf(one);
    apply(
      "available",
      from === "booked"
        ? "No-show — released for same-day sale"
        : "Vacated — released for the rest of the day",
    );
  };

  // Status by exception (AENR-587): which sets need action, per filter.
  const [exF, setExF] = useState<SetException | null>(null);
  const exSets = Object.fromEntries(EXCEPTIONS.map((e) => [e, slots.filter((s) => exOf(s).includes(e))])) as Record<SetException, SunbedSlot[]>;
  const shown = exF ? exSets[exF] : null;
  const highlight = shown ? new Set(shown.map((s) => s.id)) : null;
  const describe = (s: SunbedSlot) => [OPS_LABEL[statusOf(s)].toLowerCase(), ...exOf(s).map((e) => EXCEPTION_LABEL[e].toLowerCase())].join(", ");

  const history = sunbedOps.history.filter((h) => sel.has(h.setId)).slice(0, 12);
  const options = one
    ? TRANSITIONS[statusOf(one)]
    : (["hold", "blocked", "available"] as OpsStatus[]);

  return (
    <div className="animate-fade-up">
      <PageHead
        title="Beach Status"
        sub="Every set on the beach — scan its label or tap it to check guests in, release, hold or take it out of service."
        badge={<Badge tone="mvp">MVP</Badge>}
      />
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div
          role="radiogroup"
          aria-label="Date"
          className="flex rounded-xl ring-1 ring-slate-200 overflow-hidden"
        >
          {[
            [today, "Today"],
            [addDays(today, 1), "Tomorrow"],
          ].map(([d, l]) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={date === d}
              onClick={() => setDate(d)}
              className={`px-3.5 min-h-[44px] text-sm font-semibold ${date === d ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <label className="text-[12px] font-semibold text-slate-700">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="block mt-1 rounded-lg ring-1 ring-slate-200 px-2 py-2 text-[13px]"
          />
        </label>
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
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card className="p-4">
            <SetScanner onHit={onHit} compact />
          </Card>
          <Card className="p-4">
            <div role="radiogroup" aria-label="Show sets that need action" className="flex flex-wrap gap-1.5 mb-3">
              {[null, ...EXCEPTIONS].map((e) => {
                const on = exF === e;
                const n = e ? exSets[e].length : slots.length;
                return (
                  <button key={e ?? "all"} type="button" role="radio" aria-checked={on} onClick={() => setExF(e)}
                    className={`min-h-[44px] rounded-xl px-3 text-[13px] font-semibold ring-1 inline-flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 text-navy-900 ring-slate-200 hover:ring-slate-400"}`}>
                    {e ? EXCEPTION_LABEL[e] : "All sets"}
                    <span className={`min-w-[22px] rounded-full px-1.5 text-[11.5px] tnum ${on ? "bg-white/20" : e && n ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-navy-900">
                {zone.name} · {date === today ? "today" : date}
              </h2>
              <span className="text-[12px] text-slate-500">
                {sel.size ? `${sel.size} selected` : "Tap sets — tap again to add more"}
              </span>
            </div>
            <SunbedMap
              pickAny
              label={`${zone.name} status map`}
              slots={slots}
              selected={sel}
              onToggle={(s) =>
                setSel((cur) => {
                  const n = new Set(cur);
                  if (n.has(s.id)) n.delete(s.id);
                  else n.add(s.id);
                  return n;
                })
              }
              landmarks={beachPricing.landmarks.filter((l) => l.zoneId === zoneId)}
              highlight={highlight}
              showCodes
              describe={describe}
            />
            <div className="mt-2 text-[11.5px] text-slate-500">
              {exF === "noshow"
                ? `No-show: booked for today and not checked in by ${NO_SHOW_CUTOFF}.`
                : "Every set can be opened here — booked, held and out-of-service ones too."}
            </div>
            {shown && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-semibold text-navy-900 text-sm">{EXCEPTION_LABEL[exF as SetException]} · {shown.length} set{shown.length === 1 ? "" : "s"}</h3>
                  {shown.length > 1 && (
                    <Btn size="sm" variant="ghost" onClick={() => setSel(new Set(shown.map((s) => s.id)))}>Select all {shown.length}</Btn>
                  )}
                </div>
                {shown.length === 0 ? (
                  <p className="text-[13px] text-slate-500 py-2">Nothing here — no {EXCEPTION_LABEL[exF as SetException].toLowerCase()} sets in {zone.name}.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {shown.map((s) => {
                      const b = bookingOf(s);
                      const op = sunbedOps.status[opsKey(date, s.id)];
                      return (
                        <li key={s.id}>
                          <button type="button" onClick={() => setSel(new Set([s.id]))} aria-current={sel.has(s.id) || undefined}
                            className={`w-full min-h-[48px] text-left px-2 py-2 rounded-lg flex items-center gap-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${sel.has(s.id) ? "bg-slate-50" : ""}`}>
                            <span className="font-mono font-semibold text-navy-900 w-16 shrink-0">{s.id}</span>
                            <span className="min-w-0 flex-1 text-[12.5px] text-slate-600 truncate">
                              {b ? `${b.ref} · ${b.guest} · ${b.channel}` : op?.reason ?? OPS_LABEL[statusOf(s)]}
                              {op?.by ? ` · ${op.by}` : ""}
                            </span>
                            <Badge tone={STATUS_TONE[statusOf(s)]}>{OPS_LABEL[statusOf(s)]}</Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>

        <div id="set-panel" className="space-y-4 lg:sticky lg:top-4 scroll-mt-4 pb-24 lg:pb-0">
          {selList.length === 0 ? (
            <Card className="p-5 text-[13px] text-slate-600">
              Scan a sunbed label, type its code or tap a set on the map to see and change its
              status.
            </Card>
          ) : (
            <Card className="p-4 space-y-3">
              {one ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl font-bold text-navy-900">{one.id}</span>
                    <Badge tone={STATUS_TONE[statusOf(one)]}>{OPS_LABEL[statusOf(one)]}</Badge>
                  </div>
                  <div className="text-[12.5px] text-slate-600">
                    {zone.name} · {(one.kind ?? "standard").replace(/^./, (c) => c.toUpperCase())}
                    {one.access ? " · step-free" : ""} · €
                    {resolvePrice(one, zoneId, date, beachPricing, priceRules).price} on{" "}
                    {date === today ? "today" : date}
                  </div>
                  {one.inv && <div className="mt-1 text-[12px] text-amber-700">{one.inv}</div>}
                  {(() => {
                    const b = bookingOf(one);
                    return b ? (
                      <div className="mt-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12.5px]">
                        <div className="font-semibold text-navy-900">
                          {b.ref} · {b.guest}
                        </div>
                        <div className="text-slate-600">
                          {b.guests} guests · {b.channel} · {b.paid ? "Paid" : "Unpaid"}
                          {sunbedOps.status[opsKey(date, one.id)]?.status === "occupied"
                            ? ` · checked in ${hhmm(sunbedOps.status[opsKey(date, one.id)]!.at)}`
                            : ""}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="font-semibold text-navy-900">
                  {selList.length} sets · bulk change
                </div>
              )}

              {pending ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    apply(pending, reason === "Other" ? note.trim() : reason);
                  }}
                >
                  <div className="text-[13px] font-semibold text-navy-900">
                    {ACTION_LABEL[pending]} — reason required
                  </div>
                  {one && statusOf(one) === "booked" && pending === "available" && (
                    <div className="rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 px-3 py-2 text-[12px]">
                      This cancels or moves the guest’s booking — a manager follows up in Refunds.
                    </div>
                  )}
                  <Field label="Reason">
                    <Select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      options={(pending === "available"
                        ? ["No-show", "Guest moved to another set", "Booking cancelled", "Other"]
                        : BLOCK_REASONS
                      ).map((r) => ({ v: r, l: r }))}
                    />
                  </Field>
                  <Field label={reason === "Other" ? "Note (required)" : "Note (optional)"}>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <div className="flex gap-2">
                    <Btn
                      type="submit"
                      variant="primary"
                      disabled={reason === "Other" && !note.trim()}
                    >
                      Confirm
                    </Btn>
                    <Btn variant="ghost" onClick={() => setPending(null)}>
                      Cancel
                    </Btn>
                  </div>
                </form>
              ) : (
                <>
                  {one && (
                    <div className="grid grid-cols-1 gap-2">
                      {statusOf(one) === "booked" && (
                        <Btn
                          variant="teal"
                          size="lg"
                          icon={Icon.check}
                          onClick={() => apply("occupied")}
                        >
                          Check in
                        </Btn>
                      )}
                      {(statusOf(one) === "booked" || statusOf(one) === "vacated") && (
                        <Btn variant="primary" size="lg" icon={Icon.bolt} onClick={releaseToday}>
                          Release for the rest of the day
                        </Btn>
                      )}
                      {statusOf(one) === "available" && (
                        <Btn
                          variant="primary"
                          size="lg"
                          icon={Icon.cash}
                          onClick={() => go(persona, "walkin", { setId: one.id })}
                        >
                          Walk-in sale on {one.id}
                        </Btn>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Set status
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {options.map((to) => (
                        <button
                          key={to}
                          type="button"
                          onClick={() => tryApply(to)}
                          className="min-h-[44px] rounded-xl ring-1 ring-slate-200 bg-white/70 px-2 text-[12.5px] font-semibold text-navy-900 hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          {ACTION_LABEL[to] ?? OPS_LABEL[to]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Note (optional)">
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Shown in the set’s history"
                    />
                  </Field>
                </>
              )}
              {history.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    History
                  </div>
                  <ul className="space-y-1 text-[12px] text-slate-600">
                    {history.map((h, i) => (
                      <li key={i}>
                        <span className="tnum text-slate-400">{hhmm(h.at)}</span> · {h.setId}{" "}
                        {OPS_LABEL[h.from]} → <b className="text-navy-900">{OPS_LABEL[h.to]}</b>
                        {h.reason ? ` (${h.reason})` : ""}
                        {h.date !== today ? ` · for ${h.date}` : ""} · {h.by}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
