// Sample data for the Cashier till (AENR-493): quick keys, bundles, promo
// codes, vouchers, manager PINs, reason lists and a seeded day of sales so the
// transaction list, refunds and shift reports have something to show.
// Dates are relative to the real "today" — the till sells for the current day,
// the same day the customer booking wizard opens on.

import { ZONES, todayISO, zoneLayout } from "./beach";
import { TICKET_PRICES } from "../domain/pricing";
import { addDays } from "../domain/period";
import type { TicketCategory } from "../domain/types";
import type { PromoCode, TillLine, TillSale, TillShift, TillState } from "../domain/till";

export const TICKET_LABEL: Record<TicketCategory, string> = {
  adult: "Adult",
  resident: "Resident",
  child: "Child",
  senior: "Senior 65+",
};
export const TICKET_ORDER: TicketCategory[] = ["adult", "resident", "child", "senior"];

/** One-tap favourites (per tenant). `sets` auto-assigns that many free sets in the chosen zone. */
export interface QuickKey {
  id: string;
  label: string;
  tickets: Partial<Record<TicketCategory, number>>;
  sets?: number;
}
export const QUICK_KEYS: QuickKey[] = [
  { id: "q-1a", label: "1 Adult", tickets: { adult: 1 } },
  { id: "q-2a", label: "2 Adults", tickets: { adult: 2 } },
  { id: "q-ac", label: "Adult + Child", tickets: { adult: 1, child: 1 } },
  { id: "q-res", label: "2 Residents", tickets: { resident: 2 } },
  { id: "q-set", label: "1 set (any free)", tickets: {}, sets: 1 },
];

/** Packages priced as one basket line; the receipt lists the components. */
export interface Bundle {
  id: string;
  label: string;
  tickets: Partial<Record<TicketCategory, number>>;
  sets: number;
  saving: number;
}
export const BUNDLES: Bundle[] = [
  { id: "b-couple", label: "Couple day", tickets: { adult: 2 }, sets: 1, saving: 5 },
  { id: "b-family", label: "Family day", tickets: { adult: 2, child: 2 }, sets: 2, saving: 10 },
];

const TODAY = todayISO();
export const PROMO_CODES: PromoCode[] = [
  {
    code: "SUMMER10",
    label: "10% off a Central set",
    kind: "pct",
    value: 10,
    from: addDays(TODAY, -60),
    to: addDays(TODAY, 60),
    zones: ["central"],
  },
  {
    code: "LOCAL5",
    label: "€5 off €30+",
    kind: "abs",
    value: 5,
    from: addDays(TODAY, -60),
    to: addDays(TODAY, 60),
    minSpend: 30,
  },
  {
    code: "WELCOME15",
    label: "15% off",
    kind: "pct",
    value: 15,
    from: addDays(TODAY, -60),
    to: addDays(TODAY, 60),
    limit: 1,
  },
  {
    code: "SPRING20",
    label: "20% off",
    kind: "pct",
    value: 20,
    from: addDays(TODAY, -120),
    to: addDays(TODAY, -10),
  },
];

export const DISCOUNT_PRESETS = [
  { id: "staff", label: "Staff", kind: "pct" as const, value: 50, reason: "Staff discount" },
  {
    id: "local",
    label: "Local group",
    kind: "pct" as const,
    value: 10,
    reason: "Local resident group",
  },
  {
    id: "late",
    label: "Late afternoon",
    kind: "pct" as const,
    value: 20,
    reason: "Late-afternoon entry",
  },
];

export const DEFAULT_VOUCHERS: Record<string, number> = {
  "GIFT-20": 20,
  "GIFT-50": 50,
  "GIFT-10": 0,
};

/** Demo manager PINs (the tenant admins in RBAC). */
export const MANAGER_PINS: Record<string, string> = {
  "1234": "Eleni Markou",
  "5678": "Giorgos Antoniou",
};
/** Refunds above this, and any cash refund, always need a manager PIN. */
export const REFUND_PIN_THRESHOLD = 50;

export const REFUND_REASONS = [
  "Wrong item",
  "Customer changed mind",
  "Weather",
  "Duplicate charge",
  "Other",
];
export const MOVE_REASONS = {
  in: ["Change top-up", "Float correction", "Other"],
  out: ["Petty cash", "Supplier payment", "Cash drop to safe", "Other"],
  nosale: ["Give change", "Check drawer", "Other"],
};
export const TILLS = ["Main entrance", "North gate"];
export const DEFAULT_CASHIER = "Kostas Leontis";
/** The beach car park sold at the till (AENR-584): spots P01–P40 at the day
 *  price; this many are already taken online for today before the till sells. */
export const PARKING_LOT = { spots: 40, bookedOnline: 23 };
/** Parking spots the till has sold on a day, from its own sales. */
export const parkingSold = (sales: readonly TillSale[], day: string) =>
  sales.filter((s) => s.day === day).reduce((a, s) => a + s.lines.filter((l) => l.kind === "parking").reduce((b, l) => b + l.qty, 0), 0);
/** Hold time for sets sitting in a till basket. */
export const HOLD_MS = 5 * 60 * 1000;

/** One set per zone that gets booked online while the till is offline (sync conflicts). */
export const OFFLINE_ONLINE_BOOKED = ZONES.map(
  (z) => zoneLayout(z).filter((s) => s.state === "a")[1]?.id,
).filter(Boolean) as string[];

/* ---------- Seeded day ---------- */
const at = (hhmm: string) => `${TODAY}T${hhmm}:00`;
const freeSets = (zoneId: string, n: number, skip = 0) => {
  const z = ZONES.find((x) => x.id === zoneId)!;
  return zoneLayout(z)
    .filter((s) => s.state === "a")
    .slice(skip + 4, skip + 4 + n);
};
const tk = (id: string, cat: TicketCategory, qty: number): TillLine => ({
  id,
  kind: "ticket",
  label: TICKET_LABEL[cat],
  qty,
  unit: TICKET_PRICES[cat],
  cat,
});
const setLines = (prefix: string, zoneId: string, n: number, skip = 0): TillLine[] => {
  const z = ZONES.find((x) => x.id === zoneId)!;
  return freeSets(zoneId, n, skip).map((s, i) => ({
    id: `${prefix}-s${i}`,
    kind: "sunbed",
    label: `Sunbed set ${s.id} · ${z.name}`,
    qty: 1,
    unit: s.price,
    zoneId,
    setId: s.id,
  }));
};
const sum = (ls: TillLine[]) => ls.reduce((a, l) => a + l.unit * l.qty, 0);
function seedSale(
  seq: number,
  hhmm: string,
  shiftId: string,
  cashier: string,
  lines: TillLine[],
  pay: "card" | "cash",
  extra: Partial<TillSale> = {},
): TillSale {
  const total = sum(lines);
  return {
    id: `R-${1000 + seq}`,
    apy: `ΑΠΥ Α-${2400 + seq}`,
    mark: `4000${String(seq * 7919 + 1234567).padStart(11, "0")}`,
    at: at(hhmm),
    day: TODAY,
    shiftId,
    cashier,
    lines,
    discounts: [],
    total,
    tenders: [
      pay === "card"
        ? { kind: "card", amount: total, ref: String(4242 + seq * 111).slice(-4) }
        : { kind: "cash", amount: total, given: Math.ceil(total / 10) * 10 },
    ],
    receipt: "print",
    mydata: "sent",
    refunds: [],
    ...extra,
  };
}

const MORNING: TillShift = {
  id: "SH-0204",
  cashier: "Eleni Sava",
  till: "Main entrance",
  openedAt: at("07:30"),
  float: 100,
  moves: [],
  closedAt: at("09:00"),
  counted: 112,
  note: "",
};
const OPEN: TillShift = {
  id: "SH-0205",
  cashier: DEFAULT_CASHIER,
  till: "Main entrance",
  openedAt: at("09:00"),
  float: 100,
  moves: [],
};

const SEED_SALES: TillSale[] = [
  seedSale(
    1,
    "08:05",
    MORNING.id,
    MORNING.cashier,
    [tk("s1-a", "adult", 2), ...setLines("s1", "macaw", 2)],
    "card",
    { customer: { name: "Dimitra Kalogeropoulou", phone: "+30 694 555 0101" }, receipt: "email" },
  ),
  seedSale(2, "08:20", MORNING.id, MORNING.cashier, [tk("s2-r", "resident", 2)], "cash"),
  seedSale(
    3,
    "08:41",
    MORNING.id,
    MORNING.cashier,
    [tk("s3-a", "adult", 2), tk("s3-c", "child", 2), ...setLines("s3", "central", 1)],
    "card",
    { mydata: "failed", mark: "" },
  ),
  seedSale(4, "09:12", OPEN.id, DEFAULT_CASHIER, [tk("s4-a", "adult", 1)], "cash"),
  seedSale(5, "09:30", OPEN.id, DEFAULT_CASHIER, [tk("s5-s", "senior", 2)], "card", {
    receipt: "none",
  }),
].reverse();

export const DEFAULT_TILL: TillState = {
  sales: SEED_SALES,
  holds: {},
  shift: OPEN,
  shifts: [MORNING],
  vouchers: DEFAULT_VOUCHERS,
  promoUses: {},
  offline: false,
  failNextMydata: false,
  onlineSold: {},
  seq: SEED_SALES.length,
};

/** Who may refund on their own (RBAC demo): card refunds up to the threshold.
 *  Everyone else — and any cash refund or larger amount — needs a manager PIN. */
export const REFUND_PERMISSION: Record<string, boolean> = { "Kostas Leontis": true };
