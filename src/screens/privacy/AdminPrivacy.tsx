import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn, PageHead, StatCard, Tabs } from "../../components/ui";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { downloadCSVReport } from "../../lib/download";
import { useNow } from "../../lib/useLiveSlots";
import { dsarKpis, dueDate, hoursLeft, inWindow, retentionLabel } from "../../domain/gdpr";
import { usePrivacy } from "./usePrivacy";
import { RequestsTab } from "./Requests";
import { ConsentTab, PoliciesTab } from "./Consent";
import { RegisterTab, RetentionTab } from "./Register";
import { ProcessorsTab } from "./Processors";
import { BreachesTab, TENANT_ID } from "./Breaches";

/* ============ Privacy & GDPR (A-09) — the controller's workspace ============
   AENR-484…489: requests, consent, policies & cookies, the Art. 30 register
   with DPIAs, retention, processors & DPO, and breaches. KPIs come from the
   data; the tab lives in the URL (?tab=). */

const TABS = [
  "requests",
  "consent",
  "policies",
  "register",
  "retention",
  "processors",
  "breaches",
] as const;
type Tab = (typeof TABS)[number];

export function AdminPrivacy() {
  const { toast } = useApp();
  const { privacy, today } = usePrivacy();
  const now = useNow(60000);
  const q = readHashQuery().get("tab");
  const [tab, setTabRaw] = useState<Tab>(TABS.includes(q as Tab) ? (q as Tab) : "requests");
  const setTab = (t: string) => {
    setTabRaw(t as Tab);
    writeHashQuery({ tab: t });
  };
  const k = dsarKpis(privacy.requests, today);
  const breaches = privacy.breaches.filter(
    (b) => (b.source === "Tenant" || b.tenantIds?.includes(TENANT_ID)) && !b.closedAt,
  );
  const urgent = breaches.filter((b) => b.notifiable !== false && !b.authority.length);
  const outdated = privacy.dpa.signedVersion !== privacy.dpa.current;
  const pendingSub = privacy.subprocessors.filter(
    (s) => inWindow(s, today) && !privacy.objections.includes(s.name),
  );
  const exportAll = () => {
    downloadCSVReport("privacy-gdpr.csv", [
      {
        title: "Data-subject requests (Art. 12, 15–21)",
        header: [
          "Request",
          "Type",
          "Name",
          "E-mail",
          "Channel",
          "Received",
          "Due",
          "Status",
          "Audit entries",
        ],
        rows: privacy.requests.map((r) => [
          r.id,
          r.type,
          `${r.first} ${r.last}`,
          r.email,
          r.channel,
          r.received,
          dueDate(r),
          r.status,
          r.audit.map((a) => `${a.at} ${a.by}: ${a.what}`).join(" | "),
        ]),
      },
      {
        title: "Consent log (Art. 7)",
        header: ["Guest", "Purpose", "Granted", "At", "Source", "Notice version", "Wording"],
        rows: privacy.consentLog.map((c) => [
          c.guestId,
          c.purpose,
          c.granted ? "Yes" : "No",
          c.at,
          c.source,
          c.version,
          c.wording,
        ]),
      },
      {
        title: "Retention schedule",
        header: ["Data", "Basis", "Retention"],
        rows: privacy.retention.map((r) => [r.data, r.basis, retentionLabel(r)]),
      },
      {
        title: "Breach register (Art. 33(5))",
        header: ["Incident", "Aware", "Risk", "People", "Notifiable", "Reason", "Closed"],
        rows: privacy.breaches.map((b) => [
          b.id,
          b.awareAt,
          b.risk,
          b.people,
          b.notifiable === undefined ? "Undecided" : b.notifiable ? "Yes" : "No",
          b.decisionReason ?? "",
          b.closedAt ?? "",
        ]),
      },
    ]);
    toast("Exported the privacy log (CSV).", { tone: "success" });
  };
  return (
    <div className="animate-fade-up">
      <PageHead
        actions={
          <Btn variant="outline" icon={Icon.download} onClick={exportAll}>
            Export
          </Btn>
        }
      />
      {(outdated || pendingSub.length > 0 || urgent.length > 0) && (
        <div className="space-y-2 mb-4">
          {urgent.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setTab("breaches")}
              className="w-full text-left rounded-2xl bg-rose-600 text-white px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2"
            >
              <Icon.shieldAlert size={16} /> {b.id} · {b.title} —{" "}
              {Math.max(0, Math.floor(hoursLeft(b, now)))}h left to decide and notify the Hellenic
              DPA{b.source === "Slaice (processor)" ? " (reported by Slaice)" : ""} →
            </button>
          ))}
          {outdated && (
            <button
              type="button"
              onClick={() => setTab("processors")}
              className="w-full text-left rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] text-amber-900 flex items-center gap-2"
            >
              <Icon.doc size={15} /> Slaice published DPA v{privacy.dpa.current} — you signed v
              {privacy.dpa.signedVersion}. Review and sign →
            </button>
          )}
          {pendingSub.length > 0 && (
            <button
              type="button"
              onClick={() => setTab("processors")}
              className="w-full text-left rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] text-amber-900 flex items-center gap-2"
            >
              <Icon.bell size={15} /> New sub-processor: {pendingSub.map((s) => s.name).join(", ")}{" "}
              — you can object until the window closes →
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Open requests"
          value={String(k.open)}
          sub={k.overdue ? `${k.overdue} overdue` : "none overdue"}
          tone={k.overdue ? "rose" : "indigo"}
        />
        <StatCard
          label="Due ≤ 10 days"
          value={String(k.dueSoon)}
          sub="one-month deadline"
          tone="rose"
        />
        <StatCard
          label="Avg resolution"
          value={`${k.avgDays}d`}
          sub={`${k.completed} completed requests`}
          tone="teal"
        />
        <StatCard
          label="Open breaches"
          value={String(breaches.length)}
          sub={
            urgent.length ? `${urgent.length} on the 72-hour clock` : "none awaiting notification"
          }
          tone={urgent.length ? "rose" : "teal"}
        />
      </div>
      <Tabs
        scroll
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          ["requests", `Requests${k.open ? ` · ${k.open}` : ""}`, Icon.inbox],
          ["consent", "Consent", Icon.sliders],
          ["policies", "Policies & cookies", Icon.doc],
          ["register", "Register & DPIA", Icon.database],
          ["retention", "Retention", Icon.clock],
          ["processors", "Processors & DPO", Icon.users],
          [
            "breaches",
            `Breaches${breaches.length ? ` · ${breaches.length}` : ""}`,
            Icon.shieldAlert,
          ],
        ]}
      />
      {tab === "requests" && <RequestsTab />}
      {tab === "consent" && <ConsentTab />}
      {tab === "policies" && <PoliciesTab />}
      {tab === "register" && <RegisterTab />}
      {tab === "retention" && <RetentionTab />}
      {tab === "processors" && <ProcessorsTab />}
      {tab === "breaches" && <BreachesTab />}
    </div>
  );
}
