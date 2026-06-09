import { Btn } from "./ui";

/* Shared table helpers — sortable headers + a pager, used by the Bookings and
   e-Invoicing lists. Kept out of the ui barrel so it can import Btn without a
   circular dependency. */

export type SortState = { key: string; dir: 1 | -1 } | null;

export function SortHeader({ label, k, sort, onSort, align }: { label: string; k: string; sort: SortState; onSort: (k: string) => void; align?: "right" }) {
  const active = sort?.key === k;
  const arrow = !active ? "▼" : sort?.dir === 1 ? "▲" : "▼";
  return (
    <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-navy-900 transition ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-navy-900" : ""}`}>
      {label}
      <span className={`text-[9px] leading-none ${active ? "text-teal-600" : "text-slate-300"}`}>{arrow}</span>
    </button>
  );
}

const MONTHS_IDX: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
/** "19 Jul" → a sortable number (month·100 + day). */
export const dateVal = (d: string) => { const [day, mon] = d.split(" "); return (MONTHS_IDX[mon] ?? 0) * 100 + (parseInt(day, 10) || 0); };
/** "€120" / "−€22" → signed number for sorting. */
export const moneyVal = (a: string) => (parseInt(a.replace(/[^0-9]/g, ""), 10) || 0) * (a.trim().startsWith("−") || a.trim().startsWith("-") ? -1 : 1);
export const cmpVal = (a: string | number, b: string | number) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)));

export function Pager({ page, pageCount, total, pageSize, onPage }: { page: number; pageCount: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const start = page * pageSize;
  const end = Math.min(total, start + pageSize);
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 flex-wrap">
      <span className="text-[12.5px] text-slate-500 tnum">Showing {start + 1}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <Btn size="sm" variant="ghost" disabled={page === 0} onClick={() => onPage(page - 1)}>Prev</Btn>
        {Array.from({ length: pageCount }, (_, i) => (
          <button key={i} type="button" onClick={() => onPage(i)} aria-current={i === page}
            className={`min-w-8 h-8 px-2 rounded-lg text-[12.5px] font-semibold tnum transition ${i === page ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{i + 1}</button>
        ))}
        <Btn size="sm" variant="ghost" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>Next</Btn>
      </div>
    </div>
  );
}
