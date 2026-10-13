import { useState } from "react";
import { Btn, Card, Field, Input } from "../../components/ui";
import { Icon } from "../../lib/icons";
import { useApp } from "../../app/store";
import { DEFAULT_POLICY, fmtDeadline, cancelDeadline, type GuestPolicy } from "../../domain/visits";
import { addDays } from "../../domain/period";
import { todayISO } from "../../data/beach";

/* Guest policies (AENR-569 / 574 / 578): the rules every guest sees before
   paying — free-cancellation window and refund, the deposit option, and the
   season-pass "Release my day" deadline and credit. Read first; Edit opens the
   fields on a draft and Done applies them (AENR-616). */

const FIELDS: { k: keyof GuestPolicy; l: string; hint: string; min: number; max: number; unit: string }[] = [
  {
    k: "cancelHours",
    unit: "h",
    l: "Free cancellation until (hours before opening)",
    hint: "24 = the day before at 09:00",
    min: 0,
    max: 168,
  },
  {
    k: "refundPct",
    unit: "%",
    l: "Refund inside the window (%)",
    hint: "Of the amount paid",
    min: 0,
    max: 100,
  },
  { k: "lateRefundPct", unit: "%", l: "Refund after the window (%)", hint: "0 = no refund", min: 0, max: 100 },
  {
    k: "depositPct",
    unit: "%",
    l: "Deposit online (%)",
    hint: "0 hides “Pay a deposit” at checkout",
    min: 0,
    max: 90,
  },
  {
    k: "releaseHours",
    unit: "h",
    l: "Pass holders can release a day until (hours before)",
    hint: "Release my day",
    min: 0,
    max: 72,
  },
  {
    k: "releaseCreditPct",
    unit: "%",
    l: "Credit when a released set resells (%)",
    hint: "Of the set’s price",
    min: 0,
    max: 100,
  },
];

export function GuestPolicies() {
  const { extras, setExtras, toast } = useApp();
  const [draft, setDraft] = useState<GuestPolicy | null>(null);
  const p = draft ?? extras.policy;
  const set = (k: keyof GuestPolicy, v: number) => setDraft((d) => ({ ...(d ?? extras.policy), [k]: v }));
  const done = () => {
    if (draft) setExtras((s) => ({ ...s, policy: draft }));
    setDraft(null);
    toast("Guest policies updated — checkout, the spot sheet and tickets use them now.", { tone: "success" });
  };
  const example = addDays(todayISO(), 3);
  return (
    <Card surface="raised" className="p-5 max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-navy-900">Guest policies</h2>
          <p className="text-[13px] text-slate-600">
            Shown on the spot sheet, at checkout and on every ticket. Example: a visit on{" "}
            {fmtDeadline(`${example}T09:00`).split(",")[0]} can be cancelled free until{" "}
            <b className="text-navy-900">{fmtDeadline(cancelDeadline(example, p))}</b>.
          </p>
        </div>
        {draft ? (
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn size="sm" variant="primary" icon={Icon.check} onClick={done}>Done</Btn>
          </div>
        ) : (
          <Btn size="sm" variant="outline" icon={Icon.edit} onClick={() => setDraft(extras.policy)}>Edit</Btn>
        )}
      </div>
      {draft ? (
        <>
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
            onClick={() => setDraft(DEFAULT_POLICY)}
          >
            Reset to defaults
          </button>
        </>
      ) : (
        <dl className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {FIELDS.map((f) => (
            <div key={f.k} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="text-[13px] text-slate-700">{f.l}</dt>
              <dd className="font-semibold text-navy-900 tnum shrink-0">{p[f.k]}{f.unit === "h" ? " h" : "%"}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
