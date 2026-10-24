import { useContext, useId, useMemo, useState, type ReactNode } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, DateInput, Input, Toggle } from "../../components/ui";
import { usePlatform } from "../../lib/usePlatform";
import { useUndoToast } from "../../lib/useUndo";
import {
  SERVICES,
  SERVICE_LABEL,
  SERVICE_UNIT,
  cloneTerms,
  dayLabel,
  FEE_CHANNELS,
  FEE_CHANNEL_LABEL,
  eur,
  monthsLabel,
  pct,
  supportMonthly,
  termsChanges,
  termsErrors,
  termsOf,
  type CommercialTerms as Terms,
  type ServiceId,
  type ServiceTerms,
  type SubscriptionMode,
  type SupportItem,
} from "../../domain/economics";
import type { AuditEntry } from "../../domain/tenants";
import { Part, SectionCtx, SectionFrame, useLeaveGuard, type SectionProps } from "./kit";
import { Invoicing, Payments } from "./AccessSections";
import { Choice, Num } from "./TermsFields";
import { ExampleBooking } from "./ExampleBooking";

/* ============ Platform › tenant › Commercial terms (AENR-725 / 689) ============
   The tenant's payment plan in one place: commission per service with a
   minimum per booking, the guest's service fee, VAT per service, the
   corporate-tax rebill, the support fee and an optional monthly subscription.
   Read-only until Edit; Done saves the draft with one reason — every change
   is its own Audit-log line, old → new — and Undo puts it back. The example
   booking beside the cards recalculates with every keystroke. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let seq = 0;

/** What every card gets: the terms shown (the draft while editing), the draft's errors by field
 *  path, and a way to change the draft. */
interface CardProps {
  view: Terms;
  editing: boolean;
  err: (path: string) => string | undefined;
  patch: (f: (d: Terms) => Terms) => void;
}

const TERMS_PARTS = [
  { id: "terms", label: "Commission, fees & subscription" },
  { id: "payments", label: "Payments" },
  { id: "invoicing", label: "Invoicing & tax" },
] as const;

export function CommercialTerms({ t, go }: SectionProps) {
  const { updateTenant, plan, planName } = usePlatform();
  const { canEdit } = useContext(SectionCtx);
  const undo = useUndoToast();
  const saved = useMemo(() => termsOf(t), [t]);
  const [draft, setDraft] = useState<Terms | null>(null);
  const [why, setWhy] = useState("");
  const editing = draft !== null;
  const view = draft ?? saved;
  const errors = useMemo(() => (draft ? termsErrors(draft) : {}), [draft]);
  const errCount = Object.keys(errors).length;
  const changes = useMemo(() => (draft ? termsChanges(saved, draft) : []), [draft, saved]);
  useLeaveGuard(changes.length > 0);
  const patch = (f: (d: Terms) => Terms) => setDraft((d) => (d ? f(d) : d));
  const start = () => {
    setDraft(cloneTerms(saved));
    setWhy("");
  };
  const stop = () => {
    setDraft(null);
    setWhy("");
  };
  const reason = why.trim();
  // Why Done is not available yet — undefined once it is.
  const blocker = !changes.length
    ? "Change something first"
    : errCount
      ? "Fix the highlighted fields"
      : reason.length < 5
        ? "Give a reason (5+ characters)"
        : undefined;
  const done = () => {
    if (!draft || blocker) return;
    const before = t.terms;
    changes.forEach((c, i) =>
      updateTenant(t.id, (x) => (i === 0 ? { ...x, terms: draft } : x), {
        section: "Commercial terms",
        change: c.label,
        from: c.from,
        to: c.to,
        reason,
      }),
    );
    undo(
      `Commercial terms saved for ${t.name} — ${changes.length} change${changes.length === 1 ? "" : "s"}. New bookings use them from now on.`,
      () =>
        updateTenant(t.id, (x) => ({ ...x, terms: before }), {
          section: "Commercial terms",
          change: "Change undone",
          reason: "Undo",
        }),
    );
    stop();
  };
  const card: CardProps = { view, editing, err: (k) => errors[k], patch };

  return (
    <SectionFrame
      title="Commercial terms"
      sub="What Slaice earns from this tenant and how the money moves — the commercial terms, the Stripe account and payouts, and invoicing & tax."
      parts={TERMS_PARTS}
    >
      <Part
        id="terms"
        icon={Icon.tag}
        title="Commission, fees & subscription"
        sub="Commission per service with a minimum per booking, the guest's service fee, VAT per service, the corporate-tax rebill, support and subscription. Online and phone bookings carry commission and guest fees, as set below."
        actions={
          editing ? undefined : (
            <Btn size="sm" variant="outline" icon={Icon.edit} onClick={start} disabled={!canEdit}>
              Edit
            </Btn>
          )
        }
      >
        {/* One grid: on phones the example sits right under the commission it illustrates; from xl it is
            a sticky column beside every card. */}
        <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-4 items-start">
          <ServicesCard {...card} />
          <div className="min-w-0 self-start xl:col-start-2 xl:row-start-1 xl:row-span-5 xl:sticky xl:top-[86px]">
            <ExampleBooking terms={view} editing={editing} invalid={errCount} />
          </div>
          <CorporateTaxCard {...card} />
          <SupportCard {...card} />
          <SubscriptionCard {...card} planPrice={plan(t)?.price ?? 0} planLabel={planName(t)} />
          <RecentChanges
            history={t.audit.filter((a) => a.section === "Commercial terms").slice(0, 6)}
          />
        </div>
        {editing && (
          <EditBar
            changes={changes.length}
            errCount={errCount}
            why={why}
            onWhy={setWhy}
            blocker={blocker}
            onCancel={stop}
            onDone={done}
          />
        )}
      </Part>
      <Payments t={t} canEdit={canEdit} go={go} />
      <Invoicing t={t} canEdit={canEdit} go={go} />
    </SectionFrame>
  );
}

const Head = ({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
    <div className="min-w-0">
      <h4 className="font-semibold text-navy-900">{title}</h4>
      {sub && <p className="text-[12.5px] text-slate-500 leading-snug max-w-2xl">{sub}</p>}
    </div>
    {right}
  </div>
);

const Cell = ({ k, v }: { k: string; v: string }) => (
  <div className="min-w-0">
    <dt className="sm:sr-only text-[11px] text-slate-500">{k}</dt>
    <dd className="font-semibold text-navy-900">{v}</dd>
  </div>
);

/* ---------- Commission, guest fee and VAT per service; the commission base; who keeps the fee ---------- */
function ServicesCard({ view, editing, err, patch }: CardProps) {
  const setService = (s: ServiceId, k: keyof ServiceTerms, v: number) =>
    patch((d) => ({ ...d, services: { ...d.services, [s]: { ...d.services[s], [k]: v } } }));
  // The commission-base hint uses this tenant's sunbed terms (a field being retyped counts as 0).
  const fin = (v: number) => (Number.isFinite(v) ? v : 0);
  const sunRate = fin(view.services.sunbeds.rate);
  const sunFee = fin(view.services.sunbeds.fee);
  return (
    <Card className="p-4 min-w-0 xl:col-start-1">
      <Head
        title="Commission, guest fee and VAT per service"
        sub="Commission is a share of each booking's total for the service, VAT included — or the minimum per booking when the share is lower. The guest pays the service fee per unit on top of the beach price."
      />
      <div
        className="hidden sm:grid grid-cols-[minmax(7.5rem,1.2fr)_repeat(4,minmax(0,1fr))] gap-3 px-1 pb-1.5 border-b border-slate-100 text-[11.5px] font-semibold leading-tight text-slate-500"
        aria-hidden
      >
        <span>Service</span>
        <span>Commission</span>
        <span>Minimum per booking</span>
        <span>Guest fee per unit</span>
        <span>VAT</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {SERVICES.map((s) => {
          const x = view.services[s];
          return (
            <li
              key={s}
              className="py-2.5 sm:grid sm:grid-cols-[minmax(7.5rem,1.2fr)_repeat(4,minmax(0,1fr))] sm:gap-3 sm:items-center"
            >
              <div className="mb-2 sm:mb-0 px-1">
                <div className="font-semibold text-[13.5px] text-navy-900">{SERVICE_LABEL[s]}</div>
                <div className="text-[11.5px] text-slate-500">fee per {SERVICE_UNIT[s].one}</div>
              </div>
              {editing ? (
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <Num
                    hideLabel
                    label={`${SERVICE_LABEL[s]} commission`}
                    short="Commission"
                    unit="%"
                    value={x.rate}
                    error={err(`services.${s}.rate`)}
                    onChange={(v) => setService(s, "rate", v)}
                  />
                  <Num
                    hideLabel
                    label={`${SERVICE_LABEL[s]} minimum per booking`}
                    short="Min per booking"
                    unit="€"
                    value={x.min}
                    error={err(`services.${s}.min`)}
                    onChange={(v) => setService(s, "min", v)}
                  />
                  <Num
                    hideLabel
                    label={`${SERVICE_LABEL[s]} guest fee per ${SERVICE_UNIT[s].one}`}
                    short={`Fee per ${SERVICE_UNIT[s].one}`}
                    unit="€"
                    value={x.fee}
                    error={err(`services.${s}.fee`)}
                    onChange={(v) => setService(s, "fee", v)}
                  />
                  <Num
                    hideLabel
                    label={`${SERVICE_LABEL[s]} VAT`}
                    short="VAT"
                    unit="%"
                    value={x.vat}
                    error={err(`services.${s}.vat`)}
                    onChange={(v) => setService(s, "vat", v)}
                  />
                </div>
              ) : (
                <dl className="grid grid-cols-4 gap-2 sm:contents text-[13px] tnum">
                  <Cell k="Commission" v={pct(x.rate)} />
                  <Cell k="Min / booking" v={x.min > 0 ? eur(x.min) : "None"} />
                  <Cell k="Guest fee" v={x.fee > 0 ? eur(x.fee) : "None"} />
                  <Cell k="VAT" v={pct(x.vat)} />
                </dl>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid lg:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
        <div>
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Commission base</div>
          {editing ? (
            <Toggle
              on={view.feesInBase}
              onChange={(v) => patch((d) => ({ ...d, feesInBase: v }))}
              label="Guest fees in the commission base"
            />
          ) : (
            <div className="text-[13px] text-navy-900 font-medium">
              {view.feesInBase ? "Guest fees included" : "Beach prices only"}
            </div>
          )}
          <p className="mt-1 text-[12px] text-slate-500 leading-snug">
            {view.feesInBase && sunFee > 0
              ? `A €30 set with its ${eur(sunFee)} fee earns ${pct(sunRate)} of ${eur(30 + sunFee)}.`
              : `A €30 set earns ${pct(sunRate)} of €30${sunFee > 0 ? "; the fee stays outside" : ""}.`}
          </p>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">
            Who keeps the guest service fee
          </div>
          {editing ? (
            <Choice
              label="Who keeps the guest service fee"
              value={view.feeTo}
              onChange={(v) => patch((d) => ({ ...d, feeTo: v }))}
              options={[
                { v: "slaice", l: "Slaice", sub: "collected with the commission" },
                { v: "tenant", l: "The beach", sub: "stays in the payout" },
              ]}
            />
          ) : (
            <div className="text-[13px] text-navy-900 font-medium">
              {view.feeTo === "slaice"
                ? "Slaice — collected with the commission"
                : "The beach — stays in its payout"}
            </div>
          )}
        </div>
        {/* Which bookings the rules apply to (AENR-728): phone bookings follow the online rules by default. */}
        <div className="lg:col-span-2">
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">
            Bookings that carry commission and the guest fee
          </div>
          {editing ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {FEE_CHANNELS.map((c) => (
                <Toggle
                  key={c}
                  on={view.channels[c]}
                  onChange={(v) => patch((d) => ({ ...d, channels: { ...d.channels, [c]: v } }))}
                  label={FEE_CHANNEL_LABEL[c]}
                />
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-navy-900 font-medium">
              {FEE_CHANNELS.filter((c) => view.channels[c]).map((c) => FEE_CHANNEL_LABEL[c]).join(" and ") || "None — no commission or guest fee"}
            </div>
          )}
          <p className="mt-1 text-[12px] text-slate-500 leading-snug">
            Phone bookings are the ones staff take (call centre, New booking) and the guest pays by card or a payment link; a booking paid at the beach has no fee. Till and walk-in sales never carry commission.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Corporate tax re-billed on the month's commission ---------- */
function CorporateTaxCard({ view, editing, err, patch }: CardProps) {
  return (
    <Card className="p-4 min-w-0 xl:col-start-1">
      <Head
        title="Corporate tax re-billed"
        sub="Slaice's commission is net income. At the end of each month the corporate tax on it is added to Slaice's invoice to the tenant."
      />
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-36">
          {editing ? (
            <Num
              label="Corporate tax rate"
              unit="%"
              value={view.corporateTax}
              error={err("corporateTax")}
              onChange={(v) => patch((d) => ({ ...d, corporateTax: v }))}
            />
          ) : (
            <>
              <div className="text-[11.5px] font-semibold text-slate-600 mb-1">
                Corporate tax rate
              </div>
              <div className="font-display text-xl font-bold text-navy-900 tnum">
                {pct(view.corporateTax)}
              </div>
            </>
          )}
        </div>
        <p className="text-[12.5px] text-slate-500 pb-1.5">
          Greece: 22%. On €1,000 of {view.taxBase === "commission" ? "commission" : "commission and kept fees"} the tenant is re-billed{" "}
          {eur((1000 * (Number.isFinite(view.corporateTax) ? view.corporateTax : 0)) / 100)}.
        </p>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Re-billed on</div>
        {editing ? (
          <Choice
            label="Corporate tax re-billed on"
            value={view.taxBase}
            onChange={(v) => patch((d) => ({ ...d, taxBase: v }))}
            options={[
              { v: "commission", l: "Commission only", sub: "the default" },
              { v: "commissionAndFees", l: "Commission + guest fees", sub: "the fees Slaice keeps" },
            ]}
          />
        ) : (
          <div className="text-[13px] text-navy-900 font-medium">
            {view.taxBase === "commission" ? "Commission only" : "Commission + the guest fees Slaice keeps"}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Support fee: line items and an optional end date ---------- */
function SupportCard({ view, editing, err, patch }: CardProps) {
  const total = supportMonthly(view);
  const { items, until } = view.support;
  const errId = useId();
  const setItems = (f: (items: SupportItem[]) => SupportItem[]) =>
    patch((d) => ({ ...d, support: { ...d.support, items: f(d.support.items) } }));
  const setItem = (id: string, p: Partial<SupportItem>) =>
    setItems((xs) => xs.map((y) => (y.id === id ? { ...y, ...p } : y)));
  return (
    <Card className="p-4 min-w-0 xl:col-start-1">
      <Head
        title="Support fee"
        sub="A fixed monthly fee for support services, built from line items. It stops after the end date — that month is charged for its days only."
        right={
          <Badge tone={total > 0 ? "info" : "slate"}>
            {total > 0 ? `${eur(total)} a month` : "None"}
          </Badge>
        }
      />
      {items.length === 0 && !editing && (
        <p className="text-[13px] text-slate-500">No support fee — add line items with Edit.</p>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) =>
            editing ? (
              <li
                key={it.id}
                className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] sm:grid-cols-[minmax(0,1fr)_8.5rem_auto] gap-2 items-start"
              >
                {/* Each row's fields are named by their number; the error is the field's description. */}
                <div className="min-w-0">
                  <label className="block">
                    <span className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                      Item
                    </span>
                    <Input
                      value={it.label}
                      aria-label={`Support item ${i + 1}`}
                      aria-invalid={err(`support.items.${i}.label`) ? true : undefined}
                      aria-describedby={
                        err(`support.items.${i}.label`) ? `${errId}-${it.id}` : undefined
                      }
                      onChange={(e) => setItem(it.id, { label: e.target.value })}
                    />
                  </label>
                  {err(`support.items.${i}.label`) && (
                    <span
                      id={`${errId}-${it.id}`}
                      className="mt-1 block text-[11.5px] font-medium text-rose-700"
                    >
                      {err(`support.items.${i}.label`)}
                    </span>
                  )}
                </div>
                <Num
                  label={`Support item ${i + 1}, € a month`}
                  short="€ a month"
                  unit="€"
                  value={it.amount}
                  error={err(`support.items.${i}.amount`)}
                  onChange={(v) => setItem(it.id, { amount: v })}
                />
                <button
                  type="button"
                  aria-label={`Remove ${it.label || "item"}`}
                  onClick={() => setItems((xs) => xs.filter((y) => y.id !== it.id))}
                  className="mt-[22px] w-10 h-10 rounded-xl grid place-items-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <Icon.trash size={15} />
                </button>
              </li>
            ) : (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 text-[13px] border-b border-slate-100 last:border-0 pb-1.5"
              >
                <span className="text-slate-700">{it.label}</span>
                <span className="tnum font-semibold text-navy-900">{eur(it.amount)}</span>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {editing && (
          <Btn
            size="sm"
            variant="outline"
            icon={Icon.plus}
            onClick={() =>
              setItems((xs) => [
                ...xs,
                { id: `sup-${Date.now().toString(36)}${++seq}`, label: "", amount: 0 },
              ])
            }
          >
            Add item
          </Btn>
        )}
        <div className="ml-auto flex flex-wrap items-end gap-3">
          {editing ? (
            <>
              <Toggle
                on={until !== null}
                onChange={(v) =>
                  patch((d) => ({
                    ...d,
                    support: {
                      ...d.support,
                      until: v ? `${new Date().getFullYear()}-09-30` : null,
                    },
                  }))
                }
                label="Has an end date"
              />
              {until !== null && (
                <div>
                  <div aria-hidden className="text-[11.5px] font-semibold text-slate-600 mb-1">
                    Last day charged
                  </div>
                  <DateInput
                    aria-label="Support fee: last day charged"
                    value={until}
                    onChange={(v) => patch((d) => ({ ...d, support: { ...d.support, until: v } }))}
                  />
                </div>
              )}
            </>
          ) : (
            items.length > 0 && (
              <span className="text-[12.5px] text-slate-600">
                {until ? `Charged until ${dayLabel(until)} — that month pro-rated` : "No end date"}
              </span>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Monthly subscription: plan list price, custom season / off-season price, or none ---------- */
function SubscriptionCard({
  view,
  editing,
  err,
  patch,
  planPrice,
  planLabel,
}: CardProps & { planPrice: number; planLabel: string }) {
  const sub = view.subscription;
  const setSub = (p: Partial<Terms["subscription"]>) =>
    patch((d) => ({ ...d, subscription: { ...d.subscription, ...p } }));
  return (
    <Card className="p-4 min-w-0 xl:col-start-1">
      <Head
        title="Monthly subscription"
        sub="On top of commission, the tenant can pay a monthly price — its plan's list price, or a custom price that is higher in the season months and lower in the others."
      />
      {editing ? (
        <Choice<SubscriptionMode>
          label="Monthly subscription"
          value={sub.mode}
          onChange={(m) =>
            patch((d) => ({
              ...d,
              subscription: {
                ...d.subscription,
                mode: m,
                // A first switch to custom starts from the plan's price, with the off-season at about a third.
                ...(m === "custom" && !d.subscription.active && !d.subscription.inactive
                  ? { active: planPrice, inactive: Math.round((planPrice * 0.3) / 10) * 10 }
                  : {}),
              },
            }))
          }
          options={[
            { v: "plan", l: "Plan list price", sub: `${planLabel} · ${eur(planPrice)} a month` },
            { v: "custom", l: "Custom price", sub: "season / off-season" },
            { v: "none", l: "None", sub: "commission only" },
          ]}
        />
      ) : (
        <div className="text-[13.5px] text-navy-900 font-medium">
          {sub.mode === "none"
            ? "None — commission only"
            : sub.mode === "plan"
              ? `Plan list price · ${planLabel} · ${eur(planPrice)} a month`
              : `Custom · ${eur(sub.active)} in season months, ${eur(sub.inactive)} otherwise`}
        </div>
      )}
      {sub.mode === "custom" && (
        <div className="mt-3 space-y-3">
          {editing && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Num
                label="Season month price"
                unit="€"
                value={sub.active}
                error={err("subscription.active")}
                onChange={(v) => setSub({ active: v })}
              />
              <Num
                label="Other month price"
                unit="€"
                value={sub.inactive}
                error={err("subscription.inactive")}
                onChange={(v) => setSub({ inactive: v })}
              />
            </div>
          )}
          <div>
            <div className="text-[11.5px] font-semibold text-slate-600 mb-1.5">
              Season months (billed at {Number.isFinite(sub.active) ? eur(sub.active) : "—"}) ·{" "}
              {monthsLabel(sub.activeMonths)}
            </div>
            <div
              role="group"
              aria-label="Season months"
              className="grid grid-cols-6 sm:grid-cols-12 gap-1.5"
            >
              {MONTHS.map((m, i) => {
                const on = sub.activeMonths.includes(i + 1);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    disabled={!editing}
                    onClick={() =>
                      patch((d) => {
                        const ms = d.subscription.activeMonths;
                        const next = ms.includes(i + 1)
                          ? ms.filter((x) => x !== i + 1)
                          : [...ms, i + 1].sort((a, b) => a - b);
                        return { ...d, subscription: { ...d.subscription, activeMonths: next } };
                      })
                    }
                    className={`min-h-[40px] rounded-lg text-[12.5px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-default ${on ? "bg-teal-600 text-white ring-teal-600" : "bg-white text-slate-600 ring-slate-200 enabled:hover:ring-slate-400"}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------- The section's latest Audit-log lines ---------- */
function RecentChanges({ history }: { history: AuditEntry[] }) {
  return (
    <Card className="p-4 min-w-0 xl:col-start-1">
      <Head
        title="Recent changes"
        sub="Every change is written to the Audit log with the reason given."
      />
      {history.length === 0 ? (
        <p className="text-[13px] text-slate-500">
          No changes yet — these are the terms agreed at go-live.
        </p>
      ) : (
        <ul className="space-y-1.5 text-[12.5px]">
          {history.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-2">
              <span className="text-slate-500 tnum">
                {new Date(a.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
              <b className="text-navy-900">{a.change}</b>
              {a.from !== undefined && (
                <span className="text-slate-600">
                  {a.from} → {a.to}
                </span>
              )}
              <span className="text-slate-500">
                · {a.actor}
                {a.reason ? ` · “${a.reason}”` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Sticky bar while editing: changes, the reason, Cancel / Done ---------- */
function EditBar({
  changes,
  errCount,
  why,
  onWhy,
  blocker,
  onCancel,
  onDone,
}: {
  changes: number;
  errCount: number;
  why: string;
  onWhy: (v: string) => void;
  /** Why Done is disabled; undefined when the draft can be saved. */
  blocker?: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Edit commercial terms"
      className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-2 z-20 flex flex-wrap items-center gap-3 rounded-2xl bg-navy-900 text-white px-4 py-3 shadow-float"
    >
      <Icon.edit size={15} />
      <span role="status" className="text-sm">
        <b>{changes ? `${changes} change${changes === 1 ? "" : "s"}` : "No changes yet"}</b>
        {errCount > 0 && (
          <span className="text-rose-200">
            {" "}
            · {errCount} field{errCount === 1 ? "" : "s"} to fix
          </span>
        )}
      </span>
      <div className="basis-full sm:basis-auto sm:flex-1 min-w-[12rem]">
        <Input
          aria-label="Reason for the change (written to the Audit log)"
          placeholder="Reason — e.g. agreed in the renewal call"
          value={why}
          onChange={(e) => onWhy(e.target.value)}
          className="!py-2"
        />
      </div>
      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[40px] rounded-[14px] px-3.5 text-[13px] font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          Cancel
        </button>
        <Btn
          size="sm"
          variant="teal"
          icon={Icon.check}
          disabled={!!blocker}
          onClick={onDone}
          title={blocker}
        >
          Done
        </Btn>
      </div>
    </div>
  );
}
