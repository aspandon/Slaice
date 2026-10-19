import type { KeyboardEvent } from "react";
import { ZONES, todayISO } from "../data/beach";
import { useClosure, useLiveSlots } from "../lib/useLiveSlots";

/* ============ Zone chips (AENR-650) ============
   Staff pages that show one zone at a time pick it from a row of chips with
   live counts ("Central · 21 free"), never a dropdown — the till's pattern,
   shared. A radiogroup: arrow keys move between chips; the row scrolls
   sideways on a phone. */

export interface ZoneChipInfo {
  /** Second line, e.g. "21 free · €25+" or "Closed". */
  sub?: string;
  /** Closed or full: shown muted (still selectable unless `disableOff`). */
  off?: boolean;
}

export function ZoneChips({
  value,
  onChange,
  info,
  all,
  disableOff = false,
  label = "Zone",
  className = "",
}: {
  value: string;
  onChange: (zoneId: string) => void;
  /** Live line per zone; defaults to free sets today (see `useZoneFree`). */
  info?: (zoneId: string) => ZoneChipInfo;
  /** An "All zones" chip first (value "all"). */
  all?: { sub?: string };
  disableOff?: boolean;
  label?: string;
  className?: string;
}) {
  const fallback = useZoneFree();
  const line = info ?? fallback;
  const ids = [...(all ? ["all"] : []), ...ZONES.map((z) => z.id)];
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const next = ids[(ids.indexOf(value) + d + ids.length) % ids.length];
    onChange(next);
    const row = e.currentTarget.parentElement; // currentTarget is gone by the next frame
    requestAnimationFrame(() =>
      (row?.querySelector(`[data-zone-chip="${next}"]`) as HTMLElement | null)?.focus(),
    );
  };
  const chip = (
    id: string,
    name: string,
    color: string | null,
    sub: string | undefined,
    off: boolean,
  ) => {
    const active = id === value;
    return (
      <button
        key={id}
        type="button"
        role="radio"
        data-zone-chip={id}
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        disabled={disableOff && off && !active}
        onClick={() => onChange(id)}
        onKeyDown={onKey}
        className={`shrink-0 min-h-[48px] min-w-[104px] rounded-xl px-3 py-1.5 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${active ? "bg-navy-900 text-white ring-navy-900" : off ? "bg-slate-50 ring-slate-200 text-slate-500" : "bg-white/70 ring-slate-200 text-navy-900 hover:bg-white"} disabled:cursor-not-allowed`}
      >
        <span className="flex items-center gap-1.5 font-semibold text-[13px]">
          {color && (
            <i aria-hidden className="w-2 h-2 rounded-full" style={{ background: color }} />
          )}
          {name}
        </span>
        {sub && (
          <span
            className={`block text-[11.5px] mt-0.5 whitespace-nowrap ${active ? "text-white/75" : "text-slate-500"}`}
          >
            {sub}
          </span>
        )}
      </button>
    );
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 ${className}`}
    >
      {all && chip("all", "All zones", null, all.sub, false)}
      {ZONES.map((z) => {
        const i = line(z.id);
        return chip(z.id, z.name, z.color, i.sub, !!i.off);
      })}
    </div>
  );
}

/** Free sets per zone on a day, for chips: "21 free", "Closed", "Full". */
export function useZoneFree(day?: string, channel: Parameters<typeof useLiveSlots>[0] = "walkin") {
  const liveSlots = useLiveSlots(channel);
  const closure = useClosure();
  return (zoneId: string): ZoneChipInfo => {
    const z = ZONES.find((x) => x.id === zoneId);
    if (!z) return {};
    const d = day ?? todayISO();
    if (closure(zoneId, d)) return { sub: "Closed", off: true };
    const free = liveSlots(z, [d]).filter((s) => s.state === "a").length;
    return free ? { sub: `${free} free` } : { sub: "Full", off: true };
  };
}
