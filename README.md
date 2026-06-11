# Slaice — Platform Mockup

A modern, **non-functional but fully navigable** React mockup of the Slaice
multitenant SaaS platform, built for the beach use case (anchor tenant:
*Akti tou Iliou*, Alimos). It is designed to **demonstrate every feature and
user journey** from the RFP / financial model — both **MVP** and **Future** —
without any backend, database, or real payments. All data is sample data;
buttons that would trigger a backend show a demo toast.

The look & interactions follow the product video (aerial beach map, zone
zoom-in, coral sunbed selection, tenant-branded checkout) and the SLAiCE brand
deck ("Live Through Digital", indigo + gold).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
# or a production build:
npm run build && npm run preview
```

> Sign-in is a demo gate — magic link or SSO buttons sign you straight in.

## What's inside

**6 personas** (switch from the top-right): Customer, Manager/Admin (incl. Call
Agent), Cashier, Controller, Accountant, Platform/Slaice.

- **Customer** — Home, the hero **Sunbed Booking** flow (aerial map → zone
  zoom → multi-select → cross-sell → Stripe checkout → QR + MyDATA receipt),
  Entry Ticket (dynamic pricing + ΤΠΥ/B2B), Day Locker, Parking, My Bookings
  (QR), My Documents.
- **Manager/Admin** — Dashboard, Availability & Pricing (single/bulk), Map
  Layout Editor, Bookings, Manual/Phone booking, Users & Segments (tags),
  Reporting & Analytics (8 tabs), Refunds, Communicate.
- **Cashier** — Issue on-site ticket (print), Redeem, Cash Register, Sell Locker.
- **Controller** — Gate Validation (live QR scan sim, walk-ins).
- **Accountant** — e-Invoicing & MyDATA (ΑΠΥ/ΤΠΥ/cancellation/credit), Commission & Payouts.
- **Platform/Slaice** — Tenants, Stripe Connect **onboarding wizard**, Super
  Admin (capability flags + webhooks), Verticals, Landing page.

**Two demonstration tools** (bottom of every sidebar):

- **Feature Inventory** — all 91 RFP features, searchable & filterable by
  capability and MVP/Future, each linking to where it's demonstrated.
- **User Journeys** — all 25 end-to-end journeys with a step-by-step **player**
  that walks the steps and jumps you into the live screens.

## Tech

Vite · React 18 · Tailwind CSS. Dependency-free SVG charts, icons, QR and the
aerial beach illustration. On WebGL2-capable desktops the customer backdrop's
sea is a live three.js shader (lazy-loaded chunk; phones, reduced-motion and
unsupported GPUs keep the static SVG scene). Source of truth for the
feature/journey data lives in `src/data/` (derived from the RFP and financial
model).

```
src/
  data/        features (91), journeys (25), personas, beach/zones
  components/  ui kit, charts, beach map, brand, app shell
  screens/     one file per persona + checkout + explorer + auth
  routes.jsx   persona.page -> screen registry
  App.jsx      shell, routing, auth gate, shared cart, toasts
```

_Non-functional mockup · sample data only._
