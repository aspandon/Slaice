import { useMemo, useState } from "react";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Badge, Btn, Drawer, Field, Input, Select, StatusBadge, ActionsMenu } from "../../components/ui";
import { QR } from "../../components/charts";
import { SendModal } from "../../components/SendModal";
import { useApp } from "../../app/store";
import { useLiveSlots } from "../../lib/useLiveSlots";
import { useBookingOps, opsNow, zoneByName, type OpsBooking } from "../../lib/useBookingOps";
import {
  DECLINE_REASONS,
  ageLabel,
  slaState,
  type BookingEventKind,
  type RefundRequest,
} from "../../domain/bookingOps";
import { REFUND_REASONS } from "../../data/refunds";
import { DEMO_TODAY } from "../../domain/period";
import { Masked } from "../tenant/ViewAs";
import { LinkActions } from "./LinkActions";

import { useUndoToast } from "../../lib/useUndo";
/* ============ Booking drawer (AENR-579) ============
   Everything about one booking: guest, items, payment, gate QR and the full
   timeline (created → paid → QR sent → scanned → refunded…), with the actions
   staff take — resend QR, move a set, refund (or decide a pending refund,
   AENR-583), add a note. Each action lands in the app store, so the list, the
   maps, Refunds and the other personas update with it. */

const EVENT_ICON: Record<BookingEventKind, IconRenderer> = {
  created: Icon.plus,
  paid: Icon.card,
  link_sent: Icon.link,
  qr_sent: Icon.qr,
  qr_resent: Icon.send,
  scanned: Icon.scan,
  moved: Icon.arrowR,
  note: Icon.doc,
  refund_requested: Icon.clock,
  refunded: Icon.refund,
  refund_declined: Icon.x,
  released: Icon.bolt,
};
const fmtAt = (at: string) => {
  const d = new Date(`${at.slice(0, 16)}:00`);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const payMethod = (b: OpsBooking) =>
  b.payMethod ??
  (b.status === "Awaiting payment"
    ? "Payment link sent — not paid yet"
    : b.status === "Unpaid"
      ? "Pay on arrival (cash or card at the till)"
      : b.channel === "Pay-by-link"
        ? "Card via payment link (Stripe)"
        : b.channel === "Cashier" || b.channel === "Walk-in"
          ? "Paid at the till"
          : b.status === "Cancelled"
            ? "Not charged"
            : "Card online (Stripe)");

export function BookingDrawer({
  booking,
  onClose,
  agent,
}: {
  booking: OpsBooking | null;
  onClose: () => void;
  agent: boolean;
}) {
  return (
    <Drawer
      open={!!booking}
      onClose={onClose}
      label={booking ? `Booking ${booking.id}` : "Booking"}
      title={
        booking && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold text-navy-900 text-xl">{booking.id}</span>
              <StatusBadge status={booking.status} />
            </div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">
              {booking.date} · {booking.channel} · €{booking.amount}
            </div>
          </div>
        )
      }
    >
      {booking && <DrawerBody key={booking.id} b={booking} agent={agent} />}
    </Drawer>
  );
}

function DrawerBody({ b, agent }: { b: OpsBooking; agent: boolean }) {
  const { toast, addBookingNote, sunbedOps, bookingOps, setSunbedOps, setBookingOps } = useApp();
  const undo = useUndoToast();
  const ops = useBookingOps();
  const liveSlots = useLiveSlots("walkin");
  const [send, setSend] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [moveWhy, setMoveWhy] = useState("Guest request");
  const [refunding, setRefunding] = useState(false);
  const [rAmount, setRAmount] = useState(b.amount);
  const [rReason, setRReason] = useState<string>(REFUND_REASONS[0]);
  const [note, setNote] = useState("");
  const [escalate, setEscalate] = useState(false);
  const pending = ops.pendingRefund(b.id);
  const events = ops.timelineOf(b);
  const paid = b.status === "Confirmed" || b.status === "Used";
  const live =
    b.visitIso >= DEMO_TODAY &&
    (b.status === "Confirmed" || b.status === "Unpaid" || b.status === "Awaiting payment");
  const sets = b.items.filter((i) => i.startsWith("Sunbed · "));

  // Free sets in the moving set's zone on the visit day.
  const freeSets = useMemo(() => {
    if (!moving) return [];
    const zName = sets.find((i) => i.endsWith(` · ${moving}`))?.split(" · ")[1] ?? "";
    const z = zoneByName(zName);
    return z
      ? liveSlots(z, [b.visitIso])
          .filter((s) => s.state === "a")
          .map((s) => s.id)
      : [];
  }, [moving, liveSlots, b.visitIso, sets]);

  const doMove = () => {
    if (!moving || !moveTo) return;
    const prev = { s: sunbedOps, o: bookingOps };
    ops.move(b, moving, moveTo, moveWhy);
    // A move is reversible: Undo puts the booking and both sets back (AENR-615).
    undo(`${b.id}: ${moving} → ${moveTo}. Both sets updated on every map.`, () => {
      setSunbedOps(() => prev.s);
      setBookingOps(() => prev.o);
    });
    setMoving(null);
    setMoveTo("");
  };
  const doRefund = () => {
    if (agent) {
      ops.requestRefund(b, rAmount, rReason);
      toast(`Refund of €${rAmount} requested — a manager decides it in Refunds.`, {
        tone: "success",
      });
    } else {
      ops.refundNow(b, rAmount, rReason);
      toast(
        `Stripe refund of €${rAmount} issued · credit note (5.1) sent to myDATA · guest e-mailed.`,
        { tone: "success" },
      );
    }
    setRefunding(false);
  };
  const addNote = () => {
    if (!note.trim()) return;
    addBookingNote(b.id, {
      text: note.trim(),
      at: new Date().toISOString().replace(/^\d{4}-\d{2}-\d{2}/, DEMO_TODAY),
      by: agent ? "Call Center" : "Manager / Admin",
      escalated: escalate,
    });
    toast(escalate ? `Note added and escalated to a manager.` : "Note added.", { tone: "success" });
    setNote("");
    setEscalate(false);
  };

  return (
    <div className="space-y-5">
      <LinkActions bookingId={b.id} />
      {/* Actions — one primary, the rest in "…" (AENR-617). */}
      <div className="flex flex-wrap items-center gap-2">
        {paid ? (
          <Btn size="sm" variant="primary" icon={Icon.send} onClick={() => setSend(true)}>
            Resend QR
          </Btn>
        ) : (
          <Btn size="sm" variant="outline" icon={Icon.doc} onClick={() => document.getElementById("bk-note")?.focus()}>
            Add note
          </Btn>
        )}
        <ActionsMenu
          size="sm"
          label={`More actions for ${b.id}`}
          actions={[
            live && sets.length > 0 && {
              id: "move",
              label: "Move set",
              icon: Icon.arrowR,
              onSelect: () => {
                setMoving(sets[0].split(" · ")[2]);
                setMoveTo("");
              },
            },
            paid && {
              id: "note",
              label: "Add note",
              icon: Icon.doc,
              onSelect: () => window.setTimeout(() => document.getElementById("bk-note")?.focus(), 0),
            },
            paid &&
              !pending && {
                id: "refund",
                label: agent ? "Request refund" : "Refund",
                icon: Icon.refund,
                destructive: true,
                hint: agent ? "A manager approves it" : `Up to €${b.amount}`,
                onSelect: () => {
                  setRefunding(true);
                  setRAmount(b.amount);
                },
              },
          ]}
        />
      </div>

      {pending && <PendingRefund r={pending} agent={agent} onDecide={ops.decideRefund} />}

      {refunding && (
        <form
          className="rounded-2xl ring-1 ring-slate-200 bg-white/80 p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (rAmount > 0 && rAmount <= b.amount) doRefund();
          }}
        >
          <div className="font-semibold text-navy-900">
            {agent ? "Request a refund" : "Refund via Stripe"}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={`Amount (€, up to ${b.amount})`}>
              <Input
                type="number"
                min={1}
                max={b.amount}
                value={rAmount}
                onChange={(e) =>
                  setRAmount(Math.max(0, Math.min(b.amount, Math.round(+e.target.value) || 0)))
                }
              />
            </Field>
            <Field label="Reason">
              <Select
                value={rReason}
                onChange={(e) => setRReason(e.target.value)}
                options={[...REFUND_REASONS]}
              />
            </Field>
          </div>
          <p className="text-[12px] text-slate-500">
            {agent
              ? "A manager approves or declines it in Refunds › Needs decision."
              : "Reverses the application fee and issues a credit note to myDATA."}
          </p>
          <div className="flex gap-2">
            <Btn
              type="submit"
              variant={agent ? "primary" : "danger"}
              icon={Icon.refund}
              disabled={!(rAmount > 0)}
            >
              {agent ? `Request €${rAmount}` : `Refund €${rAmount}`}
            </Btn>
            <Btn variant="ghost" onClick={() => setRefunding(false)}>
              Cancel
            </Btn>
          </div>
        </form>
      )}

      {moving && (
        <form
          className="rounded-2xl ring-1 ring-slate-200 bg-white/80 p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            doMove();
          }}
        >
          <div className="font-semibold text-navy-900">Move a guest to another set</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="From">
              <Select
                value={moving}
                onChange={(e) => {
                  setMoving(e.target.value);
                  setMoveTo("");
                }}
                options={sets.map((i) => i.split(" · ")[2])}
              />
            </Field>
            <Field label={`To (free on ${b.date})`}>
              <Select
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                options={[
                  { v: "", l: freeSets.length ? "Pick a free set" : "No free sets" },
                  ...freeSets.map((s) => ({ v: s, l: s })),
                ]}
              />
            </Field>
            <Field label="Why">
              <Select
                value={moveWhy}
                onChange={(e) => setMoveWhy(e.target.value)}
                options={["Guest request", "Set out of service", "Upgrade", "Group together"]}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" icon={Icon.check} disabled={!moveTo}>
              Move {moving}
              {moveTo ? ` → ${moveTo}` : ""}
            </Btn>
            <Btn variant="ghost" onClick={() => setMoving(null)}>
              Cancel
            </Btn>
          </div>
        </form>
      )}

      <section className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Guest
          </h3>
          <div className="font-semibold text-navy-900">
            {b.who} {b.surname}
          </div>
          {b.phone && (
            <div className="text-[13px] text-slate-600 tnum">
              <Masked value={b.phone} />
            </div>
          )}
          {b.email && (
            <div className="text-[13px] text-slate-600 truncate">
              <Masked value={b.email} />
            </div>
          )}
        </div>
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Payment
          </h3>
          <div className="font-display font-bold text-navy-900 text-xl tnum">€{b.amount}</div>
          <div className="text-[13px] text-slate-600">{payMethod(b)}</div>
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Items
        </h3>
        <ul className="rounded-2xl ring-1 ring-slate-200 bg-white/70 divide-y divide-slate-100">
          {b.items.map((it) => {
            const set = it.startsWith("Sunbed · ") ? it.split(" · ")[2] : null;
            return (
              <li key={it} className="px-4 py-2.5 flex items-center gap-2 text-[13.5px]">
                <span className="flex-1 min-w-0">{it}</span>
                {set && live && (
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMoving(set);
                      setMoveTo("");
                    }}
                    aria-label={`Move ${set}`}
                  >
                    Move
                  </Btn>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {paid && (
        <section className="flex items-center gap-4 rounded-2xl ring-1 ring-slate-200 bg-white/70 p-4">
          <QR size={84} seed={`BOOKING-${b.id}`} />
          <div className="min-w-0">
            <div className="font-semibold text-navy-900">Gate QR</div>
            <div className="text-[12.5px] text-slate-600">
              {b.status === "Used"
                ? "Scanned at the gate — no longer valid for entry."
                : "Valid for entry on " +
                  b.date +
                  ". The guest can show it from the e-mail or their account."}
            </div>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Timeline
        </h3>
        <ol className="relative ml-3 border-l border-slate-200 space-y-3">
          {events.map((e, i) => {
            const I = EVENT_ICON[e.kind];
            return (
              <li key={i} className="pl-5 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-white ring-1 ring-slate-200 grid place-items-center text-slate-600">
                  <I size={12} />
                </span>
                <div className="text-[13.5px] text-navy-900">{e.text}</div>
                <div className="text-[11.5px] text-slate-500">
                  {fmtAt(e.at)}
                  {e.by ? ` · ${e.by}` : ""}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Add a note
        </h3>
        <textarea
          id="bk-note"
          aria-label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Guest asked for shade in the afternoon."
          className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/70"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={escalate}
              onChange={(e) => setEscalate(e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            Escalate to a manager
          </label>
          <Btn
            size="sm"
            variant="primary"
            icon={Icon.check}
            disabled={!note.trim()}
            onClick={addNote}
          >
            Add note
          </Btn>
        </div>
      </section>

      <SendModal
        open={send}
        onClose={() => setSend(false)}
        title="Resend QR"
        email={b.email}
        phone={b.phone}
        sendLabel="Resend"
        intro={`Send the gate QR for ${b.id} (${b.who} ${b.surname}) again.`}
        onSend={(ch, dest) => {
          ops.resendQr(b, ch, dest);
          toast(`QR for ${b.id} re-sent via ${ch} to ${dest}.`, { tone: "success" });
        }}
      />
    </div>
  );
}

/* A pending refund — decided here or in Refunds › Needs decision, same result (AENR-583). */
export function PendingRefund({
  r,
  agent,
  onDecide,
}: {
  r: RefundRequest;
  agent: boolean;
  onDecide: (id: string, d: { approve: number } | { decline: string }) => void;
}) {
  const { toast } = useApp();
  const [amount, setAmount] = useState(r.amount);
  const [declining, setDeclining] = useState(false);
  const [why, setWhy] = useState(DECLINE_REASONS[0]);
  const sla = slaState(r.requestedAt, opsNow());
  return (
    <div
      className={`rounded-2xl ring-1 p-4 space-y-3 ${sla === "overdue" ? "ring-rose-300 bg-rose-50/60" : "ring-amber-300 bg-amber-50/60"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-navy-900">Refund requested · €{r.amount}</div>
          <div className="text-[12.5px] text-slate-600">
            {r.reason} · by {r.requestedBy} · {ageLabel(r.requestedAt, opsNow())} ago
          </div>
        </div>
        <Badge tone={sla === "overdue" ? "red" : sla === "due" ? "amber" : "slate"}>
          {sla === "overdue" ? "Past 48 h SLA" : sla === "due" ? "SLA due soon" : "Within SLA"}
        </Badge>
      </div>
      {agent ? (
        <p className="text-[12.5px] text-slate-600">Waiting for a manager’s decision.</p>
      ) : declining ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onDecide(r.id, { decline: why });
            toast(`Refund declined — ${r.who} is told why (${why}).`, { tone: "info" });
          }}
        >
          <div className="min-w-[220px] flex-1">
            <Field label="Reason told to the guest">
              <Select
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                options={DECLINE_REASONS}
              />
            </Field>
          </div>
          <Btn type="submit" variant="primary">
            Decline
          </Btn>
          <Btn variant="ghost" onClick={() => setDeclining(false)}>
            Back
          </Btn>
        </form>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (amount > 0) {
              onDecide(r.id, { approve: amount });
              toast(
                `Stripe refund of €${amount} issued · credit note (5.1) sent to myDATA · ${r.who} e-mailed.`,
                { tone: "success" },
              );
            }
          }}
        >
          <div className="w-36">
            <Field label={`Amount (€, up to ${r.amount})`}>
              <Input
                type="number"
                min={1}
                max={r.amount}
                value={amount}
                onChange={(e) =>
                  setAmount(Math.max(0, Math.min(r.amount, Math.round(+e.target.value) || 0)))
                }
              />
            </Field>
          </div>
          <Btn type="submit" variant="danger" icon={Icon.refund} disabled={!(amount > 0)}>
            Approve €{amount}
          </Btn>
          <Btn variant="outline" onClick={() => setDeclining(true)}>
            Decline…
          </Btn>
        </form>
      )}
    </div>
  );
}
