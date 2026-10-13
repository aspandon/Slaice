import { useMemo } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Card, PageHead, StatCard } from "../../components/ui";
import { useApp } from "../../app/store";
import { TENANT, WEATHER_DEMO, ZONES } from "../../data/beach";
import { DEMO_TODAY } from "../../domain/period";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useBeachState } from "../../lib/useBeachState";
import { useInbox } from "../../lib/useInbox";
import { fmtDateGB } from "../../components/ui/DateInput";

/* ============ Admin › Today (AENR-560) ============
   The manager's home: what is happening on the beach right now and what needs
   attention — occupancy per zone, arrivals and check-ins, no-shows, the gate,
   weather and closures, and the inbox's Needs action items. Every figure comes
   from the same state as the other screens; every alert opens its record.
   Revenue charts live in Reports › Overview. */

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AdminToday() {
  const { sunbedOps, weather, closedStores } = useApp();
  const liveSlots = useLiveSlots("walkin");
  const { statusOf, exOf, ops } = useBeachState(DEMO_TODAY);
  const inbox = useInbox("admin").filter((i) => i.kind === "action");

  const zones = useMemo(
    () =>
      ZONES.map((z) => {
        const slots = liveSlots(z, [DEMO_TODAY]);
        const taken = slots.filter((s) =>
          ["booked", "occupied", "hold", "blocked"].includes(statusOf(s)),
        ).length;
        const occupied = slots.filter((s) => statusOf(s) === "occupied").length;
        const noShows = slots.filter((s) => exOf(s).includes("noshow"));
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
  const d = new Date(`${DEMO_TODAY}T12:00:00`);

  return (
    <div className="animate-fade-up space-y-4">
      <PageHead
        sub={`${WEEKDAY[d.getDay()]} ${fmtDateGB(DEMO_TODAY)} · ${TENANT.name} — what is happening now and what needs you.`}
      />

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
          label="Arrivals today"
          value={String(arrivals.length)}
          sub={`${checkedIn} set${checkedIn === 1 ? "" : "s"} checked in so far`}
        />
        <StatCard
          instant
          label="No-shows"
          value={String(noShows.length)}
          sub={
            noShows.length
              ? "not checked in by 11:00 — release to resell"
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
              Needs attention{" "}
              <span className="text-slate-400 tnum">{inbox.length + (noShows.length ? 1 : 0)}</span>
            </h2>
            {inbox.length === 0 && noShows.length === 0 ? (
              <p className="text-[13px] text-slate-600 flex items-center gap-1.5">
                <Icon.checkCircle size={15} className="text-emerald-600" /> Nothing needs you right
                now.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {noShows.length > 0 && (
                  <li>
                    <a
                      href={`#/admin/live?zone=${noShows[0].z.id}`}
                      className="flex items-start gap-2.5 py-2.5 hover:bg-slate-50 rounded-lg px-1 -mx-1"
                    >
                      <Icon.clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <span className="text-[13.5px]">
                        <b className="text-navy-900">
                          {noShows.length} no-show{noShows.length === 1 ? "" : "s"}
                        </b>{" "}
                        <span className="text-slate-600">
                          — {noShows.map((x) => x.s.id).join(", ")}. Release them for resale.
                        </span>
                      </span>
                    </a>
                  </li>
                )}
                {inbox.map((i) => {
                  const I = Icon[i.icon] ?? Icon.bell;
                  const body = (
                    <>
                      <I
                        size={16}
                        className={`${i.tone === "red" ? "text-rose-600" : "text-amber-600"} mt-0.5 shrink-0`}
                      />
                      <span className="text-[13.5px] min-w-0">
                        <b className="text-navy-900">{i.title}</b>{" "}
                        <span className="text-slate-600">— {i.body}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={i.id}>
                      {i.href ? (
                        <a
                          href={i.href}
                          className="flex items-start gap-2.5 py-2.5 hover:bg-slate-50 rounded-lg px-1 -mx-1"
                        >
                          {body}
                        </a>
                      ) : (
                        <div className="flex items-start gap-2.5 py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
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
