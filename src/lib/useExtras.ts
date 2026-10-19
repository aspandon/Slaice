import { useApp } from "../app/store";
import { activeTickets, lockerAvail, lockerPrice, ticketPrice } from "../domain/extras";

/** Ticket categories and lockers as every selling screen sees them (AENR-529/530). */
export function useExtras() {
  const { extras, setExtras } = useApp();
  return {
    extras,
    setExtras,
    /** Active categories in display order. */
    tickets: activeTickets(extras),
    ticketPrice: (catId: string, date: string) => ticketPrice(extras, catId, date).price,
    ticketLabel: (catId: string) => extras.tickets.find((t) => t.id === catId)?.short ?? catId,
    banks: extras.lockers.filter((l) => l.active),
    lockerPrice: (bankId: string, date: string) => lockerPrice(extras, bankId, date).price,
    lockerAvail: (bankId: string, date: string) => lockerAvail(extras, bankId, date),
    /** The provider's count drops when Slaice sells lockers. */
    recordLockers: (bankId: string, date: string, qty: number) =>
      setExtras((s) => ({
        ...s,
        sold: { ...s.sold, [`${bankId}|${date}`]: (s.sold[`${bankId}|${date}`] ?? 0) + qty },
      })),
  };
}
