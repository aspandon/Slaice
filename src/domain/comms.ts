// Communicate (AENR-490 / 492): a promotional message library with per-channel
// variants, and one delivery model for campaigns (sent now, on a date, or
// weekly) and automations (sent when a trigger fires). Every send goes through
// the same guardrails — consent per channel with a fallback order, quiet
// hours, a frequency cap across campaigns and automations, and the open-refund
// exclusion — and leaves one log entry per guest. Pure functions.

import type { ChannelKey } from "./types";

export type Ch = ChannelKey;
export const CH_LABEL: Record<Ch, string> = {
  push: "Push",
  email: "E-mail",
  viber: "Viber",
  sms: "SMS",
};
export const CH_ORDER: Ch[] = ["push", "email", "viber", "sms"];

/* ---------- Messages (AENR-490) ---------- */
export const LANGS = ["en", "el", "de", "fr", "es", "it"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  el: "Ελληνικά",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

export interface MsgImage {
  src: string;
  name: string;
  alt: string;
  /** Which part of the image survives the crop to each channel's ratio. */
  focus: "top" | "center" | "bottom";
}
export type CtaTarget = "plan" | "promo" | "pass" | "url";
export const CTA_TARGETS: { v: CtaTarget; l: string }[] = [
  { v: "plan", l: "Plan my visit" },
  { v: "promo", l: "A promotion / loyalty offer" },
  { v: "pass", l: "Buy a pass" },
  { v: "url", l: "External URL" },
];
export interface MsgContent {
  subject: string;
  body: string;
}
export interface Message {
  id: string;
  name: string;
  status: "Draft" | "Ready";
  archived?: boolean;
  /** English is required; other languages fall back to it. */
  content: Partial<Record<Lang, MsgContent>> & { en: MsgContent };
  image?: MsgImage;
  cta?: { label: string; target: CtaTarget; url?: string };
  channels: Ch[];
  offerId?: string;
  promoCode?: string;
  /** Fallback value per personalisation token. */
  fallbacks: Record<string, string>;
  updatedAt: string;
  updatedBy: string;
}

export const TOKENS: { key: string; label: string; fallback: string }[] = [
  { key: "first_name", label: "First name", fallback: "there" },
  { key: "favourite_zone", label: "Favourite zone", fallback: "the beach" },
  { key: "points", label: "Loyalty points", fallback: "your" },
  { key: "beach", label: "Beach name", fallback: "Akti tou Iliou" },
];

/** Channel image ratios — the crop each channel applies to the hero image. */
export const RATIO: Record<Exclude<Ch, "sms">, { w: number; h: number; label: string }> = {
  email: { w: 2, h: 1, label: "2:1 hero" },
  viber: { w: 4, h: 3, label: "4:3" },
  push: { w: 2, h: 1, label: "2:1 rich push" },
};

export function renderTokens(
  text: string,
  values: Record<string, string | undefined>,
  fallbacks: Record<string, string>,
): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = values[k];
    if (v) return v;
    if (k in fallbacks) return fallbacks[k];
    const t = TOKENS.find((x) => x.key === k);
    return t ? t.fallback : m;
  });
}
export const unknownTokens = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !TOKENS.some((t) => t.key === k));

/* SMS: GSM-7 messages fit 160 characters (153 per part when split); anything
   outside GSM-7 — Greek lower case, emoji — switches to UCS-2 at 70 / 67. */
const GSM =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€";
export function smsInfo(text: string): { chars: number; segments: number; unicode: boolean } {
  const unicode = [...text].some((c) => !GSM.includes(c));
  const chars = [...text].length;
  const [one, part] = unicode ? [70, 67] : [160, 153];
  return { chars, segments: chars === 0 ? 0 : chars <= one ? 1 : Math.ceil(chars / part), unicode };
}

/** **bold** / *italic* markers — rendered by e-mail and Viber, stripped elsewhere. */
export const stripFormatting = (t: string) =>
  t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");

export const shortLink = (id: string) =>
  `akti.gr/s/${id
    .replace(/[^a-z0-9]/gi, "")
    .slice(-5)
    .toLowerCase()}`;
export const OPT_OUT: Record<Ch, string> = {
  email: "You're receiving this because you opted in to offers. Unsubscribe · Manage preferences",
  viber: "Reply STOP to opt out",
  sms: "STOP 54321",
  push: "Turn off offers in app settings",
};
export const PUSH_TITLE_MAX = 50;
export const PUSH_BODY_MAX = 178;

export interface Variant {
  title: string;
  body: string;
  image?: MsgImage;
  cta?: string;
  link?: string;
  footer: string;
  warnings: string[];
  sms?: ReturnType<typeof smsInfo>;
}
/** One message → what a channel actually delivers. */
export function variantOf(
  m: Message,
  ch: Ch,
  lang: Lang = "en",
  values: Record<string, string | undefined> = {},
): Variant {
  const c = m.content[lang] ?? m.content.en;
  const r = (s: string) => renderTokens(s, values, m.fallbacks);
  const title = r(c.subject);
  let body = r(c.body);
  const warnings: string[] = [];
  const cta = m.cta?.label || undefined;
  const footer = OPT_OUT[ch];
  if (ch === "sms" || ch === "push") body = stripFormatting(body);
  if (ch === "sms") {
    if (m.image) warnings.push("SMS can't carry images — the image is dropped.");
    const link = m.cta ? shortLink(m.id) : undefined;
    const text = [body, link, footer].filter(Boolean).join(" ");
    const info = smsInfo(text);
    if (info.segments > 1)
      warnings.push(
        `${info.segments} SMS parts (${info.chars} chars${info.unicode ? ", Unicode" : ""}) — each part is billed.`,
      );
    return { title: "", body, link, footer, warnings, sms: info };
  }
  if (ch === "push") {
    if (title.length > PUSH_TITLE_MAX)
      warnings.push(`Push title is cut at ${PUSH_TITLE_MAX} characters.`);
    if (body.length > PUSH_BODY_MAX) {
      warnings.push(`Push text is cut at ${PUSH_BODY_MAX} characters.`);
      body = `${body.slice(0, PUSH_BODY_MAX - 1)}…`;
    }
    return { title: title.slice(0, PUSH_TITLE_MAX), body, image: m.image, cta, footer, warnings };
  }
  return { title, body, image: m.image, cta, footer, warnings };
}

/** Errors that block saving a message; empty when it can be saved. */
export function messageErrors(m: Message): string[] {
  const e: string[] = [];
  if (!m.name.trim()) e.push("Give the message a name.");
  if (!m.content.en.body.trim())
    e.push("Write the English text — other languages fall back to it.");
  if (m.channels.length === 0) e.push("Pick at least one channel.");
  if (m.image && !m.image.alt.trim())
    e.push("Add alt text to the image — it is required for accessibility.");
  if (m.cta && !m.cta.label.trim()) e.push("Give the button a label.");
  if (m.cta?.target === "url" && !/^https?:\/\/\S+\.\S+/.test(m.cta.url ?? ""))
    e.push("Enter the button's full URL (https://…).");
  const bad = LANGS.flatMap((l) => {
    const c = m.content[l];
    return c ? unknownTokens(`${c.subject} ${c.body}`) : [];
  });
  if (bad.length) e.push(`Unknown personalisation token: {${bad[0]}}.`);
  return e;
}

/* ---------- Delivery rules (AENR-492) ---------- */
export interface CommsSettings {
  quiet: { on: boolean; from: string; to: string };
  cap: { max: number; days: number };
  excludeOpenRefunds: boolean;
}
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
/** Quiet hours wrap midnight (21:00 → 09:00). */
export function inQuiet(hhmm: string, q: CommsSettings["quiet"]): boolean {
  if (!q.on) return false;
  const t = toMin(hhmm);
  const a = toMin(q.from);
  const b = toMin(q.to);
  return a <= b ? t >= a && t < b : t >= a || t < b;
}
/** E-mail waits in the inbox, so it's exempt; other channels move to the end of quiet hours. */
export function shiftOutOfQuiet(
  at: string,
  ch: Ch,
  q: CommsSettings["quiet"],
): { at: string; shifted: boolean } {
  const time = at.slice(11, 16);
  if (ch === "email" || !inQuiet(time, q)) return { at, shifted: false };
  const day = at.slice(0, 10);
  const next = toMin(time) >= toMin(q.from) && toMin(q.from) > toMin(q.to) ? addDay(day, 1) : day;
  return { at: `${next}T${q.to}`, shifted: true };
}
export const addDay = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

export type Schedule =
  | { kind: "now" }
  | { kind: "once"; at: string }
  | { kind: "weekly"; weekday: number; time: string; from: string; to: string };
/** Every send time a schedule asks for (one per occurrence for weekly). */
export function occurrences(s: Schedule, sentAt?: string): string[] {
  if (s.kind === "now") return sentAt ? [sentAt] : [];
  if (s.kind === "once") return [s.at];
  const out: string[] = [];
  let d = s.from;
  while (weekdayOf(d) !== s.weekday) d = addDay(d, 1);
  for (; d <= s.to; d = addDay(d, 7)) out.push(`${d}T${s.time}`);
  return out;
}
export function scheduleLabel(s: Schedule): string {
  if (s.kind === "now") return "Sent immediately";
  if (s.kind === "once") return `${fmtAt(s.at)}`;
  return `Every ${WEEKDAYS[s.weekday]} ${s.time} · ${fmtDate(s.from)} – ${fmtDate(s.to)}`;
}
export const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export const fmtAt = (at: string) => `${fmtDate(at)} · ${at.slice(11, 16)}`;

/* ---------- Recipients, sends and the log ---------- */
export interface Recipient {
  id: number;
  name: string;
  first: string;
  language: string;
  zone: string;
  points: number;
  /** Channels the guest can receive promotions on (push = has the app). */
  consent: Ch[];
  refundOpen: boolean;
}
export type Outcome =
  | "Delivered"
  | "Skipped · no consent"
  | "Skipped · frequency cap"
  | "Skipped · open refund"
  | "Skipped · already sent";
export interface LogEntry {
  id: string;
  guestId: number;
  at: string;
  channel?: Ch;
  title: string;
  source: string;
  sourceId: string;
  kind: "campaign" | "automation";
  promotional: boolean;
  outcome: Outcome;
}
export interface Results {
  audience: number;
  delivered: number;
  opened: number | null;
  clicked: number;
  bookings: number;
  revenue: number;
  unsubscribes: number;
  skipped: { consent: number; cap: number; refund: number; dup: number };
  byChannel: Partial<Record<Ch, number>>;
}

/** Promotional messages a guest already received inside the cap window. */
export function capCount(
  log: readonly LogEntry[],
  guestId: number,
  at: string,
  days: number,
): number {
  const from = `${addDay(at.slice(0, 10), -(days - 1))}T00:00`;
  return log.filter(
    (e) =>
      e.guestId === guestId &&
      e.promotional &&
      e.outcome === "Delivered" &&
      e.at >= from &&
      e.at <= at,
  ).length;
}

const hash = (s: string) => {
  let x = 2166136261;
  for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  return x;
};
const RATES: Record<Ch, { open: number | null; click: number }> = {
  email: { open: 0.42, click: 0.09 },
  push: { open: 0.31, click: 0.08 },
  viber: { open: 0.64, click: 0.14 },
  sms: { open: null, click: 0.07 },
};

/** Run one send through the guardrails. Returns the new log entries + results. */
export function deliver(p: {
  recipients: readonly Recipient[];
  channels: readonly Ch[];
  connected: Record<Ch, boolean>;
  at: string;
  log: readonly LogEntry[];
  settings: CommsSettings;
  source: string;
  sourceId: string;
  kind: LogEntry["kind"];
  title: string;
  promotional?: boolean;
  /** Guests already messaged for this occurrence (automations send once). */
  already?: ReadonlySet<number>;
}): { entries: LogEntry[]; results: Results } {
  const promotional = p.promotional ?? true;
  const entries: LogEntry[] = [];
  const running = [...p.log];
  const skipped = { consent: 0, cap: 0, refund: 0, dup: 0 };
  const byChannel: Partial<Record<Ch, number>> = {};
  let delivered = 0;
  p.recipients.forEach((g, i) => {
    const base = {
      id: `${p.sourceId}-${p.at}-${g.id}-${i}`,
      guestId: g.id,
      at: p.at,
      title: p.title,
      source: p.source,
      sourceId: p.sourceId,
      kind: p.kind,
      promotional,
    };
    const push = (outcome: Outcome, channel?: Ch) => {
      const e: LogEntry = { ...base, outcome, channel };
      entries.push(e);
      running.push(e);
    };
    if (p.already?.has(g.id)) return (skipped.dup++, push("Skipped · already sent"));
    if (p.settings.excludeOpenRefunds && g.refundOpen)
      return (skipped.refund++, push("Skipped · open refund"));
    const ch = p.channels.find((c) => p.connected[c] && g.consent.includes(c));
    if (!ch) return (skipped.consent++, push("Skipped · no consent"));
    if (promotional && capCount(running, g.id, p.at, p.settings.cap.days) >= p.settings.cap.max)
      return (skipped.cap++, push("Skipped · frequency cap", ch));
    delivered++;
    byChannel[ch] = (byChannel[ch] ?? 0) + 1;
    push("Delivered", ch);
  });
  // Engagement is sample data: channel benchmark rates, varied per send.
  const jitter = 0.85 + (hash(`${p.sourceId}${p.at}`) % 30) / 100;
  let opened = 0;
  let clicked = 0;
  for (const [ch, n] of Object.entries(byChannel) as [Ch, number][]) {
    opened += Math.round(n * (RATES[ch].open ?? 0) * jitter);
    clicked += Math.round(n * RATES[ch].click * jitter + 0.4);
  }
  // SMS has no open tracking — show "—" when nothing else was sent.
  const smsOnly = delivered > 0 && Object.keys(byChannel).every((c) => c === "sms");
  const bookings = Math.round(clicked * 0.4);
  return {
    entries,
    results: {
      audience: p.recipients.length,
      delivered,
      opened: smsOnly ? null : opened,
      clicked,
      bookings,
      revenue: bookings * 36,
      unsubscribes: delivered >= 8 ? Math.max(0, Math.round(delivered * 0.012)) : 0,
      skipped,
      byChannel,
    },
  };
}

/* ---------- Campaigns ---------- */
export type CampaignStatus = "Scheduled" | "Sending" | "Sent" | "Paused" | "Cancelled";
export interface SendRun {
  at: string;
  /** Planned time before quiet hours moved it. */
  plannedAt?: string;
  results: Results;
}
export interface Campaign {
  id: string;
  name: string;
  messageId?: string;
  /** Free-text campaign when no saved message is used. */
  inline?: MsgContent;
  channel: Ch;
  segmentId: string;
  segmentName: string;
  offerId?: string;
  schedule: Schedule;
  paused?: boolean;
  cancelled?: boolean;
  reachAtSchedule: number;
  runs: SendRun[];
  /** Occurrences cancelled one by one (weekly). */
  skippedAt?: string[];
  createdAt: string;
  createdBy: string;
}
/** Occurrences still to send (not sent, not skipped). */
export function pending(c: Campaign): string[] {
  if (c.cancelled) return [];
  const done = new Set([...c.runs.map((r) => r.plannedAt ?? r.at), ...(c.skippedAt ?? [])]);
  return occurrences(c.schedule).filter((at) => !done.has(at));
}
export function campaignStatus(c: Campaign): CampaignStatus {
  if (c.cancelled) return "Cancelled";
  if (c.paused) return "Paused";
  const left = pending(c);
  if (!left.length) return c.runs.length ? "Sent" : "Cancelled";
  return c.runs.length && c.schedule.kind === "weekly" ? "Sending" : "Scheduled";
}
export function totals(runs: readonly SendRun[]): Results {
  const z: Results = {
    audience: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bookings: 0,
    revenue: 0,
    unsubscribes: 0,
    skipped: { consent: 0, cap: 0, refund: 0, dup: 0 },
    byChannel: {},
  };
  for (const { results: r } of runs) {
    z.audience += r.audience;
    z.delivered += r.delivered;
    z.opened = (z.opened ?? 0) + (r.opened ?? 0);
    z.clicked += r.clicked;
    z.bookings += r.bookings;
    z.revenue += r.revenue;
    z.unsubscribes += r.unsubscribes;
    for (const k of Object.keys(z.skipped) as (keyof Results["skipped"])[])
      z.skipped[k] += r.skipped[k];
    for (const [c, n] of Object.entries(r.byChannel) as [Ch, number][])
      z.byChannel[c] = (z.byChannel[c] ?? 0) + n;
  }
  if (runs.length && runs.every((r) => r.results.opened === null)) z.opened = null;
  return z;
}

/* ---------- Automations ---------- */
export type TriggerId =
  | "booking_confirmed"
  | "before_visit"
  | "after_visit"
  | "no_visit"
  | "birthday"
  | "checkout_abandoned"
  | "points_threshold"
  | "pass_expiring"
  | "low_occupancy"
  | "sunny_weekend"
  | "enters_segment";
export interface TriggerDef {
  id: TriggerId;
  label: string;
  help: string;
  param?: { label: string; unit: string; default: number };
}
export const TRIGGERS: TriggerDef[] = [
  {
    id: "booking_confirmed",
    label: "Booking confirmed",
    help: "Right after a guest's booking is paid.",
  },
  {
    id: "before_visit",
    label: "Before the visit",
    help: "A reminder before the booked day — good for parking / locker upsell.",
    param: { label: "Hours before", unit: "h", default: 24 },
  },
  {
    id: "after_visit",
    label: "After the visit",
    help: "Thank-you or review request after the guest's day at the beach.",
    param: { label: "Hours after", unit: "h", default: 18 },
  },
  {
    id: "no_visit",
    label: "No visit for a while",
    help: "Win-back for guests who haven't been back.",
    param: { label: "Days without a visit", unit: "days", default: 30 },
  },
  { id: "birthday", label: "Birthday", help: "On the guest's birthday (when known)." },
  {
    id: "checkout_abandoned",
    label: "Checkout abandoned",
    help: "A guest left checkout without paying.",
    param: { label: "Wait", unit: "h", default: 2 },
  },
  {
    id: "points_threshold",
    label: "Loyalty points reached",
    help: "A guest's points pass a threshold.",
    param: { label: "Points", unit: "pts", default: 500 },
  },
  {
    id: "pass_expiring",
    label: "Pass about to expire",
    help: "A season or VIP pass ends soon.",
    param: { label: "Days before expiry", unit: "days", default: 14 },
  },
  {
    id: "low_occupancy",
    label: "Low occupancy forecast",
    help: "Forecast occupancy for a day and zone is below a threshold — a last-minute offer.",
    param: { label: "Below", unit: "%", default: 50 },
  },
  {
    id: "sunny_weekend",
    label: "Sunny weekend forecast",
    help: "The weather forecast for the weekend is sunny.",
  },
  {
    id: "enters_segment",
    label: "Guest enters a segment",
    help: "A guest newly matches a segment.",
  },
];
export const triggerDef = (id: TriggerId) => TRIGGERS.find((t) => t.id === id) ?? TRIGGERS[0];

export interface AutoStep {
  messageId: string;
  /** Wait before this step (days after the previous one; 0 = the trigger). */
  waitDays: number;
}
export interface Automation {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Draft";
  trigger: TriggerId;
  param: number;
  /** low_occupancy: the zone, the day checked and when the check runs. */
  zoneId?: string;
  targetWeekday?: number;
  check?: { weekday: number; time: string };
  conditions: { segmentId?: string; language?: string; zone?: string };
  delayHours: number;
  steps: AutoStep[];
  /** Channel fallback order: first one the guest consented to is used. */
  channels: Ch[];
  window: { from: string; to: string };
  stats: { sent: number; skipped: number; conversions: number };
  /** Occurrence keys already handled — each fires once. */
  fired: string[];
  /** Condition checks (low occupancy) with what they found. */
  checks?: { at: string; note: string; sent: number }[];
  createdAt: string;
}
export function triggerSummary(a: Automation, zoneName?: string): string {
  const t = triggerDef(a.trigger);
  if (a.trigger === "low_occupancy")
    return `${WEEKDAYS[a.targetWeekday ?? 6]} forecast in ${zoneName ?? "any zone"} < ${a.param}% · checked ${WEEKDAYS[a.check?.weekday ?? 4]} ${a.check?.time ?? "10:00"}`;
  return t.param ? `${t.label} · ${a.param} ${t.param.unit}` : t.label;
}
/** Next date (on or after `from`) falling on a weekday. */
export function nextWeekday(from: string, weekday: number): string {
  let d = from;
  while (weekdayOf(d) !== weekday) d = addDay(d, 1);
  return d;
}
export function automationErrors(a: Automation): string[] {
  const e: string[] = [];
  if (!a.name.trim()) e.push("Name the automation.");
  if (!a.steps.length || a.steps.some((s) => !s.messageId))
    e.push("Pick a message for every step.");
  if (!a.channels.length) e.push("Pick at least one channel.");
  if (a.window.to < a.window.from) e.push("The active window ends before it starts.");
  if (a.trigger === "low_occupancy" && !a.zoneId) e.push("Pick the zone to watch.");
  return e;
}
