import { Fragment, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Drawer, EmptyState, Field, Input, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { useNow } from "../../lib/useLiveSlots";
import { authorityDraft, closeErrors, hoursLeft, type Breach, type Risk } from "../../domain/gdpr";
import { usePrivacy } from "./usePrivacy";

/* ============ Breach register (AENR-488) ============
   The tenant is the controller: every incident is documented (Art. 33(5)),
   the 72-hour clock runs from awareness — or from Slaice's notification when
   the processor reports it — and a draft to the Hellenic DPA carries every
   Art. 33(3) element. High-risk breaches need a message to the people
   affected (Art. 34), sent through Communicate. */

export const TENANT_ID = "akti";
const fmtClock = (h: number) =>
  h <= 0
    ? `${Math.floor(-h)}h past the deadline`
    : `${Math.floor(h)}h ${Math.floor((h % 1) * 60)}m left`;

export function BreachesTab() {
  const { privacy, setPrivacy } = usePrivacy();
  const now = useNow(30000);
  const [open, setOpen] = useState<string | null>(null);
  const list = privacy.breaches
    .filter((b) => b.source === "Tenant" || b.tenantIds?.includes(TENANT_ID))
    .sort((a, b) =>
      !!a.closedAt === !!b.closedAt ? b.awareAt.localeCompare(a.awareAt) : a.closedAt ? 1 : -1,
    );
  const create = () => {
    const id = `BR-${String(privacy.breaches.length + 1).padStart(3, "0")}`;
    const b: Breach = {
      id,
      title: "New incident",
      awareAt: new Date().toISOString(),
      source: "Tenant",
      facts: "",
      categories: "",
      people: 0,
      records: 0,
      consequences: "",
      measures: "",
      risk: "Risk",
      authority: [],
    };
    setPrivacy((s) => ({ ...s, breaches: [b, ...s.breaches] }));
    setOpen(id);
  };
  const sel = privacy.breaches.find((b) => b.id === open) ?? null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[12.5px] text-slate-600">
          Record every personal-data breach — even ones you don't report. Report notifiable ones to
          the Hellenic DPA within 72 hours of becoming aware.
        </div>
        <Btn variant="danger" icon={Icon.shieldAlert} className="ml-auto" onClick={create}>
          Record an incident
        </Btn>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.shieldCheck}
            title="No incidents recorded"
            body="Record one the moment you become aware — the 72-hour clock starts then."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((b) => {
              const h = hoursLeft(b, now);
              const clockOn = !b.closedAt && b.notifiable !== false && !b.authority.length;
              return (
                <li key={b.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="font-semibold text-navy-900">
                      {b.id} · {b.title}
                    </div>
                    <div className="text-[12px] text-slate-500">
                      {b.source === "Slaice (processor)"
                        ? "Reported by Slaice (processor)"
                        : "Recorded by you"}{" "}
                      · aware {new Date(b.awareAt).toLocaleString("en-GB")} · {b.people} people
                    </div>
                  </div>
                  <Badge
                    tone={b.risk === "High risk" ? "red" : b.risk === "Risk" ? "amber" : "slate"}
                  >
                    {b.risk}
                  </Badge>
                  {b.closedAt ? (
                    <Badge tone="green">
                      Closed · {b.notifiable ? "notified" : "not notifiable"}
                    </Badge>
                  ) : clockOn ? (
                    <Badge tone={h < 12 ? "red" : "amber"}>{fmtClock(h)}</Badge>
                  ) : (
                    <Badge tone="blue">
                      {b.authority.length ? "DPA notified" : "Not notifiable"} · open
                    </Badge>
                  )}
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon={Icon.edit}
                    aria-label={`Open ${b.id}`}
                    onClick={() => setOpen(b.id)}
                  >
                    Open
                  </Btn>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {sel && <BreachDrawer b={sel} now={now} onClose={() => setOpen(null)} />}
    </div>
  );
}

function BreachDrawer({ b, now, onClose }: { b: Breach; now: number; onClose: () => void }) {
  const { privacy, setPrivacy } = usePrivacy();
  const { toast, setComms } = useApp();
  const [tried, setTried] = useState(false);
  const [msg, setMsg] = useState(
    b.subjects?.text ??
      `We're writing to tell you about an incident that affected your data at Akti tou Iliou. What happened: ${b.facts || "…"} What we've done: ${b.measures || "…"} What you can do: be careful with unexpected messages that mention your booking. Questions: ${privacy.dpo.email}.`,
  );
  const up = (p: Partial<Breach>) =>
    setPrivacy((s) => ({
      ...s,
      breaches: s.breaches.map((x) => (x.id === b.id ? { ...x, ...p } : x)),
    }));
  const h = hoursLeft(b, now);
  const draft = authorityDraft(b, privacy.dpo, "Akti tou Iliou AE · Poseidonos Ave 32, Alimos");
  const errs = closeErrors(b);
  const closed = !!b.closedAt;
  const file = () => {
    const phase = b.authority.length ? "Follow-up" : "Initial";
    up({ authority: [...b.authority, { phase, at: new Date().toISOString() }] });
    toast(
      `Demo — ${phase.toLowerCase()} notification filed with the Hellenic DPA${h < 0 ? " (late — include the reasons for the delay)" : ""}.`,
      { tone: "success" },
    );
  };
  const sendSubjects = () => {
    const sentAt = new Date().toISOString();
    up({ subjects: { text: msg, sentAt } });
    // Lands in Communicate's library as a service (non-promotional) message.
    setComms((s) => ({
      ...s,
      messages: [
        {
          id: `msg-${b.id.toLowerCase()}`,
          name: `Breach notice · ${b.id}`,
          status: "Ready",
          content: { en: { subject: "Important: an incident affecting your data", body: msg } },
          channels: ["email"],
          fallbacks: {},
          updatedAt: sentAt.slice(0, 16),
          updatedBy: "Eleni Markou",
        },
        ...s.messages.filter((m) => m.id !== `msg-${b.id.toLowerCase()}`),
      ],
    }));
    toast(
      `Notice sent by e-mail to ${b.people} affected people via Communicate (service message — consent not needed).`,
      { tone: "success" },
    );
  };
  const txt = (k: keyof Breach, label: string, rows = 2) => (
    <Field label={label}>
      <textarea
        aria-label={label}
        rows={rows}
        disabled={closed}
        value={String(b[k] ?? "")}
        onChange={(e) => up({ [k]: e.target.value } as Partial<Breach>)}
        className="glass-input w-full rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500/70 outline-none disabled:opacity-60"
      />
    </Field>
  );
  return (
    <Drawer
      open
      onClose={onClose}
      label={`Incident ${b.id}`}
      title={
        <div>
          <div className="font-display font-bold text-navy-900 text-lg">
            {b.id} · {b.title}
          </div>
          <div className="text-[12px] text-slate-500">
            {b.source} · aware {new Date(b.awareAt).toLocaleString("en-GB")}
          </div>
        </div>
      }
      footer={
        !closed && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            {tried && errs.length > 0 && (
              <div role="alert" className="text-[12px] text-rose-700 flex-1">
                {errs[0]}
              </div>
            )}
            <Btn
              variant="primary"
              icon={Icon.check}
              className="ml-auto"
              onClick={() => {
                setTried(true);
                if (!errs.length) {
                  up({ closedAt: new Date().toISOString() });
                  toast(`${b.id} closed and kept in the register.`, { tone: "success" });
                }
              }}
            >
              Close incident
            </Btn>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {!closed && b.notifiable !== false && !b.authority.length && (
          <div
            role="timer"
            aria-live="off"
            className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${h < 12 ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-900"}`}
          >
            <Icon.clock size={20} />
            <div>
              <div className="font-display font-bold text-lg tnum">{fmtClock(h)}</div>
              <div className="text-[12px] opacity-90">
                to notify the Hellenic DPA · deadline{" "}
                {new Date(Date.parse(b.awareAt) + 72 * 36e5).toLocaleString("en-GB")}
                {b.source === "Slaice (processor)" ? " · counted from Slaice's notification" : ""}
              </div>
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Field label="Title">
            <Input
              value={b.title}
              disabled={closed}
              onChange={(e) => up({ title: e.target.value })}
            />
          </Field>
          <Field label="Risk to people">
            <Select
              value={b.risk}
              disabled={closed}
              onChange={(e) => up({ risk: e.target.value as Risk })}
              options={["Unlikely to result in a risk", "Risk", "High risk"]}
            />
          </Field>
          <Field label="People affected (approx.)">
            <Input
              type="number"
              min={0}
              value={b.people}
              disabled={closed}
              onChange={(e) => up({ people: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Records affected (approx.)">
            <Input
              type="number"
              min={0}
              value={b.records}
              disabled={closed}
              onChange={(e) => up({ records: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
        </div>
        {txt("facts", "What happened (facts)")}
        {txt("categories", "Categories of people and data", 1)}
        {txt("consequences", "Likely consequences")}
        {txt("measures", "Measures taken or proposed")}
        <fieldset className="rounded-2xl ring-1 ring-slate-200 p-3 space-y-2">
          <legend className="px-1 text-[12.5px] font-semibold text-navy-900">
            Decision: notifiable to the authority? (Art. 33)
          </legend>
          <div className="flex gap-4 text-[13px]">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                disabled={closed}
                checked={b.notifiable === true}
                onChange={() => up({ notifiable: true })}
              />{" "}
              Yes — likely a risk to people
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                disabled={closed}
                checked={b.notifiable === false}
                onChange={() => up({ notifiable: false })}
              />{" "}
              No — unlikely to result in a risk
            </label>
          </div>
          <Field label="Reason (kept on file under Art. 33(5))">
            <Input
              value={b.decisionReason ?? ""}
              disabled={closed}
              onChange={(e) => up({ decisionReason: e.target.value })}
            />
          </Field>
        </fieldset>
        {b.notifiable && (
          <section className="rounded-2xl ring-1 ring-slate-200 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-navy-900">
                Draft notification · Hellenic DPA (Art. 33(3))
              </h3>
              {!closed && (
                <Btn size="sm" variant="primary" icon={Icon.send} onClick={file}>
                  {b.authority.length ? "File follow-up" : "File initial notification"}
                </Btn>
              )}
            </div>
            <dl className="grid grid-cols-[180px_1fr] gap-x-3 gap-y-1 text-[12.5px]">
              {draft.map((d) => (
                <Fragment key={d.field}>
                  <dt className="text-slate-500">{d.field}</dt>
                  <dd className="text-navy-900">{d.value}</dd>
                </Fragment>
              ))}
            </dl>
            {b.authority.length > 0 && (
              <ul className="mt-2 text-[12px] text-teal-800">
                {b.authority.map((a, i) => (
                  <li key={i}>
                    ✓ {a.phase} notification filed {new Date(a.at).toLocaleString("en-GB")}
                  </li>
                ))}
              </ul>
            )}
            <div className="text-[11.5px] text-slate-500 mt-1.5">
              Information may be provided in phases (Art. 33(4)) — file what you know now and follow
              up.
            </div>
          </section>
        )}
        {b.risk === "High risk" && (
          <section className="rounded-2xl ring-1 ring-rose-200 bg-rose-50/40 p-3 space-y-2">
            <h3 className="font-semibold text-navy-900">Tell the people affected (Art. 34)</h3>
            <textarea
              aria-label="Message to the people affected"
              rows={5}
              disabled={!!b.subjects || closed}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/70"
            />
            {b.subjects ? (
              <div className="text-[12px] text-teal-800">
                ✓ Sent {new Date(b.subjects.sentAt).toLocaleString("en-GB")} via Communicate
              </div>
            ) : (
              <Btn
                size="sm"
                variant="primary"
                icon={Icon.mail}
                disabled={closed}
                onClick={sendSubjects}
              >
                Send via Communicate
              </Btn>
            )}
          </section>
        )}
      </div>
    </Drawer>
  );
}
