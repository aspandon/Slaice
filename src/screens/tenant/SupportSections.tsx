import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, EmptyState, Field, Input, Select, Table } from "../../components/ui";
import { Sparkline } from "../../components/charts";
import { usePlatform } from "../../lib/usePlatform";
import { downloadCSV } from "../../lib/download";
import { addDays } from "../../domain/period";
import { HEALTH_WEIGHTS, healthScore, type ActorType, type Note } from "../../domain/tenants";
import { SectionFrame, type SectionProps } from "./kit";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
let seq = 0;

/* ---------- Support: tickets, internal notes, timeline ---------- */
export function Support({ t }: SectionProps) {
  const { platform, updateTenant, actor } = usePlatform();
  const [text, setText] = useState("");
  const [tag, setTag] = useState<Note["tag"]>("Product feedback");
  const [filter, setFilter] = useState("all");
  const sessions = platform.sessions.filter((s) => s.tenantId === t.id);
  const timeline = [
    ...t.notes.map((n) => ({ at: n.at, type: "Note", text: `${n.tag}: ${n.text}`, by: n.by })),
    ...t.tickets.map((k) => ({
      at: `${k.at}T09:00:00`,
      type: "Ticket",
      text: `${k.id} · ${k.title} (${k.status})`,
      by: "Zendesk",
    })),
    ...t.audit.map((a) => ({
      at: a.at,
      type: "Change",
      text: `${a.change}${a.from ? ` (${a.from} → ${a.to})` : ""}`,
      by: `${a.actor} · ${a.actorType}`,
    })),
    ...t.invoices.map((i) => ({
      at: `${i.due}T08:00:00`,
      type: "Billing",
      text: `Invoice ${i.no} · €${i.amount} · ${i.status}`,
      by: "Billing",
    })),
    ...sessions.map((s) => ({
      at: s.startedAt,
      type: "View-as",
      text: `${s.scope === "read" ? "Read-only" : "Read & write"} session · ${s.changes.length} changes · “${s.reason}”`,
      by: s.by,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((x) => filter === "all" || x.type === filter);
  const add = () => {
    const n: Note = {
      id: `n-${Date.now().toString(36)}${++seq}`,
      at: new Date().toISOString(),
      by: actor,
      tag,
      text: text.trim(),
      pinned: false,
    };
    updateTenant(t.id, (x) => ({ ...x, notes: [n, ...x.notes] }));
    setText("");
  };
  const pin = (id: string) =>
    updateTenant(t.id, (x) => ({
      ...x,
      notes: x.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    }));
  const pinned = t.notes.filter((n) => n.pinned);
  return (
    <SectionFrame
      title="Support"
      sub="Tickets, internal notes (Slaice staff only — never shown to the tenant or exported) and one timeline."
    >
      <div className="grid lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="font-semibold text-navy-900 mb-1">Open tickets</h3>
          <ul className="text-[13px] space-y-1">
            {t.tickets.map((k) => (
              <li key={k.id} className="flex gap-2 items-center">
                <Badge
                  tone={k.status === "Open" ? "amber" : k.status === "Pending" ? "blue" : "green"}
                >
                  {k.status}
                </Badge>{" "}
                {k.id} · {k.title}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-slate-500">
            Escalation: {t.contacts.find((c) => c.role === "operations")?.name} ·{" "}
            {t.contacts.find((c) => c.role === "technical")?.name}
          </p>
        </Card>
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-navy-900">Internal note</h3>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim().length > 2) add();
            }}
          >
            <Field label="Note">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Visible to Slaice staff only"
              />
            </Field>
            <div className="flex gap-2 items-end">
              <div className="w-48">
                <Field label="Tag">
                  <Select
                    value={tag}
                    onChange={(e) => setTag(e.target.value as Note["tag"])}
                    options={["Billing", "Onboarding", "Risk", "Product feedback"]}
                  />
                </Field>
              </div>
              <Btn type="submit" variant="primary" disabled={text.trim().length < 3}>
                Add note
              </Btn>
            </div>
          </form>
          {pinned.length > 0 && (
            <ul className="text-[12.5px] space-y-1">
              {pinned.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg bg-amber-50 ring-1 ring-amber-600/15 px-2 py-1"
                >
                  📌 <b>{n.tag}</b> · {n.text} <span className="text-slate-500">— {n.by}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-navy-900">Timeline</h3>
          <div className="w-40">
            <Select
              aria-label="Timeline filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { v: "all", l: "Everything" },
                ...["Note", "Ticket", "Change", "Billing", "View-as"].map((v) => ({ v, l: v })),
              ]}
            />
          </div>
        </div>
        {timeline.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.clock}
            title="Nothing here yet"
            body="Notes, tickets, changes, billing and View-as sessions appear here."
          />
        ) : (
          <ol className="space-y-1.5">
            {timeline.slice(0, 40).map((x, i) => (
              <li key={i} className="flex flex-wrap gap-x-2 text-[12.5px]">
                <span className="text-slate-500 w-28 shrink-0">{when(x.at)}</span>
                <Badge
                  tone={
                    x.type === "Note"
                      ? "amber"
                      : x.type === "View-as"
                        ? "indigo"
                        : x.type === "Billing"
                          ? "blue"
                          : "slate"
                  }
                >
                  {x.type}
                </Badge>
                <span className="flex-1 min-w-[12rem]">{x.text}</span>
                <span className="text-slate-500">{x.by}</span>
                {x.type === "Note" && (
                  <button
                    type="button"
                    className="text-[11px] text-teal-700 underline"
                    onClick={() => {
                      const n = t.notes.find((y) => y.at === x.at);
                      if (n) pin(n.id);
                    }}
                  >
                    pin / unpin
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </SectionFrame>
  );
}

/* ---------- Health score ---------- */
const PART_LABEL = {
  adoption: "Adoption (modules used, active staff)",
  payments: "Payment success rate",
  support: "Support (tickets, NPS)",
  commercial: "Commercial (renewal, overdue invoices)",
};
export function Health({ t }: SectionProps) {
  const { today } = usePlatform();
  const h = healthScore(t, today);
  return (
    <SectionFrame
      title="Health score"
      sub="A transparent 0–100 composite. Healthy ≥ 70 · At risk 40–69 · Unhealthy < 40."
    >
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-4xl font-bold text-navy-900 tnum">{h.score}</span>
          <Badge tone={h.label === "Healthy" ? "green" : h.label === "At risk" ? "amber" : "red"}>
            {h.label === "Healthy" ? <Icon.checkCircle size={11} /> : <Icon.alert size={11} />}{" "}
            {h.label}
          </Badge>
          <div>
            <Sparkline data={t.health.trend} color="#0D9488" width={180} height={40} />
            <div className="text-[11px] text-slate-500">12-week trend</div>
          </div>
        </div>
        <table className="mt-3 w-full text-[13px]">
          <caption className="sr-only">Why this score</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-1">Component</th>
              <th>Score</th>
              <th>Weight</th>
              <th className="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {h.parts.map((p) => (
              <tr key={p.k} className="border-t border-slate-100">
                <td className="py-1.5">{PART_LABEL[p.k]}</td>
                <td className="tnum">{p.v}</td>
                <td className="tnum">{Math.round(HEALTH_WEIGHTS[p.k] * 100)}%</td>
                <td className="text-right tnum font-semibold">{Math.round(p.v * p.w)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SectionFrame>
  );
}

/* ---------- Audit log ---------- */
export function Audit({ t }: SectionProps) {
  const [actor, setActor] = useState("");
  const [section, setSection] = useState("");
  const [from, setFrom] = useState("");
  const sections = [...new Set(t.audit.map((a) => a.section))];
  const rows = t.audit.filter(
    (a) =>
      (!actor || a.actorType === actor) &&
      (!section || a.section === section) &&
      (!from || a.at.slice(0, 10) >= from),
  );
  return (
    <SectionFrame
      title="Audit log"
      sub="Every change to this tenant — who, when, what, old → new and why. Kept for the life of the tenant + retention."
      actions={
        <Btn
          variant="outline"
          icon={Icon.download}
          onClick={() =>
            downloadCSV(
              `audit_${t.id}.csv`,
              ["When", "Actor", "Actor type", "Section", "Change", "From", "To", "Reason"],
              rows.map((a) => [
                a.at,
                a.actor,
                a.actorType,
                a.section,
                a.change,
                a.from ?? "",
                a.to ?? "",
                a.reason ?? "",
              ]),
            )
          }
        >
          CSV
        </Btn>
      }
    >
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-56">
          <Select
            aria-label="Actor type"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            options={[
              { v: "", l: "All actors" },
              ...(
                [
                  "Tenant staff",
                  "Slaice staff",
                  "Slaice staff while viewing as",
                  "System",
                ] as ActorType[]
              ).map((v) => ({ v, l: v })),
            ]}
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            options={[{ v: "", l: "All sections" }, ...sections.map((v) => ({ v, l: v }))]}
          />
        </div>
        <label className="text-[12px] font-semibold text-slate-700">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block mt-1 rounded-lg ring-1 ring-slate-200 px-2 py-1.5 text-[13px]"
          />
        </label>
      </div>
      <Card className="p-2">
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.list}
            title="No entries"
            body="Nothing matches these filters."
          />
        ) : (
          <Table
            dense
            cols={["When", "Actor", "Section", "Change", "Old → new", "Reason"]}
            rows={rows.map((a) => [
              when(a.at),
              <span>
                {a.actor}
                <span className="block text-[11px] text-slate-500">{a.actorType}</span>
              </span>,
              a.section,
              a.change,
              a.from ? `${a.from} → ${a.to}` : "—",
              a.reason ?? "—",
            ])}
          />
        )}
      </Card>
    </SectionFrame>
  );
}

/* ---------- Data export ---------- */
export function DataExport({ t }: SectionProps) {
  const { updateTenant, actor, today } = usePlatform();
  const [format, setFormat] = useState<"CSV" | "JSON">("JSON");
  // Advance queued exports: Queued → Preparing → Ready (demo timers).
  useEffect(() => {
    const pending = t.exports.filter((e) => e.status === "Queued" || e.status === "Preparing");
    if (!pending.length) return;
    const id = window.setTimeout(
      () =>
        updateTenant(t.id, (x) => ({
          ...x,
          exports: x.exports.map((e) =>
            e.status === "Queued"
              ? { ...e, status: "Preparing" }
              : e.status === "Preparing"
                ? { ...e, status: "Ready" }
                : e,
          ),
        })),
      1500,
    );
    return () => window.clearTimeout(id);
  }, [t.exports, t.id, updateTenant]);
  const request = () =>
    updateTenant(
      t.id,
      (x) => ({
        ...x,
        exports: [
          {
            id: `ex-${Date.now().toString(36)}`,
            at: new Date().toISOString(),
            status: "Queued",
            format,
            by: actor,
          },
          ...x.exports,
        ],
      }),
      { section: "Data export", change: `Export requested (${format})` },
    );
  const download = (fmt: "CSV" | "JSON") => {
    const data = {
      tenant: { id: t.id, name: t.name, legalName: t.legalName, vatNo: t.vatNo },
      settings: { plan: t.plan, languages: t.languages, locations: t.locations },
      bookings: t.kpi.bookings,
      invoices: t.invoices,
      exportedAt: new Date().toISOString(),
    };
    if (fmt === "CSV")
      return downloadCSV(
        `${t.id}-export.csv`,
        ["Key", "Value"],
        Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)]),
      );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.id}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <SectionFrame
      title="Data export"
      sub="Full export of the tenant's bookings, customers, invoices and settings (internal notes excluded). Links expire after 7 days."
    >
      <Card className="p-4 flex flex-wrap items-end gap-2">
        <div className="w-32">
          <Field label="Format">
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value as "CSV" | "JSON")}
              options={["JSON", "CSV"]}
            />
          </Field>
        </div>
        <Btn variant="primary" icon={Icon.database} onClick={request}>
          Request export
        </Btn>
      </Card>
      <Card className="p-2">
        {t.exports.length === 0 ? (
          <EmptyState
            compact
            icon={Icon.database}
            title="No exports yet"
            body="Requests and their status show here."
          />
        ) : (
          <Table
            dense
            cols={["Requested", "By", "Format", "Status", ""]}
            rows={t.exports.map((e) => {
              const expired = addDays(e.at.slice(0, 10), 7) < today;
              return [
                when(e.at),
                e.by,
                e.format,
                <Badge tone={expired ? "slate" : e.status === "Ready" ? "green" : "amber"}>
                  {expired ? "Expired" : e.status}
                </Badge>,
                e.status === "Ready" && !expired ? (
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon={Icon.download}
                    onClick={() => download(e.format)}
                  >
                    Download
                  </Btn>
                ) : (
                  ""
                ),
              ];
            })}
          />
        )}
      </Card>
    </SectionFrame>
  );
}
