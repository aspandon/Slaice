/**
 * Data-access seam.
 *
 * Every function here resolves the in-bundle sample data after a short delay so
 * the UI exercises real loading / empty / error states. The whole point is that
 * the *inside* of these functions is the only thing that changes when a backend
 * arrives — swap `resolve(MOCK)` for `fetch("/api/...")` and no screen is
 * touched. There is deliberately **no database and no server** behind this
 * today; it is purely the front-end boundary that decouples screens from where
 * their data comes from.
 *
 * Screens should import from here (and consume it via `useAsync`) rather than
 * importing the `src/data/*` constants directly.
 */

import type {
  Customer,
  CustomerBooking,
  CustomerDocument,
  Zone,
} from "../domain/types";
import { CUSTOMER_BOOKINGS, CUSTOMER_DOCS, CUSTOMERS } from "../data/mock";
import { ZONES } from "../data/beach";

/** Simulated network latency (ms) so loading states are real, not cosmetic. */
const LATENCY_MS = 450;

function resolve<T>(value: T, ms: number = LATENCY_MS): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

/* ---------- Customer ---------- */
export function listCustomerBookings(): Promise<CustomerBooking[]> {
  return resolve(CUSTOMER_BOOKINGS as CustomerBooking[]);
}

export function listCustomerDocuments(): Promise<CustomerDocument[]> {
  return resolve(CUSTOMER_DOCS as CustomerDocument[]);
}

/* ---------- Admin / CRM ---------- */
export function listCustomers(): Promise<Customer[]> {
  return resolve(CUSTOMERS as Customer[]);
}

export function listZones(): Promise<Zone[]> {
  return resolve(ZONES as Zone[]);
}
