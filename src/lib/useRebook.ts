import { useMemo } from "react";
import { useApp } from "../app/store";
import { ZONES, todayISO } from "../data/beach";
import { PARKING_PRICE, checkRestrictions, dateBlock, resolvePrice } from "../domain/pricing";
import { stopSellFor } from "../domain/inventory";
import { serviceFees, settleCheckout } from "../domain/account";
import { bestReward, usableRewards } from "../domain/rewards";
import { isSeasonDay } from "../domain/period";
import {
  planRebook,
  quoteRebook,
  type RebookHint,
  type RebookPlan,
  type RebookQuote,
} from "../domain/rebook";
import { usual, type UsualBooking, type Visit } from "../domain/visits";
import type { Zone } from "../domain/types";
import { useClosure, useLiveSlots } from "./useLiveSlots";
import { activeTickets, lockerAvail, lockerPrice, ticketPrice } from "../domain/extras";
import { useFinance } from "./useFinance";

/** Days ahead "Rebook your usual" looks for a day that works. */
const HORIZON = 21;

export type Rebook =
  | { status: "none" }
  | {
      status: "usual";
      usual: UsualBooking;
      zone: Zone;
      plan: Extract<RebookPlan, { status: "none" }>;
    }
  | {
      status: "ok";
      usual: UsualBooking;
      zone: Zone;
      plan: Extract<RebookPlan, { status: "ok" }>;
      quote: RebookQuote;
      /** What Pay asks for once checkout's automatic deductions (reward, passes, credit) come off. */
      due: { toPay: number; deducted: boolean };
      /** What "Book again" hands the wizard: this exact plan, opened on Pay. */
      hint: RebookHint;
    };

/** "Rebook your usual" (AENR-705): the guest's most common booking, checked free on the next day it
 *  can be booked — same availability, closures, booking rules and stop-sell as the wizard — and priced
 *  like the wizard's all-in total (sets with the booking context, tickets, extras and service fees). */
export function useRebook(
  visits: readonly Visit[],
  rewards: Parameters<typeof usableRewards>[0],
): Rebook {
  const { calendar, inventory, beachPricing, priceRules, account, extras, passes, passPricing } =
    useApp();
  const liveSlots = useLiveSlots();
  const closure = useClosure();
  const [finance] = useFinance();

  const base = useMemo(() => {
    const cats = activeTickets(extras);
    const u = usual(visits, cats);
    const zone = u && ZONES.find((z) => z.name === u.zone || z.id === u.zone);
    if (!u || !zone) return { status: "none" as const };
    const today = todayISO();
    const time = new Date().toTimeString().slice(0, 5);
    const booked = new Set(visits.filter((v) => v.status !== "cancelled").map((v) => v.date));
    const free = (iso: string) => liveSlots(zone, [iso]).filter((s) => s.state === "a");
    const plan = planRebook(
      u,
      {
        start: today,
        horizon: HORIZON,
        skip: (iso) => !isSeasonDay(iso) || booked.has(iso),
        block: (iso) => {
          const closed = closure(zone.id, iso);
          if (closed) return { kind: "closed", label: closed };
          const rule = dateBlock(zone.id, iso, calendar.restrictions, today, time);
          if (rule) return { kind: "restricted", label: rule };
          const stay = checkRestrictions(zone.id, [iso], calendar.restrictions, today, time);
          if (!stay.ok)
            return { kind: "restricted", label: stay.reasons[0] ?? "Not bookable that day" };
          const stop = stopSellFor(inventory, zone.id, [iso]);
          return stop ? { kind: "stopSell", label: "Not sold online that day" } : null;
        },
        free,
        lockersLeft: (iso) => lockerAvail(extras, "A", iso),
      },
      account.party && Object.keys(account.party).length ? account.party : { adult: u.sets * 2 },
    );
    if (plan.status === "none") return { status: "usual" as const, usual: u, zone, plan };
    const ctx = { bookedOn: today, time, stayDays: 1 };
    const slots = liveSlots(zone, [plan.date]);
    const quote = quoteRebook(plan, zone.id, {
      set: (id, iso) => {
        const s = slots.find((x) => x.id === id);
        return s ? resolvePrice(s, zone.id, iso, beachPricing, priceRules, ctx).price : 0;
      },
      ticketCats: cats.map((c) => c.id),
      ticket: (id, iso) => ticketPrice(extras, id, iso).price,
      // The wizard starts lockers on bank A.
      locker: (iso) => lockerPrice(extras, "A", iso).price,
      parking: PARKING_PRICE,
      fees: (items) => serviceFees(items, finance.fees, today).total,
    });
    const hint: RebookHint = {
      ...u,
      sets: plan.setIds.length,
      setIds: plan.setIds,
      lockers: plan.lockers,
      parking: plan.parking,
      party: plan.party,
      date: plan.date,
    };
    return { status: "ok" as const, usual: u, zone, plan, quote, hint };
  }, [
    visits,
    extras,
    liveSlots,
    closure,
    calendar,
    inventory,
    beachPricing,
    priceRules,
    account.party,
    finance.fees,
  ]);
  if (base.status !== "ok") return base;
  // The same automatic deductions checkout applies (AENR-619 / 577 / 578), on the basket this plan becomes.
  const { quote } = base;
  const best = bestReward(usableRewards(rewards, account.rewardsUsed ?? []), quote.items);
  const rewardOff = best ? Math.min(best.amount, quote.total) : 0;
  const entries = quote.items.filter((i) => i.kind === "ticket").reduce((a, i) => a + i.price, 0);
  const seasonCovered =
    passes.season && entries > 0
      ? Math.min(ticketPrice(extras, "adult", todayISO()).price, entries)
      : 0;
  const { fullDue } = settleCheckout(quote.total, {
    rewardOff,
    seasonCovered,
    vip: passes.vip ? { balance: passes.vip.balance, discount: passPricing.vipDiscount } : null,
    credit: account.credit.balance,
  });
  return { ...base, due: { toPay: fullDue, deducted: fullDue !== quote.total } };
}
