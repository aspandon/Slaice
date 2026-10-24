import { useId, useMemo, useState } from "react";
import { useTenantFeatures } from "../../lib/useFeatures";
import { Icon, type IconRenderer } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  PageHead,
  Select,
  StatusBadge,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { Masked } from "../tenant/ViewAs";
import { useUrlState } from "../../lib/useUrlState";
import { opsNow, useBookingOps, type OpsBooking } from "../../lib/useBookingOps";
import {
  DEFAULT_RULES,
  OUTCOME_LABEL,
  REQUEST_REASONS,
  ageLabel,
  policyCovers,
  refundEligibility,
  refundOutcome,
  validateRefundRequest,
  type RefundEligibility,
  type RefundOutcome,
  type RefundPolicy,
  type RefundRequest,
  type RequestErrors,
} from "../../domain/bookingOps";

/* ============ Call Center · Refund requests (AENR-719) ============
   The agent finds the caller's booking, sees what was paid and asks for a full
   or partial refund with a reason. The request joins the manager's
   Refunds › Needs decision queue (the same bookingOps.refunds in the app
   store), and the decision flows back to "My requests" as it is made. */

const digits = (s: string) => s.replace(/\D/g, "");
/** Ref, guest name or phone — phone matches on digits, so "+30 69…" and "69…" both work. */
function matches(b: OpsBooking, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return false;
  const d = digits(s);
  return (
    b.id.toLowerCase().includes(s.replace(/^#?/, "")) ||
    `${b.who} ${b.surname}`.toLowerCase().includes(s) ||
    (d.length >= 4 && digits(b.phone).includes(d))
  );
}

const OUTCOME_STYLE: Record<RefundOutcome, { tone: string; icon: IconRenderer }> = {
  pending: { tone: "warning", icon: Icon.clock },
  approved: { tone: "success", icon: Icon.checkCircle },
  partial: { tone: "info", icon: Icon.refund },
  declined: { tone: "critical", icon: Icon.x },
};
function OutcomeBadge({ r }: { r: RefundRequest }) {
  const o = refundOutcome(r);
  const { tone, icon: I } = OUTCOME_STYLE[o];
  return (
    <Badge tone={tone}>
      <I size={12} aria-hidden /> {OUTCOME_LABEL[o]}
    </Badge>
  );
}

const fmtAt = (at: string) =>
  new Date(`${at.slice(0, 16)}:00`).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function CallCenterRefunds() {
  const { toast, bookingOps } = useApp();
  // Off for the tenant (AENR-677) = no policy: every request waits for the manager.
  const { feature } = useTenantFeatures();
  const policy = feature("refunds.autoApprove") ? (bookingOps.rules?.refunds ?? DEFAULT_RULES.refunds) : { ...DEFAULT_RULES.refunds, on: false };
  const ops = useBookingOps();
  const [q, setQ] = useState("");
  // The chosen booking lives in the URL, so a refresh keeps the caller's booking open.
  const [pickedId, setPickedId] = useUrlState("booking", "");
  const picked = ops.bookings.find((b) => b.id === pickedId) ?? null;
  const results = useMemo(
    () => (picked ? [] : ops.bookings.filter((b) => matches(b, q)).slice(0, 6)),
    [ops.bookings, q, picked],
  );
  const mine = ops.refunds
    .filter((r) => r.requestedBy === ops.requester)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const [justSent, setJustSent] = useState<string | null>(null);
  const searchId = useId();

  const pick = (b: OpsBooking) => {
    setPickedId(b.id);
    setQ("");
  };
  const clear = () => setPickedId("");

  return (
    <div className="animate-fade-up">
      <PageHead
        daily
        sub="Find the caller's booking, ask for a full or partial refund with a reason, and follow the manager's decision. Requests go to Refunds › Needs decision."
      />
      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4 items-start">
        <Card className="p-4 sm:p-5">
          <h2 className="font-display font-bold text-navy-900 text-lg mb-3">New request</h2>
          {picked ? (
            <RequestForm
              key={picked.id}
              b={picked}
              eligibility={refundEligibility(picked, ops.refunds)}
              policy={policy}
              onChange={clear}
              onSubmit={(amount, reason, note) => {
                const covered = policyCovers(policy, {
                  amount,
                  reason,
                  status: "pending",
                });
                ops.requestRefund(picked, amount, reason, note || undefined);
                setJustSent(picked.id);
                toast(
                  covered
                    ? `Refund of €${amount} for ${picked.id} sent — the refund policy approves it automatically.`
                    : `Refund of €${amount} for ${picked.id} sent — a manager decides it in Refunds.`,
                  { tone: "success" },
                );
                clear();
              }}
            />
          ) : (
            <div>
              <Field
                label="Find the booking"
                hint="Booking ref (e.g. BK-10419), guest name or phone number."
              >
                <div className="relative">
                  <Icon.search
                    size={16}
                    aria-hidden
                    className="pointer-events-none absolute z-10 left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <Input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ref, name or phone"
                    className="pl-9"
                    aria-controls={searchId}
                  />
                </div>
              </Field>
              <div id={searchId} aria-live="polite" className="mt-3">
                {q.trim().length < 2 ? (
                  <p className="text-[12.5px] text-slate-500">
                    Type at least two characters to search every booking.
                  </p>
                ) : results.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Icon.search}
                    title="No booking found"
                    body={`Nothing matches “${q.trim()}”. Check the ref with the caller, or try their surname or phone.`}
                  />
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200 bg-white/70 overflow-hidden">
                    {results.map((b) => {
                      const el = refundEligibility(b, ops.refunds);
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => pick(b)}
                            className="w-full min-h-[52px] text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="font-semibold text-navy-900">{b.id}</span>
                                <span className="text-[13px] text-slate-700">
                                  {b.who} {b.surname}
                                </span>
                              </div>
                              <div className="text-[12px] text-slate-500 truncate">
                                {b.date} · {b.channel} · <span className="tnum">€{b.amount}</span>
                                {!el.ok && el.why === "pending" && " · request pending"}
                              </div>
                            </div>
                            <StatusBadge status={b.status} />
                            <Icon.chevR size={16} aria-hidden className="text-slate-500 shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="font-display font-bold text-navy-900 text-lg">
              My requests <span className="text-slate-500 tnum">{mine.length}</span>
            </h2>
            {mine.length > 0 && (
              <span className="text-[12px] text-slate-500 tnum">
                {mine.filter((r) => r.status === "pending").length} pending
              </span>
            )}
          </div>
          {mine.length === 0 ? (
            <EmptyState
              compact
              icon={Icon.inbox}
              title="No requests yet"
              body="Refunds you ask for show here with the manager's decision — Pending until it is made."
            />
          ) : (
            <ul className="space-y-2.5" aria-live="polite">
              {mine.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-2xl ring-1 p-3.5 bg-white/80 transition ${justSent === r.bookingId && r.status === "pending" ? "ring-teal-400 shadow-glow" : "ring-slate-200"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-navy-900">
                        {r.bookingId ?? r.tx} · {r.who}
                      </div>
                      <div className="text-[12.5px] text-slate-600">
                        <span className="tnum">€{r.amount}</span> · {r.reason} · sent{" "}
                        {ageLabel(r.requestedAt, opsNow())} ago
                      </div>
                    </div>
                    <OutcomeBadge r={r} />
                  </div>
                  {r.note && (
                    <p className="mt-1.5 text-[12.5px] text-slate-700 italic">“{r.note}”</p>
                  )}
                  <p className="mt-1.5 text-[12.5px] text-slate-600">{decisionLine(r)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function decisionLine(r: RefundRequest): string {
  const when = r.decidedAt ? ` · ${fmtAt(r.decidedAt)}` : "";
  switch (refundOutcome(r)) {
    case "pending":
      return "Waiting for a manager — decided within 48 h. Tell the guest they'll get an e-mail.";
    case "approved":
      return `€${r.refundAmount ?? r.amount} refunded to the guest's card by ${r.decidedBy ?? "a manager"}${when}.`;
    case "partial":
      return `€${r.refundAmount} of €${r.amount} refunded by ${r.decidedBy ?? "a manager"}${when}.`;
    case "declined":
      return `Declined by ${r.decidedBy ?? "a manager"}${when} — ${r.declineReason ?? "no reason given"}.`;
  }
}

const BLOCKED: Record<"refunded" | "unpaid" | "cancelled", { title: string; body: string }> = {
  refunded: {
    title: "Already refunded",
    body: "This booking has been refunded — there is nothing left to refund.",
  },
  cancelled: {
    title: "Cancelled, not charged",
    body: "The booking was cancelled without a charge, so there is nothing to refund.",
  },
  unpaid: {
    title: "Not paid yet",
    body: "Nothing has been paid for this booking. Only paid bookings can be refunded.",
  },
};

function RequestForm({
  b,
  eligibility,
  policy,
  onChange,
  onSubmit,
}: {
  b: OpsBooking;
  eligibility: RefundEligibility;
  policy: RefundPolicy;
  onChange: () => void;
  onSubmit: (amount: number, reason: string, note: string) => void;
}) {
  const [amount, setAmount] = useState(String(b.amount));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const errors: RequestErrors = validateRefundRequest({ amount, paid: b.amount, reason, note });
  const shown: RequestErrors = tried ? errors : {};
  const n = Number(amount);
  const partial = Number.isFinite(n) && n > 0 && n < b.amount;
  const covered =
    !errors.amount && !!reason && policyCovers(policy, { amount: n, reason, status: "pending" });
  const ids = { amount: useId(), reason: useId(), note: useId() };

  return (
    <div className="space-y-4">
      {/* What was paid — the agent reads it back to the caller. */}
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white/80 p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold text-navy-900">{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <div className="text-[13px] text-slate-700 mt-0.5">
              {b.who} {b.surname}
              {b.phone && (
                <span className="text-slate-500 tnum">
                  {" "}
                  · <Masked value={b.phone} />
                </span>
              )}
            </div>
          </div>
          <Btn size="sm" variant="ghost" icon={Icon.search} onClick={onChange}>
            Change booking
          </Btn>
        </div>
        <dl className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[12.5px]">
          <div>
            <dt className="text-slate-500">Visit</dt>
            <dd className="font-semibold text-navy-900">{b.date}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Channel</dt>
            <dd className="font-semibold text-navy-900">{b.channel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Paid</dt>
            <dd className="font-semibold text-navy-900 tnum">€{b.amount}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-slate-500">Items</dt>
            <dd className="text-navy-900">{b.items.join(" · ") || "—"}</dd>
          </div>
        </dl>
      </div>

      {!eligibility.ok ? (
        eligibility.why === "pending" ? (
          <div
            role="status"
            className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-3.5 text-[13px] text-amber-900 flex gap-2.5"
          >
            <Icon.clock size={18} aria-hidden className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">A request is already waiting for this booking</div>
              <p className="mt-0.5">
                {eligibility.request.id} · €{eligibility.request.amount} ·{" "}
                {eligibility.request.reason} — sent by {eligibility.request.requestedBy}{" "}
                {ageLabel(eligibility.request.requestedAt, opsNow())} ago. Only one request per
                booking can be open, so a manager decides that one first. If the guest has something
                to add, put it in a note on the booking.
              </p>
            </div>
          </div>
        ) : (
          <div
            role="status"
            className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3.5 text-[13px] text-slate-700 flex gap-2.5"
          >
            <Icon.alert size={18} aria-hidden className="shrink-0 mt-0.5 text-slate-500" />
            <div>
              <div className="font-semibold text-navy-900">{BLOCKED[eligibility.why].title}</div>
              <p className="mt-0.5">{BLOCKED[eligibility.why].body}</p>
            </div>
          </div>
        )
      ) : (
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (Object.keys(errors).length === 0)
              onSubmit(Math.round(n * 100) / 100, reason, note.trim());
          }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Field label={`Amount to refund (€, up to ${b.amount})`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  max={b.amount}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={!!shown.amount}
                  aria-describedby={shown.amount ? ids.amount : undefined}
                />
              </Field>
              <div className="mt-1 flex items-center gap-2 text-[11.5px]">
                {shown.amount ? (
                  <span id={ids.amount} className="text-rose-700 font-medium">
                    {shown.amount}
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {partial
                      ? `Partial refund — €${(b.amount - n).toFixed(2).replace(/\.00$/, "")} stays paid.`
                      : "Full refund."}
                  </span>
                )}
                {partial && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(b.amount))}
                    className="ml-auto font-semibold text-teal-700 hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    Full €{b.amount}
                  </button>
                )}
              </div>
            </div>
            <div>
              <Field label="Reason">
                <Select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-invalid={!!shown.reason}
                  aria-describedby={shown.reason ? ids.reason : undefined}
                >
                  <option value="" disabled>
                    Choose a reason…
                  </option>
                  {REQUEST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              {shown.reason && (
                <div id={ids.reason} className="mt-1 text-[11.5px] text-rose-700 font-medium">
                  {shown.reason}
                </div>
              )}
            </div>
          </div>
          <div>
            <Field
              label={
                reason === "Other" ? "Note for the manager" : "Note for the manager (optional)"
              }
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="e.g. Guest left at 12:00 — strong wind, red flag raised."
                aria-invalid={!!shown.note}
                aria-describedby={shown.note ? ids.note : undefined}
                className="glass-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-teal-500/70"
              />
            </Field>
            {shown.note && (
              <div id={ids.note} className="mt-1 text-[11.5px] text-rose-700 font-medium">
                {shown.note}
              </div>
            )}
          </div>
          <p className="text-[12px] text-slate-600 flex gap-1.5">
            <Icon.info size={14} aria-hidden className="shrink-0 mt-0.5 text-slate-500" />
            {covered
              ? "The refund policy covers this one — it is approved as soon as you send it."
              : "A manager approves or declines it in Refunds; the guest is e-mailed either way."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Btn type="submit" variant="primary" icon={Icon.send}>
              Send request{Number.isFinite(n) && n > 0 && n <= b.amount ? ` · €${n}` : ""}
            </Btn>
            <Btn variant="ghost" onClick={onChange}>
              Cancel
            </Btn>
          </div>
        </form>
      )}
    </div>
  );
}
