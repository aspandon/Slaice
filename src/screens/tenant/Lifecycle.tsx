import { useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Toggle,
} from "../../components/ui";
import { usePlatform } from "../../lib/usePlatform";
import { addDays, fmtDay } from "../../domain/period";
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  canTransition,
  type Lifecycle,
  type Suspension,
  type TenantRecord,
} from "../../domain/tenants";
import { SectionFrame, type SectionProps } from "./kit";

/* ============ Danger zone · tenant lifecycle (AENR-518) ============
   Suspend / pause / reactivate with the customer impact shown first, and a
   guided offboarding: export → settle money → disconnect → revoke access →
   retention window (restorable) → irreversible deletion with a certificate.
   Every transition goes through canTransition and the Audit log; irreversible
   steps need a Slaice Admin and the tenant's name typed. */

const OFF_STEPS = [
  "Confirm reason & date",
  "Export data to the owner",
  "Settle money",
  "Disconnect integrations",
  "Revoke access",
  "Retention window",
  "Delete & certificate",
];
const CATS: Suspension["category"][] = [
  "Non-payment",
  "Risk / fraud",
  "Compliance",
  "Tenant request",
  "Other",
];

export function DangerZone({ t }: SectionProps) {
  const { platform, setPlatform, updateTenant, toast, today, actor } = usePlatform();
  const [modal, setModal] = useState<
    "suspend" | "pause" | "reactivate" | "offboard" | "delete" | null
  >(null);
  const admin = platform.role === "admin";
  const move = (
    to: Lifecycle,
    reason: string,
    category?: string,
    patch: Partial<TenantRecord> = {},
  ) => {
    if (!canTransition(t.lifecycle, to))
      return toast(`Not allowed: ${LIFECYCLE_LABEL[t.lifecycle]} → ${LIFECYCLE_LABEL[to]}.`, {
        tone: "warn",
      });
    updateTenant(
      t.id,
      (x) => ({
        ...x,
        ...patch,
        lifecycle: to,
        history: [
          ...x.history,
          { from: x.lifecycle, to, reason, category, actor, at: new Date().toISOString() },
        ],
      }),
      {
        section: "Lifecycle",
        change: `${LIFECYCLE_LABEL[t.lifecycle]} → ${LIFECYCLE_LABEL[to]}`,
        reason,
      },
    );
  };
  const clock = (days: number) =>
    setPlatform((p) => ({ ...p, clockDays: days ? p.clockDays + days : 0 }));
  const last = t.history[t.history.length - 1];
  const graceOver = !!t.offboarding?.deleteOn && t.offboarding.deleteOn <= today;
  return (
    <SectionFrame
      title="Danger zone"
      sub="Suspend, reactivate or offboard — customer impact first, everything logged."
    >
      <Card className="p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-slate-600">Status</span>
          <Badge tone={LIFECYCLE_TONE[t.lifecycle]}>{LIFECYCLE_LABEL[t.lifecycle]}</Badge>
          {t.lifecycle === "offboarding" && t.offboarding?.deleteOn && (
            <span className="text-[13px] font-semibold text-amber-800">
              Offboarding · deletes on {fmtDay(t.offboarding.deleteOn)}
            </span>
          )}
          {last && (
            <span className="text-[12px] text-slate-500">
              since {new Date(last.at).toLocaleDateString("en-GB")} · {last.actor} · “{last.reason}”
            </span>
          )}
        </div>
        {t.suspension && t.lifecycle === "suspended_by_slaice" && (
          <div className="rounded-xl bg-rose-50 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px] text-rose-900">
            {t.suspension.category} · online bookings{" "}
            {t.suspension.blockOnline ? "blocked" : "open"} · cashier{" "}
            {t.suspension.blockCashier ? "blocked" : "open"} · staff sign-in{" "}
            {t.suspension.blockStaff ? "blocked" : "allowed"} · customers see “
            {t.suspension.message}”
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {canTransition(t.lifecycle, "suspended_by_slaice") && (
            <Btn variant="danger" icon={Icon.lock} onClick={() => setModal("suspend")}>
              Suspend
            </Btn>
          )}
          {canTransition(t.lifecycle, "paused_by_tenant") && (
            <Btn variant="outline" onClick={() => setModal("pause")}>
              Pause (tenant request)
            </Btn>
          )}
          {t.lifecycle !== "offboarding" &&
            canTransition(t.lifecycle, "live") &&
            t.lifecycle !== "onboarding" && (
              <Btn variant="teal" icon={Icon.check} onClick={() => setModal("reactivate")}>
                Reactivate
              </Btn>
            )}
          {canTransition(t.lifecycle, "offboarding") && (
            <Btn
              variant="outline"
              className="text-rose-700"
              icon={Icon.logout}
              onClick={() => setModal("offboard")}
            >
              Offboard…
            </Btn>
          )}
          {t.lifecycle === "offboarding" && !graceOver && (
            <Btn
              variant="teal"
              onClick={() => {
                move("live", "Restored during the grace period", undefined, {
                  offboarding: undefined,
                });
                toast(`${t.name} restored.`, { tone: "success" });
              }}
            >
              Restore tenant
            </Btn>
          )}
          {t.lifecycle === "offboarding" && graceOver && (
            <Btn
              variant="danger"
              icon={Icon.trash}
              disabled={!admin}
              onClick={() => setModal("delete")}
            >
              Delete permanently…
            </Btn>
          )}
          {t.lifecycle === "closed" && t.offboarding?.certificate && (
            <Btn variant="outline" icon={Icon.download} onClick={() => certificateFile(t)}>
              Deletion certificate
            </Btn>
          )}
        </div>
        {!admin && (
          <p className="text-[12px] text-slate-500">
            Irreversible steps need the Slaice Admin role.
          </p>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold text-navy-900 mb-1">History</h3>
        {t.history.length === 0 ? (
          <p className="text-[13px] text-slate-500">No transitions yet.</p>
        ) : (
          <ol className="text-[12.5px] space-y-1">
            {[...t.history].reverse().map((h, i) => (
              <li key={i}>
                {new Date(h.at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {LIFECYCLE_LABEL[h.from]} → <b>{LIFECYCLE_LABEL[h.to]}</b>
                {h.category ? ` · ${h.category}` : ""} · “{h.reason}” · {h.actor}
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card className="p-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        <Icon.clock size={14} /> Demo clock: <b>{fmtDay(today)}</b>
        {platform.clockDays ? ` (+${platform.clockDays} days)` : ""}
        {[7, 30, 90].map((d) => (
          <Btn key={d} size="sm" variant="ghost" onClick={() => clock(d)}>
            +{d} days
          </Btn>
        ))}
        {platform.clockDays !== 0 && (
          <Btn size="sm" variant="ghost" onClick={() => clock(0)}>
            Reset
          </Btn>
        )}
      </Card>

      {modal === "suspend" && (
        <SuspendModal
          t={t}
          today={today}
          onClose={() => setModal(null)}
          onConfirm={(s, reason) => {
            if (s.from && s.from > today) {
              updateTenant(t.id, (x) => ({ ...x, suspension: s }), {
                section: "Lifecycle",
                change: `Suspension scheduled for ${s.from}`,
                reason,
              });
              toast(
                `Suspension scheduled for ${fmtDay(s.from)} — notice e-mailed to the owner (demo).`,
              );
            } else {
              move("suspended_by_slaice", reason, s.category, { suspension: s });
              toast(
                `${t.name} suspended — ${s.blockOnline ? "online bookings blocked" : "online open"}; existing bookings stay valid.`,
                { tone: "warn" },
              );
            }
            setModal(null);
          }}
        />
      )}
      {modal === "pause" && (
        <SimpleReason
          title={`Pause ${t.name} (tenant request)`}
          body="E.g. off-season. The customer site shows the season dates; nothing is deleted."
          confirm="Pause"
          onClose={() => setModal(null)}
          onConfirm={(r) => {
            move("paused_by_tenant", r);
            setModal(null);
          }}
        />
      )}
      {modal === "reactivate" && (
        <SimpleReason
          title={`Reactivate ${t.name}`}
          body={
            t.suspension
              ? `Restores: ${[t.suspension.blockOnline && "online bookings", t.suspension.blockCashier && "cashier sales", t.suspension.blockStaff && "staff sign-in"].filter(Boolean).join(", ") || "normal service"}.`
              : "Restores normal service."
          }
          confirm="Reactivate"
          onClose={() => setModal(null)}
          onConfirm={(r) => {
            move("live", r, undefined, { suspension: undefined });
            toast(`${t.name} reactivated.`, { tone: "success" });
            setModal(null);
          }}
        />
      )}
      {modal === "offboard" && (
        <OffboardWizard
          t={t}
          today={today}
          admin={admin}
          onClose={() => setModal(null)}
          onRetention={(reason, days) => {
            move("offboarding", reason, "Offboarding", {
              offboarding: {
                step: 6,
                started: today,
                retentionDays: days,
                deleteOn: addDays(today, days),
                done: OFF_STEPS.map((_, i) => i < 6),
              },
              supportGrant: undefined,
            });
            toast(
              `${t.name} is offboarding — deletes on ${fmtDay(addDays(today, days))}; restorable until then.`,
            );
            setModal(null);
          }}
        />
      )}
      {modal === "delete" && (
        <TypeName
          t={t}
          title="Delete permanently"
          body="Deletes the tenant's data. Invoices and myDATA records are kept for the statutory period (5 years). This can't be undone."
          confirm="Delete & issue certificate"
          onClose={() => setModal(null)}
          onConfirm={(reason) => {
            move("closed", reason, "Offboarding", {
              offboarding: {
                ...(t.offboarding as NonNullable<TenantRecord["offboarding"]>),
                done: OFF_STEPS.map(() => true),
                certificate: new Date().toISOString(),
              },
            });
            toast(`${t.name} closed — deletion certificate ready.`, { tone: "success" });
            setModal(null);
          }}
        />
      )}
    </SectionFrame>
  );
}

function certificateFile(t: TenantRecord) {
  const text = [
    `DELETION CERTIFICATE — ${t.legalName} (${t.vatNo})`,
    `Tenant ID: ${t.id} · Issued: ${t.offboarding?.certificate ?? ""}`,
    "",
    "Deleted: bookings, customer profiles and consents, staff accounts, settings, maps, media, messaging history.",
    "Retained (legal obligation): ΑΠΥ / ΤΠΥ / credit documents and myDATA MARK records — 5 years; Slaice invoices — 10 years.",
    `Retention window ended: ${t.offboarding?.deleteOn ?? ""}`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `deletion-certificate-${t.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SuspendModal({
  t,
  today,
  onClose,
  onConfirm,
}: {
  t: TenantRecord;
  today: string;
  onClose: () => void;
  onConfirm: (s: Suspension, reason: string) => void;
}) {
  const [s, setS] = useState<Suspension>({
    category: t.invoices.some((i) => i.status === "Overdue") ? "Non-payment" : "Other",
    note: "",
    blockOnline: true,
    blockCashier: false,
    blockStaff: false,
    message: "Bookings are temporarily unavailable — existing bookings remain valid.",
    from: today,
  });
  const [typed, setTyped] = useState("");
  const ok = s.note.trim().length >= 5 && typed.trim() === t.name;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Suspend ${t.name}`}
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            disabled={!ok}
            onClick={() => onConfirm(s, `${s.category}: ${s.note.trim()}`)}
          >
            Suspend
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Reason">
            <Select
              value={s.category}
              onChange={(e) => setS({ ...s, category: e.target.value as Suspension["category"] })}
              options={CATS}
            />
          </Field>
          <Field label="Starts">
            <Select
              value={s.from === today ? "now" : "7"}
              onChange={(e) =>
                setS({ ...s, from: e.target.value === "now" ? today : addDays(today, 7) })
              }
              options={[
                { v: "now", l: "Now" },
                { v: "7", l: "In 7 days (notice to owner)" },
              ]}
            />
          </Field>
        </div>
        <Field label="Note (required)">
          <Input
            value={s.note}
            onChange={(e) => setS({ ...s, note: e.target.value })}
            placeholder="e.g. September invoice unpaid after day-14 reminder"
          />
        </Field>
        <div className="grid sm:grid-cols-3 gap-2">
          <Toggle
            on={s.blockOnline}
            onChange={(v) => setS({ ...s, blockOnline: v })}
            label="Block new online bookings"
          />
          <Toggle
            on={s.blockCashier}
            onChange={(v) => setS({ ...s, blockCashier: v })}
            label="Block cashier sales"
          />
          <Toggle
            on={s.blockStaff}
            onChange={(v) => setS({ ...s, blockStaff: v })}
            label="Block staff sign-in"
          />
        </div>
        <Field label="Message on the customer site">
          <Input value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} />
        </Field>
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-[12.5px]">
          <b>Customer impact:</b>{" "}
          {s.blockOnline
            ? `the site shows “${s.message}” and takes no new bookings`
            : "the site keeps taking bookings"}
          ; existing paid bookings and tickets stay valid at the gate.
        </div>
        <Field label={`Type “${t.name}” to confirm`}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function SimpleReason({
  title,
  body,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirm: string;
  onClose: () => void;
  onConfirm: (r: string) => void;
}) {
  const [r, setR] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" disabled={r.trim().length < 5} onClick={() => onConfirm(r.trim())}>
            {confirm}
          </Btn>
        </>
      }
    >
      <p className="text-sm text-slate-600 mb-3">{body}</p>
      <Field label="Reason (Audit log)">
        <Input value={r} onChange={(e) => setR(e.target.value)} />
      </Field>
    </Modal>
  );
}

function TypeName({
  t,
  title,
  body,
  confirm,
  onClose,
  onConfirm,
}: {
  t: TenantRecord;
  title: string;
  body: string;
  confirm: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [r, setR] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            disabled={typed.trim() !== t.name || r.trim().length < 5}
            onClick={() => onConfirm(r.trim())}
          >
            {confirm}
          </Btn>
        </>
      }
    >
      <p className="text-sm text-slate-600 mb-3">{body}</p>
      <div className="space-y-2">
        <Field label="Reason">
          <Input value={r} onChange={(e) => setR(e.target.value)} />
        </Field>
        <Field label={`Type “${t.name}” to confirm`}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* Guided offboarding: steps 1–5 run as simulated jobs (step 3 can fail), step 6 starts the retention window. */
function OffboardWizard({
  t,
  today,
  admin,
  onClose,
  onRetention,
}: {
  t: TenantRecord;
  today: string;
  admin: boolean;
  onClose: () => void;
  onRetention: (reason: string, days: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [failSettle, setFailSettle] = useState(true);
  const [days, setDays] = useState(30);
  const [typed, setTyped] = useState("");
  const pendingPayout = failSettle; // demo: the first run finds a pending payout, the retry succeeds
  const run = () => {
    setBusy(true);
    setErr("");
    window.setTimeout(() => {
      setBusy(false);
      if (step === 2 && pendingPayout) {
        setFailSettle(false);
        return setErr(
          "A Stripe payout of €412.30 is still pending (T+2). Wait for it to land, then retry.",
        );
      }
      setStep((s) => s + 1);
    }, 900);
  };
  const detail = [
    "",
    `Export of bookings, customers, invoices and settings e-mailed to ${t.contacts[0].email} (link valid 7 days).`,
    "Outstanding Slaice invoices, pending Stripe payouts and open refunds must be settled.",
    "Stripe Connect, myDATA, messaging channels and the custom domain are disconnected.",
    "All tenant staff and Slaice support grants are revoked.",
    "",
    "",
  ];
  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={`Offboard ${t.name}`}
      wide
      footer={
        <Btn variant="ghost" disabled={busy} onClick={onClose}>
          Close
        </Btn>
      }
    >
      <ol className="space-y-2">
        {OFF_STEPS.map((label, i) => {
          const st = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li
              key={label}
              className={`rounded-xl px-3 py-2.5 ring-1 ${st === "done" ? "ring-teal-200 bg-teal-50/60" : st === "active" ? "ring-slate-300 bg-white" : "ring-slate-100 bg-slate-50/60 opacity-70"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-lg grid place-items-center text-[12px] font-bold ${st === "done" ? "bg-teal-600 text-white" : st === "active" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {st === "done" ? <Icon.check size={13} /> : i + 1}
                </span>
                <span className="font-semibold text-navy-900 text-[13.5px]">{label}</span>
                {st === "done" && <Badge tone="green">Done</Badge>}
              </div>
              {st === "active" && (
                <div className="mt-2 pl-8 space-y-2 text-[13px]">
                  {i === 0 && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Field label="Reason">
                        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                      </Field>
                      <Field label="Effective date">
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                      </Field>
                    </div>
                  )}
                  {detail[i] && <p className="text-slate-600">{detail[i]}</p>}
                  {i === 2 && (
                    <label className="flex items-center gap-2 text-[12px] text-slate-500">
                      <input
                        type="checkbox"
                        className="accent-teal-600"
                        checked={failSettle}
                        onChange={(e) => setFailSettle(e.target.checked)}
                      />{" "}
                      Demo: a payout is still pending
                    </label>
                  )}
                  {i === 5 && (
                    <>
                      <Field label="Retention window">
                        <Select
                          value={String(days)}
                          onChange={(e) => setDays(Number(e.target.value))}
                          options={[
                            { v: "30", l: "30 days" },
                            { v: "90", l: "90 days" },
                          ]}
                        />
                      </Field>
                      <p className="text-slate-600">
                        The tenant stays “Offboarding” and can be restored until{" "}
                        {fmtDay(addDays(today, days))}; after that deletion is irreversible. Legal /
                        tax records are kept for the statutory period.
                      </p>
                      <Field label={`Type “${t.name}” to confirm`}>
                        <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
                      </Field>
                    </>
                  )}
                  {err && (
                    <div
                      role="alert"
                      className="rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2"
                    >
                      {err}
                    </div>
                  )}
                  {i < 5 && (
                    <Btn
                      size="sm"
                      variant="primary"
                      loading={busy}
                      disabled={i === 0 && reason.trim().length < 5}
                      onClick={run}
                    >
                      {busy ? "Working…" : err ? "Retry" : i === 0 ? "Confirm" : "Run step"}
                    </Btn>
                  )}
                  {i === 5 && (
                    <Btn
                      size="sm"
                      variant="danger"
                      disabled={!admin || typed.trim() !== t.name}
                      onClick={() => onRetention(reason.trim() || "Offboarding", days)}
                    >
                      Start retention window
                    </Btn>
                  )}
                  {busy && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Spinner size={12} /> simulated job
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[12px] text-slate-500">
        Step 7 runs automatically when the retention window ends: the data is deleted, the tenant
        becomes Closed and the deletion certificate is issued.
      </p>
    </Modal>
  );
}
