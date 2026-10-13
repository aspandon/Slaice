// Personas (RFP roles). Call Center is its own role (phone bookings + booking
// lookup); Manager/Admin keeps the same Manual / Phone Booking screen too.
import type { NavItem, Persona, PersonaId } from "../domain/types";

export const PERSONAS: Persona[] = [
  { id: "customer", label: "Customer", icon: "umbrella", color: "#0D9488", blurb: "Πελάτης — online booking, tickets, QR entry, documents" },
  { id: "admin", label: "Manager / Admin", icon: "chart", color: "#0B2545", blurb: "Διαχειριστής / Call Agent — config, availability, CRM, reporting" },
  { id: "callcenter", label: "Call Center", icon: "phone", color: "#0891b2", blurb: "Τηλεφωνικό κέντρο — τηλεφωνικές κρατήσεις, αναζήτηση κρατήσεων" },
  { id: "cashier", label: "Cashier", icon: "cash", color: "#0ea5e9", blurb: "Ταμίας — on-site ticket issuing, printing, cash register" },
  { id: "controller", label: "Controller", icon: "scan", color: "#f59e0b", blurb: "Ελεγκτής — gate QR validation, walk-ins" },
  { id: "support", label: "Support Agent", icon: "headset", color: "#e11d48", blurb: "Υποστήριξη — gate, beach status, walk-ins, till and pay-by-link reservations" },
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
    // In plain sight on every viewport (AENR-563): top nav on desktop, tabs on phones.
    { k: "plan", label: "Plan a visit", short: "Plan", icon: "sparkles", badge: "MVP" },
    { k: "mybookings", label: "My bookings", short: "Bookings", icon: "grid" },
    { k: "wallet", label: "Wallet", short: "Wallet", icon: "wallet" },
    { k: "account", label: "Account", short: "Account", icon: "users" },
  ],
  // Grouped by job (AENR-558): the day first, settings pinned last.
  admin: [
    { k: "today", label: "Today", short: "Today", icon: "home", badge: "MVP" },
    { k: "live", label: "Live beach", short: "Live", icon: "map", badge: "MVP", group: "Operate" },
    { k: "bookings", label: "Bookings", short: "Bookings", icon: "grid", badge: "MVP", group: "Operate" },
    { k: "newbooking", label: "New booking", short: "New", icon: "plus", badge: "MVP", group: "Operate" },
    { k: "refunds", label: "Refunds", short: "Refunds", icon: "refund", badge: "MVP", group: "Operate" },
    { k: "display", label: "Live display", short: "Display", icon: "monitor", badge: "MVP", group: "Operate" },
    { k: "pricing", label: "Pricing & calendar", short: "Pricing", icon: "tag", badge: "MVP", group: "Sell" },
    { k: "products", label: "Products", short: "Products", icon: "ticket", badge: "MVP", group: "Sell" },
    { k: "passes", label: "Passes", short: "Passes", icon: "wallet", badge: "Future", group: "Sell" },
    { k: "loyalty", label: "Loyalty", short: "Loyalty", icon: "gift", badge: "Future", group: "Sell" },
    { k: "gamification", label: "Badges", short: "Badges", icon: "star", badge: "Future", group: "Sell" },
    { k: "users", label: "Guests & segments", short: "Guests", icon: "users", badge: "MVP", group: "Customers" },
    { k: "communicate", label: "Communicate", short: "Comms", icon: "bell", badge: "Future", group: "Customers" },
    { k: "reporting", label: "Reports", short: "Reports", icon: "trend", badge: "MVP", group: "Analyze" },
    { k: "layout", label: "Beach layout", short: "Layout", icon: "umbrella", badge: "MVP", group: "Settings" },
    { k: "rbac", label: "Team & roles", short: "Team", icon: "lock", badge: "MVP", group: "Settings" },
    { k: "privacy", label: "Privacy & GDPR", short: "Privacy", icon: "shieldCheck", badge: "MVP", group: "Settings" },
    { k: "billing", label: "Billing & plan", short: "Billing", icon: "receipt", badge: "MVP", group: "Settings" },
  ],
  callcenter: [
    { k: "newbooking", label: "New booking", short: "New", icon: "plus", badge: "MVP" },
    { k: "bookings", label: "Bookings", short: "Bookings", icon: "grid", badge: "MVP" },
  ],
  cashier: [
    { k: "issue", label: "Issue Ticket", short: "Issue", icon: "ticket", badge: "MVP" },
    { k: "transactions", label: "Transactions", short: "Sales", icon: "list", badge: "MVP" },
    { k: "redeem", label: "Redeem Ticket", short: "Redeem", icon: "check", badge: "Future" },
    { k: "register", label: "Cash Register", short: "Register", icon: "cash", badge: "Future" },
    { k: "locker", label: "Sell Locker", short: "Locker", icon: "lock", badge: "Future" },
  ],
  controller: [
    { k: "scan", label: "Gate Validation", short: "Gate", icon: "scan", badge: "MVP" },
    { k: "beach", label: "Beach Status", short: "Beach", icon: "umbrella", badge: "MVP" },
    { k: "walkin", label: "Walk-in Sale", short: "Walk-in", icon: "cash", badge: "MVP" },
  ],
  // Support Agent (AENR-533): every Controller and Cashier page plus pay-by-link.
  support: [
    { k: "scan", label: "Gate Validation", short: "Gate", icon: "scan", badge: "MVP", group: "Gate" },
    { k: "beach", label: "Beach Status", short: "Beach", icon: "umbrella", badge: "MVP", group: "Beach" },
    { k: "walkin", label: "Walk-in Sale", short: "Walk-in", icon: "cash", badge: "MVP", group: "Beach" },
    { k: "issue", label: "Issue Ticket", short: "Till", icon: "ticket", badge: "MVP", group: "Till" },
    { k: "transactions", label: "Transactions", short: "Sales", icon: "list", badge: "MVP", group: "Till" },
    { k: "register", label: "Cash Register", short: "Register", icon: "cash", badge: "Future", group: "Till" },
    { k: "redeem", label: "Redeem Ticket", short: "Redeem", icon: "check", badge: "Future", group: "Till" },
    { k: "locker", label: "Sell Locker", short: "Locker", icon: "lock", badge: "Future", group: "Till" },
    { k: "newbooking", label: "New booking", short: "New", icon: "plus", badge: "MVP", group: "Reservations" },
    { k: "bookings", label: "Bookings", short: "Bookings", icon: "grid", badge: "MVP", group: "Reservations" },
  ],
  accountant: [
    { k: "monthend", label: "Month-end", short: "Month", icon: "calendar", badge: "MVP" },
    { k: "documents", label: "Documents & Payments", short: "Docs", icon: "receipt", badge: "MVP" },
    { k: "commission", label: "Commission & Payouts", short: "Payouts", icon: "trend", badge: "MVP" },
    { k: "reports", label: "Payments & Invoices", short: "Reports", icon: "chart", badge: "MVP" },
  ],
  platform: [
    { k: "tenants", label: "Tenants", short: "Tenants", icon: "building", badge: "MVP" },
    { k: "superadmin", label: "Super Admin", short: "Admin", icon: "cog", badge: "Future" },
    { k: "compliance", label: "Compliance & DPA", short: "Compliance", icon: "shield", badge: "MVP" },
    // Marketing, not operations (AENR-566). Onboarding is a tenant state: Tenants › In onboarding.
    { k: "verticals", label: "Verticals", short: "Verticals", icon: "pkg", badge: "Future", group: "Marketing site" },
    { k: "landing", label: "Landing Page", short: "Landing", icon: "globe", badge: "Future", group: "Marketing site" },
  ],
};

export const DEFAULT_PAGE: Record<PersonaId, string> = {
  customer: "home",
  admin: "today",
  callcenter: "newbooking",
  cashier: "issue",
  controller: "scan",
  support: "scan",
  accountant: "monthend",
  platform: "tenants",
};
