// Personas (RFP roles). "Call Agent" is represented inside Manager/Admin (full access),
// matching the RFP role matrix where Call Agent ≈ Admin minus tenant configuration.

export const PERSONAS = [
  { id: "customer", label: "Customer", icon: "umbrella", color: "#0D9488", blurb: "Πελάτης — online booking, tickets, QR entry, documents" },
  { id: "admin", label: "Manager / Admin", icon: "chart", color: "#0B2545", blurb: "Διαχειριστής / Call Agent — config, availability, CRM, reporting" },
  { id: "cashier", label: "Cashier", icon: "cash", color: "#0ea5e9", blurb: "Ταμίας — on-site ticket issuing, printing, cash register" },
  { id: "controller", label: "Controller", icon: "scan", color: "#f59e0b", blurb: "Ελεγκτής — gate QR validation, walk-ins" },
  { id: "accountant", label: "Accountant", icon: "receipt", color: "#a855f7", blurb: "Λογιστής — e-invoicing, MyDATA, commission & payouts" },
  { id: "platform", label: "Platform / Slaice", icon: "building", color: "#3a47cc", blurb: "Slaice staff — tenants, onboarding, super-admin, verticals" },
];

// Sidebar navigation per persona. badge "MVP"/"Future" shows the roadmap status.
export const NAV = {
  customer: [
    { k: "home", label: "Home", icon: "home" },
    { k: "book", label: "Sunbed Booking", icon: "umbrella", badge: "MVP" },
    { k: "ticket", label: "Entry Ticket", icon: "ticket", badge: "MVP" },
    { k: "locker", label: "Day Locker", icon: "lock", badge: "Future" },
    { k: "parking", label: "Parking", icon: "car", badge: "Future" },
    { k: "mybookings", label: "My Bookings", icon: "grid", badge: "MVP" },
    { k: "mydocs", label: "My Documents", icon: "receipt", badge: "MVP" },
  ],
  admin: [
    { k: "dashboard", label: "Dashboard", icon: "chart", badge: "MVP" },
    { k: "availability", label: "Availability & Pricing", icon: "umbrella", badge: "MVP" },
    { k: "map", label: "Map Layout Editor", icon: "map", badge: "MVP" },
    { k: "bookings", label: "Bookings", icon: "grid", badge: "MVP" },
    { k: "manual", label: "Manual / Phone Booking", icon: "phone", badge: "MVP" },
    { k: "users", label: "Users & Segments", icon: "users", badge: "MVP" },
    { k: "reporting", label: "Reporting & Analytics", icon: "trend", badge: "MVP" },
    { k: "refunds", label: "Refunds", icon: "refund", badge: "MVP" },
    { k: "communicate", label: "Communicate", icon: "bell", badge: "Future" },
  ],
  cashier: [
    { k: "issue", label: "Issue Ticket", icon: "ticket", badge: "MVP" },
    { k: "redeem", label: "Redeem Ticket", icon: "check", badge: "MVP" },
    { k: "register", label: "Cash Register", icon: "cash", badge: "Future" },
    { k: "locker", label: "Sell Locker", icon: "lock", badge: "Future" },
  ],
  controller: [
    { k: "scan", label: "Gate Validation", icon: "scan", badge: "MVP" },
  ],
  accountant: [
    { k: "invoicing", label: "e-Invoicing & MyDATA", icon: "receipt", badge: "MVP" },
    { k: "commission", label: "Commission & Payouts", icon: "trend", badge: "MVP" },
  ],
  platform: [
    { k: "tenants", label: "Tenants", icon: "building", badge: "MVP" },
    { k: "onboarding", label: "Tenant Onboarding", icon: "bolt", badge: "MVP" },
    { k: "superadmin", label: "Super Admin", icon: "cog", badge: "Future" },
    { k: "verticals", label: "Verticals", icon: "pkg", badge: "Future" },
    { k: "landing", label: "Landing Page", icon: "globe", badge: "Future" },
  ],
};

export const DEFAULT_PAGE = {
  customer: "home", admin: "dashboard", cashier: "issue",
  controller: "scan", accountant: "invoicing", platform: "tenants",
};
