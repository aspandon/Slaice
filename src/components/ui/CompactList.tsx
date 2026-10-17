import type { ReactNode } from "react";
import { Icon } from "../../lib/icons";

/* A table's phone and tablet face (AENR-699, shared from AENR-701): one
   two-line row per record — who or what with its reference, a summary line,
   status chips — and the amount on the right. Tapping opens the record's
   detail, the same as a table row. Pages show it below the width where their
   Table fits (e.g. `lg:hidden` + `hidden lg:block`). */
export function CompactList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className="-mx-1 divide-y divide-slate-100" aria-label={label}>
      {children}
    </ul>
  );
}

export function CompactRow({
  title,
  reference,
  sub,
  badges,
  amount,
  onOpen,
  openLabel,
}: {
  title: ReactNode;
  /** Mono reference shown next to the title (booking id, document number…). */
  reference?: ReactNode;
  sub?: ReactNode;
  badges?: ReactNode;
  amount?: ReactNode;
  /** Opens the detail; without it the row is plain text. */
  onOpen?: () => void;
  openLabel?: string;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold text-navy-900 text-[15px] truncate">{title}</span>
          {reference && <span className="font-mono text-[12px] text-slate-500 shrink-0">{reference}</span>}
        </span>
        {sub && <span className="block text-[13px] text-slate-600 truncate">{sub}</span>}
        {badges && <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</span>}
      </span>
      <span className="shrink-0 flex items-center gap-1 pt-0.5">
        {amount && <span className="font-display font-bold text-navy-900 tnum text-[16px]">{amount}</span>}
        {onOpen && <Icon.chevR size={16} className="text-slate-400" />}
      </span>
    </>
  );
  const cls = "w-full text-left px-2 py-3 min-h-[72px] rounded-xl flex items-start gap-3";
  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className={`${cls} active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500`}
        >
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
