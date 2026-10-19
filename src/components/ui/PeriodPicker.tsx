import { DateInput } from "./DateInput";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "../../lib/icons";
import { useT } from "../../app/store";
import { Btn } from "./primitives";
import { Field } from "./forms";
import { Tabs } from "./Tabs";
import type { Period, PeriodPreset } from "../../domain/period";
import {
  DEMO_TODAY,
  RANGE_MIN,
  addDays,
  rangeError,
  rangeLabel,
  resolveRange,
  samePeriod,
  stepPeriod,
} from "../../domain/period";

const PRESET_LABEL: Record<PeriodPreset, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  season: "Season",
};

// Quick ranges inside the Custom popover, resolved against the demo "today".
function quickRanges(today: string): { label: string; p: Period }[] {
  const pre = (preset: PeriodPreset, offset = 0): Period => ({ kind: "preset", preset, offset });
  return [
    { label: "Today", p: pre("day") },
    { label: "Yesterday", p: pre("day", -1) },
    { label: "Last 7 days", p: { kind: "custom", from: addDays(today, -6), to: today } },
    { label: "Last 30 days", p: { kind: "custom", from: addDays(today, -29), to: today } },
    { label: "This month", p: pre("month") },
    { label: "Last month", p: pre("month", -1) },
    { label: "This season", p: pre("season") },
    { label: "Last season", p: pre("season", -1) },
    { label: "Year to date", p: pre("year") },
  ];
}

/* ---------- PeriodPicker ----------
   The one date control for every page that reports over time: segmented
   presets (Day / Week / Month / Year [/ Season]), ‹ › to step back and forth,
   and Custom → a range popover. Emits a `Period`; pages resolve it with
   `resolveRange` and read figures for those dates. */
export function PeriodPicker({
  value,
  onChange,
  presets = ["day", "week", "month", "year"],
  allowAll = false,
  resetTo,
  className = "",
}: {
  value: Period;
  onChange: (p: Period) => void;
  presets?: PeriodPreset[];
  /** Offer an "All dates" option (lists that are unfiltered by default). */
  allowAll?: boolean;
  /** Where "Reset" returns to; defaults to the first preset. */
  resetTo?: Period;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const range = resolveRange(value);
  const [from, setFrom] = useState(range?.from ?? addDays(DEMO_TODAY, -6));
  const [to, setTo] = useState(range?.to ?? DEMO_TODAY);
  const [touched, setTouched] = useState(false);
  const error = rangeError(from, to);
  const reset: Period = resetTo ?? { kind: "preset", preset: presets[0], offset: 0 };

  const tabKey = value.kind === "preset" ? value.preset : value.kind;
  const tabs: [string, string][] = [
    ...(allowAll ? [["all", t("All dates")] as [string, string]] : []),
    ...presets.map((p) => [p, t(PRESET_LABEL[p])] as [string, string]),
    ["custom", t("Custom")],
  ];
  const pick = (k: string) => {
    if (k === "custom") {
      openCustom();
      return;
    }
    onChange(
      k === "all" ? { kind: "all" } : { kind: "preset", preset: k as PeriodPreset, offset: 0 },
    );
  };
  const openCustom = () => {
    setFrom(range?.from ?? addDays(DEMO_TODAY, -6));
    setTo(range?.to ?? DEMO_TODAY);
    setTouched(false);
    setOpen(true);
  };
  const apply = () => {
    setTouched(true);
    if (error) return;
    onChange({ kind: "custom", from, to });
    setOpen(false);
  };
  const canStep = value.kind === "preset";
  const atCurrent = value.kind === "preset" && value.offset >= 0;
  const stepBtn =
    "w-9 h-9 grid place-items-center rounded-xl text-slate-500 hover:text-navy-900 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0 max-w-full ${className}`}
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
          <div className="flex items-center gap-1 min-w-0 max-w-full">
            {canStep && (
              <button
                type="button"
                className={stepBtn}
                aria-label={t("Previous period")}
                onClick={() => onChange(stepPeriod(value, -1))}
              >
                <Icon.chevL size={16} />
              </button>
            )}
            <Tabs scroll tabs={tabs} value={tabKey} onChange={pick} className="min-w-0" />
            {canStep && (
              <button
                type="button"
                className={stepBtn}
                aria-label={t("Next period")}
                disabled={atCurrent}
                onClick={() => onChange(stepPeriod(value, 1))}
              >
                <Icon.chevR size={16} />
              </button>
            )}
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            aria-label={t("Custom date range")}
            className="glass !bg-white/95 w-[340px] max-w-[calc(100vw-1.5rem)] text-ink rounded-2xl p-4 z-[60] shadow-float origin-top-right data-[state=open]:animate-scale-in"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
              <Icon.calendar size={12} /> {t("Custom date range")}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {quickRanges(DEMO_TODAY).map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    onChange(q.p);
                    setOpen(false);
                  }}
                  aria-pressed={samePeriod(q.p, value)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 transition ${samePeriod(q.p, value) ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 text-navy-900 ring-slate-200 hover:ring-teal-400"}`}
                >
                  {t(q.label)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("From")}>
                <DateInput aria-label={t("From")} value={from} min={RANGE_MIN} max={DEMO_TODAY} onChange={setFrom} required />
              </Field>
              <Field label={t("To")}>
                <DateInput aria-label={t("To")} value={to} min={RANGE_MIN} max={DEMO_TODAY} onChange={setTo} required />
              </Field>
            </div>
            <div role="alert" className="min-h-[1.25rem] mt-1.5 text-[12px] text-rose-700">
              {touched && error ? t(error) : ""}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(reset);
                  setOpen(false);
                }}
              >
                {t("Reset")}
              </Btn>
              <div className="flex gap-2">
                <Btn variant="outline" size="sm" onClick={() => setOpen(false)}>
                  {t("Cancel")}
                </Btn>
                <Btn variant="primary" size="sm" icon={Icon.check} onClick={apply}>
                  {t("Apply")}
                </Btn>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <span
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 tnum"
        aria-live="polite"
      >
        <Icon.calendar size={13} className="text-slate-400" />
        {range ? rangeLabel(range) : t("All dates")}
      </span>
    </div>
  );
}
