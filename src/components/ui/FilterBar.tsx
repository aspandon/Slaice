import { useState } from "react";
import type { ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "../../lib/icons";
import { useT } from "../../app/store";
import { Btn } from "./primitives";
import { Field, Input, Select } from "./forms";
import { Sheet } from "./overlays";
import type { AmountFilter, AmountOp, FilterDef, FilterState } from "../../domain/filters";
import { activeCount, amountError, amountLabel, isAmount } from "../../domain/filters";

const trigger = (on: boolean) =>
  `inline-flex items-center gap-1.5 h-9 rounded-xl px-3 text-[13px] font-semibold ring-1 transition whitespace-nowrap ${on ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 text-navy-900 ring-slate-200 hover:ring-slate-300"}`;
const panel =
  "glass !bg-white/95 text-ink rounded-2xl p-3 z-[60] shadow-float w-[260px] max-w-[calc(100vw-1.5rem)] data-[state=open]:animate-scale-in";

/* ---------- FilterBar ----------
   Structured filters for a list: one popover per filter (multi-select
   checkboxes or an amount comparison), removable chips for what's active,
   "Clear all" and a result count. Stateless — the page owns the state (and
   keeps it in the URL via `filtersToParams`). */
export function FilterBar({
  defs,
  value,
  onChange,
  count,
  children,
  sheet = false,
  extraChips = [],
}: {
  defs: FilterDef[];
  value: FilterState;
  onChange: (s: FilterState) => void;
  /** e.g. "42 of 101 bookings". */
  count: ReactNode;
  /** Extra controls rendered before the filters (e.g. a date control). */
  children?: ReactNode;
  /** One "Filters" button that opens every filter in a sheet (AENR-624); `children` go in the sheet too. */
  sheet?: boolean;
  /** Chips for state the page owns (e.g. the period) so they show and clear with the rest. */
  extraChips?: { key: string; label: string; remove: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const set = (key: string, v: FilterState[string]) => onChange({ ...value, [key]: v });
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const d of defs) {
    const v = value[d.key];
    if (Array.isArray(v))
      v.forEach((x) =>
        chips.push({
          key: `${d.key}:${x}`,
          label: `${t(d.label)}: ${d.kind === "multi" ? (d.options.find((o) => o.v === x)?.l ?? x) : x}`,
          remove: () =>
            set(
              d.key,
              v.filter((y) => y !== x),
            ),
        }),
      );
    if (isAmount(v) && !amountError(v))
      chips.push({
        key: d.key,
        label: `${t(d.label)}: ${amountLabel(v, d.kind === "amount" ? d.unit : "€")}`,
        remove: () => set(d.key, undefined),
      });
  }
  chips.push(...extraChips);
  const chipRow = chips.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5 basis-full">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-600/20 pl-2.5 pr-1 py-0.5 text-[12px] font-semibold">
          {c.label}
          <button type="button" onClick={c.remove} aria-label={`${t("Remove filter")} ${c.label}`} className="w-5 h-5 grid place-items-center rounded-full hover:bg-teal-100">
            <Icon.x size={11} />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => { onChange({}); extraChips.forEach((c) => c.remove()); }} className="text-[12px] font-semibold text-slate-600 hover:text-navy-900 underline underline-offset-2 ml-1">
        {t("Clear all")}
      </button>
    </div>
  );
  if (sheet)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={trigger(chips.length > 0)}>
          <Icon.sliders size={14} /> {t("Filters")}
          {chips.length > 0 && <span className="tnum rounded-full bg-white/20 px-1.5 text-[11px]">{chips.length}</span>}
        </button>
        <span className="text-[12px] text-slate-500 tnum" aria-live="polite">{count}</span>
        {chipRow}
        <Sheet open={open} onClose={() => setOpen(false)} title={t("Filters")} footer={<Btn variant="primary" onClick={() => setOpen(false)}>{t("Show results")}</Btn>}>
          <div className="space-y-4">
            {children}
            <div className="flex flex-wrap gap-2">
              {defs.map((d) =>
                d.kind === "multi" ? (
                  <MultiFilter key={d.key} def={d} raised value={(value[d.key] as string[] | undefined) ?? []} onChange={(v) => set(d.key, v)} />
                ) : (
                  <AmountFilterPop key={d.key} raised label={t(d.label)} unit={d.unit ?? "€"} value={isAmount(value[d.key]) ? (value[d.key] as AmountFilter) : undefined} onChange={(v) => set(d.key, v)} />
                ),
              )}
            </div>
            <div className="text-[12.5px] text-slate-600 tnum">{count}</div>
          </div>
        </Sheet>
      </>
    );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {defs.map((d) =>
          d.kind === "multi" ? (
            <MultiFilter
              key={d.key}
              def={d}
              value={(value[d.key] as string[] | undefined) ?? []}
              onChange={(v) => set(d.key, v)}
            />
          ) : (
            <AmountFilterPop
              key={d.key}
              label={t(d.label)}
              unit={d.unit ?? "€"}
              value={isAmount(value[d.key]) ? (value[d.key] as AmountFilter) : undefined}
              onChange={(v) => set(d.key, v)}
            />
          ),
        )}
        <span className="ml-auto text-[12px] text-slate-500 tnum" aria-live="polite">
          {count}
        </span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-600/20 pl-2.5 pr-1 py-0.5 text-[12px] font-semibold"
            >
              {c.label}
              <button
                type="button"
                onClick={c.remove}
                aria-label={`${t("Remove filter")} ${c.label}`}
                className="w-5 h-5 grid place-items-center rounded-full hover:bg-teal-100"
              >
                <Icon.x size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange({})}
            className="text-[12px] font-semibold text-slate-600 hover:text-navy-900 underline underline-offset-2 ml-1"
          >
            {t("Clear all")}
          </button>
        </div>
      )}
    </div>
  );
}

function MultiFilter({
  def,
  value,
  onChange,
  raised = false,
}: {
  raised?: boolean;
  def: Extract<FilterDef, { kind: "multi" }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const t = useT();
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={trigger(value.length > 0)}
          aria-label={`${t(def.label)}${value.length ? ` (${value.length} ${t("selected")})` : ""}`}
        >
          {t(def.label)}
          {value.length > 0 && (
            <span className="tnum rounded-full bg-white/20 px-1.5 text-[11px]">{value.length}</span>
          )}
          <Icon.chevD size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className={raised ? panel.replace("z-[60]", "z-[80]") : panel} aria-label={t(def.label)}>
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              {t(def.label)}
            </legend>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {def.options.map((o) => (
                <label
                  key={o.v}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(o.v)}
                    onChange={() => toggle(o.v)}
                    className="w-4 h-4 accent-teal-600"
                  />
                  {o.l}
                </label>
              ))}
            </div>
          </fieldset>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-2 text-[12px] font-semibold text-slate-600 hover:text-navy-900"
            >
              {t("Clear")}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AmountFilterPop({
  raised = false,
  label,
  unit,
  value,
  onChange,
}: {
  raised?: boolean;
  label: string;
  unit: string;
  value?: AmountFilter;
  onChange: (v: AmountFilter | undefined) => void;
}) {
  const t = useT();
  const u = unit ? ` (${unit})` : "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AmountFilter>(value ?? { op: "gt", a: null, b: null });
  const [touched, setTouched] = useState(false);
  const err = amountError(draft);
  const num = (s: string) => (s === "" ? null : Number(s));
  const apply = () => {
    setTouched(true);
    if (err) return;
    onChange(draft);
    setOpen(false);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDraft(value ?? { op: "gt", a: null, b: null });
          setTouched(false);
        }
      }}
    >
      <Popover.Trigger asChild>
        <button type="button" className={trigger(!!value)}>
          {value ? `${label}: ${amountLabel(value, unit)}` : label}
          <Icon.chevD size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className={raised ? panel.replace("z-[60]", "z-[80]") : panel} aria-label={label}>
          <div className="space-y-2">
            <Field label={t("Condition")}>
              <Select
                value={draft.op}
                onChange={(e) => setDraft({ ...draft, op: e.target.value as AmountOp })}
                options={[
                  { v: "gt", l: t("More than") },
                  { v: "lt", l: t("Less than") },
                  { v: "between", l: t("Between") },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={draft.op === "between" ? `${t("Min")}${u}` : `${t("Value")}${u}`}>
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={draft.a ?? ""}
                  onChange={(e) => setDraft({ ...draft, a: num(e.target.value) })}
                  aria-invalid={touched && !!err}
                />
              </Field>
              {draft.op === "between" && (
                <Field label={`${t("Max")}${u}`}>
                  <Input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={draft.b ?? ""}
                    onChange={(e) => setDraft({ ...draft, b: num(e.target.value) })}
                    aria-invalid={touched && !!err}
                  />
                </Field>
              )}
            </div>
            <div role="alert" className="min-h-[1rem] text-[12px] text-rose-700">
              {touched && err ? t(err) : ""}
            </div>
            <div className="flex justify-between gap-2">
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                {t("Clear")}
              </Btn>
              <Btn size="sm" variant="primary" icon={Icon.check} onClick={apply}>
                {t("Apply")}
              </Btn>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Count label: "42 of 101 bookings" or "101 bookings". */
export function filterCount(
  shown: number,
  total: number,
  noun: string,
  s: FilterState,
  hasOther = false,
): string {
  return activeCount(s) || hasOther ? `${shown} of ${total} ${noun}` : `${total} ${noun}`;
}
