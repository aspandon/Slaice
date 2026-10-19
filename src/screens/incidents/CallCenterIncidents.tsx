import { useId, useMemo, useRef, useState } from "react";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Btn, Card, Drawer, EmptyState, Field, Input, PageHead, Tabs } from "../../components/ui";
import { useApp } from "../../app/store";
import { useTenantFeatures } from "../../lib/useFeatures";
import { useUrlState } from "../../lib/useUrlState";
import { CALL_CENTER_AGENT, opsNow, useBookingOps } from "../../lib/useBookingOps";
import {
  CATEGORY_LABEL,
  DESCRIPTION_MIN,
  EMPTY_INCIDENT,
  RESPONSE_TARGET,
  SEEN_BY_LABEL,
  SEVERITY_HINT,
  SEVERITY_LABEL,
  TITLE_MAX,
  addIncidentUpdate,
  createIncident,
  isOpen,
  lastSlaiceWord,
  nextIncidentId,
  normalizeRef,
  sortIncidents,
  tenantUpdates,
  validateIncident,
  type Incident,
  type IncidentCategory,
  type IncidentDraft,
  type IncidentSeenBy,
  type IncidentSeverity,
} from "../../domain/incidents";
import {
  Facts,
  IncidentStatusBadge,
  SeverityBadge,
  StatusTrack,
  Timeline,
  fmtAt,
  fmtSize,
} from "./parts";

/* ============ Call Center · Incidents (AENR-720) ============
   The agent reports to Slaice what a guest or the beach's staff ran into —
   who saw it, a category, how serious, the booking it concerns, what
   happened, who to call back and a screenshot. It lands in Slaice's Incidents
   inbox (the same app store); status changes and replies from Slaice come
   back here, and the agent can add information as it goes. */

const CATEGORY_ICON: Record<IncidentCategory, IconRenderer> = {
  payment: Icon.card,
  booking: Icon.grid,
  app: Icon.monitor,
  venue: Icon.umbrella,
  safety: Icon.shieldAlert,
  other: Icon.more,
};
const SEEN_ICON: Record<IncidentSeenBy, IconRenderer> = {
  customer: Icon.users,
  staff: Icon.headset,
};
const SEVERITIES: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const SEV_DOT: Record<IncidentSeverity, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-rose-600",
};

export function CallCenterIncidents() {
  const { incidents, setIncidents, staffUsers, viewAs, toast } = useApp();
  const { tenant } = useTenantFeatures();
  const tenantId = tenant?.id ?? "akti";
  const agentName = viewAs?.name ?? CALL_CENTER_AGENT;
  const agent = staffUsers.find((u) => u.name === agentName);
  const ops = useBookingOps();
  const mine = useMemo(
    () => sortIncidents(incidents.filter((i) => i.tenantId === tenantId)),
    [incidents, tenantId],
  );
  const [tab, setTab] = useUrlState("tab", "open");
  const [openId, setOpenId] = useUrlState("incident", "");
  const [justSent, setJustSent] = useState<string | null>(null);
  const shown = mine.filter((i) => (tab === "resolved" ? !isOpen(i) : isOpen(i)));
  const opened = mine.find((i) => i.id === openId);

  const report = (d: IncidentDraft) => {
    const inc = createIncident(d, {
      id: nextIncidentId(incidents),
      tenantId,
      at: opsNow(),
      reporter: { name: agentName, role: "Call Center" },
    });
    setIncidents((list) => [inc, ...list]);
    setJustSent(inc.id);
    setTab("open");
    toast(`${inc.id} sent to Slaice — they respond ${RESPONSE_TARGET[inc.severity]}.`, {
      tone: "success",
    });
  };

  return (
    <div className="animate-fade-up">
      <PageHead
        daily
        sub="Report to Slaice what a guest or our staff ran into — payments, bookings, app bugs, the venue or safety — and follow Slaice's answer here."
      />
      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4 items-start">
        <Card className="p-4 sm:p-5">
          <h2 className="font-display font-bold text-navy-900 text-lg mb-1">Report an incident</h2>
          <p className="text-[12.5px] text-slate-600 mb-4">
            Goes straight to the Slaice team. For an emergency on the beach, call 112 first.
          </p>
          <ReportForm
            key={justSent ?? "new"}
            bookingExists={(ref) => ops.bookings.some((b) => b.id === ref)}
            lookup={(ref) => ops.bookings.find((b) => b.id === ref)}
            contact={{ name: agentName, reach: agent?.phone ?? "" }}
            onSubmit={report}
          />
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h2 className="font-display font-bold text-navy-900 text-lg">Reported to Slaice</h2>
            <span className="text-[12px] text-slate-500 tnum">{mine.length} in total</span>
          </div>
          <Tabs
            tabs={[
              ["open", `Open · ${mine.filter(isOpen).length}`],
              ["resolved", `Resolved · ${mine.filter((i) => !isOpen(i)).length}`],
            ]}
            value={tab}
            onChange={setTab}
            className="mb-3"
          />
          {shown.length === 0 ? (
            <EmptyState
              compact
              icon={tab === "resolved" ? Icon.checkCircle : Icon.inbox}
              title={tab === "resolved" ? "Nothing resolved yet" : "No open incidents"}
              body={
                tab === "resolved"
                  ? "Incidents Slaice resolves move here with their answer."
                  : "Everything you reported is resolved. New reports show here with Slaice's status and replies."
              }
            />
          ) : (
            <ul className="space-y-2.5" aria-live="polite">
              {shown.map((i) => {
                const last = lastSlaiceWord(i);
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(i.id)}
                      className={`w-full text-left rounded-2xl ring-1 p-3.5 bg-white/80 hover:ring-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition ${justSent === i.id ? "ring-teal-400 shadow-glow" : "ring-slate-200"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] text-slate-500 tnum">
                            {i.id} · {fmtAt(i.reportedAt)} · {CATEGORY_LABEL[i.category]}
                          </div>
                          <div className="font-semibold text-navy-900 leading-snug">{i.title}</div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <SeverityBadge s={i.severity} />
                          <IncidentStatusBadge s={i.status} />
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <StatusTrack s={i.status} compact />
                      </div>
                      <p className="mt-2 text-[12.5px] text-slate-600 leading-snug line-clamp-2">
                        {last ? (
                          <>
                            <b className="font-semibold text-slaice-700">Slaice:</b>{" "}
                            {last.text ||
                              `set it to ${last.status ? last.status.replace("_", " ") : "updated"}.`}
                          </>
                        ) : (
                          `Waiting for Slaice — they respond ${RESPONSE_TARGET[i.severity]}.`
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      {opened && (
        <IncidentDetail
          i={opened}
          by={agentName}
          onClose={() => setOpenId("")}
          onAdd={(text) => {
            setIncidents((list) =>
              list.map((x) =>
                x.id === opened.id
                  ? addIncidentUpdate(x, {
                      at: opsNow(),
                      by: agentName,
                      side: "tenant",
                      kind: "reply",
                      text,
                    })
                  : x,
              ),
            );
            toast(`Added to ${opened.id} — Slaice sees it now.`, { tone: "success" });
          }}
        />
      )}
    </div>
  );
}

/* ---------- The report form ---------- */
function ReportForm({
  bookingExists,
  lookup,
  contact,
  onSubmit,
}: {
  bookingExists: (ref: string) => boolean;
  lookup: (
    ref: string,
  ) =>
    | { id: string; who: string; surname: string; date: string; amount: number; items: string[] }
    | undefined;
  contact: { name: string; reach: string };
  onSubmit: (d: IncidentDraft) => void;
}) {
  const [d, setD] = useState<IncidentDraft>({
    ...EMPTY_INCIDENT,
    contactName: contact.name,
    contactReach: contact.reach,
  });
  const [tried, setTried] = useState(false);
  const errors = validateIncident(d, bookingExists);
  const e = tried ? errors : {};
  const n = Object.keys(errors).length;
  const fileRef = useRef<HTMLInputElement>(null);
  const ids = {
    ref: useId(),
    title: useId(),
    desc: useId(),
    cn: useId(),
    cr: useId(),
    file: useId(),
    err: useId(),
  };
  const set = <K extends keyof IncidentDraft>(k: K, v: IncidentDraft[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const refNorm = normalizeRef(d.bookingRef);
  const found = refNorm ? lookup(refNorm) : undefined;
  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        setTried(true);
        if (n === 0) onSubmit(d);
      }}
      className="space-y-4"
      aria-describedby={tried && n ? ids.err : undefined}
    >
      {tried && n > 0 && (
        <div
          id={ids.err}
          role="alert"
          className="rounded-xl bg-rose-50 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px] text-rose-800 flex items-center gap-2"
        >
          <Icon.alert size={14} aria-hidden />{" "}
          {n === 1 ? "One thing is missing" : `${n} things are missing`} — see the highlighted
          fields.
        </div>
      )}
      <Choice
        legend="Who ran into it?"
        error={e.seenBy}
        name="seenBy"
        cols="grid-cols-2"
        value={d.seenBy}
        onChange={(v) => set("seenBy", v as IncidentSeenBy)}
        options={(["customer", "staff"] as const).map((k) => ({
          v: k,
          l: SEEN_BY_LABEL[k],
          icon: SEEN_ICON[k],
        }))}
      />
      <Choice
        legend="Category"
        error={e.category}
        name="category"
        cols="grid-cols-2 sm:grid-cols-3"
        value={d.category}
        onChange={(v) => set("category", v as IncidentCategory)}
        options={(Object.keys(CATEGORY_LABEL) as IncidentCategory[]).map((k) => ({
          v: k,
          l: CATEGORY_LABEL[k],
          icon: CATEGORY_ICON[k],
        }))}
      />
      <Choice
        legend="How serious is it?"
        error={e.severity}
        name="severity"
        cols="grid-cols-2 sm:grid-cols-4"
        value={d.severity}
        onChange={(v) => set("severity", v as IncidentSeverity)}
        options={SEVERITIES.map((k) => ({
          v: k,
          l: SEVERITY_LABEL[k],
          hint: SEVERITY_HINT[k],
          dot: SEV_DOT[k],
        }))}
      />
      <Field
        label="Related booking (optional)"
        hint={
          e.bookingRef ? (
            <span id={ids.ref} className="text-rose-700">
              {e.bookingRef}
            </span>
          ) : found ? (
            <span id={ids.ref} className="inline-flex items-center gap-1 text-emerald-700">
              <Icon.checkCircle size={11} aria-hidden /> {found.id} · {found.who} {found.surname} ·{" "}
              {found.date} · €{found.amount}
            </span>
          ) : refNorm && d.bookingRef.replace(/\D/g, "").length >= 5 ? (
            <span id={ids.ref} className="text-amber-700">
              No booking with this ref yet — check it with the caller.
            </span>
          ) : (
            "The booking ref, e.g. BK-10428 — Slaice sees the booking with the report."
          )
        }
      >
        <Input
          value={d.bookingRef}
          onChange={(ev) => set("bookingRef", ev.target.value)}
          placeholder="BK-10428"
          className="max-w-[14rem]"
          aria-invalid={!!e.bookingRef}
          aria-describedby={ids.ref}
          autoComplete="off"
        />
      </Field>
      <Field
        label="Title"
        hint={
          e.title ? (
            <span id={ids.title} className="text-rose-700">
              {e.title}
            </span>
          ) : (
            `${d.title.trim().length}/${TITLE_MAX}`
          )
        }
      >
        <Input
          value={d.title}
          onChange={(ev) => set("title", ev.target.value)}
          placeholder="e.g. Guest charged twice for one booking"
          maxLength={TITLE_MAX + 20}
          aria-invalid={!!e.title}
          aria-describedby={e.title ? ids.title : undefined}
        />
      </Field>
      <Field
        label="What happened?"
        hint={
          e.description ? (
            <span id={ids.desc} className="text-rose-700">
              {e.description}
            </span>
          ) : (
            "When, where, what the guest or staff saw, and what you already tried."
          )
        }
      >
        <textarea
          value={d.description}
          onChange={(ev) => set("description", ev.target.value)}
          rows={4}
          minLength={DESCRIPTION_MIN}
          aria-invalid={!!e.description}
          aria-describedby={e.description ? ids.desc : undefined}
          className="glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-teal-500/70"
        />
      </Field>
      <fieldset>
        <legend className="text-[12px] font-semibold text-slate-700 mb-1">Follow-up contact</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field
            hint={
              e.contactName ? (
                <span id={ids.cn} className="text-rose-700">
                  {e.contactName}
                </span>
              ) : (
                "You, or the guest if Slaice should call them."
              )
            }
          >
            <Input
              aria-label="Contact name"
              value={d.contactName}
              onChange={(ev) => set("contactName", ev.target.value)}
              aria-invalid={!!e.contactName}
              aria-describedby={e.contactName ? ids.cn : undefined}
              autoComplete="off"
            />
          </Field>
          <Field
            hint={
              e.contactReach ? (
                <span id={ids.cr} className="text-rose-700">
                  {e.contactReach}
                </span>
              ) : (
                "Phone or e-mail."
              )
            }
          >
            <Input
              aria-label="Contact phone or e-mail"
              value={d.contactReach}
              onChange={(ev) => set("contactReach", ev.target.value)}
              aria-invalid={!!e.contactReach}
              aria-describedby={e.contactReach ? ids.cr : undefined}
              autoComplete="off"
            />
          </Field>
        </div>
      </fieldset>
      <div>
        <div className="text-[12px] font-semibold text-slate-700 mb-1">
          Screenshot or file (optional)
        </div>
        {d.attachment ? (
          <div className="inline-flex items-center gap-2 rounded-xl ring-1 ring-slate-200 bg-white/80 pl-3 pr-1 py-1 text-[13px] max-w-full">
            <Icon.image size={15} className="text-slate-500 shrink-0" aria-hidden />
            <span className="truncate font-semibold text-navy-900">{d.attachment.name}</span>
            <span className="text-slate-500 tnum shrink-0">{fmtSize(d.attachment.size)}</span>
            <button
              type="button"
              onClick={() => set("attachment", undefined)}
              aria-label={`Remove ${d.attachment.name}`}
              className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Icon.x size={15} />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={fileRef}
              id={ids.file}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) set("attachment", { name: f.name, size: f.size });
                ev.target.value = "";
              }}
            />
            <Btn
              variant="outline"
              size="sm"
              icon={Icon.upload}
              onClick={() => fileRef.current?.click()}
            >
              Attach a screenshot
            </Btn>
          </>
        )}
        <p className="mt-1 text-[11px] text-slate-500">
          Demo — only the file's name and size are kept; nothing is uploaded.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <p className="text-[12px] text-slate-500 pt-3">
          {d.severity
            ? `Slaice responds ${RESPONSE_TARGET[d.severity]}.`
            : "Slaice sees it at once in its Incidents inbox."}
        </p>
        <Btn variant="primary" type="submit" icon={Icon.send} className="mt-3">
          Send to Slaice
        </Btn>
      </div>
    </form>
  );
}

/** A labelled group of radio cards — one choice, keyboard-operable as native radios. */
function Choice({
  legend,
  name,
  value,
  onChange,
  options,
  error,
  cols,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string; icon?: IconRenderer; hint?: string; dot?: string }[];
  error?: string;
  cols: string;
}) {
  const errId = useId();
  return (
    <fieldset aria-describedby={error ? errId : undefined} aria-invalid={!!error}>
      <legend className="text-[12px] font-semibold text-slate-700 mb-1">{legend}</legend>
      <div className={`grid ${cols} gap-2`}>
        {options.map((o) => {
          const on = value === o.v;
          const I = o.icon;
          return (
            <label
              key={o.v}
              className={`relative flex items-start gap-2 rounded-xl px-3 py-2.5 min-h-[44px] cursor-pointer ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500 ${on ? "ring-2 ring-teal-500 bg-teal-50/50" : error ? "ring-rose-300 hover:ring-rose-400" : "ring-slate-200 hover:ring-slate-300 bg-white/60"}`}
            >
              <input
                type="radio"
                name={name}
                value={o.v}
                checked={on}
                onChange={() => onChange(o.v)}
                className="sr-only"
              />
              {I && (
                <I
                  size={16}
                  className={`mt-px shrink-0 ${on ? "text-teal-700" : "text-slate-500"}`}
                  aria-hidden
                />
              )}
              {o.dot && (
                <span aria-hidden className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${o.dot}`} />
              )}
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-navy-900">{o.l}</span>
                {o.hint && (
                  <span className="block text-[11px] text-slate-500 leading-snug">{o.hint}</span>
                )}
              </span>
              {on && (
                <Icon.checkCircle
                  size={14}
                  className="absolute top-2 right-2 text-teal-600"
                  aria-hidden
                />
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errId} className="mt-1 text-[11px] text-rose-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/* ---------- One incident, as the tenant sees it ---------- */
function IncidentDetail({
  i,
  by,
  onClose,
  onAdd,
}: {
  i: Incident;
  by: string;
  onClose: () => void;
  onAdd: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const id = useId();
  const short = text.trim().length < 3;
  return (
    <Drawer
      open
      onClose={onClose}
      label={`${i.id} ${i.title}`}
      title={
        <div className="min-w-0">
          <div className="text-[12px] text-slate-500 tnum">
            {i.id} · reported {fmtAt(i.reportedAt)}
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
        <Facts i={i} />
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            History
          </h3>
          <Timeline i={i} updates={tenantUpdates(i)} />
        </section>
        <form
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            setTried(true);
            if (short) return;
            onAdd(text);
            setText("");
            setTried(false);
          }}
          className="space-y-2"
        >
          <Field
            label="Add information for Slaice"
            hint={
              tried && short ? (
                <span id={id} className="text-rose-700">
                  Write a few words first.
                </span>
              ) : (
                `Posted as ${by}. Slaice sees it in the incident at once.`
              )
            }
          >
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              rows={3}
              aria-invalid={tried && short}
              aria-describedby={tried && short ? id : undefined}
              placeholder="e.g. The guest called back — it happened again at 14:10."
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-teal-500/70"
            />
          </Field>
          <div className="flex justify-end">
            <Btn variant="primary" size="sm" type="submit" icon={Icon.send}>
              Add to incident
            </Btn>
          </div>
        </form>
      </div>
    </Drawer>
  );
}
