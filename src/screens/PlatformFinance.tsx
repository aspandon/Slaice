import { useState } from "react";
import { Icon } from "../lib/icons";
import { Badge, Btn, Field, Input, Modal, Select, Toggle } from "../components/ui";
import { useApp } from "../app/store";
import { DEFAULT_FINANCE, E_INVOICE_PROVIDERS, FEE_BASIS_LABEL, basisOption, type EInvoiceProvider, type FeeBasis, type FeeLine, type FeePayer, type FinanceConfig } from "../domain/finance";
import { useFinance } from "../lib/useFinance";

/* ============ Tenant fees & e-invoicing (AENR-521) ============
   The fee lines Slaice charges for a tenant — service fees paid by the guest
   and the platform fee paid by the tenant — plus the e-invoicing provider that
   transmits documents to AADE myDATA. Reporting › Payments computes from this,
   so new pricing is a settings change. Exact amounts are still to be agreed:
   the values here are editable demo defaults. */

const BASES = Object.keys(FEE_BASIS_LABEL) as FeeBasis[];
let n = 0;

export function FinanceSettingsModal({ tenant, subdomain, onClose }: { tenant: string; subdomain: string; onClose: () => void }) {
  const { toast } = useApp();
  const [saved, save] = useFinance(subdomain);
  const [cfg, setCfg] = useState<FinanceConfig>(saved);
  const [connecting, setConnecting] = useState(false);
  const patchFee = (id: string, p: Partial<FeeLine>) => setCfg((c) => ({ ...c, fees: c.fees.map((f) => (f.id === id ? { ...f, ...p } : f)) }));
  const addFee = () => setCfg((c) => ({ ...c, fees: [...c.fees, { id: `fee-${Date.now().toString(36)}${++n}`, name: "New fee", basis: "fixedBooking", amount: 1, payer: "customer", vat: 0.24, from: "2026-05-01", active: true }] }));
  const invalid = cfg.fees.some((f) => !f.name.trim() || !(f.amount >= 0) || (f.basis === "pctBooking" && f.amount > 100));
  const connect = () => {
    setConnecting(true);
    window.setTimeout(() => {
      setConnecting(false);
      setCfg((c) => ({ ...c, providerConnected: true }));
      toast(`Demo — connected to ${cfg.provider}; test document accepted by myDATA.`, { tone: "success" });
    }, 1200);
  };
  return (
    <Modal open wide onClose={onClose} title={`Fees & e-invoicing · ${tenant}`}
      footer={<>
        <Btn variant="ghost" onClick={() => setCfg(DEFAULT_FINANCE)}>Reset to defaults</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon={Icon.check} disabled={invalid} onClick={() => { save(cfg); toast(`Fee model saved for ${tenant} — Reporting › Payments now uses it.`, { tone: "success" }); onClose(); }}>Save</Btn>
      </>}>
      <div className="space-y-5">
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2 text-[12.5px] text-amber-800 flex gap-2"><Icon.info size={14} className="shrink-0 mt-0.5" /> Pricing still to be confirmed — these are editable demo values. Reports recompute from whatever is saved here.</div>
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-navy-900">Fee lines</h3>
            <Btn size="sm" variant="outline" icon={Icon.plus} onClick={addFee}>Add fee</Btn>
          </div>
          <div className="space-y-2">
            {cfg.fees.map((f) => (
              <fieldset key={f.id} className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3 grid sm:grid-cols-12 gap-2 items-end">
                <legend className="sr-only">{f.name}</legend>
                <div className="sm:col-span-3"><Field label="Name"><Input value={f.name} onChange={(e) => patchFee(f.id, { name: e.target.value })} /></Field></div>
                <div className="sm:col-span-3"><Field label="Charged"><Select value={f.basis} onChange={(e) => patchFee(f.id, { basis: e.target.value as FeeBasis })} options={BASES.map((b) => ({ v: b, l: basisOption(b) }))} /></Field></div>
                <div className="sm:col-span-2"><Field label={f.basis === "pctBooking" ? "Rate (%)" : "Amount (€)"}><Input type="number" min={0} step="0.5" value={f.amount} onChange={(e) => patchFee(f.id, { amount: Number(e.target.value) })} /></Field></div>
                <div className="sm:col-span-2"><Field label="Paid by"><Select value={f.payer} onChange={(e) => patchFee(f.id, { payer: e.target.value as FeePayer })} options={[{ v: "customer", l: "Guest (service fee)" }, { v: "tenant", l: "Tenant (platform fee)" }]} /></Field></div>
                <div className="sm:col-span-1"><Field label="VAT %"><Input type="number" min={0} max={100} value={Math.round(f.vat * 100)} onChange={(e) => patchFee(f.id, { vat: Number(e.target.value) / 100 })} /></Field></div>
                <div className="sm:col-span-1 flex items-center gap-1 pb-2">
                  <Toggle on={f.active} onChange={(v) => patchFee(f.id, { active: v })} ariaLabel={`${f.name} active`} />
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setCfg((c) => ({ ...c, fees: c.fees.filter((x) => x.id !== f.id) }))} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Icon.trash size={14} /></button>
                </div>
                <div className="sm:col-span-12 text-[11.5px] text-slate-500 flex flex-wrap gap-3 items-center">
                  <label className="inline-flex items-center gap-1.5">Active from <input type="date" value={f.from} onChange={(e) => patchFee(f.id, { from: e.target.value })} className="rounded-md ring-1 ring-slate-200 px-1.5 py-0.5 text-[12px]" /></label>
                  {f.basis === "pctBooking" && f.amount > 100 && <span role="alert" className="text-rose-700">A rate can’t exceed 100%.</span>}
                  {!f.name.trim() && <span role="alert" className="text-rose-700">Name the fee.</span>}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-2 grid sm:grid-cols-3 gap-2">
            <Field label="Platform fee settlement"><Select value={cfg.settlement} onChange={(e) => setCfg((c) => ({ ...c, settlement: e.target.value as FinanceConfig["settlement"] }))} options={[{ v: "monthly", l: "Monthly" }, { v: "weekly", l: "Weekly" }]} /></Field>
          </div>
        </section>
        <section>
          <h3 className="font-semibold text-navy-900 mb-2">e-Invoicing provider (AADE myDATA)</h3>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Field label="Provider" hint="Transmits ΑΠΥ / ΤΠΥ / ΠΑΠΥ / ΠΤΠΥ and returns the MARK."><Select value={cfg.provider} onChange={(e) => setCfg((c) => ({ ...c, provider: e.target.value as EInvoiceProvider, providerConnected: false }))} options={E_INVOICE_PROVIDERS.map((p) => ({ v: p, l: p }))} /></Field>
            <div className="flex items-center gap-2 pb-1">
              <Badge tone={cfg.providerConnected ? "green" : "amber"}>{cfg.providerConnected ? "Connected" : "Not connected"}</Badge>
              {!cfg.providerConnected && <Btn size="sm" variant="outline" loading={connecting} onClick={connect}>Connect</Btn>}
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
