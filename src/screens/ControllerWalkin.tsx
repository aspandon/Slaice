import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteTerms } from "../lib/useEconomics";
import { Badge, Btn, Stepper } from "../components/ui";
import { useApp } from "../app/store";
import { ZONES } from "../data/beach";
import { useExtras } from "../lib/useExtras";
import { resolvePrice } from "../domain/pricing";
import {
  basketTotals,
  vatFromTerms,
  eur,
  type Tender,
  type TenderKind,
  type TillLine,
  type TillSale,
} from "../domain/till";
import { useLiveSlots } from "../lib/useLiveSlots";
import { useFinance } from "../lib/useFinance";
import { useTill } from "./cashier/useTill";
import { ChargeButton, SaleDone } from "./cashier/TillParts";
import { TenderModal } from "./cashier/Tender";

/* ============ Walk-in sale on the beach (AENR-528; in place on Beach since AENR-637) ============
   For the Controller (and the Support Agent) walking the beach: a guest sits
   on a free set → scan its label or tap it → add entry tickets if needed →
   cash or card on a chosen POS terminal → Confirm books the set and records
   the payment together (ΑΠΥ to myDATA) → receipt by SMS or print. Uses the
   till's sale record, so it shows in Cashier › Transactions and Admin. */

export function WalkinSale({
  setId,
  zoneId,
  channel = "controller",
  onClose,
}: {
  setId: string;
  zoneId: string;
  channel?: "controller" | "support";
  /** Back to the set's card (sold or cancelled). */
  onClose: () => void;
}) {
  const { toast, viewAs, beachPricing, priceRules } = useApp();
  const ex = useExtras();
  const t = useTill();
  const [finance] = useFinance();
  const seller = viewAs?.name ?? (channel === "support" ? "Support Agent" : "Petros Nikolaou");
  const liveSlots = useLiveSlots("walkin");
  // Two guests a set by default; the controller adjusts.
  const [qty, setQty] = useState<Record<string, number>>(() => ({ [ex.tickets[0]?.id ?? "adult"]: 2 }));
  const [tender, setTender] = useState<TenderKind | null>(null);
  const [done, setDone] = useState<TillSale | null>(null);
  // The set is held while the sale is open, and let go if it's cancelled.
  const [sold, setSold] = useState(false);
  useEffect(() => {
    t.hold([setId]);
    return () => {
      if (!soldRef.current) t.release([setId]);
    };
  }, [setId]); // eslint-disable-line react-hooks/exhaustive-deps
  const soldRef = useRef(false);
  soldRef.current = sold;
  const z = ZONES.find((x) => x.id === zoneId) ?? ZONES[0];
  const slot = useMemo(() => liveSlots(z, [t.day]).find((x) => x.id === setId) ?? { id: setId, price: z.from }, [liveSlots, z, t.day, setId]);
  const lines: TillLine[] = [
    {
      id: `w-${setId}`,
      kind: "sunbed" as const,
      label: `Sunbed set ${setId} · ${z.name}`,
      qty: 1,
      unit: resolvePrice(slot, z.id, t.day, beachPricing, priceRules).price,
      zoneId: z.id,
      setId,
    },
    ...ex.tickets.filter((tc) => (qty[tc.id] ?? 0) > 0).map(({ id: c }) => ({
      id: `w-t-${c}`,
      kind: "ticket" as const,
      label: ex.ticketLabel(c),
      qty: qty[c],
      unit: ex.ticketPrice(c, t.day),
      cat: c,
    })),
  ];
  const totals = basketTotals(lines, [], vatFromTerms(useSiteTerms()));
  const onPaid = (tenders: Tender[]) => {
    const sale = t.completeSale({ lines, discounts: [], total: totals.total, tenders, channel, seller });
    const main = [...tenders].sort((a, b) => b.amount - a.amount)[0];
    if (main) t.rememberTender(main.kind);
    setSold(true);
    setTender(null);
    setDone(sale);
    toast(`Booked ${setId} and recorded ${eur(sale.total)} — ${sale.mydata === "sent" ? "ΑΠΥ sent to myDATA" : "ΑΠΥ queued"}.`, { tone: "success" });
  };
  if (done)
    return (
      <SaleDone
        sale={done}
        onNew={onClose}
        onDeliver={(c, to) => {
          t.setDelivery(done.id, c);
          toast(
            c === "sms" ? `Demo — receipt sent by SMS to ${to}.` : c === "print" ? "Demo — printed on the mobile printer." : c === "email" ? `Demo — receipt e-mailed to ${to}.` : c === "qr" ? "Receipt QR shown." : "No receipt — ΑΠΥ still recorded.",
            { tone: "success" },
          );
        }}
      />
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-navy-900">Walk-in on {setId}</h3>
        <span className="tnum font-semibold">{eur(lines[0].unit)}</span>
      </div>
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Entry tickets</div>
        {ex.tickets.map(({ id: c }) => (
          <div key={c} className="flex items-center justify-between text-sm">
            <span>
              {ex.ticketLabel(c)} <span className="text-slate-500">€{ex.ticketPrice(c, t.day)}</span>
            </span>
            <Stepper label={`${ex.ticketLabel(c)} tickets`} value={qty[c] ?? 0} onChange={(v) => setQty((q) => ({ ...q, [c]: v }))} />
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between border-t border-slate-200 pt-2">
        <span className="text-slate-600 text-sm">
          Total <span className="text-[11px] text-slate-400">incl. VAT {eur(totals.vat)}</span>
        </span>
        <span className="font-display text-3xl font-bold text-navy-900 tnum" aria-live="polite">{eur(totals.total)}</span>
      </div>
      {/* The till's Charge button and remembered tender (AENR-665). */}
      <ChargeButton total={totals.total} last={t.till.lastTender} onCharge={setTender} />
      <Btn variant="ghost" full onClick={onClose}>Cancel</Btn>
      <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5">
        <Badge tone="slate">{channel === "support" ? "Support Agent" : "Controller"}</Badge> Confirming the payment books the set and records the sale in one step.
      </div>
      {tender && (
        <TenderModal
          total={totals.total}
          initial={tender}
          offline={false}
          offlineSales={[]}
          vouchers={{}}
          onCancel={() => setTender(null)}
          onPaid={onPaid}
          terminals={finance.terminals}
          terminal={t.till.terminal}
          onTerminal={t.setTerminal}
        />
      )}
    </div>
  );
}
