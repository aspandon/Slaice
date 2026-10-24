import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../lib/icons";
import { Btn, Stepper } from "../../components/ui";
import { useDialogFocus } from "../../components/ui/overlays";
import { useGuardReason } from "../../components/ui/guard";
import { ZONES } from "../../data/beach";
import { fmtDay, fmtWeekday } from "../../domain/period";
import {
  arrivalPhrase,
  draftIssue,
  peopleOf,
  seatsPhrase,
  suggestDraft,
  suggestSeats,
  ticketsPhrase,
  type Allowance,
  type Arrival,
  type ArrivalDraft,
  type DraftIssue,
  type EntryState,
  ARRIVAL_LABEL,
  arrivalProgress,
  arrivalStage,
} from "../../domain/entry";
import { useEntry } from "../../lib/useEntry";
import type { OpsBooking } from "../../lib/useBookingOps";
import { scanFeedback, type GateFeedback } from "./ScanResult";

/* ============ Check-in at the gate (AENR-715) ============
   One booking QR admits the whole group, a few at a time. After a scan the
   controller sees what the booking allows — entry tickets by category, sets by
   zone with their seats — and what is left, confirms with the guest who is
   coming in now and where they sit, and records it (time, staff, gate). The
   sets they sit at turn checked in on every map. Once everything is used the
   code is refused, with the arrivals that used it. The same sheet serves the
   Controller, the Support Agent and a check-in from the back office. */

export type CheckInOutcome =
  | { kind: "admitted"; arrival: Arrival; after: EntryState; allowance: Allowance }
  | { kind: "denied" }
  | { kind: "reentry" };

const hhmm = (at: string) => at.slice(11, 16);
const zoneColor = (zoneId: string) => ZONES.find((z) => z.id === zoneId)?.color ?? "#94a3b8";
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, n) => a + n, 0);

function issueText(i: DraftIssue, st: EntryState): string {
  switch (i.kind) {
    case "empty":
      return "Choose who is coming in.";
    case "tickets":
      return `Only ${i.left} ${st.tickets.find((t) => t.cat === i.cat)?.label ?? i.cat} left on this booking.`;
    case "seats":
      return `${i.setId} has ${i.free} seat${i.free === 1 ? "" : "s"} free.`;
    case "seated":
      return `${i.seated} seated but ${i.people} coming in — seat at most ${i.people}.`;
  }
}

export function CheckInSheet({
  booking: given,
  date,
  gate,
  feedback,
  onClose,
  onDone,
}: {
  booking: OpsBooking;
  date: string;
  /** Where this happens — "Gate 1", or "Back office" for a check-in from Bookings. */
  gate: string;
  /** The gate device's sound / vibration (none from the back office). */
  feedback?: GateFeedback;
  /** Back without recording anything. */
  onClose: () => void;
  onDone: (o: CheckInOutcome) => void;
}) {
  const e = useEntry();
  // The booking as it is now (paid at the gate a moment ago, say), not as it was when scanned.
  const booking = e.find(given.id) ?? given;
  const al = e.allowanceOf(booking, date);
  const st = e.stateOf(booking, date);
  const due = e.dueOf(booking);
  const used = st.usedUp;
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  useDialogFocus(true, panel, primary);
  const guarded = useGuardReason("Confirm arrival");

  // The draft belongs to the state it was made for: after an Undo (or an arrival recorded
  // elsewhere) a fresh one-person suggestion takes over — derived, no effect needed.
  const [d, setD] = useState<{ at: number; draft: ArrivalDraft; seatsTouched: boolean } | null>(
    null,
  );
  const fresh = !d || d.at !== st.entered;
  const draft = fresh ? suggestDraft(st, 1) : d.draft;
  const seatsTouched = fresh ? false : d.seatsTouched;
  const setDraft = (next: ArrivalDraft, touched = seatsTouched) =>
    setD({ at: st.entered, draft: next, seatsTouched: touched });
  const people = peopleOf(draft, st.byTickets);
  const issue = used ? null : draftIssue(st, draft);

  // Sound and vibration once, as the sheet opens.
  useEffect(() => {
    if (feedback) scanFeedback(used ? "used" : "valid", feedback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Esc goes back — and stops there, so a drawer underneath (Bookings) stays open.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const counts =
    st.left <= 6 ? Array.from({ length: st.left }, (_, i) => i + 1) : [1, 2, 3, 4, st.left];
  const setTicket = (cat: string, n: number) => {
    const tickets = { ...draft.tickets, [cat]: n };
    setDraft({ tickets, seats: seatsTouched ? draft.seats : suggestSeats(st, sum(tickets)) });
  };
  const setSeat = (id: string, n: number) =>
    setDraft({ ...draft, seats: { ...draft.seats, [id]: n } }, true);
  const admit = () => {
    if (issue || guarded) return;
    const r = e.admit(booking, date, draft, gate);
    if (r) onDone({ kind: "admitted", ...r });
  };
  // Feedback stays inside the sheet: a toast would sit over its buttons on a phone.
  const [note, setNote] = useState<{ tone: "undo" | "paid"; text: string } | null>(null);
  const undo = () => {
    const gone = e.undo(booking, date);
    if (gone)
      setNote({ tone: "undo", text: `Undone: ${arrivalPhrase(gone, al)} — back on the booking.` });
  };
  const pay = (how: "Card" | "Cash") => {
    const amount = e.pay(booking, how, gate);
    setNote({
      tone: "paid",
      text: `€${amount.toFixed(2)} taken by ${how.toLowerCase()} — the booking is paid.`,
    });
  };

  const closeLabel = feedback ? "Back to the scanner" : "Close check-in";
  const guest = `${booking.who} ${booking.surname}`.trim();
  const pct = st.total ? Math.round((st.entered / st.total) * 100) : 0;
  const lastArrival = st.arrivals[st.arrivals.length - 1];
  const where = seatsPhrase(draft.seats, al);
  const what = st.byTickets
    ? ticketsPhrase(draft.tickets, al)
    : `${people} ${people === 1 ? "person" : "people"}`;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex md:items-center md:justify-center md:p-6 motion-safe:animate-fade-in">
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-navy-950/70 cursor-default"
      />
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative w-full h-full md:h-auto md:max-h-[92dvh] md:max-w-xl md:rounded-3xl overflow-hidden flex flex-col bg-surface shadow-float outline-none"
      >
        {/* The verdict, readable at arm's length: colour + icon + word, never colour alone. */}
        <header
          className={`${used ? "bg-amber-400 text-navy-900" : "bg-emerald-700 text-white"} px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shrink-0`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`w-14 h-14 rounded-full grid place-items-center shrink-0 ${used ? "bg-navy-900/10" : "bg-white/15"}`}
            >
              {used ? <Icon.alert size={30} sw={2.5} /> : <Icon.checkCircle size={30} sw={2.5} />}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="font-display font-bold uppercase tracking-tight text-[32px] leading-none"
              >
                {used ? "Used up" : "Valid"}
              </h2>
              <p className="mt-1 text-[15px] font-semibold truncate">
                {guest} · <span className="font-mono">{booking.id}</span>
              </p>
              <p className={`text-[13px] ${used ? "text-navy-900/85" : "text-white"}`}>
                {fmtWeekday(date)} {fmtDay(date)} · {booking.channel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className={`w-11 h-11 rounded-full grid place-items-center shrink-0 transition focus-visible:outline-none focus-visible:ring-2 ${used ? "bg-navy-900/10 hover:bg-navy-900/20 focus-visible:ring-navy-900" : "bg-white/15 hover:bg-white/25 focus-visible:ring-white"}`}
            >
              <Icon.x size={20} />
            </button>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-3 text-[14px] font-semibold">
              <span className="tnum">
                {ARRIVAL_LABEL[arrivalStage(st)]} · {arrivalProgress(st) || `${st.entered} of ${st.total} in`}
              </span>
              <span className="tnum">
                {st.left ? `${st.left} still expected` : "Everyone is in"}
              </span>
            </div>
            <div
              className={`mt-1.5 h-2.5 rounded-full overflow-hidden ${used ? "bg-navy-900/15" : "bg-black/20"}`}
              role="progressbar"
              aria-label="People in"
              aria-valuemin={0}
              aria-valuemax={st.total}
              aria-valuenow={st.entered}
            >
              <div
                className={`h-full rounded-full ${used ? "bg-navy-900" : "bg-white"} transition-[width] duration-300 motion-reduce:transition-none`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-5">
          <p
            id={descId}
            className={`text-[15px] font-semibold ${used ? "text-amber-900" : "text-navy-900"}`}
          >
            {used
              ? `All ${st.total} are in — this QR can't be used again. Let someone back in only if they're already on the list below.`
              : "Ask who is coming in now and where they sit, then admit them."}
          </p>

          <div role="status" aria-live="polite">
            {note && (
              <p
                className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold ring-1 ${note.tone === "paid" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-sky-50 text-sky-800 ring-sky-200"}`}
              >
                {note.tone === "paid" ? (
                  <Icon.checkCircle size={15} className="shrink-0 mt-0.5" />
                ) : (
                  <Icon.refund size={15} className="shrink-0 mt-0.5" />
                )}
                {note.text}
              </p>
            )}
          </div>

          {!used && due > 0 && (
            <div
              role="group"
              aria-label={`€${due.toFixed(2)} to pay`}
              className="rounded-2xl bg-amber-50 ring-1 ring-amber-300 p-3 space-y-2"
            >
              <div className="flex items-start gap-2 text-[13.5px] text-amber-900">
                <Icon.card size={16} className="mt-0.5 shrink-0" />
                <span>
                  <b>€{due.toFixed(2)} to pay</b> —{" "}
                  {booking.status === "Awaiting payment"
                    ? "the payment link isn't paid yet"
                    : "this booking pays on arrival"}
                  . Take it now or send them to the till.
                </span>
              </div>
              <div className="flex gap-2">
                <Btn
                  variant="primary"
                  icon={Icon.card}
                  disabled={!!guarded}
                  title={guarded || undefined}
                  onClick={() => pay("Card")}
                >
                  Card
                </Btn>
                <Btn
                  variant="outline"
                  icon={Icon.cash}
                  disabled={!!guarded}
                  title={guarded || undefined}
                  onClick={() => pay("Cash")}
                >
                  Cash
                </Btn>
              </div>
            </div>
          )}

          {!used && (
            <section aria-labelledby={`${titleId}-who`} className="space-y-2.5">
              <h3
                id={`${titleId}-who`}
                className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500"
              >
                Coming in now
              </h3>
              <div
                role="radiogroup"
                aria-label="How many are coming in now"
                className="flex flex-wrap gap-2"
              >
                {counts.map((n) => {
                  const on = people === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() =>
                        setD({ at: st.entered, draft: suggestDraft(st, n), seatsTouched: false })
                      }
                      className={`min-w-[56px] h-14 px-4 rounded-2xl text-[17px] font-bold tnum transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${on ? "bg-navy-900 text-white shadow-btn-primary" : "bg-white text-navy-900 ring-1 ring-slate-300 hover:ring-slate-400"}`}
                    >
                      {n === st.left && n > 1 ? `All ${n}` : n}
                    </button>
                  );
                })}
              </div>
              {st.byTickets && (
                <ul className="rounded-2xl bg-white ring-1 ring-slate-200 divide-y divide-slate-100">
                  {st.tickets.map((t) => (
                    <li key={t.cat} className="flex items-center gap-3 px-3 py-2.5 min-h-[64px]">
                      <Icon.ticket size={18} className="text-teal-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-navy-900 truncate">
                          {t.label}
                        </div>
                        <div className="text-[12.5px] text-slate-600 tnum">
                          {t.left} of {t.qty} left
                        </div>
                      </div>
                      {st.tickets.length > 1 || st.left > 6 ? (
                        <Stepper
                          size="lg"
                          value={draft.tickets[t.cat] ?? 0}
                          min={0}
                          max={t.left}
                          onChange={(n) => setTicket(t.cat, n)}
                          label={`${t.label} tickets now`}
                        />
                      ) : (
                        <span className="text-[15px] font-bold text-navy-900 tnum pr-1">
                          {draft.tickets[t.cat] ?? 0} now
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {st.sets.length > 0 && (
            <section aria-labelledby={`${titleId}-where`} className="space-y-2.5">
              <h3
                id={`${titleId}-where`}
                className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500"
              >
                {used ? "On the sand" : "Where they sit"}
              </h3>
              <ul className="space-y-2">
                {st.sets.map((s) => {
                  const now = used ? 0 : (draft.seats[s.setId] ?? 0);
                  return (
                    <li
                      key={s.setId}
                      className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 flex items-center gap-3"
                    >
                      <span
                        aria-hidden
                        className="w-1.5 self-stretch rounded-full"
                        style={{ background: zoneColor(s.zoneId) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[16px] font-bold text-navy-900 leading-tight">
                          {s.zone}
                        </div>
                        <div className="font-mono text-[13px] font-semibold text-slate-600">
                          {s.setId}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1" aria-hidden>
                          {Array.from({ length: s.seats }, (_, i) => (
                            <span
                              key={i}
                              className={`w-3.5 h-3.5 rounded-full ${i < s.taken ? "bg-navy-900" : i < s.taken + now ? "bg-emerald-500 ring-2 ring-emerald-200" : "ring-2 ring-inset ring-slate-300"}`}
                            />
                          ))}
                        </div>
                        <div className="mt-1 text-[12.5px] text-slate-600 tnum">
                          {s.taken ? `${s.taken} of ${s.seats} here` : "Nobody yet"}
                          {now ? ` · ${now} now` : ""}
                        </div>
                      </div>
                      {!used && s.free > 0 ? (
                        <Stepper
                          size="lg"
                          value={now}
                          min={0}
                          max={s.free}
                          onChange={(n) => setSeat(s.setId, n)}
                          label={`seated at ${s.setId} now`}
                        />
                      ) : (
                        <span
                          className={`text-[12px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg ${s.free === 0 ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-700"}`}
                        >
                          {s.free === 0 ? "Full" : `${s.free} free`}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby={`${titleId}-log`} className="space-y-2">
            <h3
              id={`${titleId}-log`}
              className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500"
            >
              Arrived so far
            </h3>
            {st.arrivals.length === 0 ? (
              <p className="text-[13.5px] text-slate-600">
                Nobody yet — this is the first arrival on {booking.id}.
              </p>
            ) : (
              <ol className="rounded-2xl bg-white ring-1 ring-slate-200 divide-y divide-slate-100">
                {st.arrivals.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                    <span className="font-mono text-[13px] font-semibold text-navy-900 tnum pt-0.5">
                      {hhmm(a.at)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-navy-900">
                        {arrivalPhrase(a, al)}
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {a.by} · {a.gate}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {lastArrival && (
              <Btn
                size="sm"
                variant="ghost"
                icon={Icon.refund}
                disabled={!!guarded}
                title={guarded || undefined}
                onClick={undo}
              >
                Undo last arrival ({hhmm(lastArrival.at)})
              </Btn>
            )}
          </section>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          {used ? (
            <div className="flex gap-2">
              <Btn
                size="lg"
                variant="outline"
                icon={Icon.check}
                disabled={!!guarded}
                title={guarded || undefined}
                onClick={() => {
                  e.reentry(booking, gate);
                  onDone({ kind: "reentry" });
                }}
              >
                Let back in
              </Btn>
              <button
                ref={primary}
                type="button"
                onClick={() => onDone({ kind: "denied" })}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[14px] min-h-[56px] px-5 text-[17px] font-semibold bg-navy-900 text-white hover:bg-navy-800 shadow-btn-primary active:scale-[.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <Icon.x size={18} /> Deny entry
              </button>
            </div>
          ) : (
            <>
              {issue && issue.kind !== "empty" ? (
                <p
                  role="alert"
                  className="text-[13px] font-semibold text-rose-700 flex items-center gap-1.5"
                >
                  <Icon.alert size={14} /> {issueText(issue, st)}
                </p>
              ) : (
                <p className="text-[13.5px] text-slate-700 truncate" aria-live="polite">
                  <b className="text-navy-900">{what || "Nobody"}</b>
                  {st.sets.length > 0 ? ` · ${where || "no set"}` : ""}
                </p>
              )}
              <div className="flex gap-2">
                <Btn size="lg" variant="outline" onClick={onClose}>
                  Not now
                </Btn>
                <button
                  ref={primary}
                  type="button"
                  onClick={admit}
                  disabled={!!issue || !!guarded}
                  title={guarded || undefined}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-[14px] min-h-[56px] px-5 text-[17px] font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-btn-teal active:scale-[.98] transition disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                >
                  <Icon.check size={19} sw={2.5} /> Admit {people || ""}
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
