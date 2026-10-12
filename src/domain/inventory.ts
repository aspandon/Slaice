// Sunbed inventory controls (AENR-512): holds with a reason and expiry,
// channel allocations (online / walk-in / phone / staff only) with automatic
// release, and stop-sell of online sales. Pure functions resolve, per set,
// date and sales channel, whether the set can be sold and why not.

export type SalesChannel = "online" | "walkin" | "phone";
/** Who an allocation keeps a set for. "staff" = not available online (walk-in + phone). */
export type AllocationChannel = SalesChannel | "staff";
export const HOLD_REASONS = ["VIP", "Maintenance", "Event / group", "Weather", "Other"] as const;

export interface InvHold {
  id: string;
  zoneId: string;
  setIds: string[];
  dates: string[];
  reason: string;
  note?: string;
  /** Auto-release moment (ISO datetime); absent = until released by hand. */
  until?: string;
  by: string;
  at: string;
  releasedAt?: string;
  releasedBy?: string;
}
export interface Allocation {
  id: string;
  zoneId: string;
  setIds: string[];
  dates: string[];
  channel: AllocationChannel;
  /** Return unsold sets to the general pool N days before the date at HH:MM. */
  release?: { daysBefore: number; time: string };
  at: string;
}
export interface StopSell {
  id: string;
  zoneId: string;
  /** Limit to one price category; absent = the whole store. */
  catId?: string;
  from: string;
  to: string;
  reason: string;
  active: boolean;
}
export interface InventoryState {
  holds: InvHold[];
  allocations: Allocation[];
  stopSells: StopSell[];
  log: { at: string; text: string }[];
  /** Demo clock offset in minutes (fast-forward to release times). */
  clockOffset: number;
}
export const DEFAULT_INVENTORY: InventoryState = {
  holds: [],
  allocations: [],
  stopSells: [],
  log: [],
  clockOffset: 0,
};

export const CHANNEL_LABEL: Record<AllocationChannel, string> = {
  online: "Online only",
  walkin: "Walk-in (Cashier) only",
  phone: "Phone (Call Center) only",
  staff: "Not available online",
};
export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  online: "Online",
  walkin: "Walk-in",
  phone: "Phone",
};

const at = (date: string, time: string, daysBefore = 0) => {
  const d = new Date(`${date}T${time}:00`);
  d.setDate(d.getDate() - daysBefore);
  return d.getTime();
};
export const holdActive = (h: InvHold, now: number) =>
  !h.releasedAt && (!h.until || new Date(h.until).getTime() > now);
export const allocationLive = (a: Allocation, date: string, now: number) =>
  !a.release || now < at(date, a.release.time, a.release.daysBefore);
const allows = (ch: AllocationChannel, sale: SalesChannel) =>
  ch === sale || (ch === "staff" && sale !== "online");

export type InvStatus =
  | { kind: "open" }
  | { kind: "held"; reason: string; until?: string }
  | { kind: "allocated"; channel: AllocationChannel; release?: string }
  | { kind: "stopsell"; reason: string };

/** Can this set be sold on `date` through `channel` at `now`? */
export function invStatus(
  inv: InventoryState,
  zoneId: string,
  setId: string,
  catId: string | undefined,
  date: string,
  channel: SalesChannel,
  now: number,
): InvStatus {
  const h = inv.holds.find(
    (x) =>
      x.zoneId === zoneId &&
      x.setIds.includes(setId) &&
      x.dates.includes(date) &&
      holdActive(x, now),
  );
  if (h) return { kind: "held", reason: h.reason + (h.note ? ` — ${h.note}` : ""), until: h.until };
  if (channel === "online") {
    const s = inv.stopSells.find(
      (x) =>
        x.active &&
        x.zoneId === zoneId &&
        (!x.catId || x.catId === catId) &&
        date >= x.from &&
        date <= x.to,
    );
    if (s) return { kind: "stopsell", reason: s.reason };
  }
  const a = [...inv.allocations]
    .reverse()
    .find(
      (x) =>
        x.zoneId === zoneId &&
        x.setIds.includes(setId) &&
        x.dates.includes(date) &&
        allocationLive(x, date, now),
    );
  if (a && !allows(a.channel, channel))
    return {
      kind: "allocated",
      channel: a.channel,
      release: a.release
        ? `${a.release.daysBefore ? `${a.release.daysBefore} day${a.release.daysBefore === 1 ? "" : "s"} before, ` : ""}${a.release.time}`
        : undefined,
    };
  return { kind: "open" };
}
export function invLabel(s: InvStatus): string {
  if (s.kind === "held") return `Held — ${s.reason}`;
  if (s.kind === "stopsell") return `Not available online — ${s.reason}`;
  if (s.kind === "allocated")
    return `${CHANNEL_LABEL[s.channel]}${s.release ? ` (released ${s.release})` : ""}`;
  return "";
}
export function stopSellFor(
  inv: InventoryState,
  zoneId: string,
  dates: readonly string[],
): StopSell | undefined {
  return inv.stopSells.find(
    (x) =>
      x.active && x.zoneId === zoneId && !x.catId && dates.some((d) => d >= x.from && d <= x.to),
  );
}
