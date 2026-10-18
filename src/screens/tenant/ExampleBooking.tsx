import { useState, type ReactNode } from "react";
import { Badge, Card, Stepper } from "../../components/ui";
import {
  SERVICES,
  SERVICE_LABEL,
  bookingEconomics,
  eur,
  pct,
  type CommercialTerms as Terms,
} from "../../domain/economics";
import { Num } from "./TermsFields";

/* ============ Commercial terms › Example booking (AENR-725) ============
   The owner's worked case, live: one online booking (1 sunbed set at €30 and
   1 entry ticket at €10 to start) split into what the guest pays and what
   Slaice earns, recalculated with every keystroke of the terms being edited. */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Non-numbers (a field being retyped) count as 0 in the example. */
function usable(t: Terms): Terms {
  const n = (v: number) => (Number.isFinite(v) ? v : 0);
  return {
    ...t,
    corporateTax: n(t.corporateTax),
    services: Object.fromEntries(
      SERVICES.map((s) => [
        s,
        {
          rate: n(t.services[s].rate),
          min: n(t.services[s].min),
          fee: n(t.services[s].fee),
          vat: n(t.services[s].vat),
        },
      ]),
    ) as Terms["services"],
  };
}

const Line = ({ l, v, bold }: { l: ReactNode; v: ReactNode; bold?: boolean }) => (
  <div
    className={`flex items-baseline justify-between gap-3 ${bold ? "font-bold text-navy-900" : "text-slate-700"}`}
  >
    <span className="min-w-0">{l}</span>
    <span className="tnum shrink-0">{v}</span>
  </div>
);

export function ExampleBooking({
  terms,
  editing,
  invalid = 0,
}: {
  terms: Terms;
  editing: boolean;
  /** Fields with errors in the draft. */
  invalid?: number;
}) {
  const [sets, setSets] = useState(1);
  const [setPrice, setSetPrice] = useState(30);
  const [tickets, setTickets] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(10);
  const tt = usable(terms);
  const sp = Number.isFinite(setPrice) ? setPrice : 0;
  const tp = Number.isFinite(ticketPrice) ? ticketPrice : 0;
  const parts = [
    ...(sets > 0 ? [{ service: "sunbeds" as const, units: sets, gross: r2(sets * sp) }] : []),
    ...(tickets > 0
      ? [{ service: "tickets" as const, units: tickets, gross: r2(tickets * tp) }]
      : []),
  ];
  const e = bookingEconomics(parts, tt);
  const vats = [...new Set(e.services.map((s) => s.vatRate))];
  return (
    <Card className="p-4" surface="raised">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-navy-900">Example booking</h3>
        {editing && (
          <Badge tone={invalid ? "red" : "amber"}>
            {invalid ? `${invalid} to fix` : "Draft terms"}
          </Badge>
        )}
      </div>
      <p className="text-[12px] text-slate-500 leading-snug">
        One online booking, worked out with {editing ? "the terms being edited" : "these terms"}.
      </p>
      {invalid > 0 && (
        <p className="mt-1.5 rounded-lg bg-rose-50 ring-1 ring-rose-600/15 px-2.5 py-1.5 text-[12px] text-rose-800">
          Some values are out of range — the example uses them as typed until you fix them.
        </p>
      )}
      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 items-end">
        <div>
          <div className="text-[11.5px] font-semibold text-slate-600 mb-1">Sunbed sets</div>
          <Stepper value={sets} onChange={setSets} label="sunbed sets" />
        </div>
        <Num label="Price per set" unit="€" value={setPrice} onChange={setSetPrice} />
        <div>
          <div className="text-[11.5px] font-semibold text-slate-600 mb-1">Entry tickets</div>
          <Stepper value={tickets} onChange={setTickets} label="entry tickets" />
        </div>
        <Num label="Price per ticket" unit="€" value={ticketPrice} onChange={setTicketPrice} />
      </div>
      {parts.length === 0 ? (
        <p className="mt-4 text-[13px] text-slate-500">Add a set or a ticket to see the split.</p>
      ) : (
        <div className="mt-4 space-y-3 text-[13px]" aria-live="polite">
          <section aria-label="The guest pays">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              The guest pays
            </div>
            {e.services.map((s) => (
              <Line
                key={s.service}
                l={
                  s.service === "sunbeds"
                    ? `${s.units} sunbed ${s.units === 1 ? "set" : "sets"} × ${eur(sp)}`
                    : `${s.units} entry ${s.units === 1 ? "ticket" : "tickets"} × ${eur(tp)}`
                }
                v={eur(s.gross)}
              />
            ))}
            {e.fees > 0 && (
              <Line
                l={`Service fee (${e.services
                  .filter((s) => s.fees > 0)
                  .map((s) => `${s.units} × ${eur(tt.services[s.service].fee)}`)
                  .join(" + ")})`}
                v={eur(e.fees)}
              />
            )}
            <Line l="Total" v={eur(e.customerPays)} bold />
            <div className="text-[11.5px] text-slate-500">
              VAT included ({vats.map((v) => pct(v)).join(" / ")}) — the guest sees the total and
              the service fee only.
            </div>
          </section>
          <section
            aria-label="Slaice earns"
            className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Slaice earns
            </div>
            {e.services.map((s) => (
              <div key={s.service} className="py-0.5">
                <Line l={`${SERVICE_LABEL[s.service]} commission`} v={eur(s.commission)} />
                <div className="text-[11.5px] text-slate-500 tnum">
                  {pct(tt.services[s.service].rate)} of {eur(s.base)} = {eur(s.byRate)}
                  {s.atMin ? ` → minimum ${eur(tt.services[s.service].min)}` : ""}
                </div>
              </div>
            ))}
            {e.fees > 0 && (
              <Line
                l={
                  tt.feeTo === "slaice"
                    ? "Service fee kept by Slaice"
                    : "Service fee (kept by the beach)"
                }
                v={tt.feeTo === "slaice" ? eur(e.slaiceFees) : "—"}
              />
            )}
            <div className="h-px bg-slate-200 my-1.5" />
            <Line l="Slaice revenue" v={eur(e.slaiceRevenue)} bold />
            <Line l="The beach receives" v={eur(e.tenantReceives)} />
            <div className="text-[11.5px] text-slate-500">
              before card processing. Month end: {pct(tt.corporateTax)} corporate tax on{" "}
              {tt.taxBase === "commissionAndFees"
                ? `${eur(e.commission + e.slaiceFees)} commission and kept fees`
                : `${eur(e.commission)} commission`}{" "}
              = {eur(e.corporateTax)} re-billed.
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
