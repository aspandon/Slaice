import { useEffect, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Modal, Select } from "../../components/ui";
import { useApp } from "../../app/store";
import { usePlatform } from "../../lib/usePlatform";
import { useNow } from "../../lib/useLiveSlots";
import { DEFAULT_PAGE } from "../../data/personas";
import { fmtDay } from "../../domain/period";
import type { TenantRecord, ViewAsSession, ViewScope } from "../../domain/tenants";

/* ============ View as tenant (AENR-515) ============
   Consented (or justified break-glass), scoped, time-limited, visible and
   audited. Starting a session switches to the chosen tenant role with a
   persistent banner; read-only disables mutating controls (GuardCtx), some
   actions are blocked in every session, sensitive fields are masked, and every
   page and change is recorded in the tenant's Audit log and the Support access
   log. */

let seq = 0;
const ROLES: { v: ViewAsSession["role"]; l: string }[] = [
  { v: "admin", l: "Admin" },
  { v: "callcenter", l: "Call Center" },
  { v: "cashier", l: "Cashier" },
  { v: "controller", l: "Controller" },
  { v: "accountant", l: "Accountant" },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.v, r.l])) as Record<
  ViewAsSession["role"],
  string
>;

/** Start a session (consent already given) — switch persona and log it. */
export function useStartViewAs() {
  const { go, toast } = useApp();
  const { setPlatform, updateTenant, actor } = usePlatform();
  return (
    t: TenantRecord,
    d: Pick<ViewAsSession, "reason" | "ticket" | "scope" | "role" | "minutes" | "emergency">,
  ) => {
    const now = Date.now();
    const s: ViewAsSession = {
      id: `va-${now.toString(36)}${++seq}`,
      tenantId: t.id,
      by: actor,
      ...d,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + d.minutes * 60000).toISOString(),
      pages: [],
      changes: [],
      reveals: 0,
    };
    setPlatform((p) => ({
      ...p,
      viewAs: s,
      recent: [t.id, ...p.recent.filter((x) => x !== t.id)].slice(0, 6),
    }));
    updateTenant(t.id, (x) => x, {
      section: "View-as",
      change: `Session started · ${d.scope === "read" ? "Read-only" : "Read & write"} as ${ROLE_LABEL[d.role]} · ${d.minutes} min${d.emergency ? " · EMERGENCY" : ""}`,
      reason: `${d.reason}${d.ticket ? ` (${d.ticket})` : ""}`,
      actorType: "Slaice staff",
    });
    toast(
      `Notification sent to ${t.name}'s admin: Slaice support (${actor}) started viewing your account.`,
    );
    go(d.role, DEFAULT_PAGE[d.role]);
  };
}

export function ViewAsDialog({ t, onClose }: { t: TenantRecord; onClose: () => void }) {
  const { platform, setPlatform, today, actor, toast } = usePlatform();
  const start = useStartViewAs();
  const [reason, setReason] = useState("");
  const [ticket, setTicket] = useState("");
  const [scope, setScope] = useState<ViewScope>("read");
  const [role, setRole] = useState<ViewAsSession["role"]>("admin");
  const [minutes, setMinutes] = useState(30);
  const [emergency, setEmergency] = useState(false);
  const granted = !!t.supportGrant && t.supportGrant.until >= today;
  const req = platform.requests.find((r) => r.tenantId === t.id && r.status === "Pending");
  const declined = platform.requests.find((r) => r.tenantId === t.id && r.status === "Declined");
  const draft = {
    reason: reason.trim(),
    ticket: ticket.trim() || undefined,
    scope,
    role,
    minutes,
    emergency,
    tenantId: t.id,
    by: actor,
  };
  const ok = reason.trim().length >= 10;
  const go = () => {
    if (granted || emergency) {
      start(t, draft);
      onClose();
      return;
    }
    setPlatform((p) => ({
      ...p,
      requests: [
        {
          id: `rq-${Date.now().toString(36)}`,
          tenantId: t.id,
          by: actor,
          at: new Date().toISOString(),
          status: "Pending",
          draft,
        },
        ...p.requests,
      ],
    }));
    toast(`Access request sent to ${t.contacts[0].name} (owner). It expires in 7 days.`);
  };
  const answer = (approve: boolean) => {
    if (!req) return;
    setPlatform((p) => ({
      ...p,
      requests: p.requests.map((r) =>
        r.id === req.id ? { ...r, status: approve ? "Approved" : "Declined" } : r,
      ),
    }));
    if (approve) {
      start(t, req.draft);
      onClose();
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`View ${t.name} as a tenant user`}
      wide
      footer={
        req ? (
          <>
            <Btn variant="ghost" onClick={onClose}>
              Close
            </Btn>
            <Btn variant="outline" onClick={() => answer(false)}>
              Demo: owner declines
            </Btn>
            <Btn variant="teal" onClick={() => answer(true)}>
              Demo: owner approves
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn variant={emergency ? "danger" : "primary"} disabled={!ok} onClick={go}>
              {granted || emergency ? "Start session" : "Request access"}
            </Btn>
          </>
        )
      }
    >
      {req ? (
        <div
          role="status"
          className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 p-4 text-sm text-amber-900"
        >
          <b>Request sent to owner</b> — {t.contacts[0].name} ({t.contacts[0].email}) was asked to
          approve {req.draft.scope === "read" ? "read-only" : "read & write"} access as{" "}
          {ROLE_LABEL[req.draft.role]} for {req.draft.minutes} min. Pending since{" "}
          {new Date(req.at).toLocaleString("en-GB")}; expires after 7 days.
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {declined && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 ring-1 ring-rose-600/20 p-3 text-rose-800"
            >
              The owner declined the last request. Next steps: reply on the support ticket with what
              you need to check, or ask the owner to grant access in Users & roles.
            </div>
          )}
          <div
            className={`rounded-xl p-3 ring-1 ${granted ? "bg-emerald-50 ring-emerald-600/20 text-emerald-800" : "bg-slate-50 ring-slate-200 text-slate-700"}`}
          >
            {granted ? (
              <>
                The tenant granted support access until{" "}
                <b>{fmtDay(t.supportGrant?.until ?? today)}</b> — the session starts immediately.
              </>
            ) : (
              <>No support access granted — the owner must approve this request.</>
            )}
          </div>
          <Field label="Reason (required, at least 10 characters)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer reports wrong Saturday prices on the map"
            />
          </Field>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="Ticket (optional)">
              <Input
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="ZD-1234"
              />
            </Field>
            <Field label="View as">
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as ViewAsSession["role"])}
                options={ROLES}
              />
            </Field>
            <Field label="Duration">
              <Select
                value={String(minutes)}
                onChange={(e) => setMinutes(Number(e.target.value))}
                options={[15, 30, 60].map((m) => ({ v: String(m), l: `${m} min` }))}
              />
            </Field>
          </div>
          <div role="radiogroup" aria-label="Scope" className="flex flex-wrap gap-2">
            {(["read", "write"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                role="radio"
                aria-checked={scope === sc}
                onClick={() => setScope(sc)}
                className={`rounded-xl px-3 min-h-[44px] text-[13px] font-semibold ring-1 ${scope === sc ? "bg-navy-900 text-white ring-navy-900" : "ring-slate-200"}`}
              >
                {sc === "read" ? "Read-only (default)" : "Read & write"}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-slate-500">
            Always blocked: payout / bank / Stripe details, exports of customer data, deleting
            users, plan & billing, refunds. Customer phone and e-mail are masked; each reveal is
            logged.
          </p>
          {platform.role === "admin" && !granted && (
            <label className="flex items-start gap-2 text-[12.5px] text-rose-800">
              <input
                type="checkbox"
                className="accent-rose-600 mt-0.5"
                checked={emergency}
                onChange={(e) => setEmergency(e.target.checked)}
              />{" "}
              Break-glass (Slaice Admins only): skip consent — flagged as Emergency in the audit log
              and to the tenant.
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}

/** End the running session: log it, return to the tenant page with a summary. */
export function useEndViewAs() {
  const { go, toast } = useApp();
  const { platform, setPlatform, updateTenant } = usePlatform();
  return (why: ViewAsSession["endReason"]) => {
    const s = platform.viewAs;
    if (!s) return;
    const ended: ViewAsSession = { ...s, endedAt: new Date().toISOString(), endReason: why };
    setPlatform((p) => ({ ...p, viewAs: null, sessions: [ended, ...p.sessions] }));
    updateTenant(s.tenantId, (x) => x, {
      section: "View-as",
      change: `Session ended (${why}) · ${s.changes.length} changes · ${s.pages.length} pages · ${s.reveals} reveals`,
      actorType: "Slaice staff",
    });
    try {
      sessionStorage.setItem("slaice.focusTenantMenu", "1");
    } catch {
      /* storage unavailable */
    }
    go("platform", "tenant");
    window.location.hash = `#/platform/tenant/${s.tenantId}/overview`;
    toast(
      `Session ended${why === "expired" ? " (time limit)" : ""} · ${s.changes.length} change${s.changes.length === 1 ? "" : "s"} made.`,
      { tone: "success" },
    );
  };
}

/* Persistent, high-contrast banner while a session runs (not dismissable). */
export function ViewAsBanner() {
  const { persona, page, beachPricing, extras, priceRules } = useApp();
  const { platform, setPlatform, toast } = usePlatform();
  const end = useEndViewAs();
  const now = useNow(1000);
  const s = platform.viewAs;
  const warned = useRef(false);
  const t = platform.tenants.find((x) => x.id === s?.tenantId);
  const left = s ? new Date(s.endsAt).getTime() - now : 0;
  useEffect(() => {
    if (!s) return;
    if (left <= 0) end("expired");
    else if (left <= 120000 && !warned.current) {
      warned.current = true;
      toast("View-as session ends in 2 minutes.", { tone: "warn" });
    }
  }, [left, s]); // eslint-disable-line react-hooks/exhaustive-deps
  // Pages viewed.
  useEffect(() => {
    if (!s) return;
    const p = `${persona}/${page}`;
    if (s.pages[s.pages.length - 1] !== p)
      setPlatform((x) =>
        x.viewAs ? { ...x, viewAs: { ...x.viewAs, pages: [...x.viewAs.pages, p] } } : x,
      );
  }, [persona, page]); // eslint-disable-line react-hooks/exhaustive-deps
  // Changes (read & write sessions): prices of categories and tickets, price rules.
  const snap = useRef<string>("");
  const snapshot = () =>
    JSON.stringify({
      c: beachPricing.categories.map((c) => [c.id, c.name, c.price]),
      t: extras.tickets.map((x) => [x.short, x.price]),
      r: priceRules.length,
    });
  // Baseline when a session starts, so its first change is caught.
  useEffect(() => {
    snap.current = s ? snapshot() : "";
  }, [s?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!s) return;
    const cur = snapshot();
    const prev = snap.current;
    snap.current = cur;
    if (!prev || prev === cur) return;
    const a = JSON.parse(prev) as {
      c: [string, string, number][];
      t: [string, number][];
      r: number;
    };
    const b = JSON.parse(cur) as typeof a;
    const diffs: { what: string; from?: string; to?: string }[] = [];
    b.c.forEach(([id, name, price]) => {
      const o = a.c.find((x) => x[0] === id);
      if (o && o[2] !== price)
        diffs.push({
          what: `Price · ${name} (${id.split("-")[0]})`,
          from: `€${o[2]}`,
          to: `€${price}`,
        });
    });
    b.t.forEach(([name, price]) => {
      const o = a.t.find((x) => x[0] === name);
      if (o && o[1] !== price)
        diffs.push({ what: `Ticket price · ${name}`, from: `€${o[1]}`, to: `€${price}` });
    });
    if (a.r !== b.r) diffs.push({ what: "Price rules", from: String(a.r), to: String(b.r) });
    if (!diffs.length) return;
    const at = new Date().toISOString();
    setPlatform((x) => {
      if (!x.viewAs) return x;
      const entries = diffs.map((d, i) => ({
        id: `au-va-${Date.now().toString(36)}${i}`,
        at,
        actor: x.viewAs!.by,
        actorType: "Slaice staff while viewing as" as const,
        section: "Pricing",
        change: d.what,
        from: d.from,
        to: d.to,
        reason: x.viewAs!.reason,
      }));
      return {
        ...x,
        viewAs: {
          ...x.viewAs,
          changes: [...x.viewAs.changes, ...diffs.map((d) => ({ at, ...d }))],
        },
        tenants: x.tenants.map((tn) =>
          tn.id === x.viewAs!.tenantId ? { ...tn, audit: [...entries, ...tn.audit] } : tn,
        ),
      };
    });
  }, [beachPricing, extras, priceRules]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !t) return null;
  const mm = Math.max(0, Math.floor(left / 60000));
  const ss = Math.max(0, Math.floor((left % 60000) / 1000));
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-3 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-lift ${s.emergency ? "bg-rose-700" : "bg-amber-600"}`}
    >
      <Icon.eye size={16} className="shrink-0" />
      <span className="flex-1 min-w-[14rem]">
        Viewing <b>{t.name}</b> as {ROLE_LABEL[s.role]} ·{" "}
        {s.scope === "read" ? "Read-only" : "Read & write"}
        {s.emergency ? " · EMERGENCY" : ""} ·{" "}
        <span className="tnum">
          {mm}:{String(ss).padStart(2, "0")}
        </span>{" "}
        left
      </span>
      <button
        type="button"
        onClick={() =>
          setPlatform((x) =>
            x.viewAs
              ? {
                  ...x,
                  viewAs: {
                    ...x.viewAs,
                    endsAt: new Date(
                      new Date(x.viewAs.endsAt).getTime() - 10 * 60000,
                    ).toISOString(),
                  },
                }
              : x,
          )
        }
        className="rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Demo: −10 min
      </button>
      <button
        type="button"
        onClick={() => end("manual")}
        className="rounded-lg bg-white text-navy-900 px-3 py-1.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        End session
      </button>
    </div>
  );
}

/** A customer's phone / e-mail, masked while Slaice staff view the tenant; each reveal is logged. */
export function Masked({ value }: { value: string }) {
  const { platform, setPlatform } = usePlatform();
  const [shown, setShown] = useState(false);
  if (!platform.viewAs || shown || !value) return <>{value}</>;
  const masked = value.includes("@")
    ? `${value[0]}•••@${value.split("@")[1]}`
    : `•••• ${value.slice(-4)}`;
  return (
    <span className="inline-flex items-center gap-1">
      {masked}
      <button
        type="button"
        className="text-[11px] font-semibold text-teal-700 underline"
        onClick={() => {
          setShown(true);
          setPlatform((x) =>
            x.viewAs
              ? {
                  ...x,
                  viewAs: { ...x.viewAs, reveals: x.viewAs.reveals + 1 },
                  tenants: x.tenants.map((tn) =>
                    tn.id === x.viewAs!.tenantId
                      ? {
                          ...tn,
                          audit: [
                            {
                              id: `au-rv-${Date.now().toString(36)}`,
                              at: new Date().toISOString(),
                              actor: x.viewAs!.by,
                              actorType: "Slaice staff while viewing as" as const,
                              section: "Privacy",
                              change: "Revealed a masked customer field",
                              reason: x.viewAs!.reason,
                            },
                            ...tn.audit,
                          ],
                        }
                      : tn,
                  ),
                }
              : x,
          );
        }}
      >
        Reveal
      </button>
    </span>
  );
}

/* Tenant-side transparency: the tenant admin sees every Slaice support session. */
export function SupportAccessCard() {
  const { platform } = usePlatform();
  const tenantId = platform.viewAs?.tenantId ?? "akti";
  const t = platform.tenants.find((x) => x.id === tenantId);
  const rows = [
    ...(platform.viewAs && platform.viewAs.tenantId === tenantId ? [platform.viewAs] : []),
    ...platform.sessions.filter((s) => s.tenantId === tenantId),
  ];
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-navy-900 flex items-center gap-2">
        <Icon.shield size={15} /> Slaice support accessed your account
      </h3>
      <p className="text-[12.5px] text-slate-500">
        {t?.supportGrant
          ? `You allow Slaice support to view your account until ${fmtDay(t.supportGrant.until)}.`
          : "You haven't granted support access — Slaice must ask first."}
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-slate-600">No access yet.</p>
      ) : (
        <ul className="mt-2 text-[12.5px] space-y-1">
          {rows.map((s) => (
            <li key={s.id}>
              {new Date(s.startedAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · <b>{s.by}</b> · {s.scope === "read" ? "read-only" : "read & write"} · “{s.reason}” ·{" "}
              {s.changes.length} change{s.changes.length === 1 ? "" : "s"}
              {s.emergency ? (
                <Badge tone="red" className="ml-1">
                  Emergency
                </Badge>
              ) : null}
              {!s.endedAt ? (
                <Badge tone="amber" className="ml-1">
                  Now
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
