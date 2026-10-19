import { useUrlState } from "../../lib/useUrlState";
import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  StatCard,
  Table,
  Tabs,
  Toggle, ExportMenu } from "../../components/ui";
import { Funnel, LineChartMini } from "../../components/charts";
import { useApp } from "../../app/store";
import { readHashQuery } from "../../app/router";
import { usePlatform } from "../../lib/usePlatform";
import { useUndoToast } from "../../lib/useUndo";
import { downloadReport } from "../../lib/download";
import { makeTenant } from "../../data/tenants";
import { mrrSeries } from "../../domain/platform";
import { seasonToDate } from "../../data/economics";
import { useStatementOpts } from "../../lib/useEconomics";
import { addDays, fmtDay } from "../../domain/period";
import {
  LIMIT_LABEL,
  MODULES,
  latestVersion,
  moduleState,
  usageLevel,
  type LimitId,
  type PlanVersion,
} from "../../domain/plans";
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  actionsRequired,
  healthScore,
  type TenantRecord,
} from "../../domain/tenants";
import { blockersOf } from "./ProductSections";

/* ============ Cross-tenant Platform pages (AENR-500 B, 515, 517) ============
   Tenants, Onboarding and Super Admin become portfolio views over the same
   tenant records the tenant pages edit — nothing per-tenant is editable in two
   places with different data. */

const openTenant = (id: string, section = "overview") => {
  window.location.hash = `#/platform/tenant/${id}/${section}`;
};
const eurK = (n: number) => `€${(n / 1000).toFixed(1)}k`;

/* ---------- Tenants (P-01) ---------- */
type View =
  | "all"
  | "attention"
  | "onboarding"
  | "renewing"
  | "atrisk"
  | "over"
  | "trial"
  | "closed";
const VIEWS: [View, string][] = [
  ["all", "All"],
  ["attention", "Needs attention"],
  ["onboarding", "In onboarding"],
  ["renewing", "Renewing in 30 days"],
  ["atrisk", "At risk"],
  ["over", "Over limit"],
  ["trial", "Trial ending"],
  ["closed", "Closed"],
];

export function PlatformTenants() {
  const { go, incidents } = useApp();
  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const newIncidents = incidents.filter((i) => i.status === "new").length;
  const { platform, setPlatform, today, mrr, arr, planName, plan } = usePlatform();
  const statementOpts = useStatementOpts(today);
  const [viewRaw, setViewRaw] = useUrlState("view", "all");
  const view = viewRaw as View;
  const setView = (v: View) => setViewRaw(v);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [module, setModule] = useState("");
  const [stripe, setStripe] = useState("");
  const scoped = platform.tenants.filter((t) => platform.includeSandbox || t.env === "live");
  const rows = scoped.map((t) => {
    const actions = actionsRequired(t, today);
    const h = healthScore(t, today);
    const pv = plan(t);
    const over = (Object.keys(LIMIT_LABEL) as LimitId[]).some(
      (k) => usageLevel(t.usage[k], pv?.limits[k].included ?? 0).level === "over",
    );
    return { t, actions, h, over };
  });
  const matches = (r: (typeof rows)[number], v: View) => {
    const { t } = r;
    switch (v) {
      case "attention":
        return r.actions.some((a) => a.severity === "blocking" || a.severity === "past_due");
      case "onboarding":
        return t.lifecycle === "onboarding";
      case "renewing":
        return t.lifecycle === "live" && t.renewal >= today && t.renewal <= addDays(today, 30);
      case "atrisk":
        return t.lifecycle === "live" && r.h.label !== "Healthy";
      case "over":
        return r.over;
      case "trial":
        return !!t.trialEnd && t.trialEnd >= today && t.trialEnd <= addDays(today, 14);
      case "closed":
        return t.lifecycle === "closed";
      default:
        return t.lifecycle !== "closed";
    }
  };
  const qq = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      matches(r, view) &&
      (!status || r.t.lifecycle === status) &&
      (!stripe ||
        (stripe === "ok"
          ? r.t.stripe.charges && r.t.stripe.payouts
          : !(r.t.stripe.charges && r.t.stripe.payouts))) &&
      (!module ||
        moduleState(module, plan(r.t), r.t.overrides, r.t.beta, blockersOf(r.t), today).on) &&
      (!qq ||
        [r.t.name, r.t.subdomain, r.t.id, r.t.vatNo].some((v) => v.toLowerCase().includes(qq))),
  );
  const totalMrr = scoped.reduce((a, t) => a + mrr(t), 0);
  const totalArr = scoped.reduce((a, t) => a + arr(t), 0);
  // Slaice's own revenue from each tenant's commercial terms, season to date (AENR-725 / 689).
  const slaiceSeason = useMemo(
    () =>
      platform.tenants
        .filter((t) => platform.includeSandbox || t.env === "live")
        .reduce((a, t) => a + seasonToDate(t, statementOpts(t)).slaiceRevenue, 0),
    [platform.tenants, platform.includeSandbox, statementOpts],
  );
  const live = scoped.filter((t) => t.lifecycle === "live");
  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          on={platform.includeSandbox}
          onChange={(v) => setPlatform((p) => ({ ...p, includeSandbox: v }))}
          label="Include sandbox / demo tenants"
        />
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          <ExportMenu
            what="tenants"
            onExport={(f) =>
              downloadReport(`tenants_${view}`, {
                brand: "Slaice · platform",
                title: "Tenants",
                subtitle: `${shown.length} tenant${shown.length === 1 ? "" : "s"} · view: ${view}${platform.includeSandbox ? " · incl. sandbox" : ""}`,
                sections: [
                  { kpis: [
                    { label: "Tenants", value: String(shown.length) },
                    { label: "Live", value: String(shown.filter((r) => r.t.lifecycle === "live").length) },
                    { label: "MRR", value: `€${shown.reduce((a, r) => a + mrr(r.t), 0).toLocaleString("en-GB")}` },
                    { label: "Actions required", value: String(shown.reduce((a, r) => a + r.actions.length, 0)) },
                  ] },
                  { title: "Tenants", table: {
                    cols: ["Tenant", "ID", "Plan", "Status", "Health", "Actions required", "Stripe", "MRR (€)", "Environment"],
                    rows: shown.map((r) => [r.t.name, r.t.id, planName(r.t), LIFECYCLE_LABEL[r.t.lifecycle], r.h.score, r.actions.length, r.t.stripe.charges && r.t.stripe.payouts ? "enabled" : "restricted", mrr(r.t), r.t.env]),
                    total: ["Total", "", "", "", "", shown.reduce((a, r) => a + r.actions.length, 0), "", shown.reduce((a, r) => a + mrr(r.t), 0), ""],
                  } },
                ],
              }, f)
            }
          />
          {/* Open incidents across tenants (AENR-720). */}
          <Btn
            variant="outline"
            icon={Icon.alert}
            onClick={() => go("platform", "incidents")}
            className="whitespace-nowrap"
            aria-label={`Incidents · ${openIncidents.length} open${newIncidents ? ` · ${newIncidents} new` : ""}`}
          >
            {/* Short on phones (AENR-731): "Incidents 4", the full count from sm up. */}
            <span className="sm:hidden">Incidents {openIncidents.length}</span>
            <span className="hidden sm:inline">Incidents · {openIncidents.length} open{newIncidents ? ` · ${newIncidents} new` : ""}</span>
          </Btn>
          <Btn variant="indigo" icon={Icon.bolt} onClick={() => go("platform", "onboarding")} className="whitespace-nowrap">
            Onboard tenant
          </Btn>
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard
          label="Live tenants"
          value={live.length}
          sub={`${scoped.filter((t) => t.lifecycle === "onboarding").length} in onboarding`}
          tone="indigo"
        />
        <StatCard
          label="MRR"
          value={eurK(totalMrr)}
          sub={`ARR ${eurK(totalArr)} · subscriptions, add-ons, support`}
          tone="indigo"
        />
        <StatCard
          label="Platform GMV"
          value={eurK(scoped.reduce((a, t) => a + t.kpi.gmv, 0))}
          sub="season to date"
        />
        <button type="button" onClick={() => go("platform", "revenue")} className="text-left rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label={`Slaice revenue, season to date: ${eurK(slaiceSeason)}. Open Revenue & invoicing`}>
          <StatCard
            label="Slaice revenue"
            value={eurK(slaiceSeason)}
            sub="season to date · commission, fees, support, subscriptions"
            tone="indigo"
          />
        </button>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <div className="font-semibold text-navy-900">MRR · last 12 months (€)</div>
            <div className="text-[12px] text-slate-500 tnum">
              {eurK(totalMrr)} now · ARR {eurK(totalArr)} · dashed = month to date
            </div>
          </div>
          <LineChartMini
            color="#13315c"
            partialLast
            label="Monthly recurring revenue, last 12 months"
            data={mrrSeries(scoped, mrr, today).map((m) => ({ l: m.label, v: m.v }))}
          />
        </Card>
        <Card className="p-5">
          <div className="font-semibold text-navy-900 mb-3">Onboarding funnel</div>
          <Funnel
            steps={[
              { l: "Leads", v: 48 },
              { l: "Trials", v: 22 },
              { l: "KYC passed", v: 14 },
              { l: "Live", v: live.length },
            ]}
          />
        </Card>
      </div>
      <Tabs
        scroll
        tabs={VIEWS.map(([v, l]): [string, string] => [
          v,
          `${l} · ${rows.filter((r) => matches(r, v)).length}`,
        ])}
        value={view}
        onChange={(v) => setView(v as View)}
      />
      {view === "onboarding" && (
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <Icon.bolt size={18} className="text-teal-700" />
          <p className="flex-1 min-w-[220px] text-[13px] text-slate-600">Onboarding is a tenant state (AENR-566): open a tenant below to continue its wizard, or start a new one.</p>
          <Btn variant="primary" icon={Icon.plus} onClick={() => go("platform", "onboarding")}>Onboard a new tenant</Btn>
        </Card>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex items-center gap-2 rounded-xl ring-1 ring-slate-200 px-3 py-2 flex-1 min-w-[200px] max-w-sm text-slate-600 bg-white/70">
          <Icon.search size={16} />
          <span className="sr-only">Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, subdomain, ID or ΑΦΜ"
            className="text-sm outline-none w-full bg-transparent"
          />
        </label>
        <div className="w-44">
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { v: "", l: "Any status" },
              ...Object.entries(LIFECYCLE_LABEL).map(([v, l]) => ({ v, l })),
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Country"
            value=""
            onChange={() => undefined}
            options={[{ v: "", l: "Greece · all" }]}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Module"
            value={module}
            onChange={(e) => setModule(e.target.value)}
            options={[{ v: "", l: "Any module" }, ...MODULES.map((m) => ({ v: m, l: m }))]}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Stripe"
            value={stripe}
            onChange={(e) => setStripe(e.target.value)}
            options={[
              { v: "", l: "Any Stripe" },
              { v: "ok", l: "Enabled" },
              { v: "restricted", l: "Restricted" },
            ]}
          />
        </div>
      </div>
      <Card className="p-2">
        {shown.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.building}
            title="No tenants here"
            body="Try another view or filter."
          />
        ) : (
          <Table
            rowLink
            cols={["Tenant", "Plan", "Status", "Health", "Actions", "Stripe", "MRR", ""]}
            right={[6]}
            rows={shown.map(({ t, actions, h }) => [
              <button type="button" className="row-link text-left" onClick={() => openTenant(t.id)} aria-label={`Open ${t.name}`}>
                <b className="text-navy-900 hover:text-teal-700">{t.name}</b>
                {t.env !== "live" && (
                  <Badge tone="amber" className="ml-1">
                    {t.env === "sandbox" ? "Sandbox" : "Demo"}
                  </Badge>
                )}
                <span className="block text-[11.5px] text-slate-500">{t.subdomain}</span>
              </button>,
              planName(t),
              <Badge tone={LIFECYCLE_TONE[t.lifecycle]}>{LIFECYCLE_LABEL[t.lifecycle]}</Badge>,
              <span className="whitespace-nowrap tnum">
                {h.score} · {h.label}
              </span>,
              actions.length ? (
                <Badge tone={actions.some((a) => a.severity === "blocking") ? "red" : "amber"}>
                  {actions.length} open
                </Badge>
              ) : (
                <span className="text-slate-400">—</span>
              ),
              <Badge tone={t.stripe.charges && t.stripe.payouts ? "green" : "amber"}>
                {t.stripe.charges && t.stripe.payouts ? "enabled" : "restricted"}
              </Badge>,
              mrr(t) ? `€${mrr(t)}` : "—",
              <Btn
                size="sm"
                variant="ghost"
                icon={Icon.arrowR}
                onClick={() =>
                  t.lifecycle === "onboarding"
                    ? (window.location.hash = `#/platform/onboarding?tenant=${t.id}`)
                    : openTenant(t.id)
                }
              >
                Open
              </Btn>,
            ])}
          />
        )}
      </Card>
    </div>
  );
}

/* ---------- Tenant onboarding (P-02) — progress saved per tenant ---------- */
const STEPS = ["Tenant details", "Branding & plan", "Stripe Connect", "Map & go-live"];
export function PlatformOnboarding() {
  const { go, toast } = useApp();
  const { platform, setPlatform, updateTenant, today, actor } = usePlatform();
  const [id, setId] = useState(() => readHashQuery().get("tenant") ?? "");
  const t = platform.tenants.find((x) => x.id === id && x.lifecycle === "onboarding");
  const [name, setName] = useState("New Beach Club");
  const [sub, setSub] = useState("newbeach");
  const drafts = platform.tenants.filter((x) => x.lifecycle === "onboarding");
  const setStep = (s: number) => t && updateTenant(t.id, (x) => ({ ...x, onboardingStep: s }));
  const step = t?.onboardingStep ?? 0;
  const create = () => {
    const nt = makeTenant(name.trim(), sub.trim());
    if (platform.tenants.some((x) => x.id === nt.id))
      return toast("That subdomain is taken.", { tone: "warn" });
    setPlatform((p) => ({ ...p, tenants: [...p.tenants, { ...nt, onboardingStep: 1 }] }));
    setId(nt.id);
    window.history.replaceState(null, "", `#/platform/onboarding?tenant=${nt.id}`);
    toast(`${nt.name} created — saved as a draft under “In onboarding”.`);
  };
  const goLive = () => {
    if (!t) return;
    updateTenant(
      t.id,
      (x) => ({
        ...x,
        lifecycle: "live",
        goLive: today,
        onboardingStep: undefined,
        trialEnd: undefined,
        history: [
          ...x.history,
          {
            from: "onboarding",
            to: "live",
            reason: "Go live",
            actor,
            at: new Date().toISOString(),
          },
        ],
        invoices: x.invoices,
      }),
      { section: "Lifecycle", change: "Went live" },
    );
    toast(`${t.name} is live!`, { tone: "success" });
    openTenant(t.id);
  };
  if (!t)
    return (
      <div className="animate-fade-up max-w-3xl space-y-4">
        <Card className="p-5 space-y-3">
          <h2 className="font-display font-bold text-navy-900">New tenant</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tenant name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Subdomain" hint="{tenant}.slaice.app">
              <Input value={sub} onChange={(e) => setSub(e.target.value)} />
            </Field>
          </div>
          <Btn
            variant="primary"
            icon={Icon.arrowR}
            disabled={name.trim().length < 3 || sub.trim().length < 3}
            onClick={create}
          >
            Create & continue
          </Btn>
        </Card>
        {drafts.length > 0 && (
          <Card className="p-2">
            <h3 className="px-2 pt-2 font-semibold text-navy-900">Resume onboarding</h3>
            <Table
              dense
              cols={["Tenant", "Step", ""]}
              rows={drafts.map((d) => [
                d.name,
                `${(d.onboardingStep ?? 0) + 1} / ${STEPS.length} · ${STEPS[d.onboardingStep ?? 0]}`,
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setId(d.id);
                    window.history.replaceState(null, "", `#/platform/onboarding?tenant=${d.id}`);
                  }}
                >
                  Resume
                </Btn>,
              ])}
            />
          </Card>
        )}
      </div>
    );
  return (
    <div className="animate-fade-up max-w-3xl">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {t.name} · step {step + 1} of {STEPS.length} · {STEPS[step]}{" "}
        <span className="normal-case font-normal text-slate-500">— progress is saved</span>
      </div>
      <ol className="flex items-center mb-5" aria-label="Onboarding steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className="flex items-center flex-1 last:flex-none"
            aria-current={i === step ? "step" : undefined}
          >
            <span
              className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold ${i < step ? "bg-teal-600 text-white" : i === step ? "bg-navy-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
            >
              {i < step ? <Icon.check size={16} /> : i + 1}
            </span>
            <span
              className={`ml-2 text-[13px] font-semibold hidden sm:block ${i === step ? "text-navy-900" : "text-slate-500"}`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`h-1 flex-1 mx-3 rounded-full ${i < step ? "bg-teal-500" : "bg-slate-200"}`}
              />
            )}
          </li>
        ))}
      </ol>
      <Card className="p-6">
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tenant name">
              <Input
                value={t.name}
                onChange={(e) => updateTenant(t.id, (x) => ({ ...x, name: e.target.value }))}
              />
            </Field>
            <Field label="ΑΦΜ / VAT no.">
              <Input
                value={t.vatNo}
                onChange={(e) => updateTenant(t.id, (x) => ({ ...x, vatNo: e.target.value }))}
              />
            </Field>
            <Field label="Owner e-mail">
              <Input
                value={t.contacts[0].email}
                onChange={(e) =>
                  updateTenant(t.id, (x) => ({
                    ...x,
                    contacts: x.contacts.map((c, i) =>
                      i === 0 ? { ...c, email: e.target.value } : c,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Default language">
              <Select
                value={t.language}
                onChange={(e) => updateTenant(t.id, (x) => ({ ...x, language: e.target.value }))}
                options={["Greek", "English"]}
              />
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <Field label="Brand colour">
              <div className="flex gap-1.5">
                {["#0D9488", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Brand colour ${c}`}
                    aria-pressed={t.brand === c}
                    onClick={() => updateTenant(t.id, (x) => ({ ...x, brand: c }))}
                    className={`w-8 h-8 rounded-lg ${t.brand === c ? "ring-2 ring-offset-2 ring-navy-900" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Plan (modules come from it; overrides later on the tenant page)">
              <Select
                value={t.plan.id}
                onChange={(e) => {
                  const p = platform.plans.find((x) => x.id === e.target.value);
                  if (p)
                    updateTenant(t.id, (x) => ({
                      ...x,
                      plan: { id: p.id, version: latestVersion(p).version },
                    }));
                }}
                options={platform.plans.map((p) => ({
                  v: p.id,
                  l: `${p.name} · €${latestVersion(p).price}/mo`,
                }))}
              />
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-[#635bff] font-bold text-lg">
              <Icon.stripe size={22} /> Stripe Connect Standard
            </div>
            <div className="flex flex-wrap justify-center gap-2 font-mono text-[12px]">
              {(
                [
                  ["details_submitted", t.stripe.details],
                  ["charges_enabled", t.stripe.charges],
                  ["payouts_enabled", t.stripe.payouts],
                ] as [string, boolean][]
              ).map(([l, on]) => (
                <span
                  key={l}
                  className={`rounded-lg px-2.5 py-1.5 ring-1 ${on ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : "bg-amber-50 text-amber-800 ring-amber-600/20"}`}
                >
                  {on ? "✓" : "…"} {l}
                </span>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <Btn
                variant="indigo"
                icon={Icon.stripe}
                onClick={() =>
                  toast("Demo — account link sent; the tenant completes KYC on Stripe.")
                }
              >
                Send onboarding link
              </Btn>
              <Btn
                variant="ghost"
                onClick={() =>
                  updateTenant(
                    t.id,
                    (x) => ({
                      ...x,
                      stripe: {
                        ...x.stripe,
                        details: true,
                        charges: true,
                        payouts: true,
                        reqs: [],
                      },
                    }),
                    { section: "Payments", change: "Stripe KYC completed", actorType: "System" },
                  )
                }
              >
                Simulate KYC completed
              </Btn>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-600 text-white grid place-items-center">
              <Icon.check size={28} />
            </div>
            <div className="font-semibold text-navy-900">Ready to go live</div>
            <p className="text-sm text-slate-500">
              Configure the beach map, then go live. The site resolves at{" "}
              <span className="font-mono">{t.subdomain}</span>.
              {actionsRequired(t, today).length
                ? ` ${actionsRequired(t, today).length} open action(s) will show on its Overview.`
                : ""}
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Btn
                variant="outline"
                icon={Icon.map}
                onClick={() => {
                  setPlatform((p) => ({ ...p, siteTenant: t.id }));
                  go("admin", "layout");
                }}
              >
                Configure map
              </Btn>
              <Btn variant="teal" icon={Icon.bolt} onClick={goLive}>
                Go live
              </Btn>
            </div>
          </div>
        )}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <Btn
            variant="ghost"
            icon={Icon.arrowL}
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Btn>
          {step < STEPS.length - 1 && (
            <Btn variant="primary" icon={Icon.arrowR} onClick={() => setStep(step + 1)}>
              Continue
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Super Admin (P-03): module matrix, plans, webhooks, support access log ---------- */
export function PlatformSuperAdmin() {
  const { platform, setPlatform, updateTenant, today, toast, plan, actor } = usePlatform();
  const [tab, setTab] = useState("modules");
  const tenants = platform.tenants.filter((t) => t.lifecycle !== "closed");
  // The matrix opens read-only (AENR-638): Edit collects changes, Done applies them
  // with one reason and Undo; Cancel drops them. A stray click changes nothing.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [why, setWhy] = useState("");
  const undo = useUndoToast();
  const changes = Object.entries(draft);
  const stop = () => {
    setEditing(false);
    setDraft({});
    setWhy("");
  };
  const applyDraft = () => {
    const before = platform;
    const reason = why.trim();
    changes.forEach(([key, v]) => {
      const [tid, m] = key.split("|");
      const t = tenants.find((x) => x.id === tid);
      if (!t) return;
      const inPlan = !!plan(t)?.modules.includes(m);
      updateTenant(
        tid,
        (x) => ({
          ...x,
          overrides:
            v === inPlan
              ? x.overrides.filter((o) => o.module !== m)
              : [...x.overrides.filter((o) => o.module !== m), { module: m, on: v, reason, by: actor, at: new Date().toISOString() }],
        }),
        { section: "Modules", change: `${m} ${v ? "on" : "off"} (matrix)`, reason },
      );
    });
    undo(`${changes.length} module change${changes.length === 1 ? "" : "s"} applied — ${reason}.`, () => setPlatform(() => before));
    stop();
  };
  return (
    <div className="animate-fade-up space-y-4">
      <Tabs
        scroll
        tabs={[
          ["modules", "Modules matrix"],
          ["plans", "Plans"],
          ["webhooks", "Webhooks"],
          ["access", "Support access log"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "modules" && (
        <Card className="p-4 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <p className="text-[12.5px] text-slate-500 flex-1 min-w-[16rem]">
              The same data as each tenant's Modules section.{" "}
              {editing ? "Switch cells, give one reason, then Done." : "Read-only — Edit to change modules."}
            </p>
            {editing ? (
              <>
                <span className="text-[12.5px] font-semibold text-navy-900 tnum">
                  {changes.length} change{changes.length === 1 ? "" : "s"}
                </span>
                <div className="w-64">
                  <Input aria-label="Reason for these changes" placeholder="Reason (required)" value={why} onChange={(e) => setWhy(e.target.value)} />
                </div>
                <Btn variant="ghost" onClick={stop}>Cancel</Btn>
                <Btn variant="primary" icon={Icon.check} disabled={!changes.length || !why.trim()} onClick={applyDraft}>Done</Btn>
              </>
            ) : (
              <Btn variant="outline" icon={Icon.edit} onClick={() => setEditing(true)}>Edit</Btn>
            )}
          </div>
          <table className="text-sm">
            <caption className="sr-only">Modules per tenant</caption>
            <thead>
              <tr className="text-[11px] uppercase text-slate-600">
                <th className="text-left py-2 pr-4">Module</th>
                {tenants.map((t) => (
                  <th key={t.id} className="px-2 py-2 font-semibold">
                    <button
                      type="button"
                      className="hover:text-teal-700 underline-offset-2 hover:underline"
                      onClick={() => openTenant(t.id, "modules")}
                    >
                      {t.name}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULES.map((m) => (
                <tr key={m}>
                  <td className="py-2 pr-4 font-medium text-navy-900 whitespace-nowrap">{m}</td>
                  {tenants.map((t) => {
                    const st = moduleState(m, plan(t), t.overrides, t.beta, blockersOf(t), today);
                    return (
                      <td key={t.id} className="px-2 py-2 text-center" title={`${st.detail}`}>
                        <span className="inline-flex flex-col items-center gap-0.5">
                          {editing ? (
                            <Toggle
                              on={draft[`${t.id}|${m}`] ?? st.on}
                              disabled={st.source === "blocked"}
                              ariaLabel={`${m} for ${t.name}`}
                              onChange={(v) =>
                                setDraft((d) => {
                                  const k = `${t.id}|${m}`;
                                  const n = { ...d };
                                  if (v === st.on) delete n[k];
                                  else n[k] = v;
                                  return n;
                                })
                              }
                            />
                          ) : (
                            <span
                              aria-label={`${m} for ${t.name}: ${st.on ? "on" : "off"}`}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${st.on ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-400"}`}
                            >
                              {st.on ? <Icon.check size={14} /> : <Icon.minus size={14} />}
                            </span>
                          )}
                          {editing && `${t.id}|${m}` in draft && (
                            <span className="text-[9.5px] font-semibold text-amber-700">changed</span>
                          )}
                          {st.source === "override" && (
                            <span className="text-[9.5px] font-semibold text-indigo-700">
                              override
                            </span>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {tab === "plans" && <PlansCatalog />}
      {tab === "webhooks" && (
        <Card className="p-2">
          <Table
            dense
            cols={["Tenant", "Stripe webhooks", "Last 24 h", ""]}
            rows={tenants.map((t) => [
              t.name,
              <Badge tone={t.webhooks === "healthy" ? "green" : "red"}>{t.webhooks}</Badge>,
              t.webhooks === "healthy" ? "100% delivered" : "12 failed",
              <Btn size="sm" variant="ghost" onClick={() => openTenant(t.id, "integrations")}>
                Integrations
              </Btn>,
            ])}
          />
          <p className="px-3 py-2 text-[12px] text-slate-600">
            Platform endpoint verifies Stripe-Signature before processing. Events:
            checkout.session.completed, payment_intent.succeeded / payment_failed, charge.refunded,
            account.updated.
          </p>
        </Card>
      )}
      {tab === "access" && <AccessLog />}
      <div className="flex items-center gap-2 text-[12px] text-slate-500">
        <Icon.lock size={12} /> Your Slaice role:
        <select
          aria-label="Slaice role (demo)"
          value={platform.role}
          onChange={(e) => {
            setPlatform((p) => ({ ...p, role: e.target.value as typeof p.role }));
            toast(`Demo — you are now a Slaice ${e.target.value}.`);
          }}
          className="rounded-lg ring-1 ring-slate-200 px-2 py-1"
        >
          {["admin", "support", "viewer"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PlansCatalog() {
  const { platform, setPlatform, updateTenant, toast } = usePlatform();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanVersion | null>(null);
  const start = (id: string) => {
    const p = platform.plans.find((x) => x.id === id);
    if (!p) return;
    setEditing(id);
    setDraft(structuredClone(latestVersion(p)));
  };
  const saveVersion = () => {
    if (!editing || !draft) return;
    setPlatform((p) => ({
      ...p,
      plans: p.plans.map((x) =>
        x.id === editing
          ? {
              ...x,
              versions: [
                ...x.versions,
                {
                  ...draft,
                  version: latestVersion(x).version + 1,
                  created: new Date().toISOString().slice(0, 10),
                },
              ],
            }
          : x,
      ),
    }));
    toast("Saved as a new version — tenants stay on their version until migrated.", {
      tone: "success",
    });
    setEditing(null);
  };
  const migrate = (id: string) => {
    const p = platform.plans.find((x) => x.id === id);
    if (!p) return;
    const v = latestVersion(p).version;
    const on = platform.tenants.filter((t) => t.plan.id === id && t.plan.version < v);
    on.forEach((t) =>
      updateTenant(t.id, (x) => ({ ...x, plan: { id, version: v } }), {
        section: "Subscription & billing",
        change: `Migrated to ${p.name} v${v}`,
        from: `v${t.plan.version}`,
        to: `v${v}`,
      }),
    );
    toast(`${on.length} tenant(s) migrated to ${p.name} v${v}.`, { tone: "success" });
  };
  return (
    <div className="grid lg:grid-cols-3 gap-3">
      {platform.plans.map((p) => {
        const lv = latestVersion(p);
        const counts = p.versions.map((v) => ({
          v: v.version,
          n: platform.tenants.filter((t) => t.plan.id === p.id && t.plan.version === v.version)
            .length,
        }));
        const behind = platform.tenants.filter(
          (t) => t.plan.id === p.id && t.plan.version < lv.version,
        ).length;
        return (
          <Card key={p.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-navy-900">{p.name}</h3>
              <Badge tone="indigo">v{lv.version}</Badge>
            </div>
            <div className="font-display text-2xl font-bold text-navy-900">
              €{lv.price}
              <span className="text-sm font-normal text-slate-500">/month</span>
            </div>
            <div className="text-[12.5px] text-slate-600">{lv.modules.join(" · ")}</div>
            <ul className="text-[12px] text-slate-600">
              {(Object.keys(LIMIT_LABEL) as LimitId[]).map((k) => (
                <li key={k}>
                  {LIMIT_LABEL[k]}: {lv.limits[k].included.toLocaleString("en-GB")} (
                  {lv.limits[k].mode})
                </li>
              ))}
            </ul>
            <div className="text-[12px] text-slate-500">
              List price. Commission, guest fees, support and the price a tenant pays are its own
              commercial terms (tenant › Commercial terms).
            </div>
            <div className="text-[12px]">
              {counts.map((c) => (
                <span key={c.v} className="mr-2">
                  v{c.v}: <b>{c.n}</b> tenants
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn size="sm" variant="outline" onClick={() => start(p.id)}>
                Edit (new version)
              </Btn>
              {behind > 0 && (
                <Btn size="sm" variant="primary" onClick={() => migrate(p.id)}>
                  Migrate {behind} to v{lv.version}
                </Btn>
              )}
            </div>
            {editing === p.id && draft && (
              <div className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2">
                <Field label="Price €/month">
                  <Input
                    type="number"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                  />
                </Field>
                <fieldset>
                  <legend className="text-[12px] font-semibold text-slate-700">Modules</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULES.map((m) => (
                      <label key={m} className="inline-flex items-center gap-1 text-[12px]">
                        <input
                          type="checkbox"
                          className="accent-teal-600"
                          checked={draft.modules.includes(m)}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              modules: e.target.checked
                                ? [...draft.modules, m]
                                : draft.modules.filter((x) => x !== m),
                            })
                          }
                        />{" "}
                        {m}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Staff seats">
                  <Input
                    type="number"
                    value={draft.limits.seats.included}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        limits: {
                          ...draft.limits,
                          seats: { ...draft.limits.seats, included: Number(e.target.value) },
                        },
                      })
                    }
                  />
                </Field>
                <div className="flex gap-2">
                  <Btn size="sm" variant="primary" onClick={saveVersion}>
                    Save as v{lv.version + 1}
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function AccessLog() {
  const { platform } = usePlatform();
  const [staff, setStaff] = useState("");
  const [tenant, setTenant] = useState("");
  const [emerg, setEmerg] = useState(false);
  const all = useMemo(
    () => [...(platform.viewAs ? [platform.viewAs] : []), ...platform.sessions],
    [platform.viewAs, platform.sessions],
  );
  const rows = all.filter(
    (s) =>
      (!staff || s.by === staff) && (!tenant || s.tenantId === tenant) && (!emerg || s.emergency),
  );
  const name = (id: string) => platform.tenants.find((t) => t.id === id)?.name ?? id;
  const mins = (s: (typeof all)[number]) =>
    Math.max(
      1,
      Math.round(
        ((s.endedAt ? new Date(s.endedAt).getTime() : Date.now()) -
          new Date(s.startedAt).getTime()) /
          60000,
      ),
    );
  return (
    <Card className="p-2">
      <div className="flex flex-wrap gap-2 p-2">
        <div className="w-44">
          <Select
            aria-label="Staff member"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            options={[
              { v: "", l: "All staff" },
              ...[...new Set(all.map((s) => s.by))].map((v) => ({ v, l: v })),
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Tenant"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            options={[
              { v: "", l: "All tenants" },
              ...[...new Set(all.map((s) => s.tenantId))].map((v) => ({ v, l: name(v) })),
            ]}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            className="accent-rose-600"
            checked={emerg}
            onChange={(e) => setEmerg(e.target.checked)}
          />{" "}
          Emergency only
        </label>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={Icon.eye}
          title="No View-as sessions yet"
          body="Sessions started from a tenant page are listed here with duration and change count."
        />
      ) : (
        <Table
          dense
          cols={["Started", "Staff", "Tenant", "Scope · role", "Duration", "Changes", "Reason", ""]}
          rows={rows.map((s) => [
            new Date(s.startedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            s.by,
            name(s.tenantId),
            `${s.scope === "read" ? "Read-only" : "Read & write"} · ${s.role}`,
            `${mins(s)} min${s.endedAt ? "" : " (running)"}`,
            String(s.changes.length),
            s.reason,
            s.emergency ? (
              <Badge tone="red">Emergency</Badge>
            ) : s.endReason ? (
              <Badge tone="slate">{s.endReason}</Badge>
            ) : (
              <Badge tone="amber">running</Badge>
            ),
          ])}
        />
      )}
    </Card>
  );
}

/* ---------- Compliance per-tenant table → links to each tenant's Compliance tab ---------- */
export function TenantPostureTable() {
  const { platform } = usePlatform();
  const ts = platform.tenants.filter((t) => t.lifecycle !== "closed");
  return (
    <Table
      cols={["Tenant", "DPA", "Region", "DPO", "Signed", ""]}
      rows={ts.map((t: TenantRecord) => [
        <b className="text-navy-900">{t.name}</b>,
        <Badge tone={t.dpa.status === "Signed" ? "green" : "amber"}>{t.dpa.status}</Badge>,
        t.region,
        t.contacts.find((c) => c.role === "dpo")?.name ?? "—",
        t.dpa.signed ? fmtDay(t.dpa.signed) : "—",
        <Btn size="sm" variant="ghost" onClick={() => openTenant(t.id, "compliance")}>
          Open
        </Btn>,
      ])}
    />
  );
}
