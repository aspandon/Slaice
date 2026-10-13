import { SupportAccessCard } from "../tenant/ViewAs";
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input } from "../../components/ui";
import { useApp } from "../../app/store";
import { downloadPDF } from "../../lib/download";
import { fmtDate, inWindow, isEu } from "../../domain/gdpr";
import { usePrivacy } from "./usePrivacy";

/* ============ Processors & DPO (AENR-487) ============
   The tenant's DPO / privacy contact (published in the Privacy Centre and the
   notice), the Slaice DPA it signed, and Slaice's sub-processors with
   location and transfer safeguard. Newly added sub-processors carry a 30-day
   objection window the tenant can use in-app. */

export function ProcessorsTab() {
  const { privacy, setPrivacy, today } = usePrivacy();
  const { toast } = useApp();
  const [dpo, setDpo] = useState(privacy.dpo);
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dpo.email);
  const dirty = JSON.stringify(dpo) !== JSON.stringify(privacy.dpo);
  const outdated = privacy.dpa.signedVersion !== privacy.dpa.current;
  const dpaPdf = () => {
    downloadPDF(`slaice-dpa-v${privacy.dpa.current}.pdf`, {
      title: `Data Processing Agreement v${privacy.dpa.current}`,
      subtitle: "Slaice (processor) · Akti tou Iliou AE (controller) · GDPR Art. 28",
      meta: [
        `Signed version: v${privacy.dpa.signedVersion} on ${fmtDate(privacy.dpa.signedAt)}`,
        `Generated ${new Date().toLocaleString("en-GB")}`,
      ],
      table: {
        cols: ["Sub-processor", "Location", "Safeguard"],
        rows: privacy.subprocessors.map((s) => [s.name, s.location, s.safeguard]),
      },
      footer: ["Annex III — technical and organisational measures available on request."],
    });
  };
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <div>
            <div className="font-semibold text-navy-900">
              Data Protection Officer / privacy contact
            </div>
            <div className="text-[12.5px] text-slate-500">
              Published in the customer Privacy Centre and the privacy notice (Art. 13(1)(b),
              37–39).
            </div>
          </div>
          <Field label="Name or role">
            <Input value={dpo.name} onChange={(e) => setDpo({ ...dpo, name: e.target.value })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <Field label="E-mail">
              <Input
                type="email"
                value={dpo.email}
                aria-invalid={!emailOk}
                onChange={(e) => setDpo({ ...dpo, email: e.target.value })}
                className={emailOk ? "" : "ring-2 ring-rose-400"}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={dpo.phone}
                onChange={(e) => setDpo({ ...dpo, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Postal address">
            <Input
              value={dpo.address}
              onChange={(e) => setDpo({ ...dpo, address: e.target.value })}
            />
          </Field>
          <div className="flex justify-end">
            <Btn
              variant="primary"
              icon={Icon.check}
              disabled={!dirty || !emailOk || !dpo.name.trim()}
              onClick={() => {
                setPrivacy((s) => ({ ...s, dpo }));
                toast("Privacy contact saved — now shown to customers in the Privacy Centre.", {
                  tone: "success",
                });
              }}
            >
              Save contact
            </Btn>
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-navy-900">Slaice Data Processing Agreement</div>
              <div className="text-[12.5px] text-slate-500">
                Slaice processes guest data on your behalf (Art. 28).
              </div>
            </div>
            <Badge tone={outdated ? "amber" : "green"}>
              {outdated ? "New version to sign" : "Signed"}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            <dt className="text-slate-500">Current version</dt>
            <dd className="font-semibold text-navy-900">v{privacy.dpa.current}</dd>
            <dt className="text-slate-500">You signed</dt>
            <dd className="font-semibold text-navy-900">
              v{privacy.dpa.signedVersion} · {fmtDate(privacy.dpa.signedAt)}
            </dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" icon={Icon.download} onClick={dpaPdf}>
              Download DPA (PDF)
            </Btn>
            {outdated && (
              <Btn
                variant="primary"
                icon={Icon.edit}
                onClick={() => {
                  setPrivacy((s) => ({
                    ...s,
                    dpa: { ...s.dpa, signedVersion: s.dpa.current, signedAt: today },
                  }));
                  toast(`DPA v${privacy.dpa.current} signed.`, { tone: "success" });
                }}
              >
                Review &amp; sign v{privacy.dpa.current}
              </Btn>
            )}
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="font-semibold text-navy-900">Slaice sub-processors</div>
          <div className="text-[12.5px] text-slate-500">
            Read-only — Slaice maintains this list. New sub-processors open a 30-day window in which
            you can object.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Provider</th>
                <th className="px-2 font-semibold">Purpose</th>
                <th className="px-2 font-semibold">Location</th>
                <th className="px-2 font-semibold">Transfer safeguard</th>
                <th className="px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {privacy.subprocessors.map((s) => {
                const pending = inWindow(s, today);
                const objected = privacy.objections.includes(s.name);
                return (
                  <tr key={s.name} className={pending ? "bg-amber-50/50" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-navy-900">{s.name}</td>
                    <td className="px-2 text-slate-600">{s.purpose}</td>
                    <td className="px-2">{s.location}</td>
                    <td className="px-2">
                      <Badge tone={isEu(s) ? "slate" : "blue"}>{s.safeguard}</Badge>
                      {s.tia && (
                        <button
                          type="button"
                          onClick={() => toast(`Demo — downloaded ${s.tia}.`)}
                          className="block text-[11.5px] font-semibold text-teal-700 hover:underline mt-0.5"
                        >
                          Transfer impact assessment
                        </button>
                      )}
                    </td>
                    <td className="px-4">
                      {pending ? (
                        objected ? (
                          <Badge tone="red">You objected</Badge>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone="amber">
                              Objection window · until {fmtDate(s.windowEnds ?? today)}
                            </Badge>
                            <Btn
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPrivacy((p) => ({
                                  ...p,
                                  objections: [...p.objections, s.name],
                                }));
                                toast(
                                  `Objection to ${s.name} sent to Slaice — they'll contact you before it processes your data.`,
                                  { tone: "success" },
                                );
                              }}
                            >
                              Object
                            </Btn>
                          </div>
                        )
                      ) : (
                        <Badge tone="green">Active</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Data-access transparency lives with the DPA and sub-processors (AENR-565):
          every Slaice support session on this account, with the grant controls. */}
      <div id="support-access"><SupportAccessCard /></div>
    </div>
  );
}
