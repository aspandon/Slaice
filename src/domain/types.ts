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

export type LangCode = "EN" | "ΕΛ" | "DE" | "FR";

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
  name: string;
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
