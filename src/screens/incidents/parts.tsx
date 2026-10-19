import type { ReactNode } from "react";
import { Icon, type IconRenderer } from "../../lib/icons";
import { Badge } from "../../components/ui";
import {
  CATEGORY_LABEL,
  SEEN_BY_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  SEVERITY_LABEL,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentUpdate,
} from "../../domain/incidents";

/* Shared pieces of the incident pages (AENR-720): the call center's Incidents
   and the Slaice inbox show the same badges, progress and timeline. */

export const fmtAt = (at: string) =>
  new Date(`${at.slice(0, 16)}:00`).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const fmtSize = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`;

const SEV: Record<IncidentSeverity, { tone: string; icon: IconRenderer }> = {
  critical: { tone: "critical", icon: Icon.shieldAlert },
  high: { tone: "coral", icon: Icon.alert },
  medium: { tone: "warning", icon: Icon.info },
  low: { tone: "neutral", icon: Icon.info },
};
export function SeverityBadge({ s }: { s: IncidentSeverity }) {
  const { tone, icon: I } = SEV[s];
  return (
    <Badge tone={tone}>
      <I size={10} aria-hidden /> {SEVERITY_LABEL[s]}
    </Badge>
  );
}

const ST: Record<IncidentStatus, { tone: string; icon: IconRenderer }> = {
  new: { tone: "warning", icon: Icon.bell },
  acknowledged: { tone: "info", icon: Icon.eye },
  in_progress: { tone: "info", icon: Icon.refresh },
  resolved: { tone: "success", icon: Icon.checkCircle },
};
export function IncidentStatusBadge({ s }: { s: IncidentStatus }) {
  const { tone, icon: I } = ST[s];
  return (
    <Badge tone={tone}>
      <I size={10} aria-hidden /> {STATUS_LABEL[s]}
    </Badge>
  );
}

/** New → Acknowledged → In progress → Resolved, the current step marked. */
export function StatusTrack({ s, compact = false }: { s: IncidentStatus; compact?: boolean }) {
  const cur = STATUS_ORDER.indexOf(s);
  // In a list card: four segments and the step in words — the full labels don't fit a phone.
  if (compact)
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1 w-24 shrink-0" aria-hidden>
          {STATUS_ORDER.map((k, i) => (
            <span
              key={k}
              className={`h-1.5 flex-1 rounded-full ${i <= cur ? (s === "resolved" ? "bg-emerald-500" : "bg-teal-600") : "bg-slate-200"}`}
            />
          ))}
        </div>
        <span className="text-[11px] text-slate-500 tnum">
          Step {cur + 1} of {STATUS_ORDER.length}
          <span className="sr-only"> — {STATUS_LABEL[s]}</span>
        </span>
      </div>
    );
  return (
    <ol className="flex items-center gap-1" aria-label={`Status: ${STATUS_LABEL[s]}`}>
      {STATUS_ORDER.map((k, i) => (
        <li key={k} className="flex items-center gap-1 min-w-0 flex-1 last:flex-none">
          <span
            aria-current={i === cur ? "step" : undefined}
            className={`text-[10.5px] font-semibold whitespace-nowrap ${i <= cur ? "text-navy-900" : "text-slate-400"}`}
          >
            <span
              aria-hidden
              className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${i < cur ? "bg-teal-600" : i === cur ? (s === "resolved" ? "bg-emerald-500" : "bg-navy-900 ring-2 ring-navy-900/20") : "bg-slate-300"}`}
            />
            {STATUS_LABEL[k]}
          </span>
          {i < STATUS_ORDER.length - 1 && (
            <span
              aria-hidden
              className={`h-px flex-1 min-w-2 ${i < cur ? "bg-teal-600" : "bg-slate-200"}`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/** The incident's history, oldest first. Internal notes only for Slaice. */
export function Timeline({ i, updates }: { i: Incident; updates: readonly IncidentUpdate[] }) {
  return (
    <ol className="relative space-y-3 pl-5 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-slate-200">
      <li className="relative">
        <span
          aria-hidden
          className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-slate-300"
        />
        <div className="text-[12px] text-slate-500">
          {fmtAt(i.reportedAt)} · <b className="text-navy-900 font-semibold">{i.reporter.name}</b> (
          {i.reporter.role}) reported it
        </div>
      </li>
      {updates.map((u) => (
        <li key={u.id} className="relative">
          <span
            aria-hidden
            className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full ring-2 ${u.kind === "note" ? "bg-amber-100 ring-amber-400" : u.side === "slaice" ? "bg-slaice-600 ring-slaice-600/30" : "bg-teal-600 ring-teal-600/30"}`}
          />
          <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-x-1.5">
            <span>{fmtAt(u.at)}</span>·<b className="text-navy-900 font-semibold">{u.by}</b>
            {u.kind === "status" && u.status && (
              <>
                set it to <IncidentStatusBadge s={u.status} />
              </>
            )}
            {u.kind === "note" && (
              <Badge tone="warning">
                <Icon.lock size={10} aria-hidden /> Internal note
              </Badge>
            )}
          </div>
          {u.text && (
            <p
              className={`mt-1 text-[13px] leading-snug rounded-xl px-3 py-2 ${u.kind === "note" ? "bg-amber-50 text-amber-900 ring-1 ring-amber-600/15" : u.side === "slaice" ? "bg-slate-50 text-slate-800 ring-1 ring-slate-200" : "bg-teal-50/60 text-slate-800 ring-1 ring-teal-600/15"}`}
            >
              {u.text}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** The report's facts, shared with the Slaice inbox. */
export function Facts({ i, extra }: { i: Incident; extra?: ReactNode }) {
  const row =
    "grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 border-b border-slate-100 last:border-0 text-[13px]";
  return (
    <section>
      <p className="text-[13.5px] text-slate-800 leading-relaxed whitespace-pre-line">
        {i.description}
      </p>
      <dl className="mt-3">
        {extra}
        <div className={row}>
          <dt className="text-slate-500">Seen by</dt>
          <dd className="text-navy-900">{SEEN_BY_LABEL[i.seenBy]}</dd>
        </div>
        <div className={row}>
          <dt className="text-slate-500">Category</dt>
          <dd className="text-navy-900">{CATEGORY_LABEL[i.category]}</dd>
        </div>
        <div className={row}>
          <dt className="text-slate-500">Booking</dt>
          <dd className="text-navy-900 tnum">{i.bookingRef ?? "—"}</dd>
        </div>
        <div className={row}>
          <dt className="text-slate-500">Follow-up contact</dt>
          <dd className="text-navy-900 break-words">
            {i.contact.name}
            {(i.contact.phone || i.contact.email) && (
              <span className="text-slate-600"> · {i.contact.phone ?? i.contact.email}</span>
            )}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-slate-500">Attachment</dt>
          <dd className="text-navy-900 min-w-0">
            {i.attachment ? (
              <span className="inline-flex items-center gap-1.5 max-w-full">
                <Icon.image size={13} className="text-slate-500 shrink-0" aria-hidden />
                <span className="truncate">{i.attachment.name}</span>
                <span className="text-slate-500 tnum shrink-0">{fmtSize(i.attachment.size)}</span>
              </span>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
