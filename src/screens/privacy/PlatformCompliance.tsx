import { useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  StatCard,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { DEMO_TODAY, addDays } from "../../domain/period";
import {
  fmtDate,
  inWindow,
  isEu,
  type Breach,
  type Safeguard,
  type SubProcessor, tiaReport } from "../../domain/gdpr";
import { TenantPostureTable } from "../tenant/PlatformOverviews";

import { downloadReport } from "../../lib/download";
/* ============ Platform · Compliance & DPA (AENR-487 / 488) ============
   Slaice is the processor. It keeps the sub-processor list (with transfer
   safeguards and TIAs) and versions the DPA; adding a sub-processor notifies
   every tenant and opens a 30-day objection window. A breach at Slaice is
   reported to the affected controllers without undue delay — the incident
   then appears in each tenant's own register, where the tenant decides on
   notifying the authority and customers. */

const SAFEGUARDS: Safeguard[] = [
  "EU / EEA",
  "Adequacy decision",
  "EU-US Data Privacy Framework",
  "SCCs (2021/914)",
];

export function PlatformCompliance() {
  const { privacy, setPrivacy, toast } = useApp();
  const { platform } = usePlatform();
  const tenants = platform.tenants.filter((t) => t.lifecycle !== "closed");
  const [addSub, setAddSub] = useState<SubProcessor | null>(null);
  const [incident, setIncident] = useState<{
    title: string;
    facts: string;
    categories: string;
    people: number;
    tenantIds: string[];
  } | null>(null);
  const today = DEMO_TODAY;
  const slaiceIncidents = privacy.breaches.filter((b) => b.source === "Slaice (processor)");
  const bump = (v: string) => {
    const [a, b] = v.split(".").map(Number);
    return `${a}.${(b || 0) + 1}`;
  };
  const report = () => {
    if (!incident) return;
    const id = `BR-${String(privacy.breaches.length + 1).padStart(3, "0")}`;
    const b: Breach = {
      id,
      title: incident.title,
      awareAt: new Date().toISOString(),
      source: "Slaice (processor)",
      facts: incident.facts,
      categories: incident.categories,
      people: incident.people,
      records: incident.people,
      consequences: "",
      measures: "Contained by Slaice; details follow in the processor's incident report.",
      risk: "Risk",
      authority: [],
      tenantIds: incident.tenantIds,
    };
    setPrivacy((s) => ({ ...s, breaches: [b, ...s.breaches] }));
    setIncident(null);
    toast(
      `${id} reported to ${incident.tenantIds.length} controller${incident.tenantIds.length > 1 ? "s" : ""} — it is now in their breach registers with the 72-hour clock running.`,
      { tone: "success" },
    );
  };
  return (
    <div className="animate-fade-up">
      <PageHead />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Data residency" value="EU" sub="Frankfurt region" tone="indigo" />
        <StatCard
          label="Sub-processors"
          value={String(privacy.subprocessors.length)}
          sub={`${privacy.subprocessors.filter((s) => !isEu(s)).length} outside the EU · all safeguarded`}
          tone="teal"
        />
        <StatCard
          label="Open incidents"
          value={String(slaiceIncidents.filter((b) => !b.closedAt).length)}
          sub="reported to tenants"
          tone={slaiceIncidents.some((b) => !b.closedAt) ? "rose" : "teal"}
        />
        <StatCard label="DPA" value={`v${privacy.dpa.current}`} sub="current version" />
      </div>
      <Card className="overflow-hidden mb-4">
        <div className="px-4 pt-4 pb-2 flex flex-wrap items-center gap-2">
          <div className="font-semibold text-navy-900">Sub-processors</div>
          <Btn
            size="sm"
            variant="primary"
            icon={Icon.plus}
            className="ml-auto"
            onClick={() =>
              setAddSub({
                name: "",
                purpose: "",
                location: "",
                safeguard: "EU / EEA",
                addedAt: today,
              })
            }
          >
            Add sub-processor
          </Btn>
        </div>
        {/* On phones the table scrolls sideways (AENR-731) instead of squeezing the safeguard badges into tall pills. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Provider</th>
                <th className="px-2 font-semibold">Purpose</th>
                <th className="px-2 font-semibold">Location</th>
                <th className="px-2 font-semibold">Transfer safeguard</th>
                <th className="px-2 font-semibold">TIA</th>
                <th className="px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {privacy.subprocessors.map((s) => (
                <tr key={s.name}>
                  <td className="px-4 py-2.5 font-semibold text-navy-900">{s.name}</td>
                  <td className="px-2 text-slate-600">{s.purpose}</td>
                  <td className="px-2">{s.location}</td>
                  <td className="px-2">
                    <Badge tone={isEu(s) ? "slate" : "blue"} className="whitespace-nowrap">{s.safeguard}</Badge>
                  </td>
                  <td className="px-2">
                    {s.tia ? (
                      <button
                        type="button"
                        className="text-[12px] font-semibold text-teal-700 hover:underline"
                        onClick={() => { downloadReport(s.tia!.replace(/\.pdf$/, ""), tiaReport(s), "pdf"); toast(`Downloaded ${s.tia}.`); }}
                      >
                        {s.tia}
                      </button>
                    ) : isEu(s) ? (
                      <span className="text-slate-500">Not needed</span>
                    ) : (
                      <Badge tone="red">Missing</Badge>
                    )}
                  </td>
                  <td className="px-4">
                    {inWindow(s, today) ? (
                      <Badge tone="amber">
                        Pending objection window · until {fmtDate(s.windowEnds ?? today)}
                        {privacy.objections.includes(s.name) ? " · 1 objection" : ""}
                      </Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-1">Data Processing Agreement</div>
          <div className="text-[13px] text-slate-600 mb-3">
            Current version <b>v{privacy.dpa.current}</b>. Publishing a new version asks every
            tenant to review and re-sign.
          </div>
          <div className="text-[12.5px] text-slate-600 mb-3">
            Akti tou Iliou signed v{privacy.dpa.signedVersion} on {fmtDate(privacy.dpa.signedAt)}
            {privacy.dpa.signedVersion !== privacy.dpa.current ? " — re-signature pending" : ""}.
          </div>
          <Btn
            variant="primary"
            icon={Icon.doc}
            onClick={() => {
              const v = bump(privacy.dpa.current);
              setPrivacy((s) => ({ ...s, dpa: { ...s.dpa, current: v } }));
              toast(`DPA v${v} published — ${tenants.length} tenants asked to re-sign.`, {
                tone: "success",
              });
            }}
          >
            Publish DPA v{bump(privacy.dpa.current)}
          </Btn>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-semibold text-navy-900 flex items-center gap-2">
              <Icon.shieldAlert size={16} className="text-rose-600" /> Incidents at Slaice
            </div>
            <Btn
              size="sm"
              variant="danger"
              icon={Icon.send}
              onClick={() =>
                setIncident({
                  title: "",
                  facts: "",
                  categories: "Customers · contact details",
                  people: 0,
                  tenantIds: [],
                })
              }
            >
              Report to tenants
            </Btn>
          </div>
          <div className="text-[12.5px] text-slate-600 mb-3">
            As processor, Slaice notifies the affected tenants without undue delay (Art. 33(2)).
            Each tenant then decides whether to notify the Hellenic DPA and its customers.
          </div>
          {slaiceIncidents.length === 0 ? (
            <div className="text-[13px] text-slate-500">No incidents reported.</div>
          ) : (
            <ul className="space-y-1.5">
              {slaiceIncidents.map((b) => (
                <li key={b.id} className="rounded-lg ring-1 ring-slate-200 px-3 py-2 text-[12.5px]">
                  <div className="flex justify-between gap-2">
                    <b className="text-navy-900">
                      {b.id} · {b.title}
                    </b>
                    <Badge tone={b.closedAt ? "green" : "amber"}>
                      {b.closedAt
                        ? "Closed by tenant"
                        : b.notifiable === undefined
                          ? "Tenant deciding"
                          : b.notifiable
                            ? "Tenant notified DPA"
                            : "Tenant: not notifiable"}
                    </Badge>
                  </div>
                  <div className="text-slate-500">
                    Reported {new Date(b.awareAt).toLocaleString("en-GB")} to{" "}
                    {b.tenantIds
                      ?.map((id) => platform.tenants.find((t) => t.id === id)?.name ?? id)
                      .join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="p-2">
        <div className="px-3 pt-2 pb-1 font-semibold text-navy-900">
          Per-tenant DPA &amp; posture
        </div>
        <TenantPostureTable />
      </Card>
      {addSub && (
        <Modal
          open
          onClose={() => setAddSub(null)}
          title="Add a sub-processor"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setAddSub(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                disabled={
                  !addSub.name.trim() ||
                  !addSub.purpose.trim() ||
                  !addSub.location.trim() ||
                  (!isEu(addSub) && !addSub.tia?.trim())
                }
                onClick={() => {
                  const s = { ...addSub, addedAt: today, windowEnds: addDays(today, 30) };
                  setPrivacy((p) => ({ ...p, subprocessors: [...p.subprocessors, s] }));
                  setAddSub(null);
                  toast(
                    `${s.name} added — ${tenants.length} tenants notified; objection window until ${fmtDate(s.windowEnds)}.`,
                    { tone: "success" },
                  );
                }}
              >
                Add &amp; notify tenants
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Provider">
              <Input
                value={addSub.name}
                onChange={(e) => setAddSub({ ...addSub, name: e.target.value })}
              />
            </Field>
            <Field label="Purpose">
              <Input
                value={addSub.purpose}
                onChange={(e) => setAddSub({ ...addSub, purpose: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <Input
                value={addSub.location}
                onChange={(e) => setAddSub({ ...addSub, location: e.target.value })}
                placeholder="e.g. USA"
              />
            </Field>
            <Field label="Transfer safeguard">
              <Select
                value={addSub.safeguard}
                onChange={(e) => setAddSub({ ...addSub, safeguard: e.target.value as Safeguard })}
                options={SAFEGUARDS}
              />
            </Field>
            {!isEu(addSub) && (
              <div className="col-span-2">
                <Field label="Transfer impact assessment (required outside the EU)">
                  <Input
                    value={addSub.tia ?? ""}
                    onChange={(e) => setAddSub({ ...addSub, tia: e.target.value })}
                    placeholder="e.g. TIA-Provider-2026.pdf"
                  />
                </Field>
              </div>
            )}
          </div>
        </Modal>
      )}
      {incident && (
        <Modal
          open
          onClose={() => setIncident(null)}
          title="Report an incident to affected tenants"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setIncident(null)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                icon={Icon.send}
                disabled={
                  !incident.title.trim() || !incident.facts.trim() || !incident.tenantIds.length
                }
                onClick={report}
              >
                Notify {incident.tenantIds.length || ""} tenant
                {incident.tenantIds.length === 1 ? "" : "s"}
              </Btn>
            </>
          }
        >
          <div className="space-y-2.5">
            <Field label="Title">
              <Input
                value={incident.title}
                onChange={(e) => setIncident({ ...incident, title: e.target.value })}
                placeholder="e.g. Misconfigured export bucket"
              />
            </Field>
            <Field label="What happened">
              <Input
                value={incident.facts}
                onChange={(e) => setIncident({ ...incident, facts: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Data affected">
                <Input
                  value={incident.categories}
                  onChange={(e) => setIncident({ ...incident, categories: e.target.value })}
                />
              </Field>
              <Field label="People (approx.)">
                <Input
                  type="number"
                  min={0}
                  value={incident.people}
                  onChange={(e) =>
                    setIncident({ ...incident, people: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </Field>
            </div>
            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-700 mb-1">
                Affected tenants (controllers)
              </legend>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {tenants.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 text-[12.5px] rounded-lg ring-1 ring-slate-200 px-2.5 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={incident.tenantIds.includes(t.id)}
                      onChange={(e) =>
                        setIncident({
                          ...incident,
                          tenantIds: e.target.checked
                            ? [...incident.tenantIds, t.id]
                            : incident.tenantIds.filter((x) => x !== t.id),
                        })
                      }
                    />{" "}
                    {t.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Modal>
      )}
    </div>
  );
}
