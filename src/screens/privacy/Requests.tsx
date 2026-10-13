import { useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { readHashQuery } from "../../app/router";
import { downloadCSV } from "../../lib/download";
import { CUSTOMERS } from "../../data/mock";
import {
  DSAR_ARTICLE,
  DSAR_CHANNELS,
  DSAR_TYPES,
  RECIPIENTS,
  VERIFY_METHODS,
  addMonths,
  canExtend,
  daysLeft,
  dsarSteps,
  dueDate,
  fmtDate,
  isOpen,
  needsRecipientNotice,
  type DsarChannel,
  type DsarRequest,
  type DsarStatus,
  type DsarType,
} from "../../domain/gdpr";
import { CHANNEL_PURPOSES } from "../../domain/gdpr";
import { STAFF_NAME, usePrivacy } from "./usePrivacy";

/* ============ Data-subject requests (AENR-484) ============
   One queue for requests from the Privacy Centre and those staff log from
   e-mail, phone or in person. Each request moves through one status machine;
   the deadline is one calendar month from receipt (extendable by two more with
   a notice inside the first month); every action writes the audit trail. */

const STATUS_TONE: Record<DsarStatus, string> = {
  Received: "blue",
  "Verifying identity": "amber",
  "In progress": "indigo",
  Extended: "amber",
  Completed: "green",
  Refused: "slate",
};
const TYPE_TONE: Partial<Record<DsarType, string>> = {
  Erasure: "red",
  Access: "blue",
  Portability: "blue",
  Restriction: "amber",
};
export const COMPLAINT_NOTICE =
  "You can complain to the Hellenic Data Protection Authority (Kifisias 1-3, 115 23 Athens · www.dpa.gr) and seek a judicial remedy (GDPR Art. 77–79).";
const stamp = () => new Date().toISOString().slice(0, 16);

export function RequestsTab() {
  const { privacy, setPrivacy, today, submitRequest } = usePrivacy();
  const { toast } = useApp();
  const [view, setView] = useState<"open" | "closed" | "all">("open");
  const [open, setOpen] = useState<string | null>(() => readHashQuery().get("request")); // inbox deep link (AENR-554)
  const [logging, setLogging] = useState(false);
  const rs = privacy.requests;
  const overdue = rs.filter((r) => isOpen(r) && daysLeft(r, today) < 0);
  const list = rs
    .filter((r) => (view === "open" ? isOpen(r) : view === "closed" ? !isOpen(r) : true))
    // Overdue first, then the nearest deadline.
    .sort((a, b) =>
      isOpen(a) === isOpen(b) ? dueDate(a).localeCompare(dueDate(b)) : isOpen(a) ? -1 : 1,
    );
  const sel = rs.find((r) => r.id === open) ?? null;
  const update = (id: string, fn: (r: DsarRequest) => DsarRequest) =>
    setPrivacy((s) => ({ ...s, requests: s.requests.map((r) => (r.id === id ? fn(r) : r)) }));
  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 flex flex-wrap items-center gap-3"
        >
          <Icon.alert size={18} className="text-rose-600 shrink-0" />
          <div className="flex-1 min-w-0 text-[13px] text-rose-900">
            <b>{overdue.length} overdue</b> — past the one-month deadline (Art. 12(3)):{" "}
            {overdue.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ", "}
                <button
                  type="button"
                  onClick={() => setOpen(r.id)}
                  className="font-semibold underline"
                >
                  {r.id} · {r.first} {r.last}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Show requests"
          className="inline-flex rounded-xl ring-1 ring-slate-200 bg-white p-0.5 text-[12.5px] font-semibold"
        >
          {(
            [
              ["open", `Open · ${rs.filter(isOpen).length}`],
              ["closed", "Closed"],
              ["all", "All"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={view === k}
              onClick={() => setView(k)}
              className={`px-3 py-1 rounded-lg ${view === k ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-slate-500">
          One month from receipt · extendable by two more with notice (Art. 12(3))
        </span>
        <Btn
          variant="primary"
          icon={Icon.plus}
          className="ml-auto"
          onClick={() => setLogging(true)}
        >
          Log a request
        </Btn>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.inbox}
            title="Nothing here"
            body="Requests from the Privacy Centre appear automatically; log e-mail, phone or in-person ones with “Log a request”."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2.5 font-semibold">Request</th>
                  <th className="px-2 font-semibold">Type</th>
                  <th className="px-2 font-semibold">Requester</th>
                  <th className="px-2 font-semibold">Channel</th>
                  <th className="px-2 font-semibold">Received</th>
                  <th className="px-2 font-semibold">Due</th>
                  <th className="px-2 font-semibold">Status</th>
                  <th className="px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((r) => {
                  const d = daysLeft(r, today);
                  return (
                    <tr key={r.id} className={isOpen(r) && d < 0 ? "bg-rose-50/50" : ""}>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-navy-900 whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="px-2">
                        <Badge tone={TYPE_TONE[r.type] ?? "slate"}>{r.type}</Badge>
                      </td>
                      <td className="px-2">
                        <div className="font-semibold text-navy-900">
                          {r.first} {r.last}
                        </div>
                        <div className="text-[11.5px] text-slate-500">{r.email}</div>
                      </td>
                      <td className="px-2 text-slate-600">{r.channel}</td>
                      <td className="px-2 tnum whitespace-nowrap">{fmtDate(r.received)}</td>
                      <td className="px-2 whitespace-nowrap tnum">
                        {isOpen(r) ? (
                          <>
                            <div>{fmtDate(dueDate(r))}</div>
                            <Badge tone={d < 0 ? "red" : d <= 10 ? "amber" : "green"}>
                              {d < 0 ? `${-d}d overdue` : `${d}d left`}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-slate-500">
                            {r.completedAt ? `Done ${fmtDate(r.completedAt)}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2">
                        <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                      </td>
                      <td className="px-4 text-right">
                        <Btn
                          size="sm"
                          variant="ghost"
                          icon={isOpen(r) ? Icon.edit : Icon.eye}
                          aria-label={`${isOpen(r) ? "Handle" : "View"} ${r.id}`}
                          onClick={() => setOpen(r.id)}
                        >
                          {isOpen(r) ? "Handle" : "View"}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {sel && (
        <RequestDrawer
          r={sel}
          today={today}
          onClose={() => setOpen(null)}
          update={(fn) => update(sel.id, fn)}
        />
      )}
      {logging && (
        <LogRequestModal
          onClose={() => setLogging(false)}
          onSave={(r) => {
            const id = submitRequest(r, STAFF_NAME);
            setLogging(false);
            toast(`${r.type} request logged — due ${fmtDate(addMonths(today, 1))}.`, {
              tone: "success",
            });
            if (id) setOpen(id);
          }}
        />
      )}
    </div>
  );
}

function LogRequestModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (r: Omit<DsarRequest, "id" | "received" | "status" | "stepsDone" | "audit">) => void;
}) {
  const [type, setType] = useState<DsarType>("Access");
  const [channel, setChannel] = useState<DsarChannel>("E-mail");
  const [guestId, setGuestId] = useState("");
  const [f, setF] = useState({ first: "", last: "", email: "", phone: "", detail: "" });
  const pick = (id: string) => {
    setGuestId(id);
    const c = CUSTOMERS.find((x) => String(x.id) === id);
    if (c) setF({ ...f, first: c.first, last: c.last, email: c.email, phone: c.phone });
  };
  const ok = f.first.trim() && f.last.trim() && (f.email.trim() || f.phone.trim());
  return (
    <Modal
      open
      onClose={onClose}
      title="Log a data-subject request"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.check}
            disabled={!ok}
            onClick={() =>
              onSave({
                type,
                channel,
                guestId: guestId ? Number(guestId) : undefined,
                ...f,
                detail: f.detail || undefined,
              })
            }
          >
            Log request
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Type">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as DsarType)}
              options={DSAR_TYPES.map((t) => ({ v: t, l: `${t} · ${DSAR_ARTICLE[t]}` }))}
            />
          </Field>
          <Field label="Received by">
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value as DsarChannel)}
              options={DSAR_CHANNELS.filter((c) => c !== "Privacy Centre").map((c) => c)}
            />
          </Field>
        </div>
        <Field label="Existing guest (optional)">
          <Select
            value={guestId}
            onChange={(e) => pick(e.target.value)}
            options={[
              { v: "", l: "Not a known guest" },
              ...CUSTOMERS.map((c) => ({ v: String(c.id), l: `${c.first} ${c.last}` })),
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="First name">
            <Input value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} />
          </Field>
          <Field label="Surname">
            <Input value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label="What they asked for (optional)">
          <Input value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
        </Field>
        <div className="text-[12px] text-slate-500">
          The clock starts today. Collect only what you need to verify identity — don't copy ID
          documents.
        </div>
      </div>
    </Modal>
  );
}

function RequestDrawer({
  r,
  today,
  onClose,
  update,
}: {
  r: DsarRequest;
  today: string;
  onClose: () => void;
  update: (fn: (r: DsarRequest) => DsarRequest) => void;
}) {
  const { toast, setCrm } = useApp();
  const { recordConsent } = usePrivacy();
  const [method, setMethod] = useState<string>(VERIFY_METHODS[1]);
  const [ext, setExt] = useState<{ months: 1 | 2; reason: string } | null>(null);
  const [refuse, setRefuse] = useState<{
    ground: NonNullable<DsarRequest["refusal"]>["ground"];
    reason: string;
  } | null>(null);
  const [recips, setRecips] = useState<string[]>(r.notified ?? RECIPIENTS);
  const steps = dsarSteps(r.type);
  const working = r.status === "In progress" || r.status === "Extended";
  const d = daysLeft(r, today);
  const log = (what: string) => ({ at: stamp(), by: STAFF_NAME, what });
  const move = (status: DsarStatus, what: string, patch: Partial<DsarRequest> = {}) =>
    update((x) => ({ ...x, ...patch, status, audit: [...x.audit, log(what)] }));
  const doStep = () => {
    const s = steps[r.stepsDone];
    const notify = s.label.startsWith("Notify recipients");
    update((x) => ({
      ...x,
      stepsDone: x.stepsDone + 1,
      notified: notify ? recips : x.notified,
      audit: [...x.audit, log(`Step done · ${s.action}${notify ? ` (${recips.join(", ")})` : ""}`)],
    }));
  };
  const complete = () => {
    move("Completed", "Completed · reply sent to the requester", { completedAt: today });
    // The outcome lands on the guest's record where one exists.
    if (r.guestId && r.type === "Restriction")
      setCrm((c) => ({
        ...c,
        profiles: {
          ...c.profiles,
          [r.guestId as number]: { ...c.profiles[r.guestId as number], restricted: true },
        },
      }));
    if (r.guestId && r.type === "Objection")
      recordConsent(
        r.guestId,
        Object.fromEntries(CHANNEL_PURPOSES.map((p) => [p, false])),
        "Staff",
        `Objection ${r.id} upheld`,
      );
    toast(
      `${r.id} completed${r.type === "Restriction" ? " — the guest's account is now flagged “processing restricted”" : ""}.`,
      { tone: "success" },
    );
  };
  const exportAudit = () =>
    downloadCSV(
      `${r.id}-audit.csv`,
      ["When", "By", "What"],
      r.audit.map((a) => [a.at, a.by, a.what]),
    );
  const flow: DsarStatus[] = [
    "Received",
    "Verifying identity",
    "In progress",
    ...(r.extension ? (["Extended"] as DsarStatus[]) : []),
    r.status === "Refused" ? "Refused" : "Completed",
  ];
  return (
    <Drawer
      open
      onClose={onClose}
      label={`Request ${r.id}`}
      title={
        <div>
          <div className="font-display font-bold text-navy-900 text-lg flex items-center gap-2 flex-wrap">
            {r.id} · {r.type} <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
          </div>
          <div className="text-[12px] text-slate-500">
            {r.first} {r.last} · {r.email}
            {r.phone ? ` · ${r.phone}` : ""} · {r.channel}
          </div>
        </div>
      }
      footer={
        <div className="flex flex-wrap gap-2 justify-between w-full">
          <Btn variant="ghost" icon={Icon.download} onClick={exportAudit}>
            Export audit trail
          </Btn>
          {isOpen(r) && !refuse && (
            <Btn
              variant="ghost"
              icon={Icon.x}
              onClick={() =>
                setRefuse({
                  ground:
                    r.status === "Verifying identity"
                      ? "Identity not verified"
                      : "Manifestly unfounded",
                  reason: "",
                })
              }
            >
              Refuse…
            </Btn>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <ol
          aria-label="Status"
          className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold"
        >
          {flow.map((s, i) => {
            const idx = flow.indexOf(r.status);
            const st = i < idx ? "done" : i === idx ? "now" : "todo";
            return (
              <li key={s} className="flex items-center gap-1.5">
                {i > 0 && <Icon.chevR size={12} className="text-slate-300" />}
                <span
                  aria-current={st === "now" ? "step" : undefined}
                  className={`rounded-full px-2 py-0.5 ring-1 ${st === "now" ? "bg-navy-900 text-white ring-navy-900" : st === "done" ? "bg-teal-50 text-teal-800 ring-teal-200" : "bg-white text-slate-400 ring-slate-200"}`}
                >
                  {s}
                </span>
              </li>
            );
          })}
        </ol>

        <section
          className={`rounded-2xl ring-1 p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px] ${isOpen(r) && d < 0 ? "bg-rose-50 ring-rose-200" : "bg-slate-50 ring-slate-200"}`}
        >
          <div>
            <div className="text-slate-500">Received</div>
            <b className="text-navy-900">{fmtDate(r.received)}</b>
          </div>
          <div>
            <div className="text-slate-500">
              Due {r.extension ? `(extended +${r.extension.months} mo)` : "(one month)"}
            </div>
            <b className="text-navy-900">{fmtDate(dueDate(r))}</b>
            {isOpen(r) && (
              <div className={d < 0 ? "text-rose-700 font-semibold" : "text-slate-500"}>
                {d < 0 ? `${-d} days overdue` : `${d} days left`}
              </div>
            )}
          </div>
          <div>
            <div className="text-slate-500">Basis</div>
            <b className="text-navy-900">{DSAR_ARTICLE[r.type]} · Art. 12</b>
          </div>
          {r.detail && (
            <div className="col-span-full">
              <div className="text-slate-500">Asked for</div>
              <div className="text-navy-900">{r.detail}</div>
            </div>
          )}
          {r.extension && (
            <div className="col-span-full">
              <div className="text-slate-500">Extension</div>
              <div className="text-navy-900">
                {r.extension.reason} · notice sent {fmtDate(r.extension.noticeSentAt)}
              </div>
            </div>
          )}
        </section>

        {r.status === "Refused" && r.refusal && (
          <section className="rounded-2xl ring-1 ring-slate-300 bg-white p-3.5 text-[13px] space-y-1.5">
            <div className="font-semibold text-navy-900">Refused · {r.refusal.ground}</div>
            <div className="text-slate-700">{r.refusal.reason}</div>
            <div className="text-slate-600 text-[12px] flex items-start gap-1.5">
              <Icon.info size={13} className="shrink-0 mt-0.5" /> Requester informed{" "}
              {fmtDate(r.refusal.informedAt)}: “{COMPLAINT_NOTICE}”
            </div>
          </section>
        )}

        {r.status === "Received" && (
          <section className="space-y-2">
            <h3 className="font-semibold text-navy-900">Next: verify identity</h3>
            <p className="text-[12.5px] text-slate-600">
              Proportionate checks only — the account login or an e-mail link is usually enough.
            </p>
            <Btn
              variant="primary"
              icon={Icon.shieldCheck}
              onClick={() => move("Verifying identity", "Identity verification started")}
            >
              Start verification
            </Btn>
          </section>
        )}
        {r.status === "Verifying identity" && (
          <section className="space-y-2">
            <h3 className="font-semibold text-navy-900">Verify identity</h3>
            <div className="max-w-xs">
              <Field label="Method">
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  options={[...VERIFY_METHODS]}
                />
              </Field>
            </div>
            <Btn
              variant="primary"
              icon={Icon.check}
              onClick={() =>
                move("In progress", `Identity verified · ${method}`, {
                  verification: { method, by: STAFF_NAME, at: today },
                })
              }
            >
              Identity verified
            </Btn>
          </section>
        )}
        {r.verification && (
          <div className="text-[12px] text-slate-600 flex items-center gap-1.5">
            <Icon.shieldCheck size={13} className="text-teal-600" /> Verified by{" "}
            {r.verification.method.toLowerCase()} · {r.verification.by} ·{" "}
            {fmtDate(r.verification.at)}
          </div>
        )}

        {working && (
          <section>
            <h3 className="font-semibold text-navy-900 mb-2">Steps</h3>
            <ol className="space-y-1.5">
              {steps.map((s, i) => {
                const st = i < r.stepsDone ? "done" : i === r.stepsDone ? "active" : "todo";
                const notify = s.label.startsWith("Notify recipients");
                return (
                  <li
                    key={s.label}
                    className={`rounded-xl px-3 py-2.5 ring-1 ${st === "done" ? "ring-teal-200 bg-teal-50/60" : st === "active" ? "ring-slate-300 bg-white" : "ring-slate-100 bg-slate-50/50 opacity-60"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full grid place-items-center shrink-0 text-[11px] font-bold ${st === "done" ? "bg-teal-600 text-white" : st === "active" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500"}`}
                      >
                        {st === "done" ? <Icon.check size={12} /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-navy-900">{s.label}</div>
                        <div className="text-[11.5px] text-slate-500">{s.detail}</div>
                      </div>
                      {st === "active" && (
                        <Btn
                          size="sm"
                          variant="tint"
                          disabled={notify && !recips.length}
                          onClick={doStep}
                        >
                          {s.action}
                        </Btn>
                      )}
                    </div>
                    {st === "active" && notify && (
                      <fieldset className="mt-2 ml-9 flex flex-wrap gap-3 text-[12.5px]">
                        <legend className="sr-only">Recipients to notify</legend>
                        {RECIPIENTS.map((x) => (
                          <label key={x} className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={recips.includes(x)}
                              onChange={(e) =>
                                setRecips(
                                  e.target.checked ? [...recips, x] : recips.filter((y) => y !== x),
                                )
                              }
                            />{" "}
                            {x}
                          </label>
                        ))}
                      </fieldset>
                    )}
                    {st === "done" && notify && r.notified && (
                      <div className="ml-9 mt-1 text-[11.5px] text-teal-800">
                        Notified: {r.notified.join(", ")}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap gap-2 mt-3">
              <Btn
                variant="primary"
                icon={Icon.check}
                disabled={r.stepsDone < steps.length}
                title={r.stepsDone < steps.length ? "Finish every step first" : undefined}
                onClick={complete}
              >
                Complete request
              </Btn>
              {canExtend(r, today) && !ext && (
                <Btn
                  variant="ghost"
                  icon={Icon.clock}
                  onClick={() => setExt({ months: 1, reason: "" })}
                >
                  Extend deadline…
                </Btn>
              )}
            </div>
            {needsRecipientNotice(r.type) && (
              <div className="text-[11.5px] text-slate-500 mt-2">
                Art. 19: recipients who got this data must be told about the {r.type.toLowerCase()}{" "}
                unless impossible or disproportionate.
              </div>
            )}
          </section>
        )}

        {ext && (
          <section className="rounded-2xl ring-1 ring-amber-200 bg-amber-50/60 p-3.5 space-y-2">
            <h3 className="font-semibold text-navy-900">Extend the deadline (Art. 12(3))</h3>
            <div className="grid sm:grid-cols-[140px_1fr] gap-2">
              <Field label="By">
                <Select
                  value={String(ext.months)}
                  onChange={(e) => setExt({ ...ext, months: Number(e.target.value) as 1 | 2 })}
                  options={[
                    { v: "1", l: "1 month" },
                    { v: "2", l: "2 months" },
                  ]}
                />
              </Field>
              <Field label="Reason (sent to the requester)">
                <Input
                  value={ext.reason}
                  onChange={(e) => setExt({ ...ext, reason: e.target.value })}
                  placeholder="e.g. complexity — four years of records across systems"
                />
              </Field>
            </div>
            <div className="text-[12px] text-slate-600">
              New due date: <b>{fmtDate(addMonths(r.received, 1 + ext.months))}</b> · the notice
              goes out today, inside the first month.
            </div>
            <div className="flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => setExt(null)}>
                Cancel
              </Btn>
              <Btn
                size="sm"
                variant="primary"
                disabled={ext.reason.trim().length < 10}
                title={ext.reason.trim().length < 10 ? "Give a reason (10+ characters)" : undefined}
                onClick={() => {
                  move(
                    "Extended",
                    `Extended by ${ext.months} month${ext.months > 1 ? "s" : ""} · notice sent to the requester · ${ext.reason}`,
                    { extension: { months: ext.months, reason: ext.reason, noticeSentAt: today } },
                  );
                  setExt(null);
                  toast(
                    `Extended — new due date ${fmtDate(addMonths(r.received, 1 + ext.months))}; notice sent.`,
                    { tone: "success" },
                  );
                }}
              >
                Extend &amp; send notice
              </Btn>
            </div>
          </section>
        )}

        {refuse && (
          <section className="rounded-2xl ring-1 ring-slate-300 bg-white p-3.5 space-y-2">
            <h3 className="font-semibold text-navy-900">Refuse the request (Art. 12(5))</h3>
            <div className="grid sm:grid-cols-[200px_1fr] gap-2">
              <Field label="Ground">
                <Select
                  value={refuse.ground}
                  onChange={(e) =>
                    setRefuse({ ...refuse, ground: e.target.value as typeof refuse.ground })
                  }
                  options={["Manifestly unfounded", "Excessive", "Identity not verified"]}
                />
              </Field>
              <Field label="Reason (sent to the requester)">
                <Input
                  value={refuse.reason}
                  onChange={(e) => setRefuse({ ...refuse, reason: e.target.value })}
                />
              </Field>
            </div>
            <div className="text-[12px] text-slate-600">
              The reply includes: “{COMPLAINT_NOTICE}”
            </div>
            <div className="flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => setRefuse(null)}>
                Cancel
              </Btn>
              <Btn
                size="sm"
                variant="danger"
                disabled={refuse.reason.trim().length < 10}
                onClick={() => {
                  move(
                    "Refused",
                    `Refused · ${refuse.ground} · requester informed of complaint and judicial remedies`,
                    { refusal: { ...refuse, informedAt: today } },
                  );
                  setRefuse(null);
                }}
              >
                Refuse &amp; inform
              </Btn>
            </div>
          </section>
        )}

        <section>
          <h3 className="font-semibold text-navy-900 mb-1.5">Audit trail</h3>
          <ul className="space-y-1">
            {[...r.audit].reverse().map((a, i) => (
              <li
                key={i}
                className="flex gap-2 text-[12.5px] rounded-lg ring-1 ring-slate-100 px-2.5 py-1.5"
              >
                <span className="text-slate-500 tnum shrink-0">{a.at.replace("T", " ")}</span>
                <span className="text-slate-500 shrink-0">{a.by}</span>
                <span className="text-navy-900">{a.what}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}
