// Structured list filters — pure helpers shared by any filterable list
// (Bookings, later Users & Segments). Values combine with AND across filters
// and OR within a filter. State round-trips through the URL query.

export type AmountOp = "gt" | "lt" | "between";
export interface AmountFilter {
  op: AmountOp;
  a: number | null;
  b: number | null;
}
export type FilterValue = string[] | AmountFilter;
export type FilterState = Record<string, FilterValue | undefined>;

export type FilterDef =
  | { key: string; label: string; kind: "multi"; options: { v: string; l: string }[] }
  | { key: string; label: string; kind: "amount"; unit?: string };

export const isAmount = (v: FilterValue | undefined): v is AmountFilter => !!v && !Array.isArray(v);

/** Why an amount filter can't be applied, or null. */
export function amountError(f: AmountFilter): string | null {
  if (f.a === null || Number.isNaN(f.a)) return "Enter an amount.";
  if (f.a < 0) return "Amounts can't be negative.";
  if (f.op === "between") {
    if (f.b === null || Number.isNaN(f.b)) return "Enter both amounts.";
    if (f.b < f.a) return "The maximum must be greater than the minimum.";
  }
  return null;
}
export function matchAmount(n: number, f: AmountFilter): boolean {
  if (amountError(f)) return true; // incomplete filters don't hide rows
  if (f.op === "gt") return n > (f.a as number);
  if (f.op === "lt") return n < (f.a as number);
  return n >= (f.a as number) && n <= (f.b as number);
}
export function amountLabel(f: AmountFilter, unit = "€"): string {
  if (f.op === "gt") return `more than ${unit}${f.a}`;
  if (f.op === "lt") return `less than ${unit}${f.a}`;
  return `${unit}${f.a} – ${unit}${f.b}`;
}

/** Number of active filters (each selected option counts once). */
export function activeCount(s: FilterState): number {
  return Object.values(s).reduce<number>(
    (a, v) => a + (Array.isArray(v) ? v.length : v && !amountError(v) ? 1 : 0),
    0,
  );
}

/* ---------- URL ---------- `channel=Online,Phone` · `amount=gt:40` · `amount=between:20:50` */
export function filtersToParams(defs: FilterDef[], s: FilterState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of defs) {
    const v = s[d.key];
    if (Array.isArray(v) && v.length) out[d.key] = v.join(",");
    if (isAmount(v) && !amountError(v))
      out[d.key] = [v.op, v.a, v.op === "between" ? v.b : null].filter((x) => x !== null).join(":");
  }
  return out;
}
export function filtersFromParams(defs: FilterDef[], params: URLSearchParams): FilterState {
  const s: FilterState = {};
  for (const d of defs) {
    const raw = params.get(d.key);
    if (!raw) continue;
    if (d.kind === "multi") {
      const allowed = new Set(d.options.map((o) => o.v));
      const vals = raw.split(",").filter((x) => allowed.has(x));
      if (vals.length) s[d.key] = vals;
    } else {
      const [op, a, b] = raw.split(":");
      if (op === "gt" || op === "lt" || op === "between") {
        const f: AmountFilter = { op, a: a ? Number(a) : null, b: b ? Number(b) : null };
        if (!amountError(f)) s[d.key] = f;
      }
    }
  }
  return s;
}
