import { useApp } from "../app/store";
import { DEMO_TODAY } from "../domain/period";
import { daysLeft, hoursLeft, isOpen } from "../domain/gdpr";
import { payLinkStatus } from "../domain/payLink";
import { ageLabel, slaState } from "../domain/bookingOps";
import { opsNow } from "./useBookingOps";
import { SEVERITY_LABEL, STATUS_LABEL, lastSlaiceWord } from "../domain/incidents";
import type { PersonaId } from "../domain/types";

/* ============ Notification inbox (AENR-554) ============
   "Needs action" items are derived from the live demo state, so the bell
   counts real work and an item disappears as soon as its record is resolved.
   Each item deep-links to the exact record. FYI items are the persona's
   activity feed. */

export interface InboxItem {
  id: string;
  kind: "action" | "fyi";
  icon: string;
  tone: "red" | "amber" | "green" | "indigo" | "slate";
  title: string;
  body: string;
  time: string;
  /** Hash to open the record (#/persona/page?…). */
  href?: string;
}

export function useInbox(persona: PersonaId): InboxItem[] {
  const { privacy, payLinks, bookingOps, till, comms, inventory, incidents, platform } = useApp();
  const out: InboxItem[] = [];
  const staff = persona === "admin" || persona === "callcenter" || persona === "support";
  const now = Date.now() + inventory.clockOffset * 60000;

  if (persona === "admin") {
    for (const r of privacy.requests.filter(isOpen)) {
      const d = daysLeft(r, DEMO_TODAY);
      if (d <= 7)
        out.push({
          id: `dsar-${r.id}`,
          kind: "action",
          icon: "shieldCheck",
          tone: d < 0 ? "red" : "amber",
          title:
            d < 0
              ? `Data request overdue · ${r.type}`
              : `Data request due in ${d} day${d === 1 ? "" : "s"}`,
          body: `${r.first} ${r.last} · ${r.id}`,
          time: d < 0 ? `${-d}d late` : `${d}d left`,
          href: `#/admin/privacy?tab=requests&request=${encodeURIComponent(r.id)}`,
        });
    }
    for (const b of privacy.breaches.filter((x) => !x.closedAt)) {
      const h = Math.round(hoursLeft(b, now));
      out.push({
        id: `breach-${b.id}`,
        kind: "action",
        icon: "shieldAlert",
        tone: "red",
        title: h > 0 ? `Breach — ${h} h left to notify` : "Breach — 72 h deadline passed",
        body: b.title,
        time: h > 0 ? `${h}h left` : "overdue",
        href: `#/admin/privacy?tab=breaches`,
      });
    }
    for (const r of bookingOps.refunds.filter((x) => x.status === "pending")) {
      const sla = slaState(r.requestedAt, opsNow());
      out.push({
        id: `refund-${r.id}`,
        kind: "action",
        icon: "refund",
        tone: sla === "overdue" ? "red" : "amber",
        title: `Refund to decide · €${r.amount}`,
        body: `${r.who} · ${r.reason}${sla === "overdue" ? " · past the 48 h SLA" : ""}`,
        time: ageLabel(r.requestedAt, opsNow()),
        href: `#/admin/refunds`,
      });
    }
  }
  if (staff)
    for (const l of payLinks) {
      if (payLinkStatus(l, now) !== "awaiting") continue;
      const min = Math.round((new Date(l.deadline).getTime() - now) / 60000);
      if (min <= 30)
        out.push({
          id: `link-${l.id}`,
          kind: "action",
          icon: "link",
          tone: "amber",
          title: `Pay link expires in ${min} min`,
          body: `${l.guest.name} · €${l.total} · sets are held until then`,
          time: `${min}m`,
          href: `#/${persona}/bookings?tab=awaiting&booking=${encodeURIComponent(`#${l.id}`)}`,
        });
    }
  if (persona === "cashier" || persona === "accountant" || persona === "admin") {
    const failed = till.sales.filter((s) => s.mydata === "failed");
    if (failed.length)
      out.push({
        id: `mydata-${failed.map((s) => s.id).join("-")}`,
        kind: "action",
        icon: "receipt",
        tone: "red",
        title: `${failed.length} receipt${failed.length === 1 ? "" : "s"} rejected by myDATA`,
        body: failed
          .map((s) => s.id)
          .slice(0, 3)
          .join(", "),
        time: "now",
        href:
          persona === "accountant"
            ? `#/accountant/documents?tab=documents&status=failed`
            : persona === "cashier"
              ? `#/cashier/transactions`
              : undefined,
      });
  }
  if ((persona === "cashier" || persona === "admin") && till.offline) {
    const q = till.sales.filter((s) => s.offline).length;
    out.push({
      id: "till-offline",
      kind: "action",
      icon: "wifiOff",
      tone: "amber",
      title: "A till is offline",
      body: `${q} sale${q === 1 ? "" : "s"} queued — reconnect to sync and send to myDATA.`,
      time: "now",
      href: persona === "cashier" ? "#/cashier/issue" : undefined,
    });
  }
  if (persona === "callcenter")
    for (const r of bookingOps.refunds
      .filter((x) => x.status !== "pending" && x.requestedBy === "Call Center")
      .slice(0, 3))
      out.push({
        id: `refund-done-${r.id}`,
        kind: "fyi",
        icon: "refund",
        tone: r.status === "approved" ? "green" : "slate",
        title: r.status === "approved" ? "Refund approved" : "Refund declined",
        body: `${r.who} · €${r.refundAmount ?? r.amount}${r.declineReason ? ` · ${r.declineReason}` : ""}`,
        time: (r.decidedAt ?? "").slice(11, 16),
        href: r.bookingId
          ? `#/callcenter/bookings?booking=${encodeURIComponent(r.bookingId)}`
          : undefined,
      });
  // Incidents (AENR-720): new reports wait for Slaice; Slaice's answers reach the call center.
  if (persona === "platform")
    for (const i of incidents.filter((x) => x.status === "new"))
      out.push({
        id: `incident-new-${i.id}`,
        kind: "action",
        icon: i.severity === "critical" ? "shieldAlert" : "alert",
        tone: i.severity === "critical" || i.severity === "high" ? "red" : "amber",
        title: `New incident · ${SEVERITY_LABEL[i.severity]}`,
        body: `${platform.tenants.find((t) => t.id === i.tenantId)?.name ?? i.tenantId} · ${i.title}`,
        time: i.reportedAt.slice(11, 16),
        href: `#/platform/incidents?incident=${encodeURIComponent(i.id)}`,
      });
  if (persona === "callcenter")
    for (const i of incidents.filter((x) => x.tenantId === platform.siteTenant)) {
      const last = lastSlaiceWord(i);
      if (!last) continue;
      out.push({
        id: `incident-${i.id}-${last.id}`,
        kind: "fyi",
        icon: last.status === "resolved" ? "checkCircle" : "alert",
        tone: last.status === "resolved" ? "green" : "indigo",
        title: last.kind === "reply" ? `Slaice replied · ${i.id}` : `${i.id} is ${STATUS_LABEL[last.status ?? i.status].toLowerCase()}`,
        body: last.text || i.title,
        time: last.at.slice(11, 16),
        href: `#/callcenter/incidents?incident=${encodeURIComponent(i.id)}`,
      });
    }
  if (persona === "admin") {
    const lowOcc = comms.automations.filter(
      (a) => a.trigger === "low_occupancy" && a.status === "Active",
    );
    const sent = comms.log.filter(
      (e) => e.kind === "automation" && lowOcc.some((a) => a.id === e.sourceId),
    );
    if (sent.length)
      out.push({
        id: `auto-lowocc-${sent.length}`,
        kind: "fyi",
        icon: "bell",
        tone: "indigo",
        title: "Low-occupancy offer sent",
        body: `${sent.length} guest${sent.length === 1 ? "" : "s"} messaged by “${lowOcc[0].name}”.`,
        time: sent[0].at.slice(11, 16),
        href: `#/admin/communicate?tab=automations`,
      });
  }
  return out;
}
