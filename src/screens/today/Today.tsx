import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, PageHead, StatCard } from "../../components/ui";
import { useApp } from "../../app/store";
import { TENANT, WEATHER_DEMO, ZONES } from "../../data/beach";
import { DEMO_TODAY } from "../../domain/period";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useBeachState } from "../../lib/useBeachState";
import { useInbox, type InboxItem } from "../../lib/useInbox";
import { useBookingOps } from "../../lib/useBookingOps";
import { useTill } from "../cashier/useTill";
import { NO_SHOW_CUTOFF } from "../../domain/sunbedOps";
import { fmtDateGB } from "../../components/ui/DateInput";

import { useUndoToast } from "../../lib/useUndo";
import { useNoShowRelease } from "../../lib/useAutomations";
/* ============ Admin › Today (AENR-560) ============
   The manager's home: what is happening on the beach right now and what needs
   attention — occupancy per zone, arrivals and check-ins, no-shows, the gate,
   weather and closures, and the inbox's Needs action items. Every figure comes
   from the same state as the other screens. Each attention item carries its
   own action (AENR-600) — release no-shows, approve a refund, re-send to
   myDATA — so the list can be finished here; done items collect under "Done
   today". Revenue charts live in Reports › Overview. */

interface Attention {
  id: string;
  icon: string;
  tone: "red" | "amber";
  title: string;
  body: string;
  /** Long lists (set codes) open on demand instead of filling the card. */
  details?: string[];
  primary?: { label: string; run?: () => void; href?: string; confirm?: string };
  secondary?: { label: string; href: string };
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AdminToday() {
  const { sunbedOps, weather, closedStores, toast, setSunbedOps, setBookingOps, bookingOps } = useApp();
  const liveSlots = useLiveSlots("walkin");
  const { statusOf, exOf, bookingOf, ops } = useBeachState(DEMO_TODAY);
  const { decideRefund } = useBookingOps();
  const tillOps = useTill();
  const inbox = useInbox("admin").filter((i) => i.kind === "action");
  const [confirming, setConfirming] = useState<string | null>(null);
  const undo = useUndoToast();
  // The scheduled no-show release (AENR-623): its summary, undoable for an hour.
  const autoRelease = useNoShowRelease();
  const autoLast = autoRelease.rules.noShow.last?.date === DEMO_TODAY ? autoRelease.rules.noShow.last : undefined;
  const canUndoAuto = !!autoLast && Date.now() - new Date(autoLast.at).getTime() < 3600000;
  const [done, setDone] = useState<{ id: string; text: string }[]>([]);
  const finish = (id: string, text: string) => {
    setDone((d) => [{ id: `${id}-${d.length}`, text }, ...d]);
    setConfirming(null);
  };

  const zones = useMemo(
    () =>
      ZONES.map((z) => {
        const slots = liveSlots(z, [DEMO_TODAY]);
        const taken = slots.filter((s) =>
          ["booked", "occupied", "hold", "blocked"].includes(statusOf(s)),
        ).length;
        const occupied = slots.filter((s) => statusOf(s) === "occupied").length;
        // A closed zone has no arrivals to wait for, so its sets are not no-shows.
        const noShows = closedStores[z.id] ? [] : slots.filter((s) => exOf(s).includes("noshow"));
        const unpaid = slots.filter((s) => exOf(s).includes("unpaid")).length;
        return {
          z,
          total: slots.length,
          taken,
          occupied,
          noShows,
          unpaid,
          closed: closedStores[z.id],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveSlots, sunbedOps, closedStores, ops.bookings],
  );
  const total = zones.reduce((a, x) => a + x.total, 0);
  const taken = zones.reduce((a, x) => a + x.taken, 0);
  const noShows = zones.flatMap((x) => x.noShows.map((s) => ({ s, z: x.z })));
  const arrivals = ops.bookings.filter(
    (b) => b.visitIso === DEMO_TODAY && b.status !== "Cancelled" && b.status !== "Refunded",
  );
  const checkedIn = Object.entries(sunbedOps.status).filter(
    ([k, v]) => k.startsWith(`${DEMO_TODAY}|`) && v.status === "occupied",
  ).length;
  const w = WEATHER_DEMO[weather];

  /* ---- Attention items, each with one action ---- */
  const releaseNoShows = () => {
    const prev = { sunbed: sunbedOps, ops: bookingOps };
    noShows.forEach(({ s }) =>
      ops.release(s.id, DEMO_TODAY, `No-show after ${NO_SHOW_CUTOFF} — released for resale`, bookingOf(s)?.booking?.id),
    );
    finish("noshow", `Released ${noShows.length} no-show set${noShows.length === 1 ? "" : "s"} for resale`);
    undo(`${noShows.length} set${noShows.length === 1 ? "" : "s"} back on sale online, at the till and on the beach.`, () => {
      setSunbedOps(() => prev.sunbed);
      setBookingOps(() => prev.ops);
      setDone((d) => d.slice(1));
    });
  };
  const fromInbox = (i: InboxItem): Attention => {
    const base = { id: i.id, icon: i.icon, tone: i.tone === "red" ? ("red" as const) : ("amber" as const), title: i.title, body: i.body };
    if (i.id.startsWith("refund-")) {
      const r = bookingOps.refunds.find((x) => `refund-${x.id}` === i.id);
      if (r)
        return {
          ...base,
          primary: {
            label: `Approve €${r.amount}`,
            confirm: `Refund €${r.amount} to ${r.who}?`,
            run: () => {
              decideRefund(r.id, { approve: r.amount });
              finish(i.id, `Approved €${r.amount} refund · ${r.who}`);
              toast(`Refund of €${r.amount} approved — ${r.who} is notified.`, { tone: "success" });
            },
          },
          secondary: { label: "Decline…", href: `#/admin/refunds` },
        };
    }
    if (i.id.startsWith("mydata-")) {
      const failed = tillOps.till.sales.filter((x) => x.mydata === "failed");
      return {
        ...base,
        primary: {
          label: "Re-send",
          run: () => {
            failed.forEach((x) => tillOps.retryMydata(x.id));
            finish(i.id, `Re-sent ${failed.length} receipt${failed.length === 1 ? "" : "s"} to myDATA`);
            toast("Re-sent to myDATA — accepted, MARK assigned.", { tone: "success" });
          },
        },
      };
    }
    if (i.id === "till-offline")
      return {
        ...base,
        primary: {
          label: "Sync now",
          run: () => {
            const r = tillOps.syncOffline();
            finish(i.id, `Till synced · ${r.synced} queued sale${r.synced === 1 ? "" : "s"} sent`);
            toast(`Till back online — ${r.synced} sale${r.synced === 1 ? "" : "s"} synced.`, { tone: "success" });
          },
        },
      };
    return { ...base, primary: i.href ? { label: "Open", href: i.href } : undefined };
  };
  const zonesWithNoShows = zones.filter((x) => x.noShows.length);
  const attention: Attention[] = [
    ...(noShows.length
      ? [
          {
            id: "noshow",
            icon: "clock",
            tone: "amber" as const,
            title: `${noShows.length} no-show${noShows.length === 1 ? "" : "s"} in ${zonesWithNoShows.length} zone${zonesWithNoShows.length === 1 ? "" : "s"}`,
            body: `Booked for today, not checked in by ${NO_SHOW_CUTOFF}.`,
            details: zonesWithNoShows.map((x) => `${x.z.name}: ${x.noShows.map((s) => s.id).join(", ")}`),
            primary: { label: "Release all", run: releaseNoShows },
            secondary: { label: "Open live beach", href: `#/admin/live?zone=${zonesWithNoShows[0].z.id}` },
          },
        ]
      : []),
    ...inbox.map(fromInbox),
  ];
  const d = new Date(`${DEMO_TODAY}T12:00:00`);

  return (
    <div className="animate-fade-up space-y-4">
      <PageHead
        sub={`${WEEKDAY[d.getDay()]} ${fmtDateGB(DEMO_TODAY)} · ${TENANT.name} — what is happening now and what needs you.`}
      />

      {autoLast && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl bg-teal-50 ring-1 ring-teal-600/20 px-4 py-3 text-[13px] text-teal-900">
          <Icon.bolt size={16} className="text-teal-700 shrink-0" />
          <span className="flex-1 min-w-0">
            At <b>{new Date(autoLast.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</b>, {autoLast.sets.length} no-show set{autoLast.sets.length === 1 ? "" : "s"} went back on sale automatically ({autoLast.sets.slice(0, 6).join(", ")}{autoLast.sets.length > 6 ? "…" : ""}).
          </span>
          {canUndoAuto && (
            <Btn size="sm" variant="outline" onClick={() => { autoRelease.undoLast(); toast("Release undone — those sets are booked again.", { tone: "success" }); }}>Undo</Btn>
          )}
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          instant
          label="Occupancy now"
          value={`${total ? Math.round((taken / total) * 100) : 0}%`}
          sub={`${taken} of ${total} sets taken`}
          tone="teal"
        />
        <StatCard
          instant
          label="Bookings for today"
          value={String(arrivals.length)}
          sub={`${checkedIn} set${checkedIn === 1 ? "" : "s"} checked in so far`}
        />
        <StatCard
          instant
          label="No-shows"
          value={String(noShows.length)}
          sub={
            noShows.length
              ? `booked sets not checked in by ${NO_SHOW_CUTOFF}`
              : "everyone expected has arrived"
          }
          tone={noShows.length ? "amber" : "navy"}
        />
        <StatCard
          instant
          label="Gate"
          value="312/hr"
          sub="1,284 scanned today · peak 11:00–13:00"
        />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display font-bold text-navy-900">Occupancy now by zone</h2>
            <a
              href="#/admin/live"
              className="text-[13px] font-semibold text-teal-700 hover:underline"
            >
              Open live beach →
            </a>
          </div>
          <ul className="space-y-2.5">
            {zones.map((x) => {
              const pct = x.total ? Math.round((x.taken / x.total) * 100) : 0;
              return (
                <li key={x.z.id}>
                  <a
                    href={`#/admin/live?zone=${x.z.id}`}
                    className="block rounded-xl px-2 py-1.5 -mx-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <div className="flex items-center justify-between gap-2 text-[13.5px]">
                      <span className="flex items-center gap-2 font-semibold text-navy-900">
                        <i className="w-2.5 h-2.5 rounded-full" style={{ background: x.z.color }} />
                        {x.z.name}
                      </span>
                      <span className="tnum text-slate-600">
                        {x.closed ? (
                          <Badge tone="critical">Closed · {x.closed}</Badge>
                        ) : (
                          <>
                            {x.taken}/{x.total} · <b className="text-navy-900">{pct}%</b>
                            {x.noShows.length > 0 && (
                              <span className="text-amber-700">
                                {" "}
                                · {x.noShows.length} no-show{x.noShows.length === 1 ? "" : "s"}
                              </span>
                            )}
                            {x.unpaid > 0 && (
                              <span className="text-amber-700"> · {x.unpaid} unpaid</span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display font-bold text-navy-900 mb-2">
              Needs attention <span className="text-slate-400 tnum">{attention.length}</span>
            </h2>
            {attention.length === 0 ? (
              <p className="text-[13px] text-slate-600 flex items-center gap-1.5">
                <Icon.checkCircle size={15} className="text-emerald-600" /> All clear — nothing needs you right now.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100" aria-live="polite">
                {attention.map((a) => {
                  const I = Icon[a.icon] ?? Icon.bell;
                  const asking = confirming === a.id;
                  return (
                    <li key={a.id} className="py-3 flex items-start gap-2.5">
                      <I size={16} className={`${a.tone === "red" ? "text-rose-600" : "text-amber-600"} mt-0.5 shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-navy-900">{a.title}</div>
                        <div className="text-[12.5px] text-slate-600">{a.body}</div>
                        {a.details && (
                          <details className="mt-1 text-[12px] text-slate-600">
                            <summary className="cursor-pointer font-semibold text-slate-700 hover:text-navy-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                              Show sets
                            </summary>
                            <ul className="mt-1 space-y-0.5 tnum">
                              {a.details.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {asking && a.primary?.confirm ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                            <span className="text-[12.5px] text-navy-900 font-medium">{a.primary.confirm}</span>
                            <Btn size="sm" variant="primary" onClick={a.primary.run}>
                              Approve
                            </Btn>
                            <Btn size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                              Cancel
                            </Btn>
                          </div>
                        ) : (
                          (a.primary || a.secondary) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {a.primary &&
                                (a.primary.href ? (
                                  <a
                                    href={a.primary.href}
                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold bg-white ring-1 ring-slate-200 text-navy-900 hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                                  >
                                    {a.primary.label} <Icon.chevR size={13} />
                                  </a>
                                ) : (
                                  <Btn
                                    size="sm"
                                    variant="teal"
                                    onClick={() => (a.primary?.confirm ? setConfirming(a.id) : a.primary?.run?.())}
                                  >
                                    {a.primary.label}
                                  </Btn>
                                ))}
                              {a.secondary && (
                                <a
                                  href={a.secondary.href}
                                  className="text-[12.5px] font-semibold text-teal-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                                >
                                  {a.secondary.label}
                                </a>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {done.length > 0 && (
              <details className="mt-3 border-t border-slate-100 pt-2 text-[12.5px] text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700 hover:text-navy-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                  Done today <span className="tnum text-slate-400">{done.length}</span>
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {done.map((d) => (
                    <li key={d.id} className="flex items-center gap-1.5">
                      <Icon.checkCircle size={13} className="text-emerald-600 shrink-0" /> {d.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-display font-bold text-navy-900 mb-2">Weather &amp; closures</h2>
            <div className="flex items-center gap-3">
              {(() => {
                const W = Icon[w.icon] ?? Icon.sun;
                return <W size={28} className="text-teal-700" />;
              })()}
              <div>
                <div className="font-semibold text-navy-900">
                  {w.label} · {w.tempC}°C
                </div>
                <div className="text-[12.5px] text-slate-600">
                  {weather === "windy" || weather === "rainy"
                    ? "Expect cancellations — consider a weather notice."
                    : "Good beach day."}
                </div>
              </div>
            </div>
            <div className="mt-3 text-[13px] text-slate-600">
              {Object.keys(closedStores).length === 0
                ? "All zones open today."
                : Object.entries(closedStores)
                    .map(([id, why]) => `${ZONES.find((z) => z.id === id)?.name}: ${why}`)
                    .join(" · ")}
            </div>
            <a
              href="#/admin/layout"
              className="mt-2 inline-block text-[13px] font-semibold text-teal-700 hover:underline"
            >
              Open / close zones →
            </a>
          </Card>
        </div>
      </div>
      <p className="text-[12.5px] text-slate-500">
        Revenue and booking trends are in{" "}
        <a className="font-semibold text-teal-700 hover:underline" href="#/admin/reporting">
          Reports › Overview
        </a>
        .
      </p>
    </div>
  );
}
