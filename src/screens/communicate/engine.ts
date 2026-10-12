import { useCallback, useMemo } from "react";
import { useApp } from "../../app/store";
import { CUSTOMERS } from "../../data/mock";
import { ZONES } from "../../data/beach";
import { guestFacts, type GuestFacts } from "../../data/guests";
import { forecast, DEFAULT_OCC_FILTERS } from "../../data/occupancy";
import type { CommsState } from "../../data/comms";
import { DEMO_TODAY } from "../../domain/period";
import { SCORE_FIELDS, rfmScores, stageOf } from "../../domain/lifecycle";
import { inSegment, segmentsFor, type Segment } from "../../domain/segments";
import {
  addDay,
  deliver,
  nextWeekday,
  pending,
  renderTokens,
  shiftOutOfQuiet,
  type Automation,
  type Campaign,
  type Ch,
  type LogEntry,
  type Recipient,
  type Results,
} from "../../domain/comms";

/* ============ Communicate engine (AENR-492) ============
   The audience (CRM guests → recipients with consent per channel) and the
   actions that send: a campaign occurrence, or an automation firing. Both run
   through domain/comms `deliver`, so the guardrails are identical. */

const DEMO_CUSTOMER_ID = 3;

export type Guest = GuestFacts & { name: string; first: string; points: number };

/** The CRM's guests with derived facts — the same list Users & Segments shows. */
export function useAudience() {
  const { crm } = useApp();
  return useMemo(() => {
    const list = [...CUSTOMERS, ...crm.imported]
      .filter((c) => !crm.mergedAway.includes(c.id))
      .map((c) => ({ ...c, ...crm.edits[c.id] }));
    const base = list.map((c) => ({
      ...guestFacts(c, c.tags),
      name: `${c.first} ${c.last}`,
      first: c.first,
      points: Math.round(c.spend / 2),
    }));
    const rfm = rfmScores(base);
    const guests: Guest[] = base.map((g) => ({
      ...g,
      lifecycle: stageOf(g, crm.regularAfter, crm.lifecycle),
      rfm: rfm.get(g.id)?.label,
    }));
    const segments = segmentsFor(crm.segments, crm.regularAfter);
    const recipient = (g: Guest): Recipient => {
      const prof = crm.profiles[g.id]?.consent ?? {};
      const has = (k: string) => prof[k]?.on ?? g.consent.includes(k);
      // Push reaches guests who book online (they have the app) — and Elena,
      // the demo's signed-in customer.
      const consent: Ch[] = [
        ...(g.channel === "Online" || g.id === DEMO_CUSTOMER_ID ? (["push"] as Ch[]) : []),
        ...(["email", "viber", "sms"] as Ch[]).filter(has),
      ];
      return {
        id: g.id,
        name: g.name,
        first: g.first,
        language: g.language,
        zone: g.zone,
        points: g.points,
        consent,
        // Two refunds in the sample data stand for an open refund / complaint.
        refundOpen: g.refunds >= 2,
      };
    };
    const members = (segId: string): Guest[] => {
      const sg = segments.find((s) => s.id === segId);
      if (!sg) return guests;
      return guests.filter((g) => inSegment(g, sg, DEMO_TODAY, SCORE_FIELDS));
    };
    return { guests, segments, recipient, members };
  }, [crm]);
}
export type Audience = ReturnType<typeof useAudience>;

export const segName = (segments: Segment[], id: string) =>
  id === "all" ? "All guests" : (segments.find((s) => s.id === id)?.name ?? "Deleted segment");

/** Reachable now on one channel: consented + not excluded. */
export function reachOf(rs: Recipient[], channels: Ch[], excludeRefunds: boolean): number {
  return rs.filter(
    (r) => !(excludeRefunds && r.refundOpen) && channels.some((c) => r.consent.includes(c)),
  ).length;
}

const firstTitle = (
  s: CommsState,
  messageId: string | undefined,
  inline: Campaign["inline"],
  g?: Recipient,
) => {
  const m = s.messages.find((x) => x.id === messageId);
  const subject = m?.content.en.subject ?? inline?.subject ?? "Message";
  return renderTokens(
    subject,
    { first_name: g?.first, favourite_zone: g?.zone, beach: "Akti tou Iliou" },
    m?.fallbacks ?? {},
  );
};

/** Personalise each log line's title for its guest. */
const personalise = (
  s: CommsState,
  entries: LogEntry[],
  rs: Recipient[],
  messageId?: string,
  inline?: Campaign["inline"],
) =>
  entries.map((e) => ({
    ...e,
    title: firstTitle(
      s,
      messageId,
      inline,
      rs.find((r) => r.id === e.guestId),
    ),
  }));

export function useCommsEngine() {
  const { comms, setComms, channels } = useApp();
  const audience = useAudience();
  const connected = useMemo(
    () => ({
      push: channels.push.connected,
      email: channels.email.connected,
      viber: channels.viber.connected,
      sms: channels.sms.connected,
    }),
    [channels],
  );

  /** Send one occurrence of a campaign (audience evaluated now). */
  const runCampaign = useCallback(
    (s: CommsState, c: Campaign, plannedAt: string): CommsState => {
      const { at } = shiftOutOfQuiet(plannedAt, c.channel, s.settings.quiet);
      const rs = audience.members(c.segmentId).map(audience.recipient);
      const { entries, results } = deliver({
        recipients: rs,
        channels: [c.channel],
        connected,
        at,
        log: s.log,
        settings: s.settings,
        source: c.name,
        sourceId: c.id,
        kind: "campaign",
        title: c.name,
      });
      return {
        ...s,
        log: [...s.log, ...personalise(s, entries, rs, c.messageId, c.inline)],
        campaigns: s.campaigns.map((x) =>
          x.id === c.id
            ? {
                ...x,
                runs: [
                  ...x.runs,
                  { at, plannedAt: at === plannedAt ? undefined : plannedAt, results },
                ],
              }
            : x,
        ),
      };
    },
    [audience, connected],
  );

  /** Every occurrence due at or before the demo clock. */
  const runDue = useCallback(
    (s: CommsState): { next: CommsState; sent: { name: string; results: Results }[] } => {
      let next = s;
      const sent: { name: string; results: Results }[] = [];
      for (const c of s.campaigns) {
        if (c.paused || c.cancelled) continue;
        for (const at of pending(c).filter((a) => a <= s.clock)) {
          const cur = next.campaigns.find((x) => x.id === c.id) ?? c;
          next = runCampaign(next, cur, at);
          const run = next.campaigns.find((x) => x.id === c.id)?.runs.at(-1);
          if (run) sent.push({ name: c.name, results: run.results });
        }
      }
      return { next, sent };
    },
    [runCampaign],
  );

  /** Who a trigger fires for, as sample events around the demo clock. */
  const triggerGuests = useCallback(
    (a: Automation, s: CommsState): Audience["guests"] => {
      const g = audience.guests;
      const day = s.clock.slice(0, 10);
      const recent = g.filter((x) => x.daysSinceLast <= 1);
      switch (a.trigger) {
        case "booking_confirmed":
        case "before_visit":
        case "after_visit":
          return recent.slice(0, 4);
        case "no_visit":
          return g.filter((x) => x.daysSinceLast >= a.param);
        case "birthday":
          return g.filter((x) => (x.id + Number(day.slice(8))) % 11 === 0);
        case "checkout_abandoned":
          return g.filter((x) => x.id === 4);
        case "points_threshold":
          return g.filter((x) => x.points >= a.param).slice(0, 3);
        case "pass_expiring":
          return g.filter((x) => x.pass !== "None");
        case "enters_segment":
          return (a.conditions.segmentId ? audience.members(a.conditions.segmentId) : g).slice(
            0,
            2,
          );
        default:
          return g;
      }
    },
    [audience],
  );

  /** Forecast occupancy for the low-occupancy trigger: check day → target day. */
  const occupancyCheck = useCallback((a: Automation, checkDate: string) => {
    const target = nextWeekday(addDay(checkDate, 1), a.targetWeekday ?? 6);
    const row = forecast(checkDate, {
      ...DEFAULT_OCC_FILTERS,
      zones: a.zoneId ? [a.zoneId] : [],
    }).find((r) => r.date === target);
    return {
      target,
      value: row?.otb ?? 0,
      zone: ZONES.find((z) => z.id === a.zoneId)?.name ?? "All zones",
    };
  }, []);

  /** Fire an automation now. `assume` overrides the forecast (demo control). */
  const fire = useCallback(
    (
      s: CommsState,
      a: Automation,
      opts: { assume?: number } = {},
    ): { next: CommsState; outcome: string; results?: Results } => {
      const day = s.clock.slice(0, 10);
      if (a.status !== "Active")
        return {
          next: s,
          outcome: `${a.name} is ${a.status.toLowerCase()} — the trigger was ignored and nothing was sent.`,
        };
      if (day < a.window.from || day > a.window.to)
        return {
          next: s,
          outcome: `Outside the active window (${a.window.from} – ${a.window.to}) — nothing sent.`,
        };
      let key = `${a.trigger}:${day}`;
      let note = "";
      if (a.trigger === "low_occupancy") {
        const chk = occupancyCheck(a, day);
        const value = opts.assume ?? chk.value;
        key = `occ:${chk.target}`;
        note = `${chk.zone} forecast for ${chk.target} is ${value}%`;
        if (value >= a.param) {
          const checks = [
            ...(a.checks ?? []),
            { at: s.clock, note: `${note} — not below ${a.param}%, no send`, sent: 0 },
          ];
          return {
            next: {
              ...s,
              automations: s.automations.map((x) => (x.id === a.id ? { ...x, checks } : x)),
            },
            outcome: `${note} — not below ${a.param}%, so nothing was sent.`,
          };
        }
        if (a.fired.includes(key))
          return {
            next: s,
            outcome: `Already sent for ${chk.target} — each occurrence fires once.`,
          };
      }
      let pool = triggerGuests(a, s);
      if (a.conditions.segmentId && a.trigger !== "enters_segment") {
        const ids = new Set(audience.members(a.conditions.segmentId).map((g) => g.id));
        pool = pool.filter((g) => ids.has(g.id));
      }
      if (a.conditions.language) pool = pool.filter((g) => g.language === a.conditions.language);
      if (a.conditions.zone) pool = pool.filter((g) => g.zone === a.conditions.zone);
      const rs = pool.map(audience.recipient);
      // Guests this automation already messaged for this occurrence.
      const already = new Set(
        s.log
          .filter((e) => e.sourceId === a.id && e.outcome === "Delivered" && e.id.includes(key))
          .map((e) => e.guestId),
      );
      let next = s;
      let first: Results | undefined;
      let deliveredIds = rs.map((r) => r.id);
      let at = `${addDay(day, 0)}T${s.clock.slice(11, 16)}`;
      a.steps.forEach((step, i) => {
        if (i > 0) at = `${addDay(at.slice(0, 10), step.waitDays)}T${at.slice(11, 16)}`;
        else if (a.delayHours) {
          const t = new Date(`${at}:00Z`).getTime() + a.delayHours * 3600000;
          at = new Date(t).toISOString().slice(0, 16);
        }
        const shifted = shiftOutOfQuiet(at, a.channels[0] ?? "push", next.settings.quiet).at;
        const stepRs = rs.filter((r) => deliveredIds.includes(r.id));
        const { entries, results } = deliver({
          recipients: stepRs,
          channels: a.channels,
          connected,
          at: shifted,
          log: next.log,
          settings: next.settings,
          source: a.name,
          sourceId: a.id,
          kind: "automation",
          title: a.name,
          already: i === 0 ? already : undefined,
        });
        const tagged = entries.map((e) => ({ ...e, id: `${e.id}:${key}:s${i + 1}` }));
        const msg = next.messages.find((m) => m.id === step.messageId);
        next = { ...next, log: [...next.log, ...personalise(next, tagged, stepRs, msg?.id)] };
        deliveredIds = entries.filter((e) => e.outcome === "Delivered").map((e) => e.guestId);
        if (i === 0) first = results;
      });
      const r = first;
      const sentN = r?.delivered ?? 0;
      const skippedN = r ? r.skipped.cap + r.skipped.consent + r.skipped.refund + r.skipped.dup : 0;
      next = {
        ...next,
        automations: next.automations.map((x) =>
          x.id === a.id
            ? {
                ...x,
                fired: a.trigger === "low_occupancy" ? [...x.fired, key] : x.fired,
                checks: note ? [...(x.checks ?? []), { at: s.clock, note, sent: sentN }] : x.checks,
                stats: {
                  sent: x.stats.sent + sentN,
                  skipped: x.stats.skipped + skippedN,
                  conversions: x.stats.conversions + (r?.bookings ?? 0),
                },
              }
            : x,
        ),
      };
      const who = rs.length === 1 ? "1 guest" : `${rs.length} guests`;
      return {
        next,
        results: r,
        outcome: `${note ? `${note} — ` : ""}triggered for ${who}: ${sentN} sent, ${skippedN} skipped.`,
      };
    },
    [audience, connected, occupancyCheck, triggerGuests],
  );

  return { comms, setComms, audience, connected, runCampaign, runDue, fire, occupancyCheck };
}
