// Seed for back-office booking operations (AENR-579, 583): the refund
// requests waiting for a decision when the demo starts. Everything staff do
// afterwards (decisions, moves, resent QRs) is demo state in the app store.

import { DEMO_TODAY } from "../domain/period";
import { DEFAULT_RULES, type BookingOpsState, type RefundRequest } from "../domain/bookingOps";

/** The back office's "now" — the demo day, late morning. */
export const DEMO_NOW = `${DEMO_TODAY}T11:00`;

const SEED_REFUNDS: RefundRequest[] = [
  {
    id: "RR-1041",
    bookingId: "#BK-10419",
    tx: "#TX-88216",
    who: "Anna",
    amount: 30,
    reason: "Weather (wind)",
    requestedAt: `${DEMO_TODAY}T08:40`,
    requestedBy: "Guest · online",
    status: "pending",
  },
  {
    id: "RR-1040",
    tx: "#TX-88210",
    who: "Maria",
    amount: 30,
    reason: "Customer request",
    requestedAt: "2026-07-18T16:10",
    requestedBy: "Call Center",
    status: "pending",
  },
  {
    id: "RR-1036",
    tx: "#TX-87810",
    who: "Eleni",
    amount: 25,
    reason: "Service issue",
    requestedAt: "2026-07-17T09:25",
    requestedBy: "Guest · e-mail",
    status: "pending",
  },
  {
    id: "RR-1031",
    tx: "#TX-87601",
    who: "Marina",
    amount: 15,
    reason: "Double booking",
    requestedAt: "2026-07-16T18:02",
    requestedBy: "Call Center",
    status: "pending",
  },
];

export const DEFAULT_BOOKING_OPS: BookingOpsState = {
  events: {},
  moves: {},
  refunds: SEED_REFUNDS,
  seq: 1041,
  rules: DEFAULT_RULES,
  arrivals: {},
};
