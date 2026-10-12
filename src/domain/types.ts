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

/** A staff note on a booking (e.g. from the call centre); `escalated` flags it
 *  for a manager — such as a refund request the agent can't action. */
export interface BookingNote {
  text: string;
  at: string; // ISO timestamp
  by: string; // persona label of the author
  escalated: boolean;
}

/** Tenant staff roles that can be assigned to a user (RBAC). Customer is not a
 *  staff role and Platform / Slaice is the platform back office, not a tenant role. */
export type StaffRole = "admin" | "callcenter" | "cashier" | "controller" | "support" | "accountant";
export type StaffStatus = "active" | "invited" | "suspended";
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  /** ISO timestamp, or null if the user never signed in. */
  lastSignIn: string | null;
  created: string; // ISO date
  suspendReason?: string;
}
export interface StaffAuditEntry {
  at: string; // ISO timestamp
  by: string;
  action: string;
}

/** Guest CRM state (Users & Segments) — persisted demo state. Segments and
 *  tag definitions are the tenant's; `edits` overlays the seed customers. */
export interface CrmState {
  segments: import("./segments").Segment[];
  tagDefs: { name: string; color: string }[];
  edits: Record<number, Partial<Customer>>;
  /** Visits after which a guest counts as Regular (system rule). */
  regularAfter: number;
  /** Lifecycle thresholds (AENR-475). */
  lifecycle: import("./lifecycle").LifecycleSettings;
  /** Optional guest-list columns the admin chose to show. */
  columns: string[];
  /** Guests added by CSV import (AENR-476). */
  imported: Customer[];
  /** Guest ids merged into another record (hidden from the list). */
  mergedAway: number[];
  /** Guests with a GDPR erasure request raised from the CRM. */
  eraseRequests: number[];
  /** 360° profile data per guest (AENR-477). */
  profiles: Record<number, GuestProfileData>;
  /** Tenant-defined guest fields. */
  customFields: { id: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[] }[];
}
export interface GuestProfileData {
  prefs?: { zone?: string; sunbed?: string; party?: string; arrival?: string; needs?: string; contact?: string };
  notes?: { text: string; at: string; by: string }[];
  important?: boolean;
  consent?: Record<string, { on: boolean; at: string; source: string }>;
  custom?: Record<string, string>;
  /** Art. 18 — data kept but not used (no marketing, profiling or edits). */
  restricted?: boolean;
}

export type PersonaId =
  | "customer"
  | "admin"
  | "callcenter"
  | "cashier"
  | "controller"
  | "support"
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
  /** Structured details for the order, My Bookings and live availability (AENR-524/532). */
  setId?: string;
  zoneId?: string;
  date?: string;
  /** People on a ticket line. */
  qty?: number;
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
export type SunbedKind = "standard" | "front" | "cabana" | "daybed" | "vip";

export interface SunbedSlot {
  id: string;
  x: number;
  y: number;
  state: SunbedState;
  /** Default €/day for this set (used when it has no price category). */
  price: number;
  kind?: SunbedKind;
  /** Price category id (AENR-469). */
  cat?: string;
  /** Step-free / near the ramp — shown with an accessibility icon. */
  access?: boolean;
  /** Persons the set seats (default 2). */
  cap?: number;
  /** Derived, never stored: why the set can't be sold on this channel/date (hold, allocation, stop-sell). */
  inv?: string;
}

/* ---------- Beach workspace: price categories, date overrides, landmarks (AENR-469) ---------- */
/** A colour-coded price category per store, e.g. "Front row · FR · €45". */
export interface PriceCategory {
  id: string;
  zoneId: string;
  name: string;
  /** Short code shown on the map next to the colour (never colour alone). */
  code: string;
  color: string;
  /** Default €/day. */
  price: number;
  /** Optional minimum spend shown to guests (information only). */
  minSpend?: number;
}
/** A per-sunbed price for a date window — wins over every other rule. */
export interface PriceOverride {
  id: string;
  zoneId: string;
  setIds: string[];
  from: string;
  to: string;
  days: PriceRuleDays;
  price: number;
  label: string;
  /** Where it came from — "suggestion" for an accepted demand-pricing suggestion (AENR-513). */
  source?: "manual" | "suggestion";
  /** Price category the override was made for (suggestions are per category). */
  catId?: string;
}
/** Demand-pricing band for a price category (AENR-513). */
export interface DemandBand {
  catId: string;
  enabled: boolean;
  wkMin: number;
  wkMax: number;
  weMin: number;
  weMax: number;
  step: number;
}
export interface DemandLogEntry {
  id: string;
  at: string;
  date: string;
  zoneId: string;
  catId: string;
  from: number;
  to: number;
  reason: string;
  overrideId: string;
  mode: "accepted" | "auto";
  reverted?: boolean;
}
export type LandmarkKind = "bar" | "shower" | "wc" | "lifeguard" | "entrance" | "ramp" | "path";
/** A non-bookable map object that orients guests and staff. */
export interface Landmark {
  id: string;
  zoneId: string;
  kind: LandmarkKind;
  x: number;
  y: number;
  label?: string;
}
export interface BeachPricing {
  categories: PriceCategory[];
  overrides: PriceOverride[];
  landmarks: Landmark[];
  /** Demand pricing (AENR-513): bands, locked date|category keys, auto-apply and its log. */
  demand?: DemandBand[];
  demandLocks?: string[];
  demandAuto?: boolean;
  demandLog?: DemandLogEntry[];
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
  /** Heading this item sits under in the sidebar / nav sheet (e.g. Support Agent: Gate · Beach · Till). */
  group?: string;
  /** "account" marks personal destinations kept out of the desktop primary nav. */
  area?: string;
}

/* ---------- Tickets ---------- */
/** A tenant ticket category id (Admin › Entry tickets, AENR-529) — seeded adult, amea, resident, child, senior. */
export type TicketCategory = string;

/* ---------- Consent / GDPR ---------- */
export interface Consent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
  ts: string | null;
  /** Privacy-notice version the choice was made under (AENR-485). */
  version?: string;
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

/* ---------- Communicate: channel connections ----------
   The admin connects the tenant's real Email / Viber / SMS providers so those
   channels can actually send. Push is in-app (no setup). Connection state is
   persisted for the mockup. */
export type ChannelKey = "push" | "email" | "viber" | "sms";
export interface ChannelConnection {
  connected: boolean;
  /** Provider chosen during setup, e.g. "SendGrid", "Twilio". */
  provider?: string;
  /** Verified sender — from-address / sender id / number. */
  sender?: string;
  /** ISO timestamp the connection was completed. */
  connectedAt?: string;
}
export type ChannelSetupState = Record<ChannelKey, ChannelConnection>;

/* ---------- Passes: wallet card designs ----------
   An admin-designed membership/pass card. Text, colours, the logo and the QR
   are all editable and draggable on the card, then published; the same design
   drives the customer card and its Apple / Google Wallet rendition. Positions
   are a percentage of the card (0–100). Persisted for the mockup. */
export interface CardElement {
  /** Position as a percentage of the card face. */
  x: number;
  y: number;
}
export interface CardText extends CardElement {
  text: string;
  /** Font size in px (at the card's design size). */
  size: number;
  color: string;
  /** Letter-spacing in px. */
  tracking?: number;
  weight?: number;
  align?: "left" | "center" | "right";
}
export interface PassDesign {
  id: string;
  /** Internal name in the designer list. */
  name: string;
  /** Two-stop background gradient. */
  bg: [string, string];
  /** Decorative wave band colour at the foot of the card. */
  wave: string;
  title: CardText;
  subtitle: CardText;
  holder: CardText;
  number: CardText;
  validUntil: CardText;
  /** Logo (tenant mark) — a data URL or a public path; null hides it. */
  logo: { src: string | null } & CardElement & { scale: number };
  qr: { show: boolean } & CardElement & { scale: number };
  published: boolean;
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
  /* — calendar extensions (AENR-511), all optional — */
  /** standard (default) · early-bird (booked ≥ `lead` days ahead) · last-minute
   *  (same day from `after`) · multi-day (stay of ≥ `minDays` consecutive days). */
  kind?: "standard" | "earlybird" | "lastminute" | "multiday";
  /** Specific dates (holidays, a selection on the calendar) — replaces from/to/days. */
  dates?: string[];
  /** Specific weekdays 0 (Sun) – 6 (Sat) — replaces `days`. */
  dow?: number[];
  /** Price categories it applies to; empty / absent = all. */
  cats?: string[];
  lead?: number;
  after?: string;
  minDays?: number;
}

/* ---------- Booking restrictions (AENR-511) ---------- */
export type RestrictionKind = "minDays" | "maxDays" | "window" | "cutoff" | "closed";
export interface Restriction {
  id: string;
  label: string;
  /** Zone id or "all". */
  zone: string;
  from: string;
  to: string;
  days: PriceRuleDays;
  dow?: number[];
  dates?: string[];
  kind: RestrictionKind;
  /** minDays / maxDays: days · window: bookable up to N days ahead. */
  value?: number;
  /** cutoff: same-day online booking closes at HH:MM. */
  time?: string;
  enabled: boolean;
}
export interface SeasonTemplate {
  id: string;
  name: string;
  /** % change applied on top of category prices. */
  pct: number;
}
export interface CalendarState {
  restrictions: Restriction[];
  templates: SeasonTemplate[];
}
