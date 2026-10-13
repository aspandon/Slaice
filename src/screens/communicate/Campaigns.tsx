import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Drawer, EmptyState } from "../../components/ui";
import { useApp } from "../../app/store";
import { useUndoToast } from "../../lib/useUndo";
import {
  CH_LABEL,
  WEEKDAYS,
  addDay,
  campaignStatus,
  fmtAt,
  fmtDate,
  pending,
  scheduleLabel,
  totals,
  type Campaign,
  type CampaignStatus,
  type Results,
} from "../../domain/comms";

/* ============ Campaigns (AENR-492 A) ============
   Every campaign with its status — Scheduled, Sending (a recurring one part
   way through), Sent, Paused, Cancelled — as a list or a month calendar. Before
   a send: edit timing by pausing / cancelling, or duplicate. After: results per
   send (delivered, opened, clicked, bookings and revenue attributed, skips). */

const TONE: Record<CampaignStatus, string> = {
  Scheduled: "blue",
  Sending: "indigo",
  Sent: "green",
  Paused: "amber",
  Cancelled: "slate",
};
const pct = (n: number | null, d: number) =>
  n === null ? "—" : d ? `${Math.round((n / d) * 100)}%` : "0%";

export function CampaignsTab({ onNew }: { onNew: () => void }) {
  const { comms, setComms, toast, channels } = useApp();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [open, setOpen] = useState<string | null>(null);
  const [month, setMonth] = useState(comms.clock.slice(0, 7));
  // Cancelling a scheduled campaign is reversible, so it happens at once with Undo (AENR-615).
  const undo = useUndoToast();
  const cancelCampaign = (c: Campaign) => {
    patch(c.id, { cancelled: true });
    undo(`“${c.name}” cancelled — ${c.runs.length ? "sends already made keep their results" : "it won't send"}.`, () => patch(c.id, { cancelled: false }));
  };
  const patch = (id: string, p: Partial<Campaign>) =>
    setComms((s) => ({
      ...s,
      campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...p } : c)),
    }));
  const duplicate = (c: Campaign) => {
    const copy: Campaign = {
      ...c,
      id: `cmp-${Date.now().toString(36)}`,
      name: `${c.name} (copy)`,
      runs: [],
      skippedAt: [],
      cancelled: false,
      paused: true,
      createdAt: comms.clock,
    };
    setComms((s) => ({ ...s, campaigns: [copy, ...s.campaigns] }));
    toast(`Duplicated as “${copy.name}” — paused until you resume it.`, { tone: "success" });
  };
  const list = [...comms.campaigns].sort(
    (a, b) =>
      (pending(a)[0] ?? a.runs.at(-1)?.at ?? "").localeCompare(
        pending(b)[0] ?? b.runs.at(-1)?.at ?? "",
      ) * -1,
  );
  const sel = comms.campaigns.find((c) => c.id === open) ?? null;

  if (!comms.campaigns.length)
    return (
      <EmptyState
        icon={Icon.send}
        title="No campaigns yet"
        body="Compose one to send now, on a date, or every week."
        action={
          <Btn variant="primary" icon={Icon.plus} onClick={onNew}>
            Compose campaign
          </Btn>
        }
      />
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div
          role="group"
          aria-label="View"
          className="inline-flex rounded-xl ring-1 ring-slate-200 bg-white p-0.5 text-[12.5px] font-semibold"
        >
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg capitalize ${view === v ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <Btn variant="primary" icon={Icon.plus} className="ml-auto" onClick={onNew}>
          Compose campaign
        </Btn>
      </div>
      {view === "list" ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {list.map((c) => {
              const st = campaignStatus(c);
              const next = pending(c)[0];
              const t = totals(c.runs);
              return (
                <li key={c.id} className="p-3.5 sm:px-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1 basis-60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setOpen(c.id)}
                        className="font-semibold text-navy-900 hover:underline text-left"
                      >
                        {c.name}
                      </button>
                      <Badge tone={TONE[st]}>{st}</Badge>
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {c.segmentName} · {CH_LABEL[c.channel]} · {scheduleLabel(c.schedule)}
                    </div>
                    {next && !channels[c.channel].connected && (
                      <div className="mt-1 text-[11.5px] font-semibold text-amber-700 inline-flex items-center gap-1">
                        <Icon.alert size={12} /> {CH_LABEL[c.channel]} isn't connected — this send
                        would reach no one.
                      </div>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-600 tnum min-w-[150px]">
                    {next && st !== "Paused" ? (
                      <>
                        Next: <b className="text-navy-900">{fmtAt(next)}</b>
                        <div className="text-slate-500">Est. reach {c.reachAtSchedule}</div>
                      </>
                    ) : st === "Paused" && next ? (
                      <>Paused · next would be {fmtAt(next)}</>
                    ) : c.runs.length ? (
                      <>
                        {c.runs.length} send{c.runs.length > 1 ? "s" : ""} ·{" "}
                        <b className="text-navy-900">{t.delivered}</b> delivered
                        <div className="text-slate-500">
                          {t.bookings} bookings · €{t.revenue}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Btn size="sm" variant="ghost" icon={Icon.chart} onClick={() => setOpen(c.id)}>
                      {c.runs.length ? "Results" : "Details"}
                    </Btn>
                    {(st === "Scheduled" || st === "Sending") && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        icon={Icon.pause}
                        onClick={() => {
                          patch(c.id, { paused: true });
                          toast(`“${c.name}” paused — no sends until you resume.`);
                        }}
                      >
                        Pause
                      </Btn>
                    )}
                    {st === "Paused" && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        icon={Icon.play}
                        onClick={() => {
                          patch(c.id, { paused: false });
                          toast(`“${c.name}” resumed.`, { tone: "success" });
                        }}
                      >
                        Resume
                      </Btn>
                    )}
                    {(st === "Scheduled" || st === "Sending" || st === "Paused") && (
                      <Btn size="sm" variant="ghost" icon={Icon.x} onClick={() => cancelCampaign(c)}>
                        Cancel
                      </Btn>
                    )}
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Icon.copy}
                      aria-label={`Duplicate ${c.name}`}
                      onClick={() => duplicate(c)}
                    >
                      Duplicate
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <CalendarView month={month} setMonth={setMonth} onOpen={setOpen} />
      )}
      {sel && (
        <ResultsDrawer
          c={sel}
          onClose={() => setOpen(null)}
          onSkip={(at) => {
            patch(sel.id, { skippedAt: [...(sel.skippedAt ?? []), at] });
            toast(`${fmtAt(at)} send skipped.`);
          }}
        />
      )}
    </div>
  );
}

function CalendarView({
  month,
  setMonth,
  onOpen,
}: {
  month: string;
  setMonth: (m: string) => void;
  onOpen: (id: string) => void;
}) {
  const { comms } = useApp();
  const first = `${month}-01`;
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => addDay(first, i - lead));
  const shift = (n: number) => {
    const d = new Date(`${first}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  // Every occurrence: sent runs + still-pending sends (paused ones greyed).
  const events = comms.campaigns
    .filter((c) => !c.cancelled)
    .flatMap((c) => [
      ...c.runs.map((r) => ({ c, at: r.at, kind: "Sent" as const })),
      ...pending(c).map((at) => ({
        c,
        at,
        kind: c.paused ? ("Paused" as const) : ("Scheduled" as const),
      })),
    ]);
  const label = new Date(`${first}T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <Btn
          size="sm"
          variant="ghost"
          icon={Icon.chevL}
          aria-label="Previous month"
          onClick={() => shift(-1)}
        />
        <h3 className="font-display font-bold text-navy-900">{label}</h3>
        <Btn
          size="sm"
          variant="ghost"
          icon={Icon.chevR}
          aria-label="Next month"
          onClick={() => shift(1)}
        />
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const ev = events.filter((e) => e.at.slice(0, 10) === d);
          const today = d === comms.clock.slice(0, 10);
          return (
            <div
              key={d}
              className={`min-h-[78px] rounded-lg p-1 ring-1 ${d.slice(0, 7) === month ? "bg-white ring-slate-200" : "bg-slate-50/60 ring-slate-100 text-slate-400"} ${today ? "ring-2 ring-teal-500" : ""}`}
            >
              <div className={`text-[11px] tnum ${today ? "font-bold text-teal-700" : ""}`}>
                {Number(d.slice(8))}
              </div>
              <ul className="space-y-0.5 mt-0.5">
                {ev.slice(0, 3).map((e) => (
                  <li key={e.c.id + e.at}>
                    <button
                      type="button"
                      onClick={() => onOpen(e.c.id)}
                      title={`${e.c.name} · ${e.at.slice(11)} · ${e.kind}`}
                      className={`w-full truncate text-left rounded px-1 py-0.5 text-[10.5px] font-semibold ${e.kind === "Sent" ? "bg-emerald-50 text-emerald-800" : e.kind === "Paused" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}
                    >
                      {e.at.slice(11)} {e.c.name}
                    </button>
                  </li>
                ))}
                {ev.length > 3 && (
                  <li className="text-[10px] text-slate-500 px-1">+{ev.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <i className="w-2.5 h-2.5 rounded bg-sky-200" /> Scheduled
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="w-2.5 h-2.5 rounded bg-emerald-200" /> Sent
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="w-2.5 h-2.5 rounded bg-amber-200" /> Paused
        </span>
      </div>
    </Card>
  );
}

function Kpis({ r }: { r: Results }) {
  const items = [
    ["Delivered", `${r.delivered}`, `of ${r.audience}`],
    [
      "Opened",
      r.opened === null ? "—" : `${r.opened}`,
      r.opened === null ? "SMS has no opens" : pct(r.opened, r.delivered),
    ],
    ["Clicked", `${r.clicked}`, pct(r.clicked, r.delivered)],
    ["Bookings", `${r.bookings}`, `€${r.revenue} revenue`],
    ["Unsubscribes", `${r.unsubscribes}`, pct(r.unsubscribes, r.delivered)],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {items.map(([l, v, s]) => (
        <div key={l} className="rounded-xl ring-1 ring-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10.5px] text-slate-500 uppercase tracking-wider font-semibold">
            {l}
          </div>
          <div className="font-display font-bold text-navy-900 text-lg tnum">{v}</div>
          <div className="text-[11px] text-slate-500">{s}</div>
        </div>
      ))}
    </div>
  );
}
const skipLine = (r: Results) =>
  [
    r.skipped.consent && `${r.skipped.consent} no consent`,
    r.skipped.cap && `${r.skipped.cap} frequency cap`,
    r.skipped.refund && `${r.skipped.refund} open refund`,
  ]
    .filter(Boolean)
    .join(" · ") || "none";

function ResultsDrawer({
  c,
  onClose,
  onSkip,
}: {
  c: Campaign;
  onClose: () => void;
  onSkip: (at: string) => void;
}) {
  const { comms } = useApp();
  const t = totals(c.runs);
  const next = pending(c);
  const msg = comms.messages.find((m) => m.id === c.messageId);
  return (
    <Drawer
      open
      onClose={onClose}
      label={`Campaign ${c.name}`}
      title={
        <div>
          <div className="font-display font-bold text-navy-900 text-lg">{c.name}</div>
          <div className="text-[12px] text-slate-500">
            {c.segmentName} · {CH_LABEL[c.channel]} · {scheduleLabel(c.schedule)}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="text-[12.5px] text-slate-600">
          Content: <b className="text-navy-900">{msg ? msg.name : "One-off message"}</b> · created{" "}
          {fmtDate(c.createdAt)} by {c.createdBy} · est. reach at scheduling {c.reachAtSchedule}
        </div>
        {c.runs.length > 0 && (
          <section>
            <h3 className="font-semibold text-navy-900 mb-2">
              {c.runs.length > 1 ? `All ${c.runs.length} sends` : "Results"}
            </h3>
            <Kpis r={t} />
            <div className="text-[11.5px] text-slate-500 mt-1.5">
              Skipped: {skipLine(t)} · bookings and revenue attributed within 7 days of a click
              (sample data).
            </div>
          </section>
        )}
        {c.runs.length > 1 && (
          <section>
            <h3 className="font-semibold text-navy-900 mb-2">Per send</h3>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-1 font-semibold">Sent</th>
                  <th className="font-semibold text-right">Delivered</th>
                  <th className="font-semibold text-right">Opened</th>
                  <th className="font-semibold text-right">Clicked</th>
                  <th className="font-semibold text-right">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tnum">
                {[...c.runs].reverse().map((r) => (
                  <tr key={r.at}>
                    <td className="py-1.5">
                      {fmtAt(r.at)}
                      {r.plannedAt && (
                        <span className="block text-[10.5px] text-amber-700">
                          moved from {r.plannedAt.slice(11)} (quiet hours)
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {r.results.delivered}/{r.results.audience}
                    </td>
                    <td className="text-right">{r.results.opened ?? "—"}</td>
                    <td className="text-right">{r.results.clicked}</td>
                    <td className="text-right">{r.results.bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {next.length > 0 && !c.cancelled && (
          <section>
            <h3 className="font-semibold text-navy-900 mb-2">
              Upcoming {c.paused && <Badge tone="amber">Paused</Badge>}
            </h3>
            <ul className="space-y-1.5">
              {next.slice(0, 8).map((at) => (
                <li
                  key={at}
                  className="flex items-center justify-between gap-2 rounded-lg ring-1 ring-slate-200 px-3 py-1.5 text-[12.5px]"
                >
                  <span>
                    {WEEKDAYS[new Date(`${at.slice(0, 10)}T12:00:00Z`).getUTCDay()]}{" "}
                    {fmtAt(at).split(" · ")[0].replace(/^\w+ /, "")} · {at.slice(11)}
                  </span>
                  {c.schedule.kind === "weekly" && (
                    <Btn size="sm" variant="ghost" onClick={() => onSkip(at)}>
                      Skip this send
                    </Btn>
                  )}
                </li>
              ))}
              {next.length > 8 && (
                <li className="text-[12px] text-slate-500">+{next.length - 8} more</li>
              )}
            </ul>
            <div className="text-[11.5px] text-slate-500 mt-1.5">
              The audience is evaluated at each send. Use the demo clock above to move time forward.
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}
