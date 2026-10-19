import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Table,
  DateInput, ExportMenu } from "../../components/ui";
import { Sparkline } from "../../components/charts";
import { usePlatform } from "../../lib/usePlatform";
import { addDays, fmtDay } from "../../domain/period";
import {
  LIMIT_LABEL,
  latestVersion,
  planChangePreview,
  usageLevel,
  type LimitId,
} from "../../domain/plans";
import {
  LIFECYCLE_LABEL,
  SEVERITY_LABEL,
  actionsRequired,
  healthScore,
  type Contact,
  type TenantRecord,
} from "../../domain/tenants";
import { KV, ReasonModal, SectionFrame, useTenantDraft, type SectionProps } from "./kit";
import { eur as eurFull, rateLabel, subscriptionLabel, termsOf } from "../../domain/economics";
import { seasonToDate } from "../../data/economics";
import { useStatementOpts } from "../../lib/useEconomics";
import { invoiceDownload } from "../reporting/Statement";

const eur = (n: number) => `€${n.toLocaleString("en-GB")}`;
const SEV_TONE = { blocking: "red", past_due: "amber", due_soon: "blue", info: "slate" } as const;
const SEV_ICON = {
  blocking: Icon.alert,
  past_due: Icon.clock,
  due_soon: Icon.calendar,
  info: Icon.info,
} as const;

/* ---------- Overview ---------- */
export function Overview({ t, go }: SectionProps) {
  const { today, updateTenant, toast, mrr, planName } = usePlatform();
  const statementOpts = useStatementOpts(today);
  const slaice = useMemo(() => seasonToDate(t, statementOpts(t)), [t, statementOpts]);
  const actions = actionsRequired(t, today);
  const h = healthScore(t, today);
  const resolve = (id: string, how: string) => {
    updateTenant(
      t.id,
      (x) => {
        if (id === "dpa")
          return { ...x, dpa: { status: "Signed", version: x.dpa.version, signed: today } };
        if (id === "mydata") return { ...x, mydata: "connected" };
        if (id === "dns") return { ...x, domainVerified: true };
        if (id.startsWith("stripe"))
          return {
            ...x,
            stripe: {
              ...x.stripe,
              payouts: true,
              reqs: x.stripe.reqs.filter((r) => `stripe-${r.id}` !== id),
            },
          };
        if (id.startsWith("inv-"))
          return {
            ...x,
            invoices: x.invoices.map((i) => (`inv-${i.no}` === id ? { ...i, status: "Paid" } : i)),
          };
        return x;
      },
      {
        section: "Actions required",
        change: `Resolved: ${actions.find((a) => a.id === id)?.title}`,
        reason: how,
      },
    );
    toast("Resolved — removed from Actions required and logged.", { tone: "success" });
  };
  return (
    <SectionFrame
      title="Overview"
      sub={`${LIFECYCLE_LABEL[t.lifecycle]}${t.goLive ? ` since ${fmtDay(t.goLive)}` : ""} · ${t.subdomain} · ${planName(t)}`}
    >
      {actions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-navy-900 flex items-center gap-2">
            <Icon.alert size={16} className="text-rose-600" /> Actions required{" "}
            <Badge tone="red">{actions.length}</Badge>
          </h3>
          <ol className="mt-2 divide-y divide-slate-100">
            {actions.map((a) => {
              const I = SEV_ICON[a.severity];
              return (
                <li key={a.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Badge tone={SEV_TONE[a.severity]}>
                    <I size={11} /> {SEVERITY_LABEL[a.severity]}
                  </Badge>
                  <span className="flex-1 min-w-[14rem] text-[13px]">
                    <b className="text-navy-900">{a.title}</b>
                    <span className="block text-slate-500">
                      {a.impact}
                      {a.due ? ` · due ${fmtDay(a.due)}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Btn size="sm" variant="ghost" onClick={() => go(a.section)}>
                      Open
                    </Btn>
                    <Btn
                      size="sm"
                      variant="outline"
                      icon={Icon.mail}
                      onClick={() =>
                        toast(
                          `Demo — remediation link sent to ${t.contacts.find((c) => c.role === "owner")?.email}.`,
                        )
                      }
                    >
                      Send link
                    </Btn>
                    <Btn
                      size="sm"
                      variant="tint"
                      onClick={() => resolve(a.id, "Tenant completed it (demo)")}
                    >
                      Tenant completed it
                    </Btn>
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ["GMV · season", eur(t.kpi.gmv)],
          ["Slaice revenue · season", eur(Math.round(slaice.slaiceRevenue))],
          ["Bookings", t.kpi.bookings.toLocaleString("en-GB")],
          ["MRR", eur(mrr(t))],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <div className="text-[12px] text-slate-500">{l}</div>
            <div className="font-display text-2xl font-bold text-navy-900 tnum">{v}</div>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="font-semibold text-navy-900 mb-1">Health</h3>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold text-navy-900 tnum">{h.score}</span>
            <Badge tone={h.label === "Healthy" ? "green" : h.label === "At risk" ? "amber" : "red"}>
              {h.label === "Healthy" ? <Icon.checkCircle size={11} /> : <Icon.alert size={11} />}{" "}
              {h.label}
            </Badge>
            <Sparkline data={t.health.trend} color="#0D9488" width={120} height={32} />
            <Btn size="sm" variant="ghost" className="ml-auto" onClick={() => go("health")}>
              Why?
            </Btn>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
            {(
              [
                ["Stripe", t.stripe.charges && t.stripe.payouts],
                ["myDATA", t.mydata === "connected"],
                ["Webhooks", t.webhooks === "healthy"],
              ] as [string, boolean][]
            ).map(([l, ok]) => (
              <span
                key={l}
                className={`rounded-lg px-2 py-1.5 ring-1 flex items-center gap-1.5 ${ok ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : "bg-amber-50 text-amber-800 ring-amber-600/20"}`}
              >
                {ok ? <Icon.check size={12} /> : <Icon.alert size={12} />} {l} {ok ? "OK" : "issue"}
              </span>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-navy-900 mb-1">Recent activity</h3>
          {t.audit.length === 0 ? (
            <p className="text-[13px] text-slate-500">No changes yet.</p>
          ) : (
            <ul className="text-[12.5px] space-y-1">
              {t.audit.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <span className="text-slate-500">
                    {new Date(a.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>{" "}
                  · <b className="text-navy-900">{a.change}</b> · {a.actor}
                </li>
              ))}
            </ul>
          )}
          <Btn size="sm" variant="ghost" className="mt-2" onClick={() => go("audit")}>
            Audit log
          </Btn>
        </Card>
      </div>
    </SectionFrame>
  );
}

/* ---------- Profile & contacts ---------- */
const ROLE_LABEL: Record<Contact["role"], string> = {
  owner: "Account owner (signatory)",
  billing: "Billing",
  operations: "Operations",
  technical: "Technical",
  dpo: "DPO",
};
export function Profile({ t }: SectionProps) {
  const d = useTenantDraft(
    t,
    [
      "name",
      "legalName",
      "vatNo",
      "address",
      "country",
      "language",
      "timezone",
      "currency",
      "contacts",
    ] as const,
    "Profile",
    ["vatNo", "legalName"],
  );
  const { updateTenant, toast } = usePlatform();
  const [transfer, setTransfer] = useState<Contact | null>(null);
  const setContact = (i: number, p: Partial<Contact>) =>
    d.set(
      "contacts",
      d.draft.contacts.map((c, j) => (j === i ? { ...c, ...p } : c)),
    );
  return (
    <SectionFrame title="Profile" sub="Legal identity, locale and the people to contact.">
      <Card className="p-4 grid sm:grid-cols-2 gap-3">
        <Field label="Trading name">
          <Input value={d.draft.name} onChange={(e) => d.set("name", e.target.value)} />
        </Field>
        <Field label="Legal name">
          <Input value={d.draft.legalName} onChange={(e) => d.set("legalName", e.target.value)} />
        </Field>
        <Field label="ΑΦΜ / VAT no.">
          <Input value={d.draft.vatNo} onChange={(e) => d.set("vatNo", e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={d.draft.address} onChange={(e) => d.set("address", e.target.value)} />
        </Field>
        <Field label="Country">
          <Select
            value={d.draft.country}
            onChange={(e) => d.set("country", e.target.value)}
            options={["Greece", "Cyprus"]}
          />
        </Field>
        <Field label="Default language">
          <Select
            value={d.draft.language}
            onChange={(e) => d.set("language", e.target.value)}
            options={["Greek", "English"]}
          />
        </Field>
        <Field label="Timezone">
          <Select
            value={d.draft.timezone}
            onChange={(e) => d.set("timezone", e.target.value)}
            options={["Europe/Athens", "Asia/Nicosia"]}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={d.draft.currency}
            onChange={(e) => d.set("currency", e.target.value)}
            options={["EUR"]}
          />
        </Field>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold text-navy-900 mb-2">Contacts by role</h3>
        <ul className="space-y-2">
          {d.draft.contacts.map((c, i) => (
            <li
              key={c.role}
              className="grid sm:grid-cols-12 gap-2 items-end rounded-xl ring-1 ring-slate-200 p-2"
            >
              {/* The role reads as the row's heading (AENR-731), so name, e-mail and phone get the width — phone numbers no longer cut off. */}
              <div className="sm:col-span-12 text-[12.5px] font-semibold text-navy-900">
                {ROLE_LABEL[c.role]}
              </div>
              <div className="sm:col-span-4">
                <Field label="Name">
                  <Input value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="E-mail">
                  <Input
                    type="email"
                    value={c.email}
                    onChange={(e) => setContact(i, { email: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Phone">
                  <Input
                    value={c.phone}
                    onChange={(e) => setContact(i, { phone: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-1 pb-1">
                {c.role !== "owner" && (
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => setTransfer(c)}
                    aria-label={`Make ${c.name} the account owner`}
                  >
                    Owner
                  </Btn>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11.5px] text-slate-500">
          Exactly one account owner. Transferring ownership needs confirmation and is audited.
        </p>
      </Card>
      {d.bar}
      {d.reasonModal}
      {transfer && (
        <ReasonModal
          title={`Make ${transfer.name} the account owner?`}
          confirmLabel="Transfer ownership"
          onCancel={() => setTransfer(null)}
          onConfirm={(reason) => {
            const prev = t.contacts.find((c) => c.role === "owner");
            updateTenant(
              t.id,
              (x) => ({
                ...x,
                contacts: x.contacts.map((c) =>
                  c.role === "owner"
                    ? { ...c, name: transfer.name, email: transfer.email, phone: transfer.phone }
                    : c,
                ),
              }),
              {
                section: "Profile",
                change: "Account owner transferred",
                from: prev?.name,
                to: transfer.name,
                reason,
              },
            );
            toast(`Ownership transferred to ${transfer.name}.`, { tone: "success" });
            setTransfer(null);
          }}
        />
      )}
    </SectionFrame>
  );
}

/* ---------- Contract & account ---------- */
export function Contract({ t, go }: SectionProps) {
  const { plan, planName } = usePlatform();
  const d = useTenantDraft(t, ["renewal", "accountManager"] as const, "Contract & account", [
    "renewal",
  ]);
  const pv = plan(t);
  const terms = termsOf(t);
  return (
    <SectionFrame
      title="Contract & account"
      sub="Dates, tier, commission and who looks after the account."
    >
      <Card className="p-4 grid sm:grid-cols-2 gap-x-6">
        <div>
          <KV k="Go-live">{t.goLive ? fmtDay(t.goLive) : "—"}</KV>
          <KV k="Plan tier">
            <button type="button" className="text-teal-700 underline" onClick={() => go("billing")}>
              {planName(t)}
            </button>
          </KV>
          {/* Commission lives in the tenant's commercial terms (AENR-725 / 689), not in the plan. */}
          <KV k="Commission · sunbeds">{rateLabel(terms.services.sunbeds)}</KV>
          <KV k="Commission · entry tickets">{rateLabel(terms.services.tickets)}</KV>
          <KV k="Subscription">
            <button type="button" className="text-teal-700 underline" onClick={() => go("terms")}>
              {subscriptionLabel(terms.subscription, pv?.price)}
            </button>
          </KV>
        </div>
        <div className="space-y-2 pt-2 sm:pt-0">
          <Field label="Renewal date">
            <DateInput
              
              value={d.draft.renewal}
              onChange={(v) => d.set("renewal", v)}
            />
          </Field>
          <Field label="Account manager">
            <Select
              value={d.draft.accountManager}
              onChange={(e) => d.set("accountManager", e.target.value)}
              options={["Sofia Antoniou", "Kostas Leventis", "Maria Papadaki"]}
            />
          </Field>
          <div className="text-[12px] text-slate-500">
            Renewal reminders go to the account manager 60 and 30 days before.
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold text-navy-900 mb-1">Signed documents</h3>
        <ul className="text-[13px] space-y-1">
          <li className="flex items-center gap-2">
            <Icon.doc size={14} /> Master services agreement · signed{" "}
            {t.goLive ? fmtDay(t.goLive) : "—"}
          </li>
          <li className="flex items-center gap-2">
            <Icon.doc size={14} /> Data processing agreement {t.dpa.version} ·{" "}
            {t.dpa.status === "Signed" ? `signed ${t.dpa.signed}` : "pending signature"}
          </li>
        </ul>
      </Card>
      {d.bar}
      {d.reasonModal}
    </SectionFrame>
  );
}

/* ---------- Subscription & billing (AENR-517) ---------- */
export function Billing({ t, go }: SectionProps) {
  const { platform, plan, planName, mrr, updateTenant, toast } = usePlatform();
  const [change, setChange] = useState<string | null>(null);
  const pv = plan(t);
  const overdue = t.invoices.filter((i) => i.status === "Overdue");
  const pay = (no: string, ok: boolean) => {
    if (!ok) return toast(`Demo — card declined for ${no}; dunning continues.`, { tone: "warn" });
    updateTenant(
      t.id,
      (x) => ({
        ...x,
        invoices: x.invoices.map((i) => (i.no === no ? { ...i, status: "Paid" } : i)),
      }),
      { section: "Subscription & billing", change: `Invoice ${no} paid`, actorType: "System" },
    );
    toast(`${no} paid.`, { tone: "success" });
  };
  return (
    <SectionFrame
      title="Subscription & billing"
      sub="Plan, billing cycle, invoices — MRR comes from the commercial terms: the subscription (plan list price, season / off-season price or none), add-ons and support."
      actions={
        <Btn variant="primary" icon={Icon.layers} onClick={() => setChange(t.plan.id)}>
          Change plan
        </Btn>
      }
    >
      {overdue.length > 0 && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 px-3 py-2.5 text-[13px] text-amber-900 flex flex-wrap items-center gap-2"
        >
          <Icon.alert size={15} />{" "}
          <b>
            {overdue.length} overdue invoice{overdue.length === 1 ? "" : "s"}
          </b>{" "}
          — reminders sent day 1 and 7; day 14 hands over to suspension.
          <Btn size="sm" variant="outline" className="ml-auto" onClick={() => go("danger")}>
            Suspension options
          </Btn>
        </div>
      )}
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ["Plan", planName(t)],
          ["MRR", `€${mrr(t)}`],
          ["Billing", t.billingCycle === "monthly" ? "Monthly" : "Seasonal"],
          ["Renews", fmtDay(t.renewal)],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <div className="text-[12px] text-slate-500">{l}</div>
            <div className="font-display text-xl font-bold text-navy-900">{v}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4 grid sm:grid-cols-2 gap-x-6">
        <div>
          <KV k="Plan list price">€{pv?.price ?? 0}/month</KV>
          <KV k="Subscription">
            <button type="button" className="text-teal-700 underline text-right" onClick={() => go("terms")}>
              {subscriptionLabel(termsOf(t).subscription, pv?.price)}
            </button>
          </KV>
          <KV k="Add-ons">€{t.addOns}/month</KV>
          <KV k="Trial ends">{t.trialEnd ? fmtDay(t.trialEnd) : "—"}</KV>
        </div>
        <div>
          <KV k="Billing contact">{t.contacts.find((c) => c.role === "billing")?.email}</KV>
          <KV k="Payment method">
            SEPA Direct Debit · ···6012 <Badge tone="green">Valid</Badge>
          </KV>
        </div>
      </Card>
      <Card className="p-2">
        <h3 className="px-2 pt-2 font-semibold text-navy-900">Invoices</h3>
        {t.invoices.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.receipt}
            title="No invoices yet"
            body="The first invoice is issued after go-live."
          />
        ) : (
          <Table
            dense
            cols={["Invoice", "Period", "Amount", "Status", ""]}
            right={[2]}
            rows={t.invoices.map((i) => [
              i.no,
              i.month ? `${i.period} · month-end` : i.period,
              eurFull(i.amount),
              <Badge
                tone={
                  i.status === "Paid"
                    ? "green"
                    : i.status === "Overdue"
                      ? "red"
                      : i.status === "Open"
                        ? "amber"
                        : "slate"
                }
              >
                {i.status}
              </Badge>,
              <span className="flex gap-1 justify-end">
                <ExportMenu
                size="sm"
                variant="ghost"
                label="Download"
                what={i.no}
                onExport={(f) => invoiceDownload(i, t, planName(t), f)}
              />
                {i.status !== "Paid" && i.status !== "Void" && (
                  <>
                    <Btn size="sm" variant="tint" onClick={() => pay(i.no, true)}>
                      Simulate paid
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => pay(i.no, false)}>
                      Simulate failed
                    </Btn>
                  </>
                )}
              </span>,
            ])}
          />
        )}
      </Card>
      {change && <PlanChangeModal t={t} onClose={() => setChange(null)} />}
      <p className="text-[11.5px] text-slate-500">
        Plans and versions are managed in Super Admin › Plans. {platform.plans.length} plans
        available.
      </p>
    </SectionFrame>
  );
}

/* Plan change with preview: gained / lost modules, limits exceeded, proration. */
function PlanChangeModal({ t: tn, onClose }: { t: TenantRecord; onClose: () => void }) {
  const { platform, plan, planName, today, updateTenant, toast } = usePlatform();
  const [to, setTo] = useState(platform.plans.find((p) => p.id !== tn.plan.id)?.id ?? tn.plan.id);
  const [when, setWhen] = useState<"now" | "renewal">("now");
  const [reason, setReason] = useState(false);
  const target = platform.plans.find((p) => p.id === to);
  const tv = target ? latestVersion(target) : undefined;
  const prev = tv ? planChangePreview(plan(tn), tv, tn.usage, today) : null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Change plan · ${tn.name}`}
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!prev || prev.blocking || to === tn.plan.id}
            onClick={() => setReason(true)}
          >
            Confirm {prev?.upgrade ? "upgrade" : "downgrade"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="New plan">
            <Select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              options={platform.plans.map((p) => ({
                v: p.id,
                l: `${p.name} v${latestVersion(p).version} · €${latestVersion(p).price}/mo`,
              }))}
            />
          </Field>
          <Field label="Effective">
            <Select
              value={when}
              onChange={(e) => setWhen(e.target.value as "now" | "renewal")}
              options={[
                { v: "now", l: "Now (prorated)" },
                { v: "renewal", l: `Next renewal (${fmtDay(tn.renewal)})` },
              ]}
            />
          </Field>
        </div>
        {prev && (
          <>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="rounded-xl ring-1 ring-emerald-600/20 bg-emerald-50/60 p-3">
                <div className="font-semibold text-emerald-800">Gains</div>
                <div className="text-[12.5px]">{prev.gained.join(", ") || "—"}</div>
              </div>
              <div className="rounded-xl ring-1 ring-rose-600/20 bg-rose-50/60 p-3">
                <div className="font-semibold text-rose-800">Loses</div>
                <div className="text-[12.5px]">{prev.lost.join(", ") || "—"}</div>
              </div>
            </div>
            {prev.exceeded.length > 0 && (
              <div
                role="alert"
                className={`rounded-xl p-3 text-[12.5px] ${prev.blocking ? "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20" : "bg-amber-50 text-amber-900 ring-1 ring-amber-600/20"}`}
              >
                <b>
                  {prev.blocking
                    ? "Blocked — current usage exceeds the new plan:"
                    : "Warning — usage above the new limits (soft, overage fees apply):"}
                </b>
                <ul className="mt-1 list-disc pl-5">
                  {prev.exceeded.map((e) => (
                    <li key={e.id}>
                      {LIMIT_LABEL[e.id]}: {e.used} used · {e.included} included
                      {e.hard ? " (hard limit)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[13px]">
              {termsOf(tn).subscription.mode !== "plan" ? (
                // The price comes from the commercial terms (AENR-689), not the plan's list price.
                <>
                  No price change — the subscription comes from the commercial terms ({subscriptionLabel(termsOf(tn).subscription)}); the plan sets modules and limits.
                </>
              ) : when === "now" ? (
                <>
                  Prorated for the rest of this month:{" "}
                  <b>
                    {prev.prorated >= 0 ? "" : "−"}€{Math.abs(prev.prorated).toFixed(2)}
                  </b>
                </>
              ) : (
                <>No charge now — the new plan starts at renewal.</>
              )}
            </div>
          </>
        )}
      </div>
      {reason && tv && (
        <ReasonModal
          title="Reason for the plan change"
          confirmLabel="Change plan"
          onCancel={() => setReason(false)}
          onConfirm={(r) => {
            updateTenant(
              tn.id,
              (x) => ({
                ...x,
                plan: { id: to, version: tv.version },
                renewal: when === "renewal" ? x.renewal : x.renewal,
              }),
              {
                section: "Subscription & billing",
                change: "Plan changed",
                from: planName(tn),
                to: `${target?.name} v${tv.version}${when === "renewal" ? ` (from ${tn.renewal})` : ""}`,
                reason: r,
              },
            );
            toast(
              `${tn.name} moved to ${target?.name} — modules, MRR and the portfolio chart updated.`,
              { tone: "success" },
            );
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

/* ---------- Usage & limits (AENR-517) ---------- */
export function Usage({ t }: SectionProps) {
  const { plan, today } = usePlatform();
  const pv = plan(t);
  const reset = (() => {
    const d = new Date(`${today}T00:00:00`);
    return addDays(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    );
  })();
  return (
    <SectionFrame
      title="Usage & limits"
      sub={`Meters against ${pv ? "the plan" : "no plan"} · monthly limits reset on ${fmtDay(reset)}.`}
    >
      <Card className="p-4 space-y-3">
        {(Object.keys(LIMIT_LABEL) as LimitId[]).map((k) => {
          const inc = pv?.limits[k].included ?? 0;
          const u = usageLevel(t.usage[k], inc);
          return (
            <div key={k}>
              <div className="flex flex-wrap justify-between gap-2 text-[13px]">
                <span className="font-semibold text-navy-900">{LIMIT_LABEL[k]}</span>
                <span className="tnum">
                  {t.usage[k].toLocaleString("en-GB")} / {inc.toLocaleString("en-GB")} ·{" "}
                  <b
                    className={
                      u.level === "over"
                        ? "text-rose-700"
                        : u.level === "warn"
                          ? "text-amber-700"
                          : "text-emerald-700"
                    }
                  >
                    {u.label}
                  </b>{" "}
                  · {pv?.limits[k].mode === "hard" ? "hard limit (blocks)" : "soft (overage fee)"}
                </span>
              </div>
              <div
                className="mt-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"
                role="meter"
                aria-label={LIMIT_LABEL[k]}
                aria-valuenow={t.usage[k]}
                aria-valuemin={0}
                aria-valuemax={inc}
              >
                <div
                  className={`h-full ${u.level === "over" ? "bg-rose-500" : u.level === "warn" ? "bg-amber-400" : "bg-teal-500"}`}
                  style={{ width: `${Math.min(100, u.pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </SectionFrame>
  );
}
