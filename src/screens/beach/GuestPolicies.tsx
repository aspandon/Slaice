import { Card, Field, Input } from "../../components/ui";
import { useApp } from "../../app/store";
import { DEFAULT_POLICY, fmtDeadline, cancelDeadline, type GuestPolicy } from "../../domain/visits";
import { addDays } from "../../domain/period";
import { todayISO } from "../../data/beach";

/* Guest policies (AENR-569 / 574 / 578): the rules every guest sees before
   paying — free-cancellation window and refund, the deposit option, and the
   season-pass "Release my day" deadline and credit. Saved as you type. */

const FIELDS: { k: keyof GuestPolicy; l: string; hint: string; min: number; max: number }[] = [
  {
    k: "cancelHours",
    l: "Free cancellation until (hours before opening)",
    hint: "24 = the day before at 09:00",
    min: 0,
    max: 168,
  },
  {
    k: "refundPct",
    l: "Refund inside the window (%)",
    hint: "Of the amount paid",
    min: 0,
    max: 100,
  },
  { k: "lateRefundPct", l: "Refund after the window (%)", hint: "0 = no refund", min: 0, max: 100 },
  {
    k: "depositPct",
    l: "Deposit online (%)",
    hint: "0 hides “Pay a deposit” at checkout",
    min: 0,
    max: 90,
  },
  {
    k: "releaseHours",
    l: "Pass holders can release a day until (hours before)",
    hint: "Release my day",
    min: 0,
    max: 72,
  },
  {
    k: "releaseCreditPct",
    l: "Credit when a released set resells (%)",
    hint: "Of the set’s price",
    min: 0,
    max: 100,
  },
];

export function GuestPolicies() {
  const { extras, setExtras } = useApp();
  const p = extras.policy;
  const set = (k: keyof GuestPolicy, v: number) =>
    setExtras((s) => ({ ...s, policy: { ...s.policy, [k]: v } }));
  const example = addDays(todayISO(), 3);
  return (
    <Card surface="raised" className="p-5 max-w-3xl space-y-4">
      <div>
        <h2 className="font-display font-bold text-navy-900">Guest policies</h2>
        <p className="text-[13px] text-slate-600">
          Shown on the spot sheet, at checkout and on every ticket. Example: a visit on{" "}
          {fmtDeadline(`${example}T09:00`).split(",")[0]} can be cancelled free until{" "}
          <b className="text-navy-900">{fmtDeadline(cancelDeadline(example, p))}</b>.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <Field key={f.k} label={f.l} hint={f.hint}>
            <Input
              type="number"
              min={f.min}
              max={f.max}
              value={p[f.k]}
              onChange={(e) =>
                set(f.k, Math.max(f.min, Math.min(f.max, Math.round(+e.target.value) || 0)))
              }
            />
          </Field>
        ))}
      </div>
      <button
        type="button"
        className="text-[12.5px] font-semibold text-teal-700 hover:underline"
        onClick={() => setExtras((s) => ({ ...s, policy: DEFAULT_POLICY }))}
      >
        Reset to defaults
      </button>
    </Card>
  );
}
