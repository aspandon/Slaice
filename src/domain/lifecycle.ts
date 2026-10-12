// Guest lifecycle stages and RFM scoring (AENR-475). Pure functions over the
// derived guest facts; thresholds are tenant settings (CRM state).

import type { GuestFacts } from "../data/guests";
import { addDays, daysIn } from "./period";
import type { FieldDef } from "./segments";

export interface LifecycleSettings {
  /** No visit for more than this many days → At risk. */
  atRiskDays: number;
  /** No visit for more than this many days → Lapsed. */
  lapsedDays: number;
}
export const DEFAULT_LIFECYCLE: LifecycleSettings = { atRiskDays: 14, lapsedDays: 35 };

export const STAGES = ["First visit", "Active", "Regular", "At risk", "Lapsed"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_TONE: Record<Stage, string> = {
  "First visit": "green",
  Active: "blue",
  Regular: "slate",
  "At risk": "amber",
  Lapsed: "red",
};
export const STAGE_HELP: Record<Stage, string> = {
  "First visit": "Has visited once so far",
  Active: "Visited more than once, recently",
  Regular: "Past the Regular visit threshold, recently",
  "At risk": "Hasn't come back for a while",
  Lapsed: "Gone quiet — win-back candidates",
};

export function stageOf(g: GuestFacts, regularAfter: number, s: LifecycleSettings): Stage {
  if (g.daysSinceLast > s.lapsedDays) return "Lapsed";
  if (g.daysSinceLast > s.atRiskDays) return "At risk";
  if (g.visits > regularAfter) return "Regular";
  if (g.visits >= 2) return "Active";
  return "First visit";
}

/* ---------- RFM ----------
   Recency, Frequency, Monetary scored 1–5 by quintile within the guest base
   (5 = best: most recent, most visits, highest spend). */
export interface Rfm {
  r: number;
  f: number;
  m: number;
  label: string;
}
export const RFM_LABELS = [
  "Champions",
  "Loyal",
  "Potential",
  "Needs attention",
  "At risk",
  "Hibernating",
] as const;
export const RFM_TONE: Record<string, string> = {
  Champions: "green",
  Loyal: "blue",
  Potential: "indigo",
  "Needs attention": "amber",
  "At risk": "red",
  Hibernating: "slate",
};

function quintile(values: number[], v: number, higherIsBetter: boolean): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.filter((x) => (higherIsBetter ? x < v : x > v)).length;
  return Math.min(5, 1 + Math.floor((rank / Math.max(1, sorted.length)) * 5));
}
export function rfmLabel(r: number, f: number, m: number): string {
  if (r >= 4 && f >= 4 && m >= 4) return "Champions";
  if (f >= 4 && r >= 3) return "Loyal";
  if (r >= 4) return "Potential";
  if (r <= 2 && f >= 3) return "At risk";
  if (r === 3) return "Needs attention";
  return "Hibernating";
}
export function rfmScores(all: GuestFacts[]): Map<number, Rfm> {
  const rec = all.map((g) => g.daysSinceLast);
  const freq = all.map((g) => g.visits);
  const mon = all.map((g) => g.spend);
  return new Map(
    all.map((g) => {
      const r = quintile(rec, g.daysSinceLast, false);
      const f = quintile(freq, g.visits, true);
      const m = quintile(mon, g.spend, true);
      return [g.id, { r, f, m, label: rfmLabel(r, f, m) }];
    }),
  );
}

/** Expected next visit: last visit + the guest's average gap between visits. */
export function predictedNextVisit(g: GuestFacts): string | null {
  if (g.visits < 2) return null;
  const span = daysIn({ from: g.firstVisit, to: g.lastVisit }) - 1;
  const gap = Math.max(1, Math.round(span / (g.visits - 1)));
  return addDays(g.lastVisit, gap);
}

/** Lifecycle stage and RFM label as segment fields (AENR-475). */
export const SCORE_FIELDS: FieldDef[] = [
  { key: "lifecycle", label: "Lifecycle stage", type: "enum", group: "Scores", options: [...STAGES], get: (g) => g.lifecycle ?? "" },
  { key: "rfm", label: "RFM segment", type: "enum", group: "Scores", options: [...RFM_LABELS], get: (g) => g.rfm ?? "" },
];
