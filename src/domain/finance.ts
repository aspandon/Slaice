// A tenant's payment set-up (AENR-521 / 527): the POS terminals at the beach,
// the e-invoicing provider that transmits documents to AADE myDATA, and the
// accountant's month-end state. What Slaice earns — commission, guest service
// fees, VAT per service, corporate tax, support fee and subscription — lives in
// the tenant's commercial terms (domain/economics, AENR-725 / 689); the fee
// lines that used to be configured here were migrated into them.

import type { LegacyFeeLine } from "./economics";

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
  terminals?: PosTerminal[];
  provider: EInvoiceProvider;
  providerConnected: boolean;
  /** Month-end state per month "YYYY-MM" (AENR-614): what Prepare fixed, and when the month was closed. */
  months?: Record<string, MonthClose>;
}
export interface MonthClose {
  prepared?: { at: string; resent: number; creditNotes: number };
  /** Rejected documents the accountant corrected and re-sent. */
  corrected?: number;
  closedAt?: string;
}

export const DEFAULT_FINANCE: FinanceConfig = {
  terminals: [
    { id: "T1", name: "Terminal 1 · Entrance", online: true },
    { id: "T2", name: "Terminal 2 · Bar", online: true },
    { id: "T3", name: "Terminal 3 · Mobile (beach)", online: true },
  ],
  provider: "Elorus",
  providerConnected: true,
};

/** A config saved before AENR-725 still carries its fee lines (read once, to migrate them into the terms). */
export type LegacyFinanceConfig = FinanceConfig & { fees?: LegacyFeeLine[]; settlement?: string };
/** A saved config without the retired fields. */
export function stripLegacyFinance(c: LegacyFinanceConfig): FinanceConfig {
  const out: LegacyFinanceConfig = { ...c };
  delete out.fees;
  delete out.settlement;
  return out;
}
