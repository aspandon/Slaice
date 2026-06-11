/**
 * Domain model — the single, typed vocabulary the whole front end shares.
 *
 * These interfaces describe the shapes that today live as sample data in
 * `src/data/*` and tomorrow will be the client/server contract (the place
 * generated OpenAPI / tRPC types would land). Keeping them here means screens,
 * the cart, pricing and the data-access seam all speak one language, and
 * illegal states are made unrepresentable with unions rather than loose
 * strings.
 */

export type PersonaId =
  | "customer"
  | "admin"
  | "cashier"
  | "controller"
  | "accountant"
  | "platform";

/** A UI language, identified by its ISO 639-1 code ("en", "el", "de", …).
 *  English is the source of truth; other languages are machine-generated. */
export type LangCode = string;

/* ---------- Cart ---------- */
export type CartKind = "sunbed" | "ticket" | "locker" | "parking";

export interface CartItem {
  kind: CartKind;
  /** Unique within a kind; booking flows suffix `@<ISO date>` for per-day lines. */
  id: string;
  label: string;
  sub: string;
  price: number;
}

/* ---------- Beach / inventory ---------- */
/** Sunbed availability: available · on hold · unavailable. */
export type SunbedState = "a" | "h" | "u";

export interface Zone {
  id: string;
  name: string;
  avail: number;
  total: number;
  from: number;
  color: string;
  prefix: string;
}

export interface Sunbed {
  id: string;
  s: SunbedState;
  price: number;
  /** Column / row within the zone grid. */
  c: number;
  r: number;
}

/* ---------- Sunbed layout (admin-authored, customer-rendered) ----------
   One umbrella set's position within a zone, in a normalized 0–100 box:
   x runs left→right along the shore, y runs from the sea / front row (0) to the
   promenade / back (100). This is the shared contract the admin Map Editor
   writes and the customer wizard's zoom view renders — one source, no drift. */
export type SunbedKind = "standard" | "front" | "cabana";

export interface SunbedSlot {
  id: string;
  x: number;
  y: number;
  state: SunbedState;
  price: number;
  kind?: SunbedKind;
}

/* ---------- Bookings & documents ---------- */
export type BookingState = "active" | "past";
export type BookingStatus =
  | "Confirmed"
  | "Used"
  | "Cancelled"
  | "Unpaid"
  | "Refunded"
  | "Pending";

export interface CustomerBooking {
  id: string;
  item: string;
  date: string;
  status: BookingStatus;
  price: number;
  state: BookingState;
}

export interface CustomerDocument {
  id: string;
  /** What the document is for, e.g. "Sunbed booking". */
  for: string;
  date: string;
  amt: string;
  /** MyDATA MARK (mocked). */
  mark: string;
  /** [description, net, vat, gross] rows. */
  lines: string[][];
}

/* ---------- CRM ---------- */
export interface Customer {
  id: number;
  /** Short display form, e.g. "Maria K." */
  name: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  bookings: number;
  spend: number;
  tags: string[];
  lastVisit: string;
}

/* ---------- Personas & navigation ---------- */
export interface Persona {
  id: PersonaId;
  label: string;
  icon: string;
  color: string;
  blurb: string;
}

export interface NavItem {
  k: string;
  label: string;
  /** Purpose-built abbreviation for the compact mobile bottom-tab bar. */
  short?: string;
  icon: string;
  badge?: "MVP" | "Future";
  /** "account" marks personal destinations kept out of the desktop primary nav. */
  area?: string;
}

/* ---------- Tickets ---------- */
export type TicketCategory = "adult" | "resident" | "child" | "senior";

/* ---------- Consent / GDPR ---------- */
export interface Consent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
  ts: string | null;
}

/* ---------- Tenant beach background ----------
   The beach scene a tenant shows on the customer booking map: either one of the
   built-in presets (see `data/backgrounds.ts`) or a manager-uploaded photo
   (stored as a downscaled data URL). A discriminated union so a preset id and a
   custom source can never both be set. */
export type BeachBackground =
  | { kind: "preset"; id: string }
  | { kind: "custom"; src: string; name?: string };

/* ---------- Passes (VIP credit + Season) ----------
   A guest can hold a VIP credit card (prepaid balance, spent with a discount,
   valid to the end of the season) and/or a Season pass (covers entry tickets for
   a month or the whole summer). Both persist on the customer session. */
export type SeasonPlan = "monthly" | "summer";

export interface VipPass {
  /** Remaining spendable credit, in euros. */
  balance: number;
  /** Total credit purchased to date (for display). */
  purchased: number;
  /** Human label, e.g. "End of season · 30 Sep 2026". */
  validUntil: string;
}

export interface SeasonPass {
  plan: SeasonPlan;
  validUntil: string;
}

export interface CustomerPasses {
  vip: VipPass | null;
  season: SeasonPass | null;
}

/** Admin-editable pass pricing — read by the customer purchase flow. */
export interface PassPricing {
  /** Selectable VIP credit packs (euros). */
  vipTiers: number[];
  /** VIP spend discount, 0–1 (e.g. 0.2 = 20% off the card-paid share). */
  vipDiscount: number;
  seasonMonthly: number;
  seasonSummer: number;
}

/* ---------- Map editor: zone arrangement ----------
   One zone's identity, grid size and position (% of the canvas) as arranged in
   the admin Map Layout Editor's "Zone map" tab. Persisted so a tenant's layout
   survives a reload (there is no backend in the mockup). Shape matches the
   editor's working model 1:1. */
export interface ZoneMapItem {
  id: string;
  name: string;
  prefix: string;
  color: string;
  total: number;
  rows: number;
  cols: number;
  /** Position as a percentage of the canvas (0–100). */
  x: number;
  y: number;
}

/* ---------- Seasonal / day-of-week pricing ----------
   An admin-authored rule that overrides a zone's base price for a date window
   and a set of weekdays — e.g. "August weekends: +€10". Rules are evaluated in
   order (later matches win) by domain/pricing.ts and persisted for the demo. */
/** Which weekdays a rule covers. */
export type PriceRuleDays = "all" | "weekday" | "weekend";
/** How a rule changes the base price. */
export type PriceRuleMode = "set" | "addAbs" | "addPct";
export interface PriceRule {
  id: string;
  /** Human label, e.g. "August weekends". */
  label: string;
  /** Zone id this applies to, or "all". */
  zone: string;
  /** Inclusive date window, ISO `YYYY-MM-DD`. */
  from: string;
  to: string;
  days: PriceRuleDays;
  mode: PriceRuleMode;
  /** € for `set`/`addAbs`, percent for `addPct` (may be negative). */
  amount: number;
  enabled: boolean;
}
