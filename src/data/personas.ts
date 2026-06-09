// Personas (RFP roles). "Call Agent" is represented inside Manager/Admin (full access),
// matching the RFP role matrix where Call Agent ≈ Admin minus tenant configuration.
import type { NavItem, Persona, PersonaId } from "../domain/types";

export const PERSONAS: Persona[] = [
  { id: "customer", label: "Customer", icon: "umbrella", color: "#0D9488", blurb: "Πελάτης — online booking, tickets, QR entry, documents" },
  { id: "admin", label: "Manager / Admin", icon: "chart", color: "#0B2545", blurb: "Διαχειριστής / Call Agent — config, availability, CRM, reporting" },
  { id: "cashier", label: "Cashier", icon: "cash", color: "#0ea5e9", blurb: "Ταμίας — on-site ticket issuing, printing, cash register" },
  { id: "controller", label: "Controller", icon: "scan", color: "#f59e0b", blurb: "Ελεγκτής — gate QR validation, walk-ins" },
  { id: "accountant", label: "Accountant", icon: "receipt", color: "#a855f7", blurb: "Λογιστής — e-invoicing, MyDATA, commission & payouts" },
  { id: "platform", label: "Platform / Slaice", icon: "building", color: "#3a47cc", blurb: "Slaice staff — tenants, onboarding, super-admin, verticals" },
];

// Sidebar navigation per persona. badge "MVP"/"Future" shows the roadmap status.
// `short` is the label used in the compact mobile bottom-tab bar. `area: "account"`
// marks personal destinations: shown in the mobile nav sheet + the avatar menu, but
// kept out of the desktop inline primary nav.
export const NAV: Record<PersonaId, NavItem[]> = {
  customer: [
    { k: "home", label: "Home", short: "Home", icon: "home" },
    { k: "plan", label: "Plan my visit", short: "Plan", icon: "sparkles", badge: "MVP" },
    { k: "mybookings", label: "My Bookings", short: "Bookings", icon: "grid", area: "account" },
    { k: "mydocs", label: "My Documents", short: "Docs", icon: "receipt", area: "account" },
  ],
  admin: [
    { k: "dashboard", label: "Dashboard", short: "Home", icon: "chart", badge: "MVP" },
    { k: "availability", label: "Availability & Pricing", short: "Pricing", icon: "umbrella", badge: "MVP" },
    { k: "map", label: "Map Layout Editor", short: "Map", icon: "map", badge: "MVP" },
    { k: "bookings", label: "Bookings", short: "Bookings", icon: "grid", badge: "MVP" },
    { k: "manual", label: "Manual / Phone Booking", short: "Manual", icon: "phone", badge: "MVP" },
    { k: "users", label: "Users & Segments", short: "Users", icon: "users", badge: "MVP" },
    { k: "reporting", label: "Reporting & Analytics", short: "Reports", icon: "trend", badge: "MVP" },
    { k: "refunds", label: "Refunds", short: "Refunds", icon: "refund", badge: "MVP" },
    { k: "privacy", label: "Privacy & GDPR", short: "Privacy", icon: "shieldCheck", badge: "MVP" },
    { k: "communicate", label: "Communicate", short: "Comms", icon: "bell", badge: "Future" },
    { k: "loyalty", label: "Loyalty", short: "Loyalty", icon: "gift", badge: "Future" },
    { k: "passes", label: "Passes", short: "Passes", icon: "wallet", badge: "Future" },
  ],
  cashier: [
    { k: "issue", label: "Issue Ticket", short: "Issue", icon: "ticket", badge: "MVP" },
    { k: "redeem", label: "Redeem Ticket", short: "Redeem", icon: "check", badge: "MVP" },
    { k: "register", label: "Cash Register", short: "Register", icon: "cash", badge: "Future" },
    { k: "locker", label: "Sell Locker", short: "Locker", icon: "lock", badge: "Future" },
  ],
  controller: [
    { k: "scan", label: "Gate Validation", short: "Gate", icon: "scan", badge: "MVP" },
  ],
  accountant: [
    { k: "invoicing", label: "e-Invoicing & MyDATA", short: "MyDATA", icon: "receipt", badge: "MVP" },
    { k: "commission", label: "Commission & Payouts", short: "Payouts", icon: "trend", badge: "MVP" },
  ],
  platform: [
    { k: "tenants", label: "Tenants", short: "Tenants", icon: "building", badge: "MVP" },
    { k: "onboarding", label: "Tenant Onboarding", short: "Onboard", icon: "bolt", badge: "MVP" },
    { k: "superadmin", label: "Super Admin", short: "Admin", icon: "cog", badge: "Future" },
    { k: "compliance", label: "Compliance & DPA", short: "Compliance", icon: "shield", badge: "MVP" },
    { k: "verticals", label: "Verticals", short: "Verticals", icon: "pkg", badge: "Future" },
    { k: "landing", label: "Landing Page", short: "Landing", icon: "globe", badge: "Future" },
  ],
};

export const DEFAULT_PAGE: Record<PersonaId, string> = {
  customer: "home",
  admin: "dashboard",
  cashier: "issue",
  controller: "scan",
  accountant: "invoicing",
  platform: "tenants",
};
