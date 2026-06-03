// Sample data shared across screens. Deterministic; safe for the mockup.

export const CUSTOMERS = [
  { id: 1, name: "Maria K.", email: "maria.kontou@example.com", phone: "+30 694 100 0001", bookings: 12, spend: 384, tags: ["VIP", "Season pass"], lastVisit: "Sun, 19 Jul" },
  { id: 2, name: "Nikos P.", email: "nikos.papas@example.com", phone: "+30 694 100 0002", bookings: 5, spend: 142, tags: ["Regular"], lastVisit: "Sat, 12 Jul" },
  { id: 3, name: "Elena V.", email: "elena.vlachos@example.com", phone: "+30 694 100 0003", bookings: 28, spend: 1240, tags: ["VIP"], lastVisit: "Sun, 19 Jul" },
  { id: 4, name: "Giorgos T.", email: "g.tsouris@example.com", phone: "+30 694 100 0004", bookings: 2, spend: 58, tags: ["New"], lastVisit: "Fri, 18 Jul" },
  { id: 5, name: "Dimitris A.", email: "d.aravidis@example.com", phone: "+30 694 100 0005", bookings: 14, spend: 560, tags: ["Regular"], lastVisit: "Sun, 12 Jul" },
  { id: 6, name: "Ioanna S.", email: "ioanna.sava@example.com", phone: "+30 694 100 0006", bookings: 9, spend: 286, tags: ["Regular"], lastVisit: "Wed, 16 Jul" },
  { id: 7, name: "Andreas M.", email: "a.markou@example.com", phone: "+30 694 100 0007", bookings: 18, spend: 720, tags: ["Season pass"], lastVisit: "Sat, 19 Jul" },
  { id: 8, name: "Eleni K.", email: "eleni.k@example.com", phone: "+30 694 100 0008", bookings: 3, spend: 84, tags: ["New"], lastVisit: "Thu, 17 Jul" },
  { id: 9, name: "Kostas L.", email: "kostas.leontis@example.com", phone: "+30 694 100 0009", bookings: 21, spend: 890, tags: ["VIP", "Regular"], lastVisit: "Sun, 19 Jul" },
  { id: 10, name: "Sofia P.", email: "sofia.papaki@example.com", phone: "+30 694 100 0010", bookings: 7, spend: 198, tags: ["Regular"], lastVisit: "Tue, 15 Jul" },
  { id: 11, name: "Petros N.", email: "p.nikolaou@example.com", phone: "+30 694 100 0011", bookings: 11, spend: 412, tags: ["Season pass"], lastVisit: "Sat, 19 Jul" },
  { id: 12, name: "Anna M.", email: "anna.m@example.com", phone: "+30 694 100 0012", bookings: 1, spend: 30, tags: ["New"], lastVisit: "Sun, 19 Jul" },
];

// Customer-side bookings (Elena's view of "My Bookings")
export const CUSTOMER_BOOKINGS = [
  { id: "#BK-10428", item: "Sunbed · Central · CE-89", date: "Sun, 19 Jul", status: "Confirmed", price: 30, state: "active" },
  { id: "#BK-10402", item: "Sunbed · Central · CE-92", date: "Sun, 19 Jul", status: "Confirmed", price: 30, state: "active" },
  { id: "#TK-55120", item: "Entry · Adult ×2", date: "Sun, 19 Jul", status: "Confirmed", price: 20, state: "active" },
  { id: "#LK-9921", item: "Day Locker · A07", date: "Sun, 19 Jul", status: "Confirmed", price: 5, state: "active" },
  { id: "#PK-4012", item: "Parking · Spot P12", date: "Sun, 19 Jul", status: "Confirmed", price: 15, state: "active" },
  { id: "#BK-10310", item: "Sunbed · Bestbuy · BE-14", date: "Sat, 12 Jul", status: "Used", price: 22, state: "past" },
  { id: "#BK-10288", item: "Sunbed · Akanthus · AK-31", date: "Sun, 06 Jul", status: "Used", price: 30, state: "past" },
  { id: "#TK-55041", item: "Entry · Adult", date: "Sun, 06 Jul", status: "Used", price: 10, state: "past" },
  { id: "#BK-10122", item: "Sunbed · Main · MA-08", date: "Sat, 28 Jun", status: "Used", price: 28, state: "past" },
  { id: "#BK-09980", item: "Sunbed · Bolivar · BO-22", date: "Sun, 22 Jun", status: "Used", price: 18, state: "past" },
];

// Customer documents (Elena's MyDATA receipts/invoices)
export const CUSTOMER_DOCS = [
  { id: "ΑΠΥ-2026-004281", for: "Sunbed booking", date: "19 Jul 2026", amt: "€30", mark: "400001020304002281", lines: [["Sunbed CE-89", "€24.19", "€5.81", "€30.00"]] },
  { id: "ΑΠΥ-2026-004280", for: "Locker + Parking", date: "19 Jul 2026", amt: "€20", mark: "400001020304002280", lines: [["Locker A07", "€4.03", "€0.97", "€5.00"], ["Parking P12", "€12.10", "€2.90", "€15.00"]] },
  { id: "ΑΠΥ-2026-004102", for: "Entry tickets ×3", date: "12 Jul 2026", amt: "€25", mark: "400001020304002102", lines: [["Adult ×2", "€16.13", "€3.87", "€20.00"], ["Child ×1", "€4.03", "€0.97", "€5.00"]] },
  { id: "ΑΠΥ-2026-003988", for: "Sunbed booking", date: "06 Jul 2026", amt: "€30", mark: "400001020304003988", lines: [["Sunbed AK-31", "€24.19", "€5.81", "€30.00"]] },
  { id: "ΤΠΥ-2026-000118", for: "Group ticket (B2B)", date: "06 Jul 2026", amt: "€120", mark: "400001020304000118", lines: [["Adult ×12", "€96.77", "€23.23", "€120.00"]] },
  { id: "ΑΠΥ-2026-003774", for: "Sunbed + extras", date: "28 Jun 2026", amt: "€38", mark: "400001020304003774", lines: [["Sunbed MA-08", "€22.58", "€5.42", "€28.00"], ["Locker B12", "€4.03", "€0.97", "€5.00"], ["Parking P22", "€4.03", "€0.97", "€5.00"]] },
  { id: "ΠΙΣ-2026-000012", for: "Refund · Double booking", date: "21 Jun 2026", amt: "−€22", mark: "400001020304000012", lines: [["Sunbed BE-14 refund", "−€17.74", "−€4.26", "−€22.00"]] },
];

// Admin all bookings (tenant-wide) — channel: Online | Walk-in | Phone | Cashier
export const ADMIN_BOOKINGS = [
  ["#BK-10428", "Elena V.", "Central · CE-89", "19 Jul", "Online", "Confirmed", 30],
  ["#BK-10427", "Walk-in", "Macaw · MC-04", "19 Jul", "Walk-in", "Confirmed", 35],
  ["#BK-10426", "Nikos P.", "Bestbuy · BE-12", "19 Jul", "Online", "Confirmed", 44],
  ["#BK-10425", "Maria K.", "Akanthus · AK-08", "19 Jul", "Online", "Confirmed", 30],
  ["#BK-10424", "Andreas M.", "Bolivar · BO-19", "19 Jul", "Online", "Confirmed", 18],
  ["#BK-10423", "Walk-in", "Central · CE-44", "19 Jul", "Walk-in", "Confirmed", 25],
  ["#BK-10422", "Sofia P.", "Main · MA-22", "19 Jul", "Phone", "Unpaid", 28],
  ["#BK-10421", "Petros N.", "Central · CE-101", "19 Jul", "Online", "Confirmed", 25],
  ["#BK-10420", "Walk-in", "Bestbuy · BE-34", "19 Jul", "Cashier", "Confirmed", 22],
  ["#BK-10419", "Anna M.", "Akanthus · AK-15", "19 Jul", "Online", "Confirmed", 30],
  ["#BK-10418", "Kostas L.", "Macaw · MC-12", "19 Jul", "Online", "Confirmed", 35],
  ["#BK-10410", "Maria K.", "Central · CE-92", "18 Jul", "Phone", "Unpaid", 30],
  ["#BK-10402", "Dimitris A.", "Bestbuy · BE-09", "18 Jul", "Online", "Confirmed", 22],
  ["#BK-10310", "Giorgos T.", "Bestbuy · BE-14", "12 Jul", "Online", "Used", 22],
  ["#BK-10288", "Elena V.", "Akanthus · AK-31", "06 Jul", "Online", "Used", 30],
  ["#BK-10142", "Walk-in", "Main · MA-12", "29 Jun", "Walk-in", "Used", 28],
  ["#BK-09980", "Ioanna S.", "Bolivar · BO-22", "22 Jun", "Online", "Used", 18],
  ["#BK-09812", "Eleni K.", "Central · CE-67", "15 Jun", "Online", "Cancelled", 25],
];

// Admin refunds
export const ADMIN_REFUNDS = [
  { tx: "#TX-88210", cust: "Maria K.", amount: 30, reason: "", status: null, date: "19 Jul" },
  { tx: "#TX-88154", cust: "Nikos P.", amount: 22, reason: "Double booking", status: "Refunded", date: "12 Jul" },
  { tx: "#TX-88102", cust: "Sofia P.", amount: 28, reason: "Weather (rain)", status: "Refunded", date: "10 Jul" },
  { tx: "#TX-88051", cust: "Andreas M.", amount: 35, reason: "Customer request", status: "Refunded", date: "08 Jul" },
  { tx: "#TX-87922", cust: "Walk-in", amount: 18, reason: "Service issue", status: "Refunded", date: "30 Jun" },
  { tx: "#TX-87810", cust: "Eleni K.", amount: 25, reason: "", status: null, date: "29 Jun" },
];

// Cashier register session transactions
export const CASHIER_TX = [
  ["09:14", "Float in", "Opening cash", { type: "tone", tone: "slate", label: "Open" }, "+€100"],
  ["09:38", "Sale", "Adult", { type: "tone", tone: "amber", label: "Cash" }, "€10"],
  ["10:02", "Sale", "Adult ×2", { type: "tone", tone: "blue", label: "Card" }, "€20"],
  ["10:21", "Sale", "Resident ×2", { type: "tone", tone: "amber", label: "Cash" }, "€12"],
  ["10:55", "Sale", "Child + Adult", { type: "tone", tone: "blue", label: "Card" }, "€15"],
  ["11:14", "Sale", "Locker A07", { type: "tone", tone: "amber", label: "Cash" }, "€5"],
  ["11:40", "Sale", "Adult ×3", { type: "tone", tone: "blue", label: "Card" }, "€30"],
  ["12:05", "Sale", "Senior", { type: "tone", tone: "amber", label: "Cash" }, "€7"],
  ["12:30", "Sale", "Adult ×2", { type: "tone", tone: "amber", label: "Cash" }, "€20"],
  ["12:41", "Sale", "Resident", { type: "tone", tone: "blue", label: "Card" }, "€6"],
  ["13:02", "Handover", "Shift change", { type: "tone", tone: "slate", label: "—" }, { negative: true, label: "−€500" }],
  ["13:30", "Sale", "Locker B12", { type: "tone", tone: "blue", label: "Card" }, "€5"],
  ["14:11", "Sale", "Adult ×4", { type: "tone", tone: "blue", label: "Card" }, "€40"],
];

// Controller validations queue
export const RECENT_VALIDATIONS = [
  { id: "#BK-10428", sub: "Central · CE-89", state: "valid" },
  { id: "#TK-55120", sub: "Entry · Adult", state: "valid" },
  { id: "#BK-10421", sub: "Central · CE-101", state: "valid" },
  { id: "#BK-10402", sub: "Central · CE-92", state: "used" },
  { id: "#TK-55119", sub: "Entry · Resident", state: "valid" },
  { id: "#BK-10310", sub: "Bestbuy · BE-14", state: "used" },
];

// Accountant invoicing docs (tenant-wide)
export const ACCOUNTANT_DOCS = [
  { d: "ΑΠΥ-2026-004281", t: "ΑΠΥ", mark: "400001020304002281", amt: "€30", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004280", t: "ΑΠΥ", mark: "400001020304002280", amt: "€25", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004279", t: "ΑΠΥ", mark: "400001020304002279", amt: "€44", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004278", t: "ΑΠΥ", mark: "400001020304002278", amt: "€18", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΤΠΥ-2026-000118", t: "ΤΠΥ", mark: "400001020304000118", amt: "€120", st: "MyDATA ✓", type: "issued", date: "18 Jul" },
  { d: "ΑΠΥ-2026-004102", t: "ΑΠΥ", mark: "400001020304002102", amt: "€25", st: "MyDATA ✓", type: "issued", date: "12 Jul" },
  { d: "ΑΠΥ-2026-003988", t: "ΑΠΥ", mark: "400001020304003988", amt: "€30", st: "MyDATA ✓", type: "issued", date: "06 Jul" },
  { d: "ΑΚΥ-2026-000044", t: "Cancellation", mark: "400001020304000044", amt: "−€30", st: "Issued", type: "cancelled", date: "18 Jul" },
  { d: "ΑΚΥ-2026-000043", t: "Cancellation", mark: "400001020304000043", amt: "−€35", st: "Issued", type: "cancelled", date: "08 Jul" },
  { d: "ΠΙΣ-2026-000012", t: "Credit (5.1)", mark: "400001020304000012", amt: "−€22", st: "MyDATA ✓", type: "credited", date: "12 Jul" },
  { d: "ΠΙΣ-2026-000011", t: "Credit (5.1)", mark: "400001020304000011", amt: "−€28", st: "MyDATA ✓", type: "credited", date: "10 Jul" },
];

// Accountant monthly payouts
export const ACCOUNTANT_PAYOUTS = [
  ["May", "€48,000", "−€700", "−€2,400", "€44,900"],
  ["Jun", "€121,000", "−€1,760", "−€6,050", "€113,190"],
  ["Jul", "€198,000", "−€2,880", "−€9,900", "€185,220"],
  ["Aug", "€241,000", "−€3,500", "−€12,050", "€225,450"],
  ["Sep", "€96,000", "−€1,400", "−€4,800", "€89,800"],
];

// Platform tenants
export const PLATFORM_TENANTS = [
  { name: "Akti tou Iliou", subdomain: "aktitouiliou.slaice.app", stripe: { tone: "green", label: "charges ✓" }, modules: ["Booking", "Ticket", "Invoice", "Pay"], status: { tone: "green", label: "Live" }, mrr: "€4.2k" },
  { name: "Demo Beach #2", subdomain: "beach2.slaice.app", stripe: { tone: "amber", label: "onboarding" }, modules: ["Booking"], status: { tone: "amber", label: "Setup" }, mrr: "—" },
  { name: "Paralia Sun", subdomain: "paraliasun.slaice.app", stripe: { tone: "slate", label: "pending" }, modules: [], status: { tone: "slate", label: "Lead" }, mrr: "—" },
  { name: "Glyfada Bay", subdomain: "glyfada.slaice.app", stripe: { tone: "amber", label: "KYC review" }, modules: ["Booking", "Ticket"], status: { tone: "amber", label: "Setup" }, mrr: "—" },
  { name: "Saronida Beach", subdomain: "saronida.slaice.app", stripe: { tone: "slate", label: "pending" }, modules: [], status: { tone: "slate", label: "Lead" }, mrr: "—" },
  { name: "Kavouri Coast", subdomain: "kavouri.slaice.app", stripe: { tone: "green", label: "charges ✓" }, modules: ["Booking", "Ticket", "Invoice", "Pay"], status: { tone: "green", label: "Live" }, mrr: "€2.8k" },
];

// Top customers (revenue/visits) — used by Reporting/Customers tab
export const TOP_CUSTOMERS = [
  { name: "Elena V.", segment: { tone: "amber", label: "VIP" }, visits: 28, spend: "€1,240" },
  { name: "Kostas L.", segment: { tone: "amber", label: "VIP" }, visits: 21, spend: "€890" },
  { name: "Andreas M.", segment: { tone: "blue", label: "Season" }, visits: 18, spend: "€720" },
  { name: "Maria K.", segment: { tone: "blue", label: "Season" }, visits: 12, spend: "€384" },
  { name: "Dimitris A.", segment: { tone: "slate", label: "Regular" }, visits: 14, spend: "€560" },
  { name: "Petros N.", segment: { tone: "blue", label: "Season" }, visits: 11, spend: "€412" },
  { name: "Ioanna S.", segment: { tone: "slate", label: "Regular" }, visits: 9, spend: "€286" },
];

// Reporting · Revenue · Transactions tab
export const REVENUE_TX = [
  ["#TX-88210", "Sunbed", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€30"],
  ["#TX-88209", "Ticket", { tone: "amber", label: "Cashier" }, { tone: "green", label: "Paid" }, "€20"],
  ["#TX-88208", "Sunbed", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€44"],
  ["#TX-88207", "Locker", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€5"],
  ["#TX-88206", "Sunbed", { tone: "amber", label: "Walk-in" }, { tone: "green", label: "Paid" }, "€35"],
  ["#TX-88205", "Parking", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€15"],
  ["#TX-88154", "Sunbed", { tone: "blue", label: "Online" }, { tone: "red", label: "Refunded" }, "−€22"],
  ["#TX-88102", "Sunbed", { tone: "blue", label: "Online" }, { tone: "red", label: "Refunded" }, "−€28"],
];

// Reporting · Tickets tab
export const REPORTING_TICKETS = [
  ["#TK-55120", "Adult ×2", "Customer", "19 Jul", "VIP", "€20", { tone: "green", label: "Valid" }],
  ["#TK-55119", "Resident", "Cashier", "19 Jul", "Regular", "€6", { tone: "slate", label: "Used" }],
  ["#TK-55118", "Senior", "Customer", "19 Jul", "Regular", "€7", { tone: "green", label: "Valid" }],
  ["#TK-55101", "Child", "Customer", "18 Jul", "New", "€5", { tone: "green", label: "Valid" }],
  ["#TK-55052", "Adult ×4", "Customer", "12 Jul", "Regular", "€40", { tone: "slate", label: "Used" }],
  ["#TK-54988", "Resident ×2", "Cashier", "06 Jul", "Regular", "€12", { tone: "slate", label: "Used" }],
];

// Reporting · Daily ops tab
export const DAILY_OPS = [
  ["Sunbed bookings", 214, "€6,420", "−€60", "€6,360"],
  ["Entry tickets", 512, "€4,180", "€0", "€4,180"],
  ["Lockers", 38, "€190", "€0", "€190"],
  ["Parking", 27, "€405", "€0", "€405"],
];

// Cashier register session statistics
export const CASHIER_SESSION = { id: "#CS-204", cashier: "Kostas L.", openedAt: "09:14", duration: "4h 22m", cashIn: "€1,240", cardIn: "€3,860" };
