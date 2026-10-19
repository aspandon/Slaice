// Staff invitations and first sign-in (AENR-718). Pure rules only: validating a
// new person's details, the invitation's life (pending → expired / revoked),
// password rules and the 2-step verification codes the demo simulates.
import type { StaffInvite, StaffRole, StaffUser, TwoFactorMethod } from "./types";

/* ---------- The person's details ---------- */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Strip everything but digits and a leading "+" (and turn a leading 00 into +). */
export function normalizePhone(s: string): string {
  const t = s.trim().replace(/^00/, "+");
  return (t.startsWith("+") ? "+" : "") + t.replace(/\D/g, "");
}
/** "+306942000110" → "+30 694 200 0110"; other countries are grouped in threes. */
export function formatPhone(s: string): string {
  const n = normalizePhone(s);
  if (!n.startsWith("+")) return s.trim();
  if (n.startsWith("+30") && n.length === 13)
    return `+30 ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
  const cc = n.match(/^\+(1|7|\d{2})/)?.[0] ?? n.slice(0, 3);
  return `${cc} ${n.slice(cc.length).replace(/(\d{3})(?=\d{3,})/g, "$1 ")}`.trim();
}
/** A mobile number SMS codes can reach: international format, Greek mobiles start 69. */
export function phoneError(s: string): string {
  const n = normalizePhone(s);
  if (!s.trim()) return "Enter a mobile number — it receives sign-in codes by SMS.";
  if (!n.startsWith("+")) return "Start with the country code, e.g. +30 694 200 0110.";
  if (n.startsWith("+30")) {
    if (n.length !== 13) return "A Greek number has 10 digits after +30.";
    if (!n.startsWith("+3069"))
      return "Use a mobile (Greek mobiles start 69) — landlines can't receive SMS.";
    return "";
  }
  return n.length >= 9 && n.length <= 16 ? "" : "Check the number — 8 to 15 digits after the +.";
}

export interface StaffDraft {
  id?: string;
  name: string;
  email: string;
  phone: string;
  roles: StaffRole[];
  tillPin: string;
}
export type StaffDraftErrors = Partial<
  Record<"name" | "email" | "phone" | "roles" | "tillPin", string>
>;
/** Roles that sell at a shared till and switch in with a PIN (AENR-608). */
export const TILL_ROLES: readonly StaffRole[] = ["cashier", "support"];
export const sellsAtTill = (roles: readonly StaffRole[]) =>
  roles.some((r) => TILL_ROLES.includes(r));

export function validateStaffDraft(d: StaffDraft, others: readonly StaffUser[]): StaffDraftErrors {
  const e: StaffDraftErrors = {};
  const rest = others.filter((u) => u.id !== d.id);
  if (!d.name.trim()) e.name = "Enter the person's name.";
  const email = d.email.trim().toLowerCase();
  if (!email) e.email = "Enter their e-mail — the invitation goes there.";
  else if (!EMAIL_RE.test(email)) e.email = "Enter a valid e-mail, e.g. name@beach.gr.";
  else if (rest.some((u) => u.email.toLowerCase() === email))
    e.email = "Someone already uses this e-mail.";
  const ph = phoneError(d.phone);
  if (ph) e.phone = ph;
  else if (rest.some((u) => u.phone && normalizePhone(u.phone) === normalizePhone(d.phone)))
    e.phone = "Someone already uses this number.";
  if (!d.roles.length) e.roles = "Pick at least one role.";
  if (sellsAtTill(d.roles) && d.tillPin) {
    if (!/^\d{4}$/.test(d.tillPin)) e.tillPin = "Use exactly 4 digits.";
    else if (rest.some((u) => u.tillPin === d.tillPin))
      e.tillPin = "Someone else uses this PIN — pick another.";
  }
  return e;
}

/** "Sofia Lambrou" → "sofia.lambrou" (Greek letters transliterated), unique among `taken`. */
export function usernameFor(name: string, taken: readonly string[]): string {
  const GR: Record<string, string> = {
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "ch",
    ψ: "ps",
    ω: "o",
  };
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[α-ω]/g, (c) => GR[c] ?? "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "user";
  let u = base;
  for (let i = 2; taken.includes(u); i++) u = `${base}${i}`;
  return u;
}
/** The username a user signs in with — stored, or derived for older accounts. */
export const usernameOf = (u: Pick<StaffUser, "username" | "name">) =>
  u.username ?? usernameFor(u.name, []);

/* ---------- The invitation ---------- */
export const INVITE_TTL_HOURS = 72;
export function newInvite(nowMs: number, prev?: StaffInvite): StaffInvite {
  return {
    sentAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + INVITE_TTL_HOURS * 3600_000).toISOString(),
    sends: (prev?.sends ?? 0) + 1,
  };
}
export type InviteState = "pending" | "expired" | "revoked";
export function inviteState(inv: StaffInvite | undefined, nowMs: number): InviteState {
  if (inv?.revokedAt) return "revoked";
  if (!inv || new Date(inv.expiresAt).getTime() <= nowMs) return "expired";
  return "pending";
}
/** An invited user from before AENR-718 gets the invitation they were sent on the day they were added. */
export function inviteFor(u: Pick<StaffUser, "created" | "invite">): StaffInvite {
  if (u.invite) return u.invite;
  const sent = new Date(`${u.created}T09:00:00`).getTime();
  return newInvite(sent);
}

/** "just now", "2 min ago", "3 h ago", "2 days ago" — `at` relative to `nowMs`. */
export function ago(at: string, nowMs: number): string {
  const m = Math.max(0, Math.round((nowMs - new Date(at).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ---------- First sign-in: password ---------- */
export interface PasswordRule {
  id: string;
  label: string;
  ok: boolean;
}
export const PASSWORD_MIN = 10;
export function passwordRules(pw: string, who: { name: string; username: string }): PasswordRule[] {
  const lower = pw.toLowerCase();
  const parts = [who.username, ...who.name.toLowerCase().split(/\s+/)].filter((p) => p.length >= 3);
  return [
    { id: "len", label: `At least ${PASSWORD_MIN} characters`, ok: pw.length >= PASSWORD_MIN },
    {
      id: "case",
      label: "Upper- and lower-case letters",
      ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    },
    { id: "num", label: "A number", ok: /\d/.test(pw) },
    { id: "sym", label: "A symbol, e.g. ! ? # @", ok: /[^A-Za-z0-9]/.test(pw) },
    {
      id: "name",
      label: "Not your name or username",
      ok: pw.length > 0 && !parts.some((p) => lower.includes(p.toLowerCase())),
    },
  ];
}
export type Strength = "empty" | "weak" | "fair" | "strong";
export function passwordStrength(rules: readonly PasswordRule[], pw: string): Strength {
  if (!pw) return "empty";
  const ok = rules.filter((r) => r.ok).length;
  if (ok === rules.length) return pw.length >= 14 ? "strong" : "fair";
  return ok >= 3 ? "fair" : "weak";
}

/* ---------- First sign-in: 2-step verification ---------- */
export const TWO_FACTOR_LABEL: Record<TwoFactorMethod, string> = {
  sms: "Text message (SMS)",
  email: "E-mail code",
  app: "Authenticator app",
};
/** The demo has no SMS gateway or TOTP: this code always verifies, besides the one "sent". */
export const DEMO_CODE = "123456";
export const MAX_CODE_TRIES = 5;
export function demoCode(rand: () => number = Math.random): string {
  return String(Math.floor(100000 + rand() * 900000));
}
export function maskPhone(phone: string): string {
  const n = normalizePhone(phone);
  return n.length > 6 ? `${n.slice(0, 3)} ••• ••• ${n.slice(-4)}` : phone;
}
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, user.length - 1)))}@${domain}`;
}
/** A deterministic base32 secret for the authenticator QR, shown in groups of four. */
export function authenticatorKey(seed: string): string {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let h = 2166136261;
  let out = "";
  for (let i = 0; i < 16; i++) {
    for (const c of `${seed}#${i}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    out += A[(h >>> 0) % 32];
  }
  return out.replace(/(.{4})(?=.)/g, "$1 ");
}
