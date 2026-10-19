// Reporting periods — one model for every "Day / Week / Month / Year / Season /
// Custom" control in the app (Dashboard, Reporting, Bookings, Refunds). Pure,
// framework-free functions: resolve a period to concrete dates, step it, find
// the comparison period, pick a chart granularity and (de)serialise it for the
// URL. Dates are ISO `YYYY-MM-DD` strings in local time.

export type PeriodPreset = "day" | "week" | "month" | "year" | "season";
export type Period =
  | { kind: "all" }
  | { kind: "preset"; preset: PeriodPreset; offset: number } // offset 0 = current, -1 = previous…
  | { kind: "custom"; from: string; to: string };

export interface DateRange {
  from: string;
  to: string;
}
export type Granularity = "hour" | "day" | "week" | "month";

/** The mockup's "today": a peak-season Sunday that the sample bookings, refunds
 *  and daily operations are anchored to. The live calendar date is outside the
 *  2026 season, so every period resolves relative to this day instead. */
export const DEMO_TODAY = "2026-07-19";

/** The beach season (inclusive); outside it the beach is closed. */
export const SEASON_START = { month: 5, day: 1 }; // 1 May
export const SEASON_END = { month: 9, day: 30 }; // 30 Sep

/* ---------- ISO date arithmetic (local time, DST-safe) ---------- */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // noon avoids DST edge cases
}
export function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return fmtISO(d);
}
/** Inclusive number of days in a range. */
export function daysIn(r: DateRange): number {
  return Math.round((parseISO(r.to).getTime() - parseISO(r.from).getTime()) / 86400000) + 1;
}
export function eachDay(r: DateRange): string[] {
  const out: string[] = [];
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) out.push(d);
  return out;
}
const isoOf = (y: number, m: number, d: number) => fmtISO(new Date(y, m - 1, d, 12));
const lastOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const isValidISO = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && fmtISO(parseISO(s)) === s;

export function isSeasonDay(iso: string): boolean {
  const d = parseISO(iso);
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  return (
    md >= SEASON_START.month * 100 + SEASON_START.day &&
    md <= SEASON_END.month * 100 + SEASON_END.day
  );
}

/* ---------- Resolve a period to dates ---------- */
/** The current (offset 0) or a past/future (offset ≠ 0) instance of a preset.
 *  Presets are "to date": the current week/month/year/season ends today. */
function presetRange(preset: PeriodPreset, offset: number, today: string): DateRange {
  const t = parseISO(today);
  const y = t.getFullYear();
  const m = t.getMonth() + 1;
  switch (preset) {
    case "day": {
      const d = addDays(today, offset);
      return { from: d, to: d };
    }
    case "week": {
      const dow = (t.getDay() + 6) % 7; // Monday = 0
      const mon = addDays(today, -dow + offset * 7);
      return { from: mon, to: offset === 0 ? today : addDays(mon, 6) };
    }
    case "month": {
      const first = new Date(y, m - 1 + offset, 1, 12);
      const fy = first.getFullYear();
      const fm = first.getMonth() + 1;
      return {
        from: isoOf(fy, fm, 1),
        to: offset === 0 ? today : isoOf(fy, fm, lastOfMonth(fy, fm)),
      };
    }
    case "year": {
      const yy = y + offset;
      return { from: isoOf(yy, 1, 1), to: offset === 0 ? today : isoOf(yy, 12, 31) };
    }
    case "season": {
      const yy = y + offset;
      const end = isoOf(yy, SEASON_END.month, SEASON_END.day);
      return {
        from: isoOf(yy, SEASON_START.month, SEASON_START.day),
        to: offset === 0 && today < end ? today : end,
      };
    }
  }
}

/** Concrete dates for a period. `all` has no dates (callers skip filtering). */
export function resolveRange(p: Period, today = DEMO_TODAY): DateRange | null {
  if (p.kind === "all") return null;
  if (p.kind === "custom") return { from: p.from, to: p.to };
  return presetRange(p.preset, p.offset, today);
}

/** The equal-length period immediately before `r` — the default comparison. */
export function previousRange(r: DateRange): DateRange {
  const n = daysIn(r);
  return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
}
/** The same dates one year earlier — the "vs last year" comparison. */
export function lastYearRange(r: DateRange): DateRange {
  const shift = (iso: string) => {
    const d = parseISO(iso);
    return isoOf(
      d.getFullYear() - 1,
      d.getMonth() + 1,
      Math.min(d.getDate(), lastOfMonth(d.getFullYear() - 1, d.getMonth() + 1)),
    );
  };
  return { from: shift(r.from), to: shift(r.to) };
}

/** Chart bucket size that keeps a series readable for the range length. */
export function granularityFor(r: DateRange): Granularity {
  const n = daysIn(r);
  if (n <= 2) return "hour";
  if (n <= 31) return "day";
  if (n <= 183) return "week";
  return "month";
}

/** Step a preset back/forward (offset), never past the current period. */
export function stepPeriod(p: Period, dir: -1 | 1): Period {
  if (p.kind !== "preset") return p;
  return { ...p, offset: Math.min(0, p.offset + dir) };
}

/* ---------- Validation ---------- */
export const RANGE_MIN = "2025-01-01";
export const RANGE_MAX_DAYS = 366;
/** Why a custom range can't be applied, or null when it's fine. */
export function rangeError(from: string, to: string, today = DEMO_TODAY): string | null {
  if (!isValidISO(from) || !isValidISO(to)) return "Pick a start and an end date.";
  if (to < from) return "The end date must be on or after the start date.";
  if (from < RANGE_MIN) return "Data is available from 1 Jan 2025.";
  if (to > today) return "The range can't end after today.";
  if (daysIn({ from, to }) > RANGE_MAX_DAYS) return "Choose a range of one year or less.";
  return null;
}

/* ---------- Labels ---------- */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function fmtDay(iso: string, withYear = false): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
}
export function fmtWeekday(iso: string): string {
  return WK[parseISO(iso).getDay()];
}
export function fmtMonth(iso: string): string {
  return MON[parseISO(iso).getMonth()];
}
/** "19 Jul 2026", "13 – 19 Jul 2026", "28 Jun – 4 Jul 2026", "1 Dec 2025 – 3 Jan 2026". */
export function rangeLabel(r: DateRange): string {
  if (r.from === r.to) return fmtDay(r.from, true);
  const a = parseISO(r.from);
  const b = parseISO(r.to);
  if (a.getFullYear() !== b.getFullYear()) return `${fmtDay(r.from, true)} – ${fmtDay(r.to, true)}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${fmtDay(r.to, true)}`;
  return `${fmtDay(r.from)} – ${fmtDay(r.to, true)}`;
}
/** What a period is compared with: the same dates last year for whole
 *  years/seasons (the previous equal-length window would be the closed
 *  off-season), the previous equal-length window otherwise. */
export function comparisonRange(p: Period, r: DateRange): DateRange {
  return p.kind === "preset" && (p.preset === "season" || p.preset === "year")
    ? lastYearRange(r)
    : previousRange(r);
}
/** Short noun for the comparison line under a KPI. */
export function comparisonLabel(p: Period): string {
  if (p.kind !== "preset") return "vs previous period";
  return {
    day: "vs previous day",
    week: "vs previous week",
    month: "vs previous month",
    year: "vs same dates last year",
    season: "vs same dates last season",
  }[p.preset];
}
/** "today", "this week"… for the current preset; the dates otherwise. */
export function periodNoun(p: Period, today = DEMO_TODAY): string {
  if (p.kind === "preset" && p.offset === 0) {
    return {
      day: "today",
      week: "this week",
      month: "this month",
      year: "this year",
      season: "this season",
    }[p.preset];
  }
  const r = resolveRange(p, today);
  return r ? rangeLabel(r) : "all dates";
}

/* ---------- URL (de)serialisation ----------
   `period=week` · `period=week-1` (previous week) · `from=2026-07-01&to=2026-07-15` · `period=all` */
export function periodToParams(p: Period): Record<string, string> {
  if (p.kind === "all") return { period: "all" };
  if (p.kind === "custom") return { from: p.from, to: p.to };
  return { period: p.offset ? `${p.preset}${p.offset}` : p.preset };
}
export function periodFromParams(
  params: URLSearchParams,
  fallback: Period,
  today = DEMO_TODAY,
): Period {
  const from = params.get("from");
  const to = params.get("to");
  if (from && to && !rangeError(from, to, today)) return { kind: "custom", from, to };
  const raw = params.get("period");
  if (raw === "all") return { kind: "all" };
  const m = raw?.match(/^(day|week|month|year|season)(-\d+)?$/);
  if (m) return { kind: "preset", preset: m[1] as PeriodPreset, offset: m[2] ? Number(m[2]) : 0 };
  return fallback;
}
export const samePeriod = (a: Period, b: Period) =>
  JSON.stringify(periodToParams(a)) === JSON.stringify(periodToParams(b));

/** Sample-data dates like "19 Jul" or "Sun, 19 Jul" (2026 season) → ISO. */
export function isoFromDayMonth(label: string, year = 2026): string | null {
  const m = label.match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const mi = MON.indexOf(m[2]);
  return mi < 0 ? null : isoOf(year, mi + 1, Number(m[1]));
}
/** Whether an ISO date falls inside a range (null range = all dates). */
export const inRange = (iso: string | null, r: DateRange | null) =>
  !r || (!!iso && iso >= r.from && iso <= r.to);
