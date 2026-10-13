import { useApp } from "../../app/store";
import { todayISO } from "../../data/beach";
import { DEFAULT_CASHIER, HOLD_MS, OFFLINE_ONLINE_BOOKED } from "../../data/till";
import {
  apyNo, creditNo, fakeMark, receiptNo, refundedQty, tillSetStatus,
  type DrawerMove, type ReceiptChoice, type Tender, type TenderKind, type TillDiscount, type TillLine, type TillRefund, type TillSale, type TillShift,
} from "../../domain/till";

/** Till actions over the shared store. Screens call these; the pure rules live in domain/till. */
export function useTill() {
  const { till, setTill, viewAs } = useApp();
  const day = todayISO();
  const cashier = viewAs?.role === "cashier" ? viewAs.name : till.active ?? till.shift?.cashier ?? DEFAULT_CASHIER;
  const tillName = till.shift?.till ?? "Main entrance";
  const nowIso = () => new Date().toISOString();

  const hold = (setIds: string[]) =>
    setTill((t) => ({ ...t, holds: { ...t.holds, ...Object.fromEntries(setIds.map((id) => [id, { day, until: Date.now() + HOLD_MS, by: tillName }])) } }));
  const release = (setIds: string[]) =>
    setTill((t) => {
      const holds = { ...t.holds };
      setIds.forEach((id) => delete holds[id]);
      return { ...t, holds };
    });
  /** Live status for today (sold / held), e.g. to block a set someone else took. */
  const status = (now = Date.now()) => tillSetStatus(till, day, now);

  /** Record a paid sale. Returns it so the screen can show the receipt. */
  const completeSale = (draft: { lines: TillLine[]; discounts: TillDiscount[]; total: number; tenders: Tender[]; customer?: TillSale["customer"]; channel?: TillSale["channel"]; seller?: string }): TillSale => {
    const seq = till.seq + 1;
    const mydata = till.offline ? "pending" : till.failNextMydata ? "failed" : "sent";
    const sale: TillSale = {
      id: receiptNo(seq), apy: apyNo(seq), mark: mydata === "sent" ? fakeMark(seq) : "",
      at: nowIso(), day, shiftId: draft.channel && draft.channel !== "cashier" ? null : till.shift?.id ?? null, cashier: draft.seller ?? cashier, channel: draft.channel,
      lines: draft.lines, discounts: draft.discounts, total: draft.total, tenders: draft.tenders, customer: draft.customer,
      receipt: "print", mydata, offline: till.offline || undefined, refunds: [],
    };
    setTill((t) => {
      const holds = { ...t.holds };
      draft.lines.forEach((l) => l.setId && delete holds[l.setId]);
      const vouchers = { ...t.vouchers };
      draft.tenders.forEach((td) => td.kind === "voucher" && td.ref && (vouchers[td.ref] = Math.max(0, (vouchers[td.ref] ?? 0) - td.amount)));
      const promoUses = { ...t.promoUses };
      draft.discounts.forEach((d) => d.code && (promoUses[d.code] = (promoUses[d.code] ?? 0) + 1));
      return { ...t, seq, sales: [sale, ...t.sales], holds, vouchers, promoUses, failNextMydata: mydata === "failed" ? false : t.failNextMydata };
    });
    return sale;
  };

  const patchSale = (id: string, fn: (s: TillSale) => TillSale) => setTill((t) => ({ ...t, sales: t.sales.map((s) => (s.id === id ? fn(s) : s)) }));
  const setDelivery = (id: string, receipt: ReceiptChoice) => patchSale(id, (s) => ({ ...s, receipt }));
  const reprint = (id: string) => patchSale(id, (s) => ({ ...s, reprints: (s.reprints ?? 0) + 1 }));
  const retryMydata = (id: string) => patchSale(id, (s) => ({ ...s, mydata: "sent", mark: s.mark || fakeMark(Number(s.id.slice(2)) - 1000) }));

  const refund = (saleId: string, r: Omit<TillRefund, "id" | "doc" | "at" | "shiftId">): TillRefund => {
    const n = till.sales.reduce((a, s) => a + s.refunds.length, 0) + 1;
    const rec: TillRefund = { ...r, id: `RF-${n}`, doc: creditNo(n), at: nowIso(), shiftId: till.shift && !till.shift.closedAt ? till.shift.id : null };
    patchSale(saleId, (s) => ({ ...s, refunds: [...s.refunds, rec] }));
    return rec;
  };

  /* ---- Shift / drawer ---- */
  const openShift = (s: { cashier: string; till: string; float: number }) =>
    setTill((t) => {
      const n = Math.max(203, ...[t.shift, ...t.shifts].map((x) => Number(x?.id.slice(3)) || 0)) + 1;
      return { ...t, active: s.cashier, shift: { id: `SH-${String(n).padStart(4, "0")}`, ...s, openedAt: nowIso(), moves: [] } };
    });
  const addMove = (m: Omit<DrawerMove, "id" | "at">) =>
    setTill((t) => (t.shift ? { ...t, shift: { ...t.shift, moves: [...t.shift.moves, { ...m, id: `MV-${t.shift.moves.length + 1}`, at: nowIso() }] } } : t));
  const closeShift = (c: { counted: number; note: string; blind: boolean }): TillShift | null => {
    if (!till.shift) return null;
    const closed: TillShift = { ...till.shift, ...c, closedAt: nowIso() };
    setTill((t) => ({ ...t, shift: null, shifts: [closed, ...t.shifts], active: undefined }));
    return closed;
  };
  /** Hand the till to another person (after their PIN); the shift and drawer carry on (AENR-608). */
  const switchCashier = (to: string, expected: number, counted?: number) =>
    setTill((t) => ({
      ...t,
      active: to,
      shift: t.shift
        ? { ...t.shift, handovers: [...(t.shift.handovers ?? []), { at: nowIso(), from: cashier, to, expected, counted }] }
        : t.shift,
    }));

  /* ---- Offline ---- */
  const setOffline = (offline: boolean) => setTill((t) => ({ ...t, offline }));
  /** Reconnect: push queued sales to the server and myDATA. Sets booked online
   *  meanwhile become sold, and an offline sale that also sold one is flagged. */
  const syncOffline = (): { synced: number; conflicts: number } => {
    const clashOf = (s: TillSale) => s.lines.find((l) => l.setId && OFFLINE_ONLINE_BOOKED.includes(l.setId) && refundedQty(s, l.id) < l.qty);
    const queued = till.sales.filter((s) => s.offline);
    const conflicts = queued.filter((s) => clashOf(s)).length;
    setTill((t) => {
      const onlineSold = { ...t.onlineSold };
      OFFLINE_ONLINE_BOOKED.forEach((id) => (onlineSold[id] = day));
      const sales = t.sales.map((s) => (s.offline ? { ...s, offline: undefined, mydata: "sent" as const, mark: fakeMark(Number(s.id.slice(2)) - 1000), conflict: clashOf(s)?.id } : s));
      return { ...t, offline: false, onlineSold, sales };
    });
    return { synced: queued.length, conflicts };
  };
  /** Move a conflicting line to another free set in the same zone. */
  const moveLine = (saleId: string, lineId: string, setId: string, label: string) =>
    patchSale(saleId, (s) => ({ ...s, conflict: undefined, lines: s.lines.map((l) => (l.id === lineId ? { ...l, setId, label } : l)) }));
  const clearConflict = (saleId: string) => patchSale(saleId, (s) => ({ ...s, conflict: undefined }));
  const setFailNext = (v: boolean) => setTill((t) => ({ ...t, failNextMydata: v }));
  const setTerminal = (id: string) => setTill((t) => ({ ...t, terminal: id }));
  const rememberTender = (k: TenderKind) => setTill((t) => ({ ...t, lastTender: k }));
  const markOfflineHelpSeen = () => setTill((t) => ({ ...t, offlineHelpSeen: true }));

  return { till, day, cashier, tillName, hold, release, status, completeSale, setDelivery, reprint, retryMydata, refund, openShift, addMove, closeShift, switchCashier, setOffline, syncOffline, moveLine, clearConflict, setFailNext, setTerminal, rememberTender, markOfflineHelpSeen };
}
