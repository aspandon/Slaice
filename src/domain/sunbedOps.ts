// On-the-beach sunbed status (AENR-499): what staff see and set per set and
// date — a small state machine with a reason and a logged history. The live
// availability every persona renders applies these on top of the layout.

export type OpsStatus = "available" | "booked" | "occupied" | "vacated" | "hold" | "blocked";
export const OPS_LABEL: Record<OpsStatus, string> = {
  available: "Available",
  booked: "Booked",
  occupied: "Occupied — in use",
  vacated: "Vacated — day finished",
  hold: "On hold",
  blocked: "Out of service",
};
export const BLOCK_REASONS = ["Broken", "Cleaning", "Weather", "Private event", "Other"];

/** Allowed transitions; the panel only offers these. */
export const TRANSITIONS: Record<OpsStatus, OpsStatus[]> = {
  available: ["hold", "blocked"],
  booked: ["occupied", "available", "hold", "blocked"],
  occupied: ["vacated"],
  vacated: ["available"],
  hold: ["available", "blocked"],
  blocked: ["available"],
};
/** Changes that need a reason (and, for booked → available, a confirmation). */
export const needsReason = (from: OpsStatus, to: OpsStatus) =>
  to === "blocked" || to === "hold" || (from === "booked" && to === "available");

export interface OpsEntry {
  status: OpsStatus;
  reason?: string;
  note?: string;
  by: string;
  at: string;
}
export interface OpsHistory {
  setId: string;
  date: string;
  from: OpsStatus;
  to: OpsStatus;
  reason?: string;
  note?: string;
  by: string;
  at: string;
}
export interface SunbedOpsState {
  /** `${date}|${setId}` → current staff-set status. */
  status: Record<string, OpsEntry>;
  history: OpsHistory[];
}
export const DEFAULT_SUNBED_OPS: SunbedOpsState = { status: {}, history: [] };
export const opsKey = (date: string, setId: string) => `${date}|${setId}`;

/** Effective status: a staff override, else what the live map says (booked/held/free). */
export function opsStatus(
  ops: SunbedOpsState,
  date: string,
  setId: string,
  mapState: "a" | "h" | "u",
): OpsStatus {
  return (
    ops.status[opsKey(date, setId)]?.status ??
    (mapState === "u" ? "booked" : mapState === "h" ? "hold" : "available")
  );
}
/** How a staff status shows on the shared map: free, on hold or taken. */
export function opsToMap(s: OpsStatus): "a" | "h" | "u" {
  return s === "available" ? "a" : s === "hold" ? "h" : "u";
}
