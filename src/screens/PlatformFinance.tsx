import { useState } from "react";
import { Icon } from "../lib/icons";
import { Badge, Btn, Field, Input, Modal, Select, Toggle } from "../components/ui";
import { useApp } from "../app/store";
import { DEFAULT_FINANCE, E_INVOICE_PROVIDERS, type EInvoiceProvider, type FinanceConfig } from "../domain/finance";
import { useFinance } from "../lib/useFinance";

/* ============ Tenant terminals & e-invoicing (AENR-521 / 527) ============
   The tenant's POS terminals and the e-invoicing provider that transmits
   documents to AADE myDATA. What Slaice charges — commission, guest service
   fees, VAT, corporate tax, support and subscription — moved to the tenant's
   Commercial terms section (AENR-725 / 689), where the old fee lines were
   migrated. */

let n = 0;

export function FinanceSettingsModal({ tenant, tenantId, subdomain, onClose }: { tenant: string; tenantId: string; subdomain: string; onClose: () => void }) {
  const { toast } = useApp();
  const [saved, save] = useFinance(subdomain);
  const [cfg, setCfg] = useState<FinanceConfig>(saved);
  const [connecting, setConnecting] = useState(false);
  const invalid = (cfg.terminals ?? []).some((x) => !x.name.trim());
  const connect = () => {
    setConnecting(true);
    window.setTimeout(() => {
      setConnecting(false);
      setCfg((c) => ({ ...c, providerConnected: true }));
      toast(`Demo — connected to ${cfg.provider}; test document accepted by myDATA.`, { tone: "success" });
    }, 1200);
  };
  return (
    <Modal open wide onClose={onClose} title={`Terminals & e-invoicing · ${tenant}`}
      footer={<>
        <Btn variant="ghost" onClick={() => setCfg({ ...DEFAULT_FINANCE, months: cfg.months })}>Reset to defaults</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon={Icon.check} disabled={invalid} onClick={() => { save(cfg); toast(`Terminals and e-invoicing saved for ${tenant}.`, { tone: "success" }); onClose(); }}>Save</Btn>
      </>}>
      <div className="space-y-5">
        <div className="rounded-xl bg-sky-50 ring-1 ring-sky-600/15 px-3 py-2 text-[12.5px] text-sky-900 flex flex-wrap items-center gap-2">
          <Icon.info size={14} className="shrink-0" />
          <span className="flex-1 min-w-[12rem]">Commission, guest service fees, VAT, corporate tax, support and subscription are set in the tenant's Commercial terms.</span>
          <Btn size="sm" variant="outline" onClick={() => { onClose(); window.location.hash = `#/platform/tenant/${tenantId}/terms`; }}>Open Commercial terms</Btn>
        </div>
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-semibold text-navy-900">POS terminals</h3>
            <Btn size="sm" variant="outline" icon={Icon.plus} onClick={() => setCfg((c) => ({ ...c, terminals: [...(c.terminals ?? []), { id: `T${(c.terminals?.length ?? 0) + 1}-${++n}`, name: `Terminal ${(c.terminals?.length ?? 0) + 1}`, online: true }] }))}>Add terminal</Btn>
          </div>
          <p className="text-[12px] text-slate-500 mb-2">Staff pick one when taking a card; the Z report splits card takings per terminal. Offline terminals can’t be chosen.</p>
          <ul className="space-y-2">
            {(cfg.terminals ?? []).map((x) => (
              <li key={x.id} className="flex items-center gap-2">
                <div className="flex-1"><Input aria-label="Terminal name" value={x.name} onChange={(e) => setCfg((c) => ({ ...c, terminals: c.terminals?.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)) }))} /></div>
                <Toggle on={x.online} onChange={(v) => setCfg((c) => ({ ...c, terminals: c.terminals?.map((y) => (y.id === x.id ? { ...y, online: v } : y)) }))} ariaLabel={`${x.name} online`} />
                <button type="button" aria-label={`Remove ${x.name}`} onClick={() => setCfg((c) => ({ ...c, terminals: c.terminals?.filter((y) => y.id !== x.id) }))} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Icon.trash size={14} /></button>
              </li>
            ))}
          </ul>
          {invalid && <p role="alert" className="mt-1 text-[12px] text-rose-700">Name every terminal.</p>}
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
