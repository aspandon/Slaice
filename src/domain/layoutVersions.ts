// Beach layout drafts, published versions and scheduled layouts (AENR-514).
// The live layout (`beachLayout`) is what applies today; a version scheduled
// for a later date takes over from that date. Pure helpers only — the
// Workspace and every live map resolve "which layout on this date" here.

import type { BeachPricing, SunbedSlot, Zone } from "./types";

export interface KeptSet {
  zoneId: string;
  /** The set as it was before the change (old position / still present). */
  slot: SunbedSlot;
  /** Kept on the map up to and including this date (a booking needs it). */
  until: string;
}
export interface Reassignment {
  bookingId: string;
  from: string;
  to: string;
}
export interface LayoutVersion {
  id: string;
  no: number;
  name: string;
  /** Every zone's layout in this version; a missing zone means the default layout. */
  layouts: Record<string, SunbedSlot[]>;
  effectiveFrom: string;
  publishedAt: string;
  by: string;
  summary: string;
  kept?: KeptSet[];
  reassigned?: Reassignment[];
}
export interface SavedDraft {
  id: string;
  name: string;
  layouts: Record<string, SunbedSlot[]>;
  pricing: BeachPricing;
  updated: string;
  by: string;
}
export interface LayoutState {
  versions: LayoutVersion[];
  drafts: SavedDraft[];
}
export const DEFAULT_LAYOUT_STATE: LayoutState = {
  versions: [
    {
      id: "lv-1",
      no: 1,
      name: "Opening layout 2026",
      layouts: {},
      effectiveFrom: "2026-05-01",
      publishedAt: "2026-04-20T10:00:00",
      by: "Eleni Markou",
      summary: "First layout — 6 stores.",
    },
  ],
  drafts: [],
};

/** The version scheduled to apply on `date` (effective after today), if any. */
export function scheduledOn(
  versions: readonly LayoutVersion[],
  date: string,
  today: string,
): LayoutVersion | undefined {
  let hit: LayoutVersion | undefined;
  for (const v of versions) {
    if (v.effectiveFrom <= today || v.effectiveFrom > date) continue;
    if (
      !hit ||
      v.effectiveFrom > hit.effectiveFrom ||
      (v.effectiveFrom === hit.effectiveFrom && v.no > hit.no)
    )
      hit = v;
  }
  return hit;
}
/** The version whose layout applies on `date` (scheduled, else the latest already in force). */
export function versionOn(
  versions: readonly LayoutVersion[],
  date: string,
  today: string,
): LayoutVersion | undefined {
  return (
    scheduledOn(versions, date, today) ??
    [...versions]
      .filter((v) => v.effectiveFrom <= today)
      .sort((a, b) => a.no - b.no)
      .pop()
  );
}

/** A zone's layout on a date: a scheduled version from its date, else the live one, plus sets kept for bookings. */
export function layoutFor(
  zone: Zone,
  date: string,
  live: Record<string, SunbedSlot[]>,
  versions: readonly LayoutVersion[],
  today: string,
  fallback: (z: Zone) => SunbedSlot[],
  /** false = the layout alone, without sets kept for bookings (for diffs). */
  withKept = true,
): SunbedSlot[] {
  const sched = scheduledOn(versions, date, today);
  const base = (sched ? sched.layouts[zone.id] : live[zone.id]) ?? fallback(zone);
  if (!withKept) return base;
  const kept = versions
    .flatMap((v) => v.kept ?? [])
    .filter((k) => k.zoneId === zone.id && date <= k.until);
  if (!kept.length) return base;
  const keptIds = new Set(kept.map((k) => k.slot.id));
  return [...base.filter((s) => !keptIds.has(s.id)), ...kept.map((k) => k.slot)];
}

export interface ZoneDiff {
  added: string[];
  removed: string[];
  moved: string[];
  recat: string[];
}
/** What changed in one zone between two layouts. */
export function diffZone(before: readonly SunbedSlot[], after: readonly SunbedSlot[]): ZoneDiff {
  const b = new Map(before.map((s) => [s.id, s]));
  const a = new Map(after.map((s) => [s.id, s]));
  const d: ZoneDiff = { added: [], removed: [], moved: [], recat: [] };
  for (const s of after) {
    const o = b.get(s.id);
    if (!o) d.added.push(s.id);
    else {
      if (Math.abs(o.x - s.x) > 0.5 || Math.abs(o.y - s.y) > 0.5) d.moved.push(s.id);
      if ((o.cat ?? "") !== (s.cat ?? "")) d.recat.push(s.id);
    }
  }
  for (const s of before) if (!a.has(s.id)) d.removed.push(s.id);
  return d;
}
export const diffCount = (d: ZoneDiff) =>
  d.added.length + d.removed.length + d.moved.length + d.recat.length;
export function diffText(d: ZoneDiff): string {
  return [
    d.added.length && `${d.added.length} added`,
    d.removed.length && `${d.removed.length} removed`,
    d.moved.length && `${d.moved.length} moved`,
    d.recat.length && `${d.recat.length} category changed`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The set a booking is on after every reassignment. */
export function bookedSet(
  bookingId: string,
  setId: string,
  versions: readonly LayoutVersion[],
): string {
  let cur = setId;
  for (const v of [...versions].sort((a, b) => a.no - b.no))
    for (const r of v.reassigned ?? []) if (r.bookingId === bookingId && r.from === cur) cur = r.to;
  return cur;
}
