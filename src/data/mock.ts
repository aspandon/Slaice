// Sample data shared across screens. Deterministic; safe for the mockup.
import type { Customer, CustomerBooking, CustomerDocument } from "../domain/types";

export const CUSTOMERS: Customer[] = [
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
  { id: 13, name: "Christina R.", email: "c.raptis@example.com", phone: "+30 694 100 0013", bookings: 16, spend: 612, tags: ["Season pass"], lastVisit: "Sun, 19 Jul" },
  { id: 14, name: "Vasilis D.", email: "v.dimou@example.com", phone: "+30 694 100 0014", bookings: 4, spend: 110, tags: ["Regular"], lastVisit: "Fri, 18 Jul" },
  { id: 15, name: "Despina K.", email: "despina.k@example.com", phone: "+30 694 100 0015", bookings: 33, spend: 1480, tags: ["VIP"], lastVisit: "Sun, 19 Jul" },
  { id: 16, name: "Thanos P.", email: "t.petrou@example.com", phone: "+30 694 100 0016", bookings: 1, spend: 30, tags: ["New"], lastVisit: "Sat, 19 Jul" },
  { id: 17, name: "Marina G.", email: "marina.geo@example.com", phone: "+30 694 100 0017", bookings: 8, spend: 248, tags: ["Regular"], lastVisit: "Thu, 17 Jul" },
  { id: 18, name: "Stelios V.", email: "s.vergos@example.com", phone: "+30 694 100 0018", bookings: 19, spend: 760, tags: ["Season pass", "Regular"], lastVisit: "Sun, 19 Jul" },
  { id: 19, name: "Katerina M.", email: "k.manou@example.com", phone: "+30 694 100 0019", bookings: 6, spend: 174, tags: ["Regular"], lastVisit: "Tue, 15 Jul" },
  { id: 20, name: "Yiannis A.", email: "y.alexiou@example.com", phone: "+30 694 100 0020", bookings: 25, spend: 1010, tags: ["VIP"], lastVisit: "Sun, 19 Jul" },
  { id: 21, name: "Foteini L.", email: "f.lekka@example.com", phone: "+30 694 100 0021", bookings: 2, spend: 52, tags: ["New"], lastVisit: "Wed, 16 Jul" },
  { id: 22, name: "Alexis T.", email: "a.tziolas@example.com", phone: "+30 694 100 0022", bookings: 13, spend: 470, tags: ["Season pass"], lastVisit: "Sat, 19 Jul" },
  { id: 23, name: "Roula S.", email: "roula.s@example.com", phone: "+30 694 100 0023", bookings: 10, spend: 322, tags: ["Regular"], lastVisit: "Sun, 12 Jul" },
  { id: 24, name: "Manos K.", email: "m.kallis@example.com", phone: "+30 694 100 0024", bookings: 3, spend: 96, tags: ["New"], lastVisit: "Mon, 14 Jul" },
];

// Customer-side bookings (Elena's view of "My Bookings")
export const CUSTOMER_BOOKINGS: CustomerBooking[] = [
  { id: "#BK-10455", item: "Sunbed · Central · CE-77", date: "Sat, 25 Jul", status: "Confirmed", price: 25, state: "active" },
  { id: "#TK-55180", item: "Entry · Adult ×2 + Child", date: "Sat, 25 Jul", status: "Confirmed", price: 25, state: "active" },
  { id: "#PK-4080", item: "Parking · Spot P03", date: "Sat, 25 Jul", status: "Confirmed", price: 15, state: "active" },
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
  { id: "#BK-09844", item: "Sunbed · Macaw · MC-09", date: "Sun, 15 Jun", status: "Used", price: 35, state: "past" },
  { id: "#LK-9810", item: "Day Locker · C04", date: "Sun, 15 Jun", status: "Used", price: 5, state: "past" },
  { id: "#BK-09712", item: "Sunbed · Central · CE-12", date: "Sat, 07 Jun", status: "Used", price: 25, state: "past" },
];

// Customer documents (Elena's MyDATA receipts/invoices)
export const CUSTOMER_DOCS: CustomerDocument[] = [
  { id: "ΑΠΥ-2026-004281", for: "Sunbed booking", date: "19 Jul 2026", amt: "€30", mark: "400001020304002281", lines: [["Sunbed CE-89", "€24.19", "€5.81", "€30.00"]] },
  { id: "ΑΠΥ-2026-004280", for: "Locker + Parking", date: "19 Jul 2026", amt: "€20", mark: "400001020304002280", lines: [["Locker A07", "€4.03", "€0.97", "€5.00"], ["Parking P12", "€12.10", "€2.90", "€15.00"]] },
  { id: "ΑΠΥ-2026-004102", for: "Entry tickets ×3", date: "12 Jul 2026", amt: "€25", mark: "400001020304002102", lines: [["Adult ×2", "€16.13", "€3.87", "€20.00"], ["Child ×1", "€4.03", "€0.97", "€5.00"]] },
  { id: "ΑΠΥ-2026-003988", for: "Sunbed booking", date: "06 Jul 2026", amt: "€30", mark: "400001020304003988", lines: [["Sunbed AK-31", "€24.19", "€5.81", "€30.00"]] },
  { id: "ΤΠΥ-2026-000118", for: "Group ticket (B2B)", date: "06 Jul 2026", amt: "€120", mark: "400001020304000118", lines: [["Adult ×12", "€96.77", "€23.23", "€120.00"]] },
  { id: "ΑΠΥ-2026-003774", for: "Sunbed + extras", date: "28 Jun 2026", amt: "€38", mark: "400001020304003774", lines: [["Sunbed MA-08", "€22.58", "€5.42", "€28.00"], ["Locker B12", "€4.03", "€0.97", "€5.00"], ["Parking P22", "€4.03", "€0.97", "€5.00"]] },
  { id: "ΑΠΥ-2026-003590", for: "Sunbed booking", date: "15 Jun 2026", amt: "€35", mark: "400001020304003590", lines: [["Sunbed MC-09", "€28.23", "€6.77", "€35.00"]] },
  { id: "ΑΠΥ-2026-003421", for: "Day locker", date: "15 Jun 2026", amt: "€5", mark: "400001020304003421", lines: [["Locker C04", "€4.03", "€0.97", "€5.00"]] },
  { id: "ΑΠΥ-2026-003388", for: "Sunbed booking", date: "07 Jun 2026", amt: "€25", mark: "400001020304003388", lines: [["Sunbed CE-12", "€20.16", "€4.84", "€25.00"]] },
  { id: "ΑΠΥ-2026-003201", for: "Entry tickets ×2", date: "01 Jun 2026", amt: "€16", mark: "400001020304003201", lines: [["Resident ×2", "€12.90", "€3.10", "€16.00"]] },
  { id: "ΑΠΥ-2026-003044", for: "Sunbed + parking", date: "24 May 2026", amt: "€43", mark: "400001020304003044", lines: [["Sunbed BO-05", "€14.52", "€3.48", "€18.00"], ["Parking P09", "€20.16", "€4.84", "€25.00"]] },
  { id: "ΤΠΥ-2026-000092", for: "Corporate day (B2B)", date: "20 May 2026", amt: "€240", mark: "400001020304000092", lines: [["Adult ×24", "€193.55", "€46.45", "€240.00"]] },
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
  ["#BK-10417", "Roula S.", "Central · CE-55", "19 Jul", "Online", "Confirmed", 25],
  ["#BK-10416", "Walk-in", "Akanthus · AK-22", "19 Jul", "Walk-in", "Confirmed", 30],
  ["#BK-10415", "Stelios V.", "Bestbuy · BE-41", "19 Jul", "Online", "Confirmed", 22],
  ["#BK-10414", "Yiannis A.", "Macaw · MC-18", "19 Jul", "Online", "Confirmed", 35],
  ["#BK-10413", "Marina G.", "Main · MA-31", "19 Jul", "Phone", "Unpaid", 28],
  ["#BK-10412", "Walk-in", "Bolivar · BO-07", "19 Jul", "Cashier", "Confirmed", 18],
  ["#BK-10410", "Maria K.", "Central · CE-92", "18 Jul", "Phone", "Unpaid", 30],
  ["#BK-10408", "Despina K.", "Central · CE-03", "18 Jul", "Online", "Confirmed", 25],
  ["#BK-10405", "Vasilis D.", "Akanthus · AK-44", "18 Jul", "Online", "Refunded", 30],
  ["#BK-10402", "Dimitris A.", "Bestbuy · BE-09", "18 Jul", "Online", "Confirmed", 22],
  ["#BK-10377", "Christina R.", "Bestbuy · BE-08", "17 Jul", "Online", "Used", 22],
  ["#BK-10355", "Walk-in", "Macaw · MC-21", "16 Jul", "Walk-in", "Used", 35],
  ["#BK-10310", "Giorgos T.", "Bestbuy · BE-14", "12 Jul", "Online", "Used", 22],
  ["#BK-10298", "Katerina M.", "Main · MA-05", "12 Jul", "Phone", "Used", 28],
  ["#BK-10288", "Elena V.", "Akanthus · AK-31", "06 Jul", "Online", "Used", 30],
  ["#BK-10240", "Alexis T.", "Central · CE-30", "06 Jul", "Online", "Used", 25],
  ["#BK-10155", "Walk-in", "Bolivar · BO-14", "29 Jun", "Cashier", "Used", 18],
  ["#BK-10142", "Walk-in", "Main · MA-12", "29 Jun", "Walk-in", "Used", 28],
  ["#BK-09980", "Ioanna S.", "Bolivar · BO-22", "22 Jun", "Online", "Used", 18],
  ["#BK-09905", "Manos K.", "Akanthus · AK-02", "22 Jun", "Online", "Cancelled", 30],
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
  { tx: "#TX-87744", cust: "Christina R.", amount: 30, reason: "Weather (wind)", status: "Refunded", date: "27 Jun" },
  { tx: "#TX-87690", cust: "Walk-in", amount: 22, reason: "Double booking", status: "Refunded", date: "25 Jun" },
  { tx: "#TX-87655", cust: "Stelios V.", amount: 35, reason: "Customer request", status: "Refunded", date: "22 Jun" },
  { tx: "#TX-87601", cust: "Marina G.", amount: 15, reason: "", status: null, date: "20 Jun" },
  { tx: "#TX-87588", cust: "Yiannis A.", amount: 28, reason: "Service issue", status: "Refunded", date: "18 Jun" },
  { tx: "#TX-87540", cust: "Alexis T.", amount: 18, reason: "Weather (rain)", status: "Refunded", date: "15 Jun" },
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
  ["14:35", "Sale", "Adult ×2 + Child", { type: "tone", tone: "blue", label: "Card" }, "€25"],
  ["15:02", "Sale", "Resident ×3", { type: "tone", tone: "amber", label: "Cash" }, "€18"],
  ["15:28", "Sale", "Locker A14", { type: "tone", tone: "amber", label: "Cash" }, "€5"],
  ["15:51", "Sale", "Senior ×2", { type: "tone", tone: "blue", label: "Card" }, "€14"],
  ["16:14", "Sale", "Adult", { type: "tone", tone: "blue", label: "Card" }, "€10"],
  ["16:40", "Refund", "Adult (rain)", { type: "tone", tone: "slate", label: "—" }, { negative: true, label: "−€10" }],
  ["17:05", "Sale", "Adult ×5", { type: "tone", tone: "blue", label: "Card" }, "€50"],
];

// Controller validations queue
export const RECENT_VALIDATIONS = [
  { id: "#BK-10428", sub: "Central · CE-89", state: "valid" },
  { id: "#TK-55120", sub: "Entry · Adult", state: "valid" },
  { id: "#BK-10421", sub: "Central · CE-101", state: "valid" },
  { id: "#BK-10402", sub: "Central · CE-92", state: "used" },
  { id: "#TK-55119", sub: "Entry · Resident", state: "valid" },
  { id: "#BK-10310", sub: "Bestbuy · BE-14", state: "used" },
  { id: "#TK-55118", sub: "Entry · Senior", state: "valid" },
  { id: "#BK-10425", sub: "Akanthus · AK-08", state: "valid" },
  { id: "#BK-10427", sub: "Macaw · MC-04", state: "valid" },
  { id: "#TK-55101", sub: "Entry · Child", state: "valid" },
  { id: "#BK-10288", sub: "Akanthus · AK-31", state: "used" },
  { id: "#TK-54988", sub: "Entry · Resident ×2", state: "valid" },
];

// Accountant invoicing docs (tenant-wide)
export const ACCOUNTANT_DOCS = [
  { d: "ΑΠΥ-2026-004281", t: "ΑΠΥ", mark: "400001020304002281", amt: "€30", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004280", t: "ΑΠΥ", mark: "400001020304002280", amt: "€25", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004279", t: "ΑΠΥ", mark: "400001020304002279", amt: "€44", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004278", t: "ΑΠΥ", mark: "400001020304002278", amt: "€18", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004277", t: "ΑΠΥ", mark: "400001020304002277", amt: "€35", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΑΠΥ-2026-004276", t: "ΑΠΥ", mark: "400001020304002276", amt: "€15", st: "MyDATA ✓", type: "issued", date: "19 Jul" },
  { d: "ΤΠΥ-2026-000118", t: "ΤΠΥ", mark: "400001020304000118", amt: "€120", st: "MyDATA ✓", type: "issued", date: "18 Jul" },
  { d: "ΑΠΥ-2026-004210", t: "ΑΠΥ", mark: "400001020304002210", amt: "€28", st: "MyDATA ✓", type: "issued", date: "16 Jul" },
  { d: "ΤΠΥ-2026-000117", t: "ΤΠΥ", mark: "400001020304000117", amt: "€240", st: "MyDATA ✓", type: "issued", date: "15 Jul" },
  { d: "ΑΠΥ-2026-004102", t: "ΑΠΥ", mark: "400001020304002102", amt: "€25", st: "MyDATA ✓", type: "issued", date: "12 Jul" },
  { d: "ΑΠΥ-2026-004044", t: "ΑΠΥ", mark: "400001020304004044", amt: "€43", st: "MyDATA ✓", type: "issued", date: "12 Jul" },
  { d: "ΑΠΥ-2026-003988", t: "ΑΠΥ", mark: "400001020304003988", amt: "€30", st: "MyDATA ✓", type: "issued", date: "06 Jul" },
  { d: "ΑΠΥ-2026-003901", t: "ΑΠΥ", mark: "400001020304003901", amt: "€18", st: "Retry queue", type: "issued", date: "06 Jul" },
  { d: "ΑΚΥ-2026-000044", t: "Cancellation", mark: "400001020304000044", amt: "−€30", st: "Issued", type: "cancelled", date: "18 Jul" },
  { d: "ΑΚΥ-2026-000043", t: "Cancellation", mark: "400001020304000043", amt: "−€35", st: "Issued", type: "cancelled", date: "08 Jul" },
  { d: "ΑΚΥ-2026-000042", t: "Cancellation", mark: "400001020304000042", amt: "−€25", st: "Issued", type: "cancelled", date: "06 Jul" },
  { d: "ΑΚΥ-2026-000041", t: "Cancellation", mark: "400001020304000041", amt: "−€22", st: "Issued", type: "cancelled", date: "01 Jul" },
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
  { name: "Kavouri Coast", subdomain: "kavouri.slaice.app", stripe: { tone: "green", label: "charges ✓" }, modules: ["Booking", "Ticket", "Invoice", "Pay"], status: { tone: "green", label: "Live" }, mrr: "€2.8k" },
  { name: "Sun & Sea Paros", subdomain: "sunseaparos.slaice.app", stripe: { tone: "green", label: "charges ✓" }, modules: ["Booking", "Ticket", "Invoice", "Pay"], status: { tone: "green", label: "Live" }, mrr: "€3.1k" },
  { name: "Blue Lagoon Beach", subdomain: "bluelagoon.slaice.app", stripe: { tone: "green", label: "charges ✓" }, modules: ["Booking", "Ticket", "Pay"], status: { tone: "green", label: "Live" }, mrr: "€1.9k" },
  { name: "Naxos Sands", subdomain: "naxossands.slaice.app", stripe: { tone: "green", label: "charges ✓" }, modules: ["Booking", "Invoice", "Pay"], status: { tone: "green", label: "Live" }, mrr: "€2.2k" },
  { name: "Glyfada Bay", subdomain: "glyfada.slaice.app", stripe: { tone: "amber", label: "KYC review" }, modules: ["Booking", "Ticket"], status: { tone: "amber", label: "Setup" }, mrr: "—" },
  { name: "Demo Beach #2", subdomain: "beach2.slaice.app", stripe: { tone: "amber", label: "onboarding" }, modules: ["Booking"], status: { tone: "amber", label: "Setup" }, mrr: "—" },
  { name: "Mykonos Shore", subdomain: "mykonosshore.slaice.app", stripe: { tone: "amber", label: "KYC review" }, modules: ["Booking", "Ticket"], status: { tone: "amber", label: "Setup" }, mrr: "—" },
  { name: "Rhodes Bay Club", subdomain: "rhodesbay.slaice.app", stripe: { tone: "amber", label: "onboarding" }, modules: ["Booking"], status: { tone: "amber", label: "Setup" }, mrr: "—" },
  { name: "Paralia Sun", subdomain: "paraliasun.slaice.app", stripe: { tone: "slate", label: "pending" }, modules: [], status: { tone: "slate", label: "Lead" }, mrr: "—" },
  { name: "Saronida Beach", subdomain: "saronida.slaice.app", stripe: { tone: "slate", label: "pending" }, modules: [], status: { tone: "slate", label: "Lead" }, mrr: "—" },
  { name: "Vouliagmeni Cove", subdomain: "vouliagmeni.slaice.app", stripe: { tone: "slate", label: "pending" }, modules: [], status: { tone: "slate", label: "Lead" }, mrr: "—" },
];

// Top customers (revenue/visits) — used by Reporting/Customers tab
export const TOP_CUSTOMERS = [
  { name: "Despina K.", segment: { tone: "amber", label: "VIP" }, visits: 33, spend: "€1,480" },
  { name: "Elena V.", segment: { tone: "amber", label: "VIP" }, visits: 28, spend: "€1,240" },
  { name: "Yiannis A.", segment: { tone: "amber", label: "VIP" }, visits: 25, spend: "€1,010" },
  { name: "Kostas L.", segment: { tone: "amber", label: "VIP" }, visits: 21, spend: "€890" },
  { name: "Stelios V.", segment: { tone: "blue", label: "Season" }, visits: 19, spend: "€760" },
  { name: "Andreas M.", segment: { tone: "blue", label: "Season" }, visits: 18, spend: "€720" },
  { name: "Christina R.", segment: { tone: "blue", label: "Season" }, visits: 16, spend: "€612" },
  { name: "Dimitris A.", segment: { tone: "slate", label: "Regular" }, visits: 14, spend: "€560" },
  { name: "Alexis T.", segment: { tone: "blue", label: "Season" }, visits: 13, spend: "€470" },
  { name: "Maria K.", segment: { tone: "blue", label: "Season" }, visits: 12, spend: "€384" },
  { name: "Roula S.", segment: { tone: "slate", label: "Regular" }, visits: 10, spend: "€322" },
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
  ["#TX-88204", "Sunbed", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€25"],
  ["#TX-88203", "Ticket", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€25"],
  ["#TX-88202", "Sunbed", { tone: "amber", label: "Walk-in" }, { tone: "green", label: "Paid" }, "€30"],
  ["#TX-88201", "Locker", { tone: "amber", label: "Cashier" }, { tone: "green", label: "Paid" }, "€5"],
  ["#TX-88200", "Sunbed", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€18"],
  ["#TX-88199", "Parking", { tone: "blue", label: "Online" }, { tone: "green", label: "Paid" }, "€15"],
  ["#TX-88198", "Ticket", { tone: "amber", label: "Cashier" }, { tone: "green", label: "Paid" }, "€12"],
  ["#TX-88154", "Sunbed", { tone: "blue", label: "Online" }, { tone: "red", label: "Refunded" }, "−€22"],
  ["#TX-88102", "Sunbed", { tone: "blue", label: "Online" }, { tone: "red", label: "Refunded" }, "−€28"],
  ["#TX-88051", "Sunbed", { tone: "blue", label: "Online" }, { tone: "red", label: "Refunded" }, "−€35"],
];

// Reporting · Tickets tab
export const REPORTING_TICKETS = [
  ["#TK-55122", "Resident ×3", "Customer", "19 Jul", "Regular", "€18", { tone: "green", label: "Valid" }],
  ["#TK-55121", "Adult", "Controller", "19 Jul", "Walk-in", "€10", { tone: "green", label: "Valid" }],
  ["#TK-55120", "Adult ×2", "Customer", "19 Jul", "VIP", "€20", { tone: "green", label: "Valid" }],
  ["#TK-55119", "Resident", "Cashier", "19 Jul", "Regular", "€6", { tone: "slate", label: "Used" }],
  ["#TK-55118", "Senior", "Customer", "19 Jul", "Regular", "€7", { tone: "green", label: "Valid" }],
  ["#TK-55115", "Senior", "Cashier", "18 Jul", "Regular", "€7", { tone: "slate", label: "Used" }],
  ["#TK-55101", "Child", "Customer", "18 Jul", "New", "€5", { tone: "green", label: "Valid" }],
  ["#TK-55090", "Adult ×2", "Customer", "17 Jul", "VIP", "€20", { tone: "green", label: "Valid" }],
  ["#TK-55052", "Adult ×4", "Customer", "12 Jul", "Regular", "€40", { tone: "slate", label: "Used" }],
  ["#TK-54988", "Resident ×2", "Cashier", "06 Jul", "Regular", "€12", { tone: "slate", label: "Used" }],
  ["#TK-54977", "Adult", "Customer", "06 Jul", "VIP", "€10", { tone: "slate", label: "Used" }],
  ["#TK-54920", "Senior ×2", "Cashier", "29 Jun", "Regular", "€14", { tone: "slate", label: "Used" }],
  ["#TK-54888", "Child ×2", "Customer", "28 Jun", "New", "€10", { tone: "slate", label: "Used" }],
  ["#TK-54810", "Adult ×3", "Customer", "22 Jun", "Season", "€30", { tone: "slate", label: "Used" }],
];

// Reporting · Daily ops tab
export const DAILY_OPS = [
  ["Sunbed bookings", 214, "€6,420", "−€60", "€6,360"],
  ["Entry tickets", 512, "€4,180", "€0", "€4,180"],
  ["Day lockers", 38, "€190", "€0", "€190"],
  ["Parking", 27, "€405", "€0", "€405"],
  ["Bundles & extras", 64, "€512", "−€16", "€496"],
  ["Season passes", 9, "€1,080", "€0", "€1,080"],
];

// Cashier register session statistics
export const CASHIER_SESSION = { id: "#CS-204", cashier: "Kostas L.", openedAt: "09:14", duration: "4h 22m", cashIn: "€1,240", cardIn: "€3,860" };

// Past closed sessions — surfaced before a new session is opened, so the
// cashier can see what a typical day looks like instead of an empty card.
export const CASHIER_PAST_SESSIONS = [
  { id: "#CS-203", cashier: "Kostas L.", date: "Yesterday", duration: "8h 06m", cash: "€1,820", card: "€5,940", tx: 312, status: "Closed" },
  { id: "#CS-202", cashier: "Eleni S.",  date: "Yesterday", duration: "7h 48m", cash: "€1,440", card: "€5,210", tx: 268, status: "Closed" },
  { id: "#CS-201", cashier: "Kostas L.", date: "Mon",        duration: "8h 12m", cash: "€2,010", card: "€6,420", tx: 354, status: "Closed" },
  { id: "#CS-200", cashier: "Maria T.",  date: "Sun",        duration: "9h 02m", cash: "€2,540", card: "€7,180", tx: 401, status: "Closed" },
  { id: "#CS-199", cashier: "Eleni S.",  date: "Sat",        duration: "9h 35m", cash: "€2,720", card: "€7,840", tx: 432, status: "Closed" },
  { id: "#CS-198", cashier: "Kostas L.", date: "Fri",        duration: "8h 20m", cash: "€1,910", card: "€6,040", tx: 338, status: "Closed" },
  { id: "#CS-197", cashier: "Maria T.",  date: "Thu",        duration: "7h 55m", cash: "€1,520", card: "€5,380", tx: 281, status: "Closed" },
  { id: "#CS-196", cashier: "Eleni S.",  date: "Wed",        duration: "8h 02m", cash: "€1,760", card: "€5,610", tx: 296, status: "Closed" },
];

// Locker banks for the "Sell locker" view — each bank has 30 cells; the
// `taken` set lets us render which are unavailable today.
export const CASHIER_LOCKER_BANKS = [
  { id: "A", label: "Bank A · Entrance",       size: 30, taken: [1,2,5,6,9,12,14,18,21,22,25,28], price: 5 },
  { id: "B", label: "Bank B · Pool side",      size: 30, taken: [3,4,7,8,11,15,16,19,20,23,27,29,30], price: 5 },
  { id: "C", label: "Bank C · North gate",     size: 30, taken: [1,2,4,8,10,13,17,19,22,24,26], price: 5 },
  { id: "D", label: "Bank D · Family area",    size: 30, taken: [2,5,7,10,11,14,15,18,21,24,27,29], price: 7 },
  { id: "E", label: "Bank E · Premium",        size: 30, taken: [4,5,9,12,13,16,20,23,26], price: 9 },
];
