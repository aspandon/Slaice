// Sample Slaice tenants (AENR-500): deterministic records seeded so every
// platform journey can be shown — Glyfada Bay (DPA pending, payouts off),
// Kavouri Coast (support access granted), Naxos Sands (Starter, ready to
// upgrade), Blue Lagoon (overdue invoice), Sun & Sea Paros, Demo Beach #2 (demo
// environment, offboarding candidate) and a few still in onboarding.

import type { Contact, Lifecycle, TenantRecord, Env } from "../domain/tenants";

const seed = (k: string) => {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
const contacts = (name: string, domain: string, owner: string): Contact[] => [
  {
    role: "owner",
    name: owner,
    email: `owner@${domain}`,
    phone: "+30 694 300 0001",
    lang: "Greek",
  },
  {
    role: "billing",
    name: "Accounts dept.",
    email: `billing@${domain}`,
    phone: "+30 210 300 0002",
    lang: "Greek",
  },
  {
    role: "operations",
    name: `${name} ops`,
    email: `ops@${domain}`,
    phone: "+30 694 300 0003",
    lang: "English",
  },
  {
    role: "technical",
    name: "IT partner",
    email: `it@${domain}`,
    phone: "+30 210 300 0004",
    lang: "English",
  },
  {
    role: "dpo",
    name: "DPO Services ΙΚΕ",
    email: `dpo@${domain}`,
    phone: "+30 210 300 0005",
    lang: "Greek",
  },
];

interface Seed {
  id: string;
  name: string;
  sub: string;
  lifecycle: Lifecycle;
  env?: Env;
  plan: "starter" | "pro" | "group";
  owner: string;
  step?: number;
  dpa?: boolean;
  payouts?: boolean;
  charges?: boolean;
  mydata?: TenantRecord["mydata"];
  overdue?: boolean;
  grant?: string;
  domain?: string;
  seats: number;
  bookings: number;
  gmv: number;
  renewal: string;
}
const SEEDS: Seed[] = [
  {
    id: "akti",
    name: "Akti tou Iliou",
    sub: "aktitouiliou",
    lifecycle: "live",
    plan: "pro",
    owner: "Eleni Markou",
    seats: 10,
    bookings: 9800,
    gmv: 241000,
    renewal: "2027-03-31",
    domain: "book.aktitouiliou.gr",
  },
  {
    id: "kavouri",
    name: "Kavouri Coast",
    sub: "kavouri",
    lifecycle: "live",
    plan: "pro",
    owner: "Andreas Kavouras",
    seats: 8,
    bookings: 6100,
    gmv: 168000,
    renewal: "2026-11-02",
    grant: "2026-12-31",
  },
  {
    id: "paros",
    name: "Sun & Sea Paros",
    sub: "sunseaparos",
    lifecycle: "live",
    plan: "pro",
    owner: "Marina Kostaki",
    seats: 12,
    bookings: 7400,
    gmv: 186000,
    renewal: "2027-04-15",
  },
  {
    id: "bluelagoon",
    name: "Blue Lagoon Beach",
    sub: "bluelagoon",
    lifecycle: "live",
    plan: "starter",
    owner: "Petros Lagos",
    seats: 4,
    bookings: 2650,
    gmv: 92000,
    renewal: "2027-02-28",
    overdue: true,
  },
  {
    id: "naxos",
    name: "Naxos Sands",
    sub: "naxossands",
    lifecycle: "live",
    plan: "starter",
    owner: "Ioanna Naxiou",
    seats: 5,
    bookings: 2900,
    gmv: 104000,
    renewal: "2027-01-20",
  },
  {
    id: "glyfada",
    name: "Glyfada Bay",
    sub: "glyfada",
    lifecycle: "onboarding",
    plan: "pro",
    owner: "Nikos Glyfadas",
    step: 3,
    dpa: false,
    payouts: false,
    seats: 2,
    bookings: 0,
    gmv: 0,
    renewal: "2027-05-01",
  },
  {
    id: "beach2",
    name: "Demo Beach #2",
    sub: "beach2",
    lifecycle: "onboarding",
    env: "demo",
    plan: "starter",
    owner: "Demo Owner",
    step: 2,
    dpa: false,
    payouts: false,
    charges: false,
    seats: 1,
    bookings: 40,
    gmv: 0,
    renewal: "2027-05-01",
  },
  {
    id: "mykonos",
    name: "Mykonos Shore",
    sub: "mykonosshore",
    lifecycle: "onboarding",
    env: "sandbox",
    plan: "group",
    owner: "Stavros Mykonios",
    step: 2,
    dpa: false,
    payouts: false,
    mydata: "missing",
    seats: 3,
    bookings: 0,
    gmv: 0,
    renewal: "2027-05-01",
  },
  {
    id: "rhodes",
    name: "Rhodes Bay Club",
    sub: "rhodesbay",
    lifecycle: "onboarding",
    plan: "pro",
    owner: "Eleni Roditi",
    step: 1,
    payouts: false,
    charges: false,
    mydata: "missing",
    seats: 1,
    bookings: 0,
    gmv: 0,
    renewal: "2027-05-01",
  },
];

const month = (offset: number) => {
  const d = new Date(2026, 9 + offset, 1);
  return {
    label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    due: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-10`,
  };
};
const PRICE = { starter: 490, pro: 990, group: 2400 };

export const DEFAULT_TENANTS: TenantRecord[] = SEEDS.map((s) => {
  const r = (k: string) => seed(s.id + k);
  const live = s.lifecycle === "live";
  const domain = `${s.sub}.gr`;
  return {
    id: s.id,
    name: s.name,
    legalName: `${s.name} ${r("l") > 0.5 ? "ΑΕ" : "ΙΚΕ"}`,
    subdomain: `${s.sub}.slaice.app`,
    customDomain: s.domain,
    domainVerified: !!s.domain && s.id === "akti",
    vatNo: `EL ${800000000 + Math.floor(r("v") * 99999999)}`,
    address: `${Math.floor(1 + r("a") * 120)} Poseidonos Ave, Attica`,
    country: "Greece",
    language: "Greek",
    languages: ["el", "en", ...(r("de") > 0.5 ? ["de"] : [])],
    timezone: "Europe/Athens",
    currency: "EUR",
    region: "EU · Frankfurt",
    env: s.env ?? "live",
    lifecycle: s.lifecycle,
    history: live
      ? [
          {
            from: "onboarding",
            to: "live",
            reason: "Go live",
            actor: "Slaice onboarding",
            at: "2026-04-20T10:00:00",
          },
        ]
      : [],
    onboardingStep: s.step,
    goLive: live ? "2026-04-20" : undefined,
    brand: ["#0D9488", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444"][Math.floor(r("b") * 5)],
    plan: { id: s.plan, version: 1 },
    billingCycle: "monthly",
    trialEnd: live ? undefined : "2026-11-15",
    renewal: s.renewal,
    addOns: s.id === "akti" ? 60 : 0,
    overrides: [],
    beta: s.id === "akti" ? ["Geo Map"] : [],
    releaseChannel: s.id === "akti" ? "beta" : "stable",
    stripe: {
      details: true,
      charges: s.charges ?? true,
      payouts: s.payouts ?? true,
      reqs:
        s.payouts === false
          ? [
              {
                id: "bank",
                label: "Bank account verification",
                due: s.id === "glyfada" ? "currently_due" : "eventually_due",
                dueDate: "2026-10-20",
                capability: "Payouts paused",
              },
            ]
          : [],
      schedule: "Every 3 days (T+2)",
    },
    dpa:
      s.dpa === false
        ? { status: "Pending", version: "v3.1" }
        : { status: "Signed", version: "v3.1", signed: "2026-04-02" },
    mydata: s.mydata ?? (live ? "connected" : "connected"),
    webhooks: "healthy",
    channels: { email: true, sms: live, viber: s.id === "akti" },
    contacts: contacts(s.name, domain, s.owner),
    accountManager: ["Sofia Antoniou", "Kostas Leventis"][Math.floor(r("am") * 2)],
    slaiceTeam: ["Support · Maria P.", "Onboarding · Giannis D."],
    supportGrant: s.grant ? { until: s.grant } : undefined,
    usage: {
      locations: 1,
      seats: s.seats,
      bookings: s.bookings > 0 ? Math.round(s.bookings / 4) : 0,
      messages: Math.round(r("m") * 900 + (live ? 400 : 0)),
      storage: Math.round(r("s") * 6 + 1),
    },
    invoices: live
      ? [-3, -2, -1].map((o, i) => {
          const m = month(o);
          return {
            no: `SL-${2026}${String(400 + i)}-${s.id.toUpperCase().slice(0, 3)}`,
            period: m.label,
            amount: PRICE[s.plan],
            status: s.overdue && i === 2 ? "Overdue" : "Paid",
            due: m.due,
          };
        })
      : [],
    locations: {
      sites: 1,
      zones: live ? 6 : 2,
      sets: live ? 240 : 40,
      lockers: live ? 40 : 0,
      parking: live ? 60 : 0,
      season: "1 May – 15 Oct",
      hours: "08:00–20:00",
    },
    kpi: { gmv: s.gmv, fees: Math.round(s.gmv * 0.05), bookings: s.bookings },
    health: {
      adoption: live ? Math.round(55 + r("ad") * 40) : 30,
      payments: live ? Math.round(80 + r("pa") * 18) : 50,
      support: Math.round(50 + r("su") * 45),
      commercial: live ? Math.round(60 + r("co") * 35) : 50,
      trend: Array.from({ length: 12 }, (_, i) =>
        Math.round((live ? 60 : 40) + r(`t${i}`) * 25 + i),
      ),
    },
    tickets: live
      ? [
          {
            id: `ZD-${3000 + Math.floor(r("z") * 900)}`,
            title: "Receipt printer offline at entrance",
            status: "Solved",
            at: "2026-09-28",
          },
        ]
      : [
          {
            id: `ZD-${3000 + Math.floor(r("z") * 900)}`,
            title: "Help with Stripe verification",
            status: "Open",
            at: "2026-10-08",
          },
        ],
    notes:
      s.id === "bluelagoon"
        ? [
            {
              id: "n1",
              at: "2026-10-05T09:12:00",
              by: "Sofia Antoniou",
              tag: "Billing",
              text: "Owner promised payment of the September invoice by mid-October.",
              pinned: true,
            },
          ]
        : [],
    audit: [
      {
        id: "a0",
        at: "2026-04-20T10:00:00",
        actor: "Slaice onboarding",
        actorType: "Slaice staff",
        section: "Lifecycle",
        change: live ? "Went live" : "Tenant created",
      },
    ],
    exports: [],
    security: {
      require2fa: s.id === "akti",
      sessionMins: 60,
      methods: ["Magic link", "Google", "Password"],
      events: [
        { at: "2026-10-09T08:40:00", text: "3 failed sign-ins for cashier@ (locked 15 min)" },
      ],
    },
    invoicing: { series: "Α", vatRate: 24, accountant: "Logistiki Plus ΟΕ", provider: "Elorus" },
  };
});

/** A new tenant draft created by the onboarding wizard (AENR-500). */
export function makeTenant(name: string, sub: string): TenantRecord {
  const base = DEFAULT_TENANTS.find((t) => t.id === "rhodes") ?? DEFAULT_TENANTS[0];
  const id = sub.toLowerCase().replace(/[^a-z0-9]/g, "") || `t${Date.now().toString(36)}`;
  return {
    ...base,
    id,
    name,
    legalName: `${name} ΙΚΕ`,
    subdomain: `${id}.slaice.app`,
    customDomain: undefined,
    env: "live",
    lifecycle: "onboarding",
    onboardingStep: 0,
    history: [],
    contacts: contacts(name, `${id}.gr`, "Owner"),
    notes: [],
    exports: [],
    tickets: [],
    audit: [
      {
        id: "a0",
        at: new Date().toISOString(),
        actor: "Sofia Antoniou",
        actorType: "Slaice staff",
        section: "Lifecycle",
        change: "Tenant created in onboarding",
      },
    ],
    kpi: { gmv: 0, fees: 0, bookings: 0 },
  };
}
