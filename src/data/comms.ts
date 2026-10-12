// Communicate sample data (AENR-490 / 492): the image library, saved messages,
// campaigns (one sent, one scheduled, one weekly), automations and a few weeks
// of message log. Deterministic; dates sit around DEMO_TODAY (Sun 19 Jul 2026).

import type {
  Automation,
  Campaign,
  CommsSettings,
  LogEntry,
  Message,
  Results,
} from "../domain/comms";

export interface LibraryImage {
  id: string;
  name: string;
  src: string;
  source: "Library" | "Uploaded" | "Zone logo";
}
export interface CommsState {
  messages: Message[];
  campaigns: Campaign[];
  automations: Automation[];
  log: LogEntry[];
  settings: CommsSettings;
  images: LibraryImage[];
  /** Demo clock (local Europe/Athens time) — scheduled sends run when it passes them. */
  clock: string;
}

/* Illustrated beach scenes as inline SVG — no network, tiny in localStorage. */
function scene(sky: [string, string], sea: string, sand: string, extra = ""): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="800" height="450" fill="url(#s)"/><path d="M0 230 Q200 215 400 230 T800 228 V330 H0Z" fill="${sea}"/><path d="M0 300 Q220 280 420 300 T800 296 V450 H0Z" fill="${sand}"/>${extra}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const umbrellas = (c: string) =>
  [140, 330, 520, 690]
    .map(
      (x) =>
        `<path d="M${x - 46} ${330} Q${x} ${282} ${x + 46} ${330}Z" fill="${c}"/><rect x="${x - 2}" y="330" width="4" height="60" fill="#5b4636"/><rect x="${x - 34}" y="380" width="68" height="10" rx="4" fill="#ffffff" opacity=".9"/>`,
    )
    .join("");
export const DEFAULT_IMAGES: LibraryImage[] = [
  {
    id: "img-frontrow",
    name: "Front row at noon",
    source: "Library",
    src: scene(
      ["#7dd3fc", "#e0f2fe"],
      "#0ea5e9",
      "#f5deb3",
      `<circle cx="660" cy="90" r="42" fill="#fde047"/>${umbrellas("#0d9488")}`,
    ),
  },
  {
    id: "img-sunset",
    name: "Sunset cabanas",
    source: "Library",
    src: scene(
      ["#fb923c", "#fde68a"],
      "#c2410c",
      "#e7c9a0",
      `<circle cx="400" cy="226" r="60" fill="#fef3c7" opacity=".9"/>${umbrellas("#7c2d12")}`,
    ),
  },
  {
    id: "img-cove",
    name: "Quiet cove",
    source: "Library",
    src: scene(
      ["#a5f3fc", "#ecfeff"],
      "#0891b2",
      "#fef3c7",
      `<path d="M560 230 L640 120 L760 230Z" fill="#78716c"/><circle cx="160" cy="80" r="30" fill="#fef08a"/>`,
    ),
  },
];

const r = (
  audience: number,
  delivered: number,
  opened: number | null,
  clicked: number,
  bookings: number,
  skipped: Partial<Results["skipped"]> = {},
  byChannel: Results["byChannel"] = {},
): Results => ({
  audience,
  delivered,
  opened,
  clicked,
  bookings,
  revenue: bookings * 36,
  unsubscribes: 0,
  skipped: { consent: 0, cap: 0, refund: 0, dup: 0, ...skipped },
  byChannel,
});

export const DEFAULT_MESSAGES: Message[] = [
  {
    id: "msg-august",
    name: "August weekend offer",
    status: "Ready",
    content: {
      en: {
        subject: "Your August weekend, {first_name} ☀️",
        body: "Front-row sunbeds in {favourite_zone} are 20% off this weekend. Book before Friday noon to keep your spot.",
      },
      el: {
        subject: "Το Σαββατοκύριακό σου τον Αύγουστο, {first_name} ☀️",
        body: "Ξαπλώστρες πρώτης σειράς στο {favourite_zone} με 20% έκπτωση αυτό το Σαββατοκύριακο.",
      },
    },
    image: {
      src: DEFAULT_IMAGES[0].src,
      name: "Front row at noon",
      alt: "Teal umbrellas over sunbeds on the front row at noon",
      focus: "center",
    },
    cta: { label: "Plan my visit", target: "plan" },
    channels: ["email", "push", "viber", "sms"],
    promoCode: "AUG20",
    fallbacks: { first_name: "there", favourite_zone: "the front row" },
    updatedAt: "2026-07-14T11:20",
    updatedBy: "Eleni Markou",
  },
  {
    id: "msg-reminder",
    name: "Day-before reminder + parking",
    status: "Ready",
    content: {
      en: {
        subject: "See you tomorrow at {beach}",
        body: "Your sunbeds are ready, {first_name}. Add parking or a locker now and skip the queue at the gate.",
      },
    },
    cta: { label: "Add parking", target: "plan" },
    channels: ["push", "email", "sms"],
    fallbacks: {},
    updatedAt: "2026-06-02T09:05",
    updatedBy: "Eleni Markou",
  },
  {
    id: "msg-winback",
    name: "We miss you",
    status: "Ready",
    content: {
      en: {
        subject: "It's been a while, {first_name}",
        body: "The sea is warm and your favourite spot in {favourite_zone} is waiting. Here's €5 off your next day with us.",
      },
    },
    image: {
      src: DEFAULT_IMAGES[2].src,
      name: "Quiet cove",
      alt: "A quiet cove with clear water and rocks",
      focus: "center",
    },
    cta: { label: "Claim €5 off", target: "promo" },
    channels: ["email", "viber", "sms"],
    promoCode: "BACK5",
    fallbacks: { favourite_zone: "the beach" },
    updatedAt: "2026-06-20T16:40",
    updatedBy: "Eleni Markou",
  },
  {
    id: "msg-lastminute",
    name: "Last-minute Saturday",
    status: "Ready",
    content: {
      en: {
        subject: "Saturday in {favourite_zone}? 15% off",
        body: "A few sunbeds just opened up for Saturday. Book today with code SAT15.",
      },
    },
    image: {
      src: DEFAULT_IMAGES[1].src,
      name: "Sunset cabanas",
      alt: "Cabanas on the sand at sunset",
      focus: "center",
    },
    cta: { label: "Book Saturday", target: "plan" },
    channels: ["push", "viber", "sms", "email"],
    promoCode: "SAT15",
    fallbacks: { favourite_zone: "Bolivar" },
    updatedAt: "2026-07-08T12:00",
    updatedBy: "Eleni Markou",
  },
  {
    id: "msg-thanks",
    name: "Thank you + review",
    status: "Draft",
    content: {
      en: {
        subject: "Thanks for visiting, {first_name}",
        body: "How was your day at {beach}? Tell us in one tap.",
      },
    },
    cta: { label: "Leave a review", target: "url", url: "https://g.page/akti-tou-iliou/review" },
    channels: ["email", "push"],
    fallbacks: {},
    updatedAt: "2026-07-17T18:10",
    updatedBy: "Eleni Markou",
  },
];

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp-july",
    name: "July heatwave offer",
    messageId: "msg-august",
    channel: "email",
    segmentId: "sys-vip",
    segmentName: "VIP",
    schedule: { kind: "once", at: "2026-07-10T10:00" },
    reachAtSchedule: 6,
    runs: [{ at: "2026-07-10T10:00", results: r(6, 5, 2, 1, 1, { consent: 1 }, { email: 5 }) }],
    createdAt: "2026-07-08T09:30",
    createdBy: "Eleni Markou",
  },
  {
    id: "cmp-friday",
    name: "Friday weekend teaser",
    messageId: "msg-lastminute",
    channel: "push",
    segmentId: "sys-regular",
    segmentName: "Regular",
    schedule: { kind: "weekly", weekday: 5, time: "10:00", from: "2026-06-01", to: "2026-09-30" },
    reachAtSchedule: 9,
    runs: [
      { at: "2026-06-05T10:00", results: r(9, 7, 2, 1, 0, { consent: 2 }, { push: 7 }) },
      { at: "2026-06-12T10:00", results: r(9, 7, 3, 1, 1, { consent: 2 }, { push: 7 }) },
      { at: "2026-06-19T10:00", results: r(10, 8, 3, 1, 1, { consent: 2 }, { push: 8 }) },
      { at: "2026-06-26T10:00", results: r(10, 8, 2, 1, 0, { consent: 2 }, { push: 8 }) },
      { at: "2026-07-03T10:00", results: r(10, 7, 2, 1, 1, { consent: 2, cap: 1 }, { push: 7 }) },
      { at: "2026-07-10T10:00", results: r(10, 6, 2, 1, 0, { consent: 2, cap: 2 }, { push: 6 }) },
      { at: "2026-07-17T10:00", results: r(10, 7, 3, 1, 1, { consent: 2, cap: 1 }, { push: 7 }) },
    ],
    createdAt: "2026-05-28T15:00",
    createdBy: "Eleni Markou",
  },
  {
    id: "cmp-august",
    name: "August weekend · Season pass",
    messageId: "msg-august",
    channel: "push",
    segmentId: "sys-season",
    segmentName: "Season pass",
    schedule: { kind: "once", at: "2026-07-24T10:00" },
    reachAtSchedule: 6,
    runs: [],
    createdAt: "2026-07-18T17:45",
    createdBy: "Eleni Markou",
  },
];

export const DEFAULT_AUTOMATIONS: Automation[] = [
  {
    id: "auto-reminder",
    name: "Day-before reminder + parking upsell",
    status: "Active",
    trigger: "before_visit",
    param: 24,
    conditions: {},
    delayHours: 0,
    steps: [{ messageId: "msg-reminder", waitDays: 0 }],
    channels: ["push", "email", "sms"],
    window: { from: "2026-05-01", to: "2026-09-30" },
    stats: { sent: 412, skipped: 37, conversions: 61 },
    fired: [],
    createdAt: "2026-04-28T10:00",
  },
  {
    id: "auto-winback",
    name: "Win-back after 30 days",
    status: "Active",
    trigger: "no_visit",
    param: 30,
    conditions: {},
    delayHours: 0,
    steps: [
      { messageId: "msg-winback", waitDays: 0 },
      { messageId: "msg-lastminute", waitDays: 5 },
    ],
    channels: ["email", "viber", "sms"],
    window: { from: "2026-05-15", to: "2026-09-15" },
    stats: { sent: 58, skipped: 9, conversions: 7 },
    fired: [],
    createdAt: "2026-05-12T13:20",
  },
  {
    id: "auto-lowocc",
    name: "Low occupancy · Bolivar Saturday",
    status: "Paused",
    trigger: "low_occupancy",
    param: 50,
    zoneId: "bolivar",
    targetWeekday: 6,
    check: { weekday: 4, time: "10:00" },
    conditions: {},
    delayHours: 0,
    steps: [{ messageId: "msg-lastminute", waitDays: 0 }],
    channels: ["push", "viber", "sms"],
    window: { from: "2026-06-01", to: "2026-09-15" },
    stats: { sent: 0, skipped: 0, conversions: 0 },
    fired: [],
    createdAt: "2026-07-01T09:00",
  },
];

/* A few weeks of log so the guest profile and the frequency cap have history.
   Elena (#3) already had two promotional messages this week. */
const L = (
  guestId: number,
  at: string,
  channel: LogEntry["channel"],
  title: string,
  source: string,
  sourceId: string,
  kind: LogEntry["kind"] = "campaign",
): LogEntry => ({
  id: `seed-${guestId}-${at}-${sourceId}`,
  guestId,
  at,
  channel,
  title,
  source,
  sourceId,
  kind,
  promotional: true,
  outcome: "Delivered",
});
export const DEFAULT_LOG: LogEntry[] = [
  L(
    3,
    "2026-07-10T10:00",
    "email",
    "Your August weekend, Elena ☀️",
    "July heatwave offer",
    "cmp-july",
  ),
  L(
    3,
    "2026-07-15T18:00",
    "push",
    "It's been a while, Elena",
    "Win-back after 30 days",
    "auto-winback",
    "automation",
  ),
  L(
    3,
    "2026-07-17T10:00",
    "push",
    "Saturday in Bolivar? 15% off",
    "Friday weekend teaser",
    "cmp-friday",
  ),
  L(
    1,
    "2026-07-10T10:00",
    "email",
    "Your August weekend, Maria ☀️",
    "July heatwave offer",
    "cmp-july",
  ),
  L(
    9,
    "2026-07-17T10:00",
    "push",
    "Saturday in Bolivar? 15% off",
    "Friday weekend teaser",
    "cmp-friday",
  ),
  L(
    15,
    "2026-07-10T10:00",
    "email",
    "Your August weekend, Despina ☀️",
    "July heatwave offer",
    "cmp-july",
  ),
];

export const DEFAULT_COMMS_SETTINGS: CommsSettings = {
  quiet: { on: true, from: "21:00", to: "09:00" },
  cap: { max: 2, days: 7 },
  excludeOpenRefunds: true,
};

export const DEFAULT_COMMS: CommsState = {
  messages: DEFAULT_MESSAGES,
  campaigns: DEFAULT_CAMPAIGNS,
  automations: DEFAULT_AUTOMATIONS,
  log: DEFAULT_LOG,
  settings: DEFAULT_COMMS_SETTINGS,
  images: DEFAULT_IMAGES,
  clock: "2026-07-19T11:00",
};
