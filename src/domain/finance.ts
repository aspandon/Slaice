// Tenant fee model and e-invoicing provider (AENR-521). The fee lines are
// configured per tenant on the Platform side; the Reporting › Payments tab
// always computes from them, so a pricing change is a settings change only.

export type FeeBasis = "perOnlineSet" | "perEntryPerson" | "pctBooking" | "fixedBooking";
export type FeePayer = "customer" | "tenant";

export interface FeeLine {
  id: string;
  name: string;
  basis: FeeBasis;
  /** € per unit / per booking, or % for pctBooking. */
  amount: number;
  /** customer = service fee on top of the beach price; tenant = platform fee (commission). */
  payer: FeePayer;
  /** VAT rate charged on the fee (0.24 = 24%). */
  vat: number;
  /** ISO date the line applies from. */
  from: string;
  active: boolean;
}

export const E_INVOICE_PROVIDERS = [
  "Elorus",
  "Epsilon Digital",
  "SoftOne",
  "Direct myDATA (no provider)",
] as const;
export type EInvoiceProvider = (typeof E_INVOICE_PROVIDERS)[number];

/** A card terminal at the beach (AENR-527). */
export interface PosTerminal {
  id: string;
  name: string;
  online: boolean;
}
export interface FinanceConfig {
  fees: FeeLine[];
  terminals?: PosTerminal[];
  settlement: "monthly" | "weekly";
  provider: EInvoiceProvider;
  providerConnected: boolean;
}

export const FEE_BASIS_LABEL: Record<FeeBasis, string> = {
  perOnlineSet: "per online sunbed set",
  perEntryPerson: "per entry person (online)",
  pctBooking: "of captured value",
  fixedBooking: "per booking",
};

/** Demo defaults — editable; exact pricing to be confirmed by the product owner. */
export const DEFAULT_FINANCE: FinanceConfig = {
  fees: [
    {
      id: "fee-online",
      name: "Online booking fee",
      basis: "perOnlineSet",
      amount: 2.5,
      payer: "customer",
      vat: 0.24,
      from: "2026-05-01",
      active: true,
    },
    {
      id: "fee-entry",
      name: "Entry ticket fee",
      basis: "perEntryPerson",
      amount: 0.5,
      payer: "customer",
      vat: 0.24,
      from: "2026-05-01",
      active: true,
    },
    {
      id: "fee-platform",
      name: "Slaice platform fee",
      basis: "pctBooking",
      amount: 5,
      payer: "tenant",
      vat: 0.24,
      from: "2026-05-01",
      active: true,
    },
  ],
  terminals: [
    { id: "T1", name: "Terminal 1 · Entrance", online: true },
    { id: "T2", name: "Terminal 2 · Bar", online: true },
    { id: "T3", name: "Terminal 3 · Mobile (beach)", online: true },
  ],
  settlement: "monthly",
  provider: "Elorus",
  providerConnected: true,
};

export const feeLabel = (f: FeeLine) =>
  f.basis === "pctBooking"
    ? `${f.amount}% ${FEE_BASIS_LABEL[f.basis]}`
    : `€${f.amount} ${FEE_BASIS_LABEL[f.basis]}`;
export const basisOption = (b: FeeBasis) =>
  b === "pctBooking" ? "% of captured value" : FEE_BASIS_LABEL[b];

/** Volumes a fee line can be charged on, for one period. */
export interface FeeBase {
  onlineSets: number;
  entryPersons: number;
  captured: number;
  bookings: number;
}
export function feeAmount(f: FeeLine, b: FeeBase): number {
  if (!f.active) return 0;
  const v =
    f.basis === "perOnlineSet"
      ? b.onlineSets * f.amount
      : f.basis === "perEntryPerson"
        ? b.entryPersons * f.amount
        : f.basis === "fixedBooking"
          ? b.bookings * f.amount
          : (b.captured * f.amount) / 100;
  return Math.round(v * 100) / 100;
}
export const feeUnits = (f: FeeLine, b: FeeBase) =>
  f.basis === "perOnlineSet"
    ? b.onlineSets
    : f.basis === "perEntryPerson"
      ? b.entryPersons
      : f.basis === "fixedBooking"
        ? b.bookings
        : null;
