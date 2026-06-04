import { useState } from "react";
import { Icon } from "../lib/icons";
import { Modal, Btn, Badge, Tabs, Toggle, Table, ConfirmModal } from "./ui";
import { useApp } from "../app/store";
import { PROCESSORS, RETENTION, DATA_RIGHTS } from "../data/gdpr";
import { downloadZIP, buildPDFBytes } from "../lib/download";
import { CUSTOMER_BOOKINGS, CUSTOMER_DOCS } from "../data/mock";

/* Customer Privacy Centre (P4.2) — access/portability, consent management,
   transparency on processors, and a proper erasure flow with the legal
   retention caveat. Opened from Account settings. */
export function PrivacyCenter({ open, onClose }) {
  const { consent, setConsent, reopenConsent, toast } = useApp();
  const [tab, setTab] = useState("data");
  const [confirmErase, setConfirmErase] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = () => {
    setExporting(true);
    // Assemble the data subject's bundle from the mock stores.
    const profile = { name: "Elena Manoli", email: "elena@example.com", phone: "+30 694 000 0000", language: "EN", created: "2025-06-12" };
    const json = JSON.stringify({
      exportedAt: new Date().toISOString(),
      subject: profile,
      consents: { analytics: consent.analytics, marketing: consent.marketing, recordedAt: consent.ts },
      bookings: CUSTOMER_BOOKINGS,
      documents: CUSTOMER_DOCS.map((d) => ({ id: d.id, date: d.date, for: d.for, amount: d.amt, mark: d.mark })),
      processors: PROCESSORS,
    }, null, 2);
    const summary = buildPDFBytes({
      title: "Your personal data export",
      subtitle: "Akti tou Iliou · data subject access request",
      meta: [`Subject: ${profile.name} · ${profile.email}`, `Generated ${new Date().toLocaleString("en-GB")}`, "Format: JSON (full) + this PDF summary"],
      table: {
        cols: ["Category", "Records"],
        rightCols: [1],
        rows: [
          ["Profile fields", "5"],
          ["Bookings", String(CUSTOMER_BOOKINGS.length)],
          ["Documents (ΑΠΥ/ΤΠΥ)", String(CUSTOMER_DOCS.length)],
          ["Marketing consent", consent.marketing ? "Granted" : "Not granted"],
        ],
      },
      footer: ["Provided under GDPR Art. 15 & 20.", "Questions? privacy@aktitouiliou.example"],
    });
    setTimeout(() => {
      downloadZIP(`my-data-${new Date().toISOString().slice(0, 10)}.zip`, [
        { name: "my-data.json", content: json },
        { name: "summary.pdf", content: summary },
      ]);
      setExporting(false);
      toast("Your data export is ready (ZIP: JSON + PDF).", { tone: "success" });
    }, 600);
  };

  const tabs = [
    ["data", "Your data", Icon.fileDown],
    ["consent", "Consents", Icon.sliders],
    ["who", "Who sees it", Icon.users],
    ["delete", "Delete", Icon.trash],
  ];

  return (
    <Modal open={open} onClose={onClose} title="Privacy & data" wide
      footer={<Btn variant="ghost" onClick={onClose}>Close</Btn>}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" scroll />

      {tab === "data" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-teal-50/70 ring-1 ring-teal-600/15 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white text-teal-700 grid place-items-center shrink-0 shadow-sm"><Icon.download size={20} /></span>
            <div className="flex-1">
              <div className="font-semibold text-navy-900">Download your data</div>
              <p className="text-[13px] text-slate-600 leading-snug mt-0.5">Get a machine-readable copy of everything we hold — profile, bookings, documents and consents (GDPR Art. 15 & 20).</p>
              <Btn variant="teal" size="sm" className="mt-3" icon={Icon.fileDown} loading={exporting} onClick={exportData}>{exporting ? "Preparing…" : "Export my data (ZIP)"}</Btn>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {DATA_RIGHTS.map((r) => {
              const I = Icon[r.icon] || Icon.shield;
              return (
                <div key={r.key} className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-sm text-navy-900"><I size={15} className="text-slate-500" />{r.title}</div>
                  <div className="text-[12px] text-slate-600 leading-snug mt-1">{r.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "consent" && (
        <div className="space-y-3">
          <ConsentToggle label="Analytics cookies" desc="Anonymous usage stats to improve the experience." on={consent.analytics} set={(v) => { setConsent({ analytics: v }); toast(`Analytics ${v ? "enabled" : "disabled"}.`); }} />
          <ConsentToggle label="Marketing" desc="Personalised offers by e-mail, SMS & push." on={consent.marketing} set={(v) => { setConsent({ marketing: v }); toast(`Marketing ${v ? "enabled" : "disabled"}.`); }} />
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-3.5 py-3 text-[12px] text-slate-600">
            <span>{consent.ts ? `Last updated ${new Date(consent.ts).toLocaleString("en-GB")}` : "No decision recorded yet."}</span>
            <button onClick={reopenConsent} className="font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"><Icon.refund size={12} /> Re-open cookie banner</button>
          </div>
        </div>
      )}

      {tab === "who" && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Who processes your data</div>
            <Table cols={["Party", "Role", "Location", "Legal basis"]} rows={PROCESSORS.map((p) => [
              <div><div className="font-semibold text-navy-900 text-[13px]">{p.name}</div><div className="text-[11px] text-slate-500">{p.purpose}</div></div>,
              <Badge tone={p.role.includes("controller") ? "indigo" : p.role.includes("Recipient") ? "amber" : "slate"}>{p.role}</Badge>,
              p.location, p.basis,
            ])} />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">How long we keep it</div>
            <Table cols={["Data", "Retention", "Basis"]} rows={RETENTION.map((r) => [
              r.data,
              <span className={r.legal ? "font-semibold text-navy-900" : ""}>{r.period}</span>,
              r.legal ? <Badge tone="amber">{r.basis}</Badge> : r.basis,
            ])} />
          </div>
        </div>
      )}

      {tab === "delete" && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-rose-50/70 ring-1 ring-rose-600/15 p-4">
            <div className="flex items-center gap-2 font-semibold text-rose-700"><Icon.trash size={16} /> Delete your account &amp; data</div>
            <p className="text-[13px] text-slate-600 leading-snug mt-1.5">
              We'll erase your profile, bookings, saved cards and marketing data after a <b>30-day grace period</b> (in case you change your mind).
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50/70 ring-1 ring-amber-600/15 p-3.5 flex items-start gap-2.5">
            <Icon.shieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-snug">
              <b>What we must keep:</b> issued invoices (ΑΠΥ/ΤΠΥ) and their myDATA records are retained for <b>5 years</b> under Greek tax law — this overrides erasure for those specific documents.
            </p>
          </div>
          <Btn variant="danger" icon={Icon.trash} onClick={() => setConfirmErase(true)}>Request erasure</Btn>
        </div>
      )}

      <ConfirmModal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        onConfirm={() => { onClose(); toast("Erasure requested. You'll get a confirmation e-mail; data is removed after 30 days.", { tone: "error" }); }}
        title="Request account erasure?"
        body="Your account is scheduled for deletion in 30 days. Invoices retained for tax law are excluded. You can cancel anytime before then."
        confirmLabel="Request erasure"
        icon={Icon.trash}
      />
    </Modal>
  );
}

function ConsentToggle({ label, desc, on, set }) {
  return (
    <div className="flex items-center justify-between rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3.5 py-3">
      <div className="min-w-0 pr-3">
        <div className="font-semibold text-sm text-navy-900">{label}</div>
        <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{desc}</div>
      </div>
      <Toggle on={on} onChange={set} />
    </div>
  );
}
