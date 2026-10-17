import { useId, useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn, Card, Drawer, EmptyState, Field, Select, StatCard } from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { useUrlState } from "../../lib/useUrlState";
import { opsNow } from "../../lib/useBookingOps";
import {
  NEXT_ACTION,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  STATUS_LABEL,
  STATUS_ORDER,
  addIncidentUpdate,
  filterIncidents,
  isOpen,
  setIncidentStatus,
  sortIncidents,
  type Incident,
  type IncidentFilter,
  type IncidentSeverity,
  type IncidentStatus,
} from "../../domain/incidents";
import { Facts, IncidentStatusBadge, SeverityBadge, StatusTrack, Timeline, fmtAt } from "./parts";

/* ============ Platform · Incidents (AENR-720) ============
   Everything tenants report, across tenants: filter by tenant, severity and
   status, open one to read the report, move it New → Acknowledged → In
   progress → Resolved, reply to the tenant (their call center sees it) or
   leave an internal note (only Slaice sees it). Timestamps follow the tenant's
   demo day, so a report and its answers read in order. */

export function PlatformIncidents() {
  const { incidents, setIncidents, toast } = useApp();
  const { platform, actor } = usePlatform();
  const [tenant, setTenant] = useUrlState("tenant", "");
  const [severity, setSeverity] = useUrlState("severity", "");
  const [status, setStatus] = useUrlState("status", "open");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useUrlState("incident", "");
  const by = `Slaice · ${actor}`;
  const tenantName = (id: string) => platform.tenants.find((t) => t.id === id)?.name ?? id;
  const f: IncidentFilter = {
    tenant,
    severity: severity as IncidentSeverity | "",
    status: status as IncidentFilter["status"],
    q,
  };
  const shown = sortIncidents(filterIncidents(incidents, f));
  const open = incidents.filter(isOpen);
  const fresh = incidents.filter((i) => i.status === "new");
  const urgent = open.filter((i) => SEVERITY_RANK[i.severity] <= 1);
  const opened = incidents.find((i) => i.id === openId);
  const tenantsWith = [...new Set(incidents.map((i) => i.tenantId))];
  const filtered = !!(tenant || severity || status !== "open" || q);

  const update = (id: string, fn: (i: Incident) => Incident) =>
    setIncidents((list) => list.map((i) => (i.id === id ? fn(i) : i)));

  return (
    <div className="animate-fade-up space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Open"
          value={open.length}
          sub={`across ${new Set(open.map((i) => i.tenantId)).size} tenants`}
          tone="indigo"
        />
        <StatCard
          label="New"
          value={fresh.length}
          sub="waiting for acknowledgement"
          tone={fresh.length ? "amber" : undefined}
        />
        <StatCard
          label="Critical & high"
          value={urgent.length}
          sub="open now"
          tone={urgent.length ? "rose" : undefined}
        />
        <StatCard label="Resolved" value={incidents.length - open.length} sub="all time" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <label className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 flex-1 min-w-[200px] max-w-sm text-slate-600 bg-white/70">
            <Icon.search size={16} aria-hidden />
            <span className="sr-only">Search incidents</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID, title, booking…"
              className="text-sm outline-none w-full bg-transparent text-ink"
            />
          </label>
          <div className="w-full sm:w-44">
            <Field label="Tenant">
              <Select
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                options={[
                  { v: "", l: "All tenants" },
                  ...tenantsWith.map((id) => ({ v: id, l: tenantName(id) })),
                ]}
              />
            </Field>
          </div>
          <div className="w-[calc(50%-0.375rem)] sm:w-36">
            <Field label="Severity">
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                options={[
                  { v: "", l: "Any" },
                  ...(["critical", "high", "medium", "low"] as const).map((s) => ({
                    v: s,
                    l: SEVERITY_LABEL[s],
                  })),
                ]}
              />
            </Field>
          </div>
          <div className="w-[calc(50%-0.375rem)] sm:w-40">
            <Field label="Status">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { v: "open", l: "Open (not resolved)" },
                  { v: "", l: "All" },
                  ...STATUS_ORDER.map((s) => ({ v: s, l: STATUS_LABEL[s] })),
                ]}
              />
            </Field>
          </div>
          <div className="ml-auto text-[12px] text-slate-500 pb-2.5 tnum">
            {shown.length} of {incidents.length}
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={filtered ? Icon.search : Icon.checkCircle}
            title={filtered ? "No incidents match" : "No open incidents"}
            body={
              filtered
                ? "Try another tenant, severity or status."
                : "Every reported incident is resolved."
            }
            action={
              filtered ? (
                <Btn
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTenant("");
                    setSeverity("");
                    setStatus("open");
                    setQ("");
                  }}
                >
                  Clear filters
                </Btn>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 -mx-1">
            {shown.map((i) => {
              const last = i.updates[i.updates.length - 1];
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(i.id)}
                    className="w-full text-left px-2 sm:px-3 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] text-slate-500 tnum">
                        {i.id} ·{" "}
                        <b className="font-semibold text-slate-700">{tenantName(i.tenantId)}</b> ·{" "}
                        {fmtAt(i.reportedAt)} · {i.reporter.name}
                      </div>
                      <div className="font-semibold text-navy-900 leading-snug">{i.title}</div>
                      <div className="text-[12px] text-slate-500 truncate">
                        {last
                          ? `Last: ${last.by} · ${fmtAt(last.at)}${last.kind === "note" ? " · internal note" : ""}`
                          : "No answer yet"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:w-56 shrink-0">
                      <SeverityBadge s={i.severity} />
                      <IncidentStatusBadge s={i.status} />
                      <Icon.chevR
                        size={16}
                        className="text-slate-400 hidden sm:block"
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {opened && (
        <IncidentDrawer
          key={opened.id}
          i={opened}
          tenant={tenantName(opened.tenantId)}
          onClose={() => setOpenId("")}
          onStatus={(s, msg) => {
            update(opened.id, (x) => setIncidentStatus(x, s, by, opsNow(), msg));
            toast(
              `${opened.id} is ${STATUS_LABEL[s].toLowerCase()}${msg.trim() ? " — your message went to the tenant" : ""}.`,
              { tone: "success" },
            );
          }}
          onPost={(kind, text) => {
            update(opened.id, (x) =>
              addIncidentUpdate(x, { at: opsNow(), by, side: "slaice", kind, text }),
            );
            toast(
              kind === "note"
                ? "Internal note saved — the tenant doesn't see it."
                : `Reply sent to ${tenantName(opened.tenantId)}'s call center.`,
              { tone: "success" },
            );
          }}
        />
      )}
    </div>
  );
}

function IncidentDrawer({
  i,
  tenant,
  onClose,
  onStatus,
  onPost,
}: {
  i: Incident;
  tenant: string;
  onClose: () => void;
  onStatus: (s: IncidentStatus, message: string) => void;
  onPost: (kind: "reply" | "note", text: string) => void;
}) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"reply" | "note">("reply");
  const [tried, setTried] = useState(false);
  const [to, setTo] = useState<IncidentStatus>(i.status);
  const ids = { msg: useId(), err: useId() };
  const next = NEXT_ACTION[i.status];
  const empty = text.trim().length < 3;
  return (
    <Drawer
      open
      onClose={onClose}
      label={`${i.id} ${i.title}`}
      title={
        <div className="min-w-0">
          <div className="text-[12px] text-slate-500 tnum">
            {i.id} · <b className="font-semibold text-slate-700">{tenant}</b> · reported{" "}
            {fmtAt(i.reportedAt)}
          </div>
          <div className="font-display font-bold text-navy-900 text-lg leading-snug">{i.title}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <SeverityBadge s={i.severity} />
            <IncidentStatusBadge s={i.status} />
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <StatusTrack s={i.status} />
        <Facts
          i={i}
          extra={
            <>
              <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 border-b border-slate-100 text-[13px]">
                <dt className="text-slate-500">Tenant</dt>
                <dd>
                  <a
                    href={`#/platform/tenant/${i.tenantId}/overview`}
                    className="font-semibold text-teal-700 hover:underline"
                  >
                    {tenant}
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 border-b border-slate-100 text-[13px]">
                <dt className="text-slate-500">Reported by</dt>
                <dd className="text-navy-900">
                  {i.reporter.name} · {i.reporter.role}
                </dd>
              </div>
            </>
          }
        />
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            History
          </h3>
          <Timeline i={i} updates={i.updates} />
        </section>

        {/* Status */}
        <section className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5 space-y-2.5">
          <h3 className="font-semibold text-navy-900 text-[14px]">Status</h3>
          <div className="flex flex-wrap items-end gap-2">
            {next && (
              <Btn
                variant="primary"
                size="sm"
                icon={
                  next.to === "resolved"
                    ? Icon.checkCircle
                    : next.to === "acknowledged"
                      ? Icon.eye
                      : Icon.play
                }
                onClick={() => {
                  onStatus(next.to, kind === "reply" ? text : "");
                  if (kind === "reply") setText("");
                  setTo(next.to);
                }}
              >
                {next.label}
                {kind === "reply" && !empty ? " & send reply" : ""}
              </Btn>
            )}
            <div className="flex items-end gap-2">
              <div className="w-40">
                <Field label="Or set to">
                  <Select
                    value={to}
                    onChange={(e) => setTo(e.target.value as IncidentStatus)}
                    options={STATUS_ORDER.map((s) => ({ v: s, l: STATUS_LABEL[s] }))}
                  />
                </Field>
              </div>
              <Btn
                variant="outline"
                size="sm"
                disabled={to === i.status}
                onClick={() => onStatus(to, "")}
              >
                {i.status === "resolved" && to !== "resolved" ? "Reopen" : "Set"}
              </Btn>
            </div>
          </div>
          <p className="text-[12px] text-slate-500">
            The tenant's call center sees every status change in their Incidents page.
          </p>
        </section>

        {/* Reply or note */}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (empty) return;
            onPost(kind, text);
            setText("");
            setTried(false);
          }}
          className="space-y-2"
        >
          <div
            role="radiogroup"
            aria-label="Who sees it"
            className="inline-flex rounded-xl ring-1 ring-slate-200 p-0.5 bg-white/70"
          >
            {(
              [
                ["reply", "Reply to tenant", Icon.send],
                ["note", "Internal note", Icon.lock],
              ] as const
            ).map(([k, l, I]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 min-h-[36px] text-[12.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${kind === k ? (k === "note" ? "bg-amber-100 text-amber-900" : "bg-navy-900 text-white") : "text-slate-600 hover:bg-slate-100"}`}
              >
                <I size={13} aria-hidden /> {l}
              </button>
            ))}
          </div>
          <Field
            label={kind === "reply" ? `Message to ${tenant}` : "Note for the Slaice team"}
            hint={
              tried && empty ? (
                <span id={ids.err} className="text-rose-700">
                  Write a few words first.
                </span>
              ) : kind === "reply" ? (
                "Their call center sees it in Incidents and in their notifications."
              ) : (
                "Only Slaice staff see internal notes."
              )
            }
          >
            <textarea
              id={ids.msg}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              aria-invalid={tried && empty}
              aria-describedby={tried && empty ? ids.err : undefined}
              placeholder={
                kind === "reply"
                  ? "e.g. Thanks — we've found the cause and are deploying a fix."
                  : "e.g. Linked to PAY-388; Stripe ticket opened."
              }
              className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-teal-500/70 ${kind === "note" ? "bg-amber-50/60" : ""}`}
            />
          </Field>
          <div className="flex justify-end">
            <Btn
              variant={kind === "note" ? "outline" : "primary"}
              size="sm"
              type="submit"
              icon={kind === "note" ? Icon.lock : Icon.send}
            >
              {kind === "note" ? "Save note" : "Send reply"}
            </Btn>
          </div>
        </form>
      </div>
    </Drawer>
  );
}
