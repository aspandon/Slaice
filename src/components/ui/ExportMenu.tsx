import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "../../lib/icons";

/* One export control everywhere (AENR-593): "Export ▾" → PDF (formatted to
   read and share) or CSV (opens in Excel / Sheets). Both come from the same
   report definition, so they hold the same content. */
export function ExportMenu({
  onExport,
  label = "Export",
  disabled = false,
  size = "md",
  variant = "outline",
  what,
}: {
  onExport: (format: "pdf" | "csv") => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  variant?: "outline" | "primary" | "ghost";
  /** What is exported, for the accessible name (e.g. "bookings"). */
  what?: string;
}) {
  const base =
    variant === "primary"
      ? "bg-navy-900 text-white hover:bg-navy-800 shadow-btn-primary"
      : variant === "ghost"
        ? "text-navy-900 hover:bg-slate-100"
        : "ring-1 ring-slate-200 bg-white/80 text-navy-900 hover:bg-slate-50 hover:ring-slate-300";
  const sz = size === "sm" ? "min-h-[36px] px-3 text-[13px]" : "min-h-[44px] px-4 text-sm";
  const item =
    "flex items-start gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer select-none outline-none data-[highlighted]:bg-slate-100";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={what ? `${label} ${what}` : label}
          className={`inline-flex items-center gap-2 rounded-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:pointer-events-none ${sz} ${base}`}
        >
          <Icon.download size={size === "sm" ? 14 : 16} /> {label}{" "}
          <Icon.chevD size={13} className="opacity-70" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[70] w-60 rounded-xl bg-white p-1.5 shadow-overlay ring-1 ring-slate-200 text-ink data-[state=open]:animate-scale-in origin-top-right"
        >
          <DropdownMenu.Item className={item} onSelect={() => onExport("pdf")}>
            <Icon.doc size={16} className="mt-0.5 text-rose-600 shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-navy-900">PDF</span>
              <span className="block text-[12px] text-slate-500">
                Formatted — to read, print or share
              </span>
            </span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => onExport("csv")}>
            <Icon.list size={16} className="mt-0.5 text-emerald-700 shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-navy-900">CSV</span>
              <span className="block text-[12px] text-slate-500">
                Data — opens in Excel or Sheets
              </span>
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
