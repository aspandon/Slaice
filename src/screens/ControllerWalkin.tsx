import { useEffect, useMemo, useState } from "react";
import { Icon } from "../lib/icons";
import { Badge, Btn, Card, PageHead, Select, Stepper } from "../components/ui";
import { SunbedMap } from "../components/SunbedMap";
import { SetScanner, type ScanHit } from "../components/SetScanner";
import { useApp } from "../app/store";
import { ZONES } from "../data/beach";
import { useExtras } from "../lib/useExtras";
import { resolvePrice } from "../domain/pricing";
import {
  basketTotals,
  eur,
  type Tender,
  type TenderKind,
  type TillLine,
  type TillSale,
} from "../domain/till";
import { useLiveSlots } from "../lib/useLiveSlots";
import { useFinance } from "../lib/useFinance";
import { useTill } from "./cashier/useTill";
import { SaleDone } from "./cashier/TillParts";
import { TenderModal } from "./cashier/Tender";

/* ============ Walk-in sale on the beach (AENR-528) ============
   For the Controller (and the Support Agent) walking the beach: a guest sits
   on a free set → scan its label or tap it → add entry tickets if needed →
   cash or card on a chosen POS terminal → Confirm books the set and records
   the payment together (ΑΠΥ to myDATA) → receipt by SMS or print. Uses the
   till's sale record, so it shows in Cashier › Transactions and Admin. */

export function ControllerWalkin({
  channel = "controller",
}: {
  channel?: "controller" | "support";
}) {
  const { toast, hint, clearHint, viewAs, beachPricing, priceRules } = useApp();
  const ex = useExtras();
  const t = useTill();
  const [finance] = useFinance();
  const seller = viewAs?.name ?? (channel === "support" ? "Support Agent" : "Petros Nikolaou");
  const liveSlots = useLiveSlots("walkin");
  const [zoneId, setZoneId] = useState("central");
  const [sets, setSets] = useState<{ id: string; zoneId: string }[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tender, setTender] = useState<TenderKind | null>(null);
  const [done, setDone] = useState<TillSale | null>(null);
  const [err, setErr] = useState("");
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const slots = useMemo(() => liveSlots(zone, [t.day]), [liveSlots, zone, t.day]);
  const inBasket = new Set(sets.map((s) => s.id));

  const add = (setId: string, zId: string) => {
    setErr("");
    if (done) setDone(null);
    const z = ZONES.find((x) => x.id === zId)!;
    const slot = liveSlots(z, [t.day]).find((s) => s.id === setId);
    if (!slot) return setErr(`${setId} isn't on the map.`);
    if (inBasket.has(setId)) return;
    if (slot.state !== "a")
      return setErr(
        `${setId} can't be sold now — ${slot.inv ?? (slot.state === "h" ? "on hold" : "already booked or out of service")}.`,
      );
    setSets((x) => [...x, { id: setId, zoneId: zId }]);
    t.hold([setId]);
  };
  useEffect(() => {
    if (hint?.page === "walkin" && hint.setId) {
      const z = ZONES.find((x) => hint.setId!.startsWith(x.prefix + "-"));
      if (z) {
        setZoneId(z.id);
        add(hint.setId, z.id);
      }
      clearHint();
    }
  }, [hint]); // eslint-disable-line react-hooks/exhaustive-deps
  const onHit = (h: ScanHit) => {
    if (h.kind === "booking") return setErr(`${h.code} is a booking QR, not a sunbed label.`);
    setZoneId(h.zoneId);
    add(h.setId, h.zoneId);
  };
  const remove = (id: string) => {
    setSets((x) => x.filter((s) => s.id !== id));
    t.release([id]);
  };

  const lines: TillLine[] = [
    ...sets.map((s) => {
      const z = ZONES.find((x) => x.id === s.zoneId)!;
      const slot = liveSlots(z, [t.day]).find((x) => x.id === s.id) ?? { id: s.id, price: z.from };
      return {
        id: `w-${s.id}`,
        kind: "sunbed" as const,
        label: `Sunbed set ${s.id} · ${z.name}`,
        qty: 1,
        unit: resolvePrice(slot, z.id, t.day, beachPricing, priceRules).price,
        zoneId: z.id,
        setId: s.id,
      };
    }),
    ...ex.tickets.filter((tc) => (qty[tc.id] ?? 0) > 0).map(({ id: c }) => ({
      id: `w-t-${c}`,
      kind: "ticket" as const,
      label: ex.ticketLabel(c),
      qty: qty[c],
      unit: ex.ticketPrice(c, t.day),
      cat: c,
    })),
  ];
  const totals = basketTotals(lines, []);
  const onPaid = (tenders: Tender[]) => {
    const sale = t.completeSale({
      lines,
      discounts: [],
      total: totals.total,
      tenders,
      channel,
      seller,
    });
    setTender(null);
    setDone(sale);
    setSets([]);
    setQty({});
    toast(
      `Booked ${sets.map((s) => s.id).join(", ") || "tickets"} and recorded ${eur(sale.total)} — ${sale.mydata === "sent" ? "ΑΠΥ sent to myDATA" : "ΑΠΥ queued"}.`,
      { tone: "success" },
    );
  };

  return (
    <div className="animate-fade-up max-w-5xl">
      <PageHead
        title="Walk-in Sale"
        sub="A guest is sitting on a free set — scan or tap it, add entry tickets, take cash or card. One step books the set and records the payment."
        badge={<Badge tone="mvp">MVP</Badge>}
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start pb-24 lg:pb-0">
        <div className="space-y-4 min-w-0">
          <Card className="p-4">
            <SetScanner onHit={onHit} compact />
          </Card>
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="font-display font-bold text-navy-900">Or tap a free set</h2>
              <div className="w-40">
                <Select
                  aria-label="Zone"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  options={ZONES.map((z) => ({ v: z.id, l: z.name }))}
                />
              </div>
            </div>
            <SunbedMap
              label={`${zone.name} walk-in map`}
              slots={slots}
              selected={inBasket}
              onToggle={(s) => (inBasket.has(s.id) ? remove(s.id) : add(s.id, zone.id))}
              priceOf={(s) => resolvePrice(s, zone.id, t.day, beachPricing, priceRules).price}
              landmarks={beachPricing.landmarks.filter((l) => l.zoneId === zone.id)}
            />
            {err && (
              <div
                role="alert"
                className="mt-2 rounded-lg bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 px-3 py-2 text-[12.5px]"
              >
                {err}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4 lg:sticky lg:top-4">
          {done ? (
            <SaleDone
              sale={done}
              onNew={() => setDone(null)}
              onDeliver={(c, to) => {
                t.setDelivery(done.id, c);
                toast(
                  c === "sms"
                    ? `Demo — receipt sent by SMS to ${to}.`
                    : c === "print"
                      ? "Demo — printed on the mobile printer."
                      : c === "email"
                        ? `Demo — receipt e-mailed to ${to}.`
                        : c === "qr"
                          ? "Receipt QR shown."
                          : "No receipt — ΑΠΥ still recorded.",
                  { tone: "success" },
                );
              }}
            />
          ) : (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-navy-900">Basket</h2>
              {sets.length === 0 ? (
                <div className="rounded-xl bg-slate-50 ring-1 ring-dashed ring-slate-300 px-3 py-5 text-center text-[13px] text-slate-600">
                  Scan or tap the set the guest is sitting on.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {lines
                    .filter((l) => l.setId)
                    .map((l) => (
                      <li key={l.id} className="py-2 flex items-center gap-2 text-sm">
                        <span className="flex-1 font-semibold text-navy-900">{l.label}</span>
                        <span className="tnum font-semibold">{eur(l.unit)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${l.setId}`}
                          onClick={() => remove(l.setId!)}
                          className="w-10 h-10 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Icon.x size={15} />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Entry tickets (optional)
                </div>
                {ex.tickets.map(({ id: c }) => (
                  <div key={c} className="flex items-center justify-between text-sm">
                    <span>
                      {ex.ticketLabel(c)} <span className="text-slate-500">€{ex.ticketPrice(c, t.day)}</span>
                    </span>
                    <Stepper
                      label={`${ex.ticketLabel(c)} tickets`}
                      value={qty[c] ?? 0}
                      onChange={(v) => setQty((q) => ({ ...q, [c]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-end justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-600 text-sm">
                  Total{" "}
                  <span className="text-[11px] text-slate-400">incl. VAT {eur(totals.vat)}</span>
                </span>
                <span
                  className="font-display text-3xl font-bold text-navy-900 tnum"
                  aria-live="polite"
                >
                  {eur(totals.total)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  variant="primary"
                  size="lg"
                  icon={Icon.cash}
                  disabled={!lines.length}
                  onClick={() => setTender("cash")}
                >
                  Cash
                </Btn>
                <Btn
                  variant="teal"
                  size="lg"
                  icon={Icon.card}
                  disabled={!lines.length}
                  onClick={() => setTender("card")}
                >
                  Card · POS
                </Btn>
              </div>
              <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5">
                <Badge tone="slate">{channel === "support" ? "Support Agent" : "Controller"}</Badge>{" "}
                Confirming the payment books the set and records the sale in one step.
              </div>
            </div>
          )}
        </Card>
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
