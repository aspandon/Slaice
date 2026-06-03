// All 25 end-to-end user journeys from the "User Journeys" tab.
// Each step optionally deep-links to a screen via { go: [persona, page] }.

export const JOURNEYS = [
  {
    id: 1, persona: "customer", title: "Book a sunbed online", status: "MVP", source: "RFP + Mock-up + Live site",
    keyFeatures: [15, 21, 25, 23, 24, 18, 19, 51],
    steps: [
      { t: "Open the tenant site", go: ["customer", "home"] },
      { t: "Pick a date on the availability strip", go: ["customer", "book"], spotlight: "dates", tip: "Tap a date — beach map updates live." },
      { t: "Browse the beach map & zoom into a zone", go: ["customer", "book"], spotlight: "zones", tip: "Each pill shows free %, price and a hover preview." },
      { t: "Tap sunbeds (see ID / status / price) and add to selection", go: ["customer", "book"], spotlight: "quick-picks", tip: "Or use a quick-pick (couple · family · front row) to skip ahead." },
      { t: "Review cart + cross-sell (ticket, locker)", go: ["customer", "book"] },
      { t: "Pay via Stripe (hosted checkout)", go: ["customer", "checkout"] },
      { t: "Receive booking confirmation + QR by e-mail", go: ["customer", "mybookings"] },
      { t: "Auto-issued ΑΠΥ (MyDATA) e-mailed", go: ["customer", "mydocs"] },
    ],
  },
  {
    id: 2, persona: "customer", title: "Buy an entry ticket online", status: "MVP", source: "RFP",
    keyFeatures: [40, 41, 42, 51],
    steps: [
      { t: "Select ticket type/category per person (resident, age group)", go: ["customer", "ticket"] },
      { t: "Dynamic price by profile", go: ["customer", "ticket"] },
      { t: "Pay via Stripe", go: ["customer", "checkout"] },
      { t: "Receive confirmation + QR", go: ["customer", "mybookings"] },
      { t: "ΑΠΥ issued and e-mailed", go: ["customer", "mydocs"] },
    ],
  },
  {
    id: 3, persona: "customer", title: "Add ticket / extras during booking (cross-sell)", status: "MVP", source: "RFP",
    keyFeatures: [43, 76, 17],
    steps: [
      { t: "During sunbed checkout, add an entry ticket", go: ["customer", "book"] },
      { t: "(Future) add a locker to the same cart", go: ["customer", "book"] },
      { t: "Single combined payment", go: ["customer", "checkout"] },
    ],
  },
  {
    id: 4, persona: "customer", title: "View my bookings & documents", status: "MVP", source: "RFP",
    keyFeatures: [20, 19, 57],
    steps: [
      { t: "Sign in", go: ["customer", "home"] },
      { t: "Open 'My bookings' — QR, status, ID, zone, price, date", go: ["customer", "mybookings"] },
      { t: "Open invoice via public document URL", go: ["customer", "mydocs"] },
    ],
  },
  {
    id: 5, persona: "customer", title: "Entry to the beach (QR)", status: "MVP", source: "RFP + Mock-up",
    keyFeatures: [19, 36, 47],
    steps: [
      { t: "Arrive at gate, present QR (sunbed and/or ticket)", go: ["customer", "mybookings"] },
      { t: "Controller scans → real-time validation", go: ["controller", "scan"] },
      { t: "Admitted ✓", go: ["controller", "scan"] },
    ],
  },
  {
    id: 6, persona: "customer", title: "Buy a day locker", status: "Future", source: "RFP (Roadmap)",
    keyFeatures: [74, 76, 77],
    steps: [
      { t: "Select a day locker online (or add at checkout)", go: ["customer", "locker"] },
      { t: "Pay", go: ["customer", "checkout"] },
      { t: "Receive locker QR", go: ["customer", "mybookings"] },
      { t: "Redeem at entry", go: ["controller", "scan"] },
    ],
  },
  {
    id: 7, persona: "admin", title: "Configure beach map & layout", status: "MVP", source: "Mock-up + RFP",
    keyFeatures: [35, 2, 31],
    steps: [
      { t: "Open admin → 'Edit map layout'", go: ["admin", "map"] },
      { t: "Define background, zones and sunbed positions/codes", go: ["admin", "map"] },
      { t: "Publish to the customer-facing map", go: ["admin", "map"] },
    ],
  },
  {
    id: 8, persona: "admin", title: "Manage availability & pricing", status: "MVP", source: "RFP",
    keyFeatures: [28, 29],
    steps: [
      { t: "Open admin → update availability (single/bulk)", go: ["admin", "availability"] },
      { t: "Set prices per sunbed or in bulk", go: ["admin", "availability"] },
      { t: "Changes reflect live on the map", go: ["customer", "book"] },
    ],
  },
  {
    id: 9, persona: "admin", title: "Monitor bookings (dashboard)", status: "MVP", source: "RFP",
    keyFeatures: [30, 32, 31],
    steps: [
      { t: "Open dashboard → bookings overview by day/week/month/year", go: ["admin", "dashboard"] },
      { t: "Drill into the bookings list", go: ["admin", "bookings"] },
      { t: "See sunbed status on map", go: ["admin", "map"] },
    ],
  },
  {
    id: 10, persona: "admin", title: "Manual / phone booking", status: "MVP", source: "RFP",
    keyFeatures: [34, 33],
    steps: [
      { t: "Reserve/block a sunbed without payment", go: ["admin", "manual"] },
      { t: "Send QR to the customer (VIP/phone booking)", go: ["admin", "manual"] },
      { t: "Resend QR if needed", go: ["admin", "bookings"] },
    ],
  },
  {
    id: 11, persona: "admin", title: "Manage users & segments", status: "MVP", source: "RFP",
    keyFeatures: [8, 9, 10, 7],
    steps: [
      { t: "Open user list → search/filter tenant users", go: ["admin", "users"] },
      { t: "Apply tags (VIP, regulars, season pass)", go: ["admin", "users"] },
      { t: "Use interaction filter to view their activity", go: ["admin", "users"] },
    ],
  },
  {
    id: 12, persona: "admin", title: "Reporting & accounting export", status: "MVP", source: "RFP",
    keyFeatures: [62, 63, 64, 49, 69, 65],
    steps: [
      { t: "Open reporting → turnover totals by period", go: ["admin", "reporting"] },
      { t: "Transactions list with filters", go: ["admin", "reporting"] },
      { t: "Revenue by capability + ticket/refund history", go: ["admin", "reporting"] },
      { t: "Export CSV", go: ["admin", "reporting"] },
    ],
  },
  {
    id: 13, persona: "admin", title: "Process a refund", status: "MVP", source: "RFP + Stripe/MyDATA",
    keyFeatures: [66, 67, 68, 56],
    steps: [
      { t: "Open transaction → issue partial/full refund via Stripe", go: ["admin", "refunds"] },
      { t: "Record reason", go: ["admin", "refunds"] },
      { t: "Status auto-updates + customer e-mailed", go: ["admin", "refunds"] },
      { t: "Credit/cancellation document issued", go: ["accountant", "invoicing"] },
    ],
  },
  {
    id: 14, persona: "admin", title: "Communicate with users / send offers", status: "Future", source: "RFP (Roadmap)",
    keyFeatures: [11, 9],
    steps: [
      { t: "Select a user or segment", go: ["admin", "communicate"] },
      { t: "Send notifications/offers through platform tools", go: ["admin", "communicate"] },
    ],
  },
  {
    id: 15, persona: "cashier", title: "Issue an on-site ticket", status: "MVP", source: "RFP",
    keyFeatures: [44, 45, 46],
    steps: [
      { t: "Open cashier tool → set ticket parameters per person", go: ["cashier", "issue"] },
      { t: "Issue anonymous ticket", go: ["cashier", "issue"] },
      { t: "Print on the spot", go: ["cashier", "issue"] },
      { t: "Redeem at entry", go: ["cashier", "redeem"] },
    ],
  },
  {
    id: 16, persona: "cashier", title: "On-site sale with payment", status: "MVP", source: "RFP",
    keyFeatures: [48, 42],
    steps: [
      { t: "Add ticket on the spot", go: ["cashier", "issue"] },
      { t: "Take payment via Stripe (or cash)", go: ["cashier", "issue"] },
      { t: "Issue document", go: ["accountant", "invoicing"] },
    ],
  },
  {
    id: 17, persona: "cashier", title: "Cash register session", status: "Future", source: "RFP (Roadmap)",
    keyFeatures: [70, 71, 72, 73],
    steps: [
      { t: "Open session (duration, cashier)", go: ["cashier", "register"] },
      { t: "Record cash handover/receipt", go: ["cashier", "register"] },
      { t: "Close session → review per-session statistics", go: ["cashier", "register"] },
      { t: "Export CSV", go: ["cashier", "register"] },
    ],
  },
  {
    id: 18, persona: "cashier", title: "Sell a day locker", status: "Future", source: "RFP (Roadmap)",
    keyFeatures: [75, 78, 77],
    steps: [
      { t: "Sell a day locker at the desk", go: ["cashier", "locker"] },
      { t: "Mark in inventory", go: ["cashier", "locker"] },
      { t: "Customer redeems at entry", go: ["controller", "scan"] },
    ],
  },
  {
    id: 19, persona: "controller", title: "Validate entry at the gate", status: "MVP", source: "RFP + Mock-up",
    keyFeatures: [36, 47, 39],
    steps: [
      { t: "Scan booking/ticket QR from browser", go: ["controller", "scan"], spotlight: "scanner", tip: "Tap Scan QR — a live feed pulses the scanline." },
      { t: "Real-time verification", go: ["controller", "scan"], spotlight: "scanner" },
      { t: "See status (free/blocked/booked, valid/used) → admit", go: ["controller", "scan"] },
    ],
  },
  {
    id: 20, persona: "controller", title: "Handle walk-ins", status: "MVP", source: "RFP",
    keyFeatures: [37, 38, 48],
    steps: [
      { t: "Block a sunbed and create a walk-in booking", go: ["controller", "scan"] },
      { t: "Optionally take on-site payment", go: ["controller", "scan"] },
      { t: "Open same-day availability online", go: ["controller", "scan"] },
    ],
  },
  {
    id: 21, persona: "controller", title: "Add ticket / locker at control", status: "MVP", source: "RFP",
    keyFeatures: [48, 77],
    steps: [
      { t: "Add a ticket on the spot during control", go: ["controller", "scan"], spotlight: "walkins", tip: "Use the Walk-ins & on-the-spot panel to add tickets." },
      { t: "Pay on site via Stripe", go: ["controller", "scan"], spotlight: "walkins", tip: "Charge via Stripe Terminal — handled in the same panel." },
      { t: "(Future) redeem locker at entry", go: ["controller", "scan"], spotlight: "walkins" },
    ],
  },
  {
    id: 22, persona: "accountant", title: "e-Invoicing & MyDATA compliance", status: "MVP", source: "RFP + Stripe/MyDATA",
    keyFeatures: [51, 52, 53, 55, 56, 58],
    steps: [
      { t: "Each transaction auto-issues ΑΠΥ (or ΤΠΥ on demand)", go: ["accountant", "invoicing"] },
      { t: "Transmitted to MyDATA → MARK stored", go: ["accountant", "invoicing"] },
      { t: "PDF + MARK e-mailed", go: ["accountant", "invoicing"] },
      { t: "Cancellations/credits as needed", go: ["accountant", "invoicing"] },
      { t: "Invoice history + CSV", go: ["accountant", "invoicing"] },
    ],
  },
  {
    id: 23, persona: "platform", title: "Onboard a new tenant (beach)", status: "MVP", source: "RFP + Stripe/MyDATA",
    keyFeatures: [1, 2, 59, 35],
    steps: [
      { t: "Create tenant", go: ["platform", "onboarding"] },
      { t: "Assign subdomain, roles, pricing, config", go: ["platform", "onboarding"] },
      { t: "Connect Stripe (Connect Standard, verify charges_enabled)", go: ["platform", "onboarding"] },
      { t: "Configure map/zones", go: ["admin", "map"] },
      { t: "Go live", go: ["platform", "tenants"] },
    ],
  },
  {
    id: 24, persona: "platform", title: "Self-service corporate onboarding", status: "Future", source: "RFP (Roadmap)",
    keyFeatures: [5, 6, 80, 81],
    steps: [
      { t: "New corporate client self-configures logo, colours, layout", go: ["platform", "onboarding"] },
      { t: "Enabled services and payment settings via wizard", go: ["platform", "onboarding"] },
      { t: "Tenant ready without dev work", go: ["platform", "superadmin"] },
    ],
  },
  {
    id: 25, persona: "platform", title: "Launch a new vertical (theatre/events/retail)", status: "Future", source: "RFP + Slaice deck",
    keyFeatures: [83, 82, 84, 85, 86, 87],
    steps: [
      { t: "Reuse generic inventory + payments + e-invoice + catalogue", go: ["platform", "verticals"] },
      { t: "Configure the new vertical (seats/products)", go: ["platform", "verticals"] },
      { t: "Enable modules per tenant", go: ["platform", "superadmin"] },
    ],
  },
];

export const journeyCounts = {
  total: JOURNEYS.length,
  mvp: JOURNEYS.filter((j) => j.status === "MVP").length,
  future: JOURNEYS.filter((j) => j.status === "Future").length,
};
