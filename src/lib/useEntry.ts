import { useMemo, useRef } from "react";
import { useApp } from "../app/store";
import { ZONES, todayISO, zoneLayout } from "../data/beach";
import { hasRole } from "../data/staff";
import { partyFromTickets } from "../domain/visits";
import { opsKey } from "../domain/sunbedOps";
import {
  arrivalPhrase,
  buildAllowance,
  draftIssue,
  entryKey,
  entryState,
  gateVerdict,
  linesFromText,
  makeArrival,
  normRef,
  type Allowance,
  type AllowanceCtx,
  type Arrival,
  type ArrivalDraft,
  type EntryLine,
  type EntryState,
} from "../domain/entry";
import { effectiveStatus, type BookingEvent } from "../domain/bookingOps";
import type { PersonaId } from "../domain/types";
import { opsNow, useBookingOps, type OpsBooking } from "./useBookingOps";

/* The gate entry allowance against the live store (AENR-715): which booking a
   code is, what it admits on a day (from the structured basket when the booking
   was made here — online, by staff or at the till — otherwise from the back
   office's item text), who has come through already, and the actions every
   role that checks guests in shares: admit an arrival, undo it, let someone
   back in. One writer, so the gate, the maps, Bookings and the guest's shared
   pass agree. */

/** Who is signed in on a staff device when nobody picked a user (mirrors the top bar, AENR-646). */
const DEVICE_USER: Partial<Record<PersonaId, string>> = {
  controller: "Petros Nikolaou",
  support: "Dimitris Galanis",
  admin: "Eleni Markou",
  callcenter: "Maria Kontou",
  cashier: "Kostas Leontis",
};

export function useEntry() {
  const {
    account,
    payLinks,
    setPayLinks,
    till,
    extras,
    beachLayout,
    bookingOps,
    setBookingOps,
    sunbedOps,
    setSunbedOps,
    persona,
    staffUsers,
    staffMeId,
    viewAs,
  } = useApp();
  const ops = useBookingOps();
  const who =
    viewAs?.name ??
    staffUsers.find((u) => u.id === staffMeId && u.status === "active" && hasRole(u, persona))
      ?.name ??
    DEVICE_USER[persona] ??
    "Staff";

  // The latest state for actions fired later (an Undo in a toast must see arrivals made since).
  const live = useRef({ bookingOps, sunbedOps });
  live.current = { bookingOps, sunbedOps };

  const ctx: AllowanceCtx = useMemo(() => {
    const layouts = new Map<string, Map<string, number>>();
    const capsIn = (zoneId: string) => {
      let m = layouts.get(zoneId);
      if (!m) {
        const z = ZONES.find((x) => x.id === zoneId);
        const slots = beachLayout[zoneId] ?? (z ? zoneLayout(z) : []);
        m = new Map(slots.map((s) => [s.id, s.cap ?? 2]));
        layouts.set(zoneId, m);
      }
      return m;
    };
    return {
      zoneName: (id) => ZONES.find((z) => z.id === id)?.name ?? id,
      seatsOf: (zoneId, setId) => capsIn(zoneId).get(setId) ?? 2,
      ticketLabel: (cat) => extras.tickets.find((t) => t.id === cat)?.short ?? cat,
    };
  }, [beachLayout, extras.tickets]);
  const cats = extras.tickets;
  const zoneOfSet = (setId: string) => ZONES.find((z) => setId.startsWith(`${z.prefix}-`))?.id;
  const zoneIdOf = (name: string) => ZONES.find((z) => z.name === name)?.id;
  /** A ticket label ("Normal", "Normal (13+)", "Adult") → its category. */
  const catOf = (label: string) => Object.keys(partyFromTickets([label], cats))[0];

  const find = (code: string): OpsBooking | undefined => {
    const c = normRef(code);
    return ops.bookings.find((b) => normRef(b.id) === c);
  };
  const placedOf = (b: Pick<OpsBooking, "id">) =>
    account.bookings.find((x) => normRef(x.ref) === normRef(b.id));

  /** The days a booking opens the gate (an online booking can span several). */
  const daysOf = (b: OpsBooking): string[] => {
    const p = placedOf(b);
    if (!p) return [b.visitIso];
    const days = [...new Set(p.items.map((i) => i.date).filter(Boolean))] as string[];
    return days.length ? days.sort() : [b.visitIso];
  };
  /** The booking's status on one day: an online booking (always paid) can be cancelled day by day (AENR-572). */
  const statusOn = (b: OpsBooking, date: string): string => {
    const p = placedOf(b);
    if (!p) return b.status;
    const c = p.cancelledDates?.[date];
    if (c) return c.refund > 0 ? "Refunded" : "Cancelled";
    return effectiveStatus({ id: b.id, status: "Confirmed" }, bookingOps);
  };

  const allowanceOf = (b: OpsBooking, date: string): Allowance => {
    const moved = (setId: string) => bookingOps.moves[b.id]?.[setId] ?? setId;
    const p = placedOf(b);
    if (p) {
      const first = [...p.items.map((i) => i.date).filter(Boolean)].sort()[0];
      const items = p.items.filter((i) => i.date === date || (!i.date && date === first));
      const lines: EntryLine[] = items.flatMap((i): EntryLine[] =>
        i.kind === "sunbed" && i.setId
          ? [{ kind: "set", setId: moved(i.setId), zoneId: i.zoneId ?? zoneOfSet(i.setId) ?? "" }]
          : i.kind === "ticket"
            ? [{ kind: "tickets", cat: i.id.split("@")[0], qty: i.qty ?? 1 }]
            : [],
      );
      // Tickets the guest added to the visit afterwards (AENR-572) — "your QR now includes them".
      const added = account.selfService.added[`${p.ref}@${date}`] ?? [];
      for (const l of added.filter((x) => x.kind === "ticket"))
        for (const [cat, qty] of Object.entries(partyFromTickets([l.label], cats)))
          lines.push({ kind: "tickets", cat, qty });
      return buildAllowance(lines, ctx);
    }
    const link = payLinks.find((l) => normRef(l.id) === normRef(b.id));
    if (link)
      return buildAllowance(
        link.lines.flatMap((l): EntryLine[] => {
          if (l.setId)
            return [
              { kind: "set", setId: moved(l.setId), zoneId: l.zoneId ?? zoneOfSet(l.setId) ?? "" },
            ];
          const cat = catOf(l.label);
          return cat ? [{ kind: "tickets", cat, qty: l.qty }] : [];
        }),
        ctx,
      );
    const sale = till.sales.find((s) => normRef(s.id) === normRef(b.id));
    if (sale)
      return buildAllowance(
        sale.lines.flatMap((l): EntryLine[] => {
          if (l.setId)
            return [
              { kind: "set", setId: moved(l.setId), zoneId: l.zoneId ?? zoneOfSet(l.setId) ?? "" },
            ];
          const cat = l.kind === "ticket" ? (l.cat ?? catOf(l.label)) : undefined;
          return cat ? [{ kind: "tickets", cat, qty: l.qty }] : [];
        }),
        ctx,
      );
    // Sample and older rows: their item text (set moves already applied).
    return buildAllowance(linesFromText(b.items, cats, zoneIdOf), ctx);
  };

  /** Arrivals on a booking-day; a set moved after check-in carries its seats along. */
  const arrivalsOf = (b: Pick<OpsBooking, "id">, date: string): Arrival[] => {
    const list = bookingOps.arrivals?.[entryKey(b.id, date)] ?? [];
    const mv = bookingOps.moves[b.id];
    if (!mv) return list;
    return list.map((a) => ({
      ...a,
      seats: Object.fromEntries(Object.entries(a.seats).map(([id, n]) => [mv[id] ?? id, n])),
    }));
  };
  const stateOf = (b: OpsBooking, date: string): EntryState =>
    entryState(allowanceOf(b, date), arrivalsOf(b, date));
  const verdictOf = (b: OpsBooking, date = todayISO()) =>
    gateVerdict(
      { status: statusOn(b, date), days: daysOf(b) },
      date,
      allowanceOf(b, date),
      arrivalsOf(b, date),
    );
  /** What is still to pay on arrival: an unpaid or link-awaiting booking, or an online deposit's rest. */
  const dueOf = (b: OpsBooking): number => {
    if (b.status === "Unpaid" || b.status === "Awaiting payment") return b.amount;
    const p = placedOf(b);
    const paidOnSite = bookingOps.events[b.id]?.some((e) => e.kind === "paid");
    return p?.deposit != null && !paidOnSite
      ? Math.max(0, Math.round((p.total - p.deposit) * 100) / 100)
      : 0;
  };

  const event = (o: typeof bookingOps, id: string, e: BookingEvent) => ({
    ...o.events,
    [id]: [...(o.events[id] ?? []), e],
  });

  /** Record who came in now: the arrival, the booking's timeline and the sets they sat at (checked in). */
  const admit = (b: OpsBooking, date: string, draft: ArrivalDraft, gate: string) => {
    const al = allowanceOf(b, date);
    const before = entryState(al, arrivalsOf(b, date));
    if (draftIssue(before, draft)) return null;
    const key = entryKey(b.id, date);
    const at = opsNow();
    const arrival = makeArrival(
      draft,
      {
        id: `A${(live.current.bookingOps.arrivals?.[key]?.length ?? 0) + 1}-${Date.now().toString(36)}`,
        at,
        by: who,
        gate,
      },
      (setId) => live.current.sunbedOps.status[opsKey(date, setId)]?.status === "occupied",
    );
    const after = entryState(al, [...before.arrivals, arrival]);
    const text = `${gate}: ${arrivalPhrase(arrival, al)} — ${after.entered} of ${after.total} entered${after.usedUp ? " · QR used up" : ""}`;
    setBookingOps((o) => ({
      ...o,
      arrivals: { ...(o.arrivals ?? {}), [key]: [...(o.arrivals?.[key] ?? []), arrival] },
      events: event(o, b.id, { at, kind: "scanned", text, by: who }),
    }));
    if (arrival.checkedIn.length) {
      const iso = new Date().toISOString();
      const reason = `Checked in at ${gate} · ${b.id}`;
      setSunbedOps((o) => ({
        status: {
          ...o.status,
          ...Object.fromEntries(
            arrival.checkedIn.map((id) => [
              opsKey(date, id),
              { status: "occupied" as const, reason, by: who, at: iso },
            ]),
          ),
        },
        history: [
          ...arrival.checkedIn.map((setId) => ({
            setId,
            date,
            from: "booked" as const,
            to: "occupied" as const,
            reason,
            by: who,
            at: iso,
          })),
          ...o.history,
        ].slice(0, 300),
      }));
    }
    return { arrival, after, allowance: al };
  };

  /** Take an arrival back (the last one unless named): its tickets and seats return, sets it checked in are booked again. */
  const undo = (b: OpsBooking, date: string, arrivalId?: string): Arrival | null => {
    const key = entryKey(b.id, date);
    const list = live.current.bookingOps.arrivals?.[key] ?? [];
    const gone = arrivalId ? list.find((a) => a.id === arrivalId) : list[list.length - 1];
    if (!gone) return null;
    const rest = list.filter((a) => a.id !== gone.id);
    const al = allowanceOf(b, date);
    const at = opsNow();
    setBookingOps((o) => ({
      ...o,
      arrivals: {
        ...(o.arrivals ?? {}),
        [key]: (o.arrivals?.[key] ?? []).filter((a) => a.id !== gone.id),
      },
      events: event(o, b.id, {
        at,
        kind: "entry_undone",
        text: `Arrival undone: ${arrivalPhrase(gone, al)} — back on the booking`,
        by: who,
      }),
    }));
    // A set goes back to booked only when nobody else from the group sits there.
    const back = gone.checkedIn.filter((id) => !rest.some((a) => (a.seats[id] ?? 0) > 0));
    if (back.length) {
      const iso = new Date().toISOString();
      const reason = `Gate arrival undone · ${b.id}`;
      setSunbedOps((o) => ({
        status: {
          ...o.status,
          ...Object.fromEntries(
            back.map((id) => [
              opsKey(date, id),
              { status: "booked" as const, reason, by: who, at: iso },
            ]),
          ),
        },
        history: [
          ...back.map((setId) => ({
            setId,
            date,
            from: "occupied" as const,
            to: "booked" as const,
            reason,
            by: who,
            at: iso,
          })),
          ...o.history,
        ].slice(0, 300),
      }));
    }
    return gone;
  };

  /** Someone already counted comes back in (lunch, the car): logged, nothing is used. */
  const reentry = (b: OpsBooking, gate: string) =>
    setBookingOps((o) => ({
      ...o,
      events: event(o, b.id, {
        at: opsNow(),
        kind: "scanned",
        text: `${gate}: let back in — QR already used up, re-entry (no ticket used)`,
        by: who,
      }),
    }));

  /** Take what is due on arrival (AENR-651 rules): a staff booking's link closes as paid, any other booking logs the payment. */
  const pay = (b: OpsBooking, how: "Card" | "Cash", gate: string) => {
    const amount = dueOf(b);
    const link = payLinks.find((l) => normRef(l.id) === normRef(b.id));
    const iso = new Date().toISOString();
    if (link)
      setPayLinks((ls) =>
        ls.map((l) =>
          l.id === link.id
            ? {
                ...l,
                closed: "paid",
                paidAt: iso,
                log: [
                  {
                    at: iso,
                    text: `Paid €${amount.toFixed(2)} · ${how} · taken at ${gate} · ${who}`,
                  },
                  ...l.log,
                ],
              }
            : l,
        ),
      );
    else
      setBookingOps((o) => ({
        ...o,
        events: event(o, b.id, {
          at: opsNow(),
          kind: "paid",
          text: `Paid €${amount.toFixed(2)} · ${how} · taken at ${gate}`,
          by: who,
        }),
      }));
    return amount;
  };

  return {
    who,
    find,
    daysOf,
    statusOn,
    allowanceOf,
    arrivalsOf,
    stateOf,
    verdictOf,
    dueOf,
    admit,
    undo,
    reentry,
    pay,
  };
}
