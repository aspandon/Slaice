# Slaice — Platform Mockup

A **front-end-only, fully navigable** React mockup of **Slaice** (_SLAiCE — "Live Through
Digital"_), a multi-tenant SaaS platform whose first vertical is organised beaches. Beach operators
are tenants; their guests book sunbeds, entry tickets, day lockers and parking on a live, illustrated
beach, pay online and get in with a QR code. The anchor tenant throughout is **Akti tou Iliou**
(Alimos, Greece).

Every persona is covered — Customer, Manager/Admin, Cashier, Controller, Accountant and the Slaice
platform team — across both **MVP** and **Future** (roadmap 2027–2029) features. There is **no
backend, database, real payment or real messaging**: all data is deterministic sample data, and
actions that would call a server show a demo toast or a simulated multi-step flow.

- **Live stage:** <https://aspandon.github.io/Slaice/> (e.g. `#/customer/home`). It sits behind a
  site gate; ask the project owner for access.
- **Full specification:** [`project_description 29 Sept.md`](project_description%2029%20Sept.md) —
  every journey, business rule, data shape and design token. It is the source of truth: if this
  README disagrees with it, the spec wins.
- **UX backlog:** [`UX_REVIEW.md`](UX_REVIEW.md) — review findings and their current status.
- **Agent instructions:** [`CLAUDE.md`](CLAUDE.md).

## Run it

Requires Node.js (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
```

> **Getting in.** Locally the app opens behind the same **site gate** as the stage site (one fixed
> e-mail + password, held by the project owner). After it, the product's own demo sign-in accepts any
> e-mail or SSO button. Both are demo scaffolding, not product requirements.

| Script                            | What it does                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server on port 5173 (`--host`, so a phone on your network can open it) |
| `npm run typecheck`               | `tsc --noEmit` against the strict TypeScript config                             |
| `npm run lint`                    | ESLint 9 — typescript-eslint, react-hooks, jsx-a11y                             |
| `npm run build`                   | Production build into **`docs/`** (see [Deployment](#deployment))               |
| `npm run preview`                 | Serve the built `docs/` on port 4173                                            |
| `npm run format` / `format:check` | Prettier write / check                                                          |
| `npm run i18n`                    | Machine-translate new UI strings into `src/locales/*.json`                      |

`npm run build` overwrites the committed `docs/` folder, which CI regenerates on every push to
`main`. For a local build you don't mean to commit, use `npm run build -- --outDir dist` (git-ignored)
and serve it with `npx vite preview --outDir dist`.

## What's inside

Six personas share one app. Every screen has a hash route, `#/<persona>/<page>`: deep links work,
refresh keeps your place and Back/Forward move between screens. Switch persona with the **Demo** pill
(bottom-right on customer pages) or the persona chip at the right of the staff top bar. That switcher is
a demo affordance; in production the role comes from sign-in.

| Persona                                | Routes              | Screens                                                                                                                                                                                                                            |
| -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer**                           | `#/customer/…`      | Home · **Plan my visit** (booking wizard) · Checkout · Confirmation · My Bookings · My Documents · VIP Pass and Season Pass purchase — plus account settings, Privacy Centre, change password and 2FA                              |
| **Manager / Admin** (incl. Call Agent) | `#/admin/…`         | **MVP:** Dashboard · Availability & Pricing · Map Layout Editor · Bookings · Manual/Phone Booking · Users & Segments · Reporting & Analytics · Refunds · Privacy & GDPR. **Future:** Communicate · Loyalty · Passes · Gamification |
| **Cashier**                            | `#/cashier/…`       | **MVP:** Issue Ticket · Redeem Ticket. **Future:** Cash Register · Sell Locker                                                                                                                                                     |
| **Controller**                         | `#/controller/scan` | Gate Validation — QR scan simulation, walk-ins, pay-on-site tickets, same-day release                                                                                                                                              |
| **Accountant**                         | `#/accountant/…`    | e-Invoicing & myDATA · Commission & Payouts                                                                                                                                                                                        |
| **Platform / Slaice**                  | `#/platform/…`      | **MVP:** Tenants · Tenant Onboarding (Stripe Connect KYC) · Compliance & DPA. **Future:** Super Admin (capability flags, webhook health) · Verticals · Landing Page                                                                |

Future screens carry an orange dot in the navigation and a _"Preview · Roadmap 2027–2029"_ banner.
The complete route list is in spec §6.

### The core journey

1. **Home** — a live _"N sunbeds free today · from €18"_ hero, the weekend offer, _Rebook your
   usual_, rewards, badges and the VIP / Season pass cards.
2. **Plan my visit** — an immersive wizard over the live beach: **Beach** (dates, up to 7 days; a
   zone; then exact umbrella sets tapped on the sand) → **Guests** (entry tickets by category) →
   **Locker** → **Parking Spot** (with plates) → **Review**, with a running total.
3. **Checkout** — basket with undo and swipe-to-delete, optional VIP credit / Season pass, and a
   simulated, tenant-branded Stripe checkout.
4. **Confirmation** — booking reference, QR, Apple / Google Wallet pass, calendar invite (`.ics`) and
   the receipt in My Documents.

What the admin publishes reaches the customer: each zone's sunbed layout, zone logos, the beach
background, pass pricing, loyalty schemes, badges and the scene's weather and time of day. A few
admin settings don't reach the customer yet — pricing rules, zone-map positions, zone open/closed,
wallet card designs and capability flags (spec §18.3 and §22).

### Demo-only affordances

These keep the prototype explorable and are not product requirements (spec §21): the site gate,
"any input signs you in", the persona switcher, the scene demo panel (weather + time of day,
bottom-left on Home), **Simulate successful payment**, **Show platform economics** at checkout, the
pass **Reset** buttons, random gate-scan results, faux (non-scannable) QR codes and unsigned wallet
passes.

## Tech stack

| Area              | Choice                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build             | Vite 5 — relative base `./`, output to `docs/`, targets Chrome/Edge 88, Firefox 78, Safari 14                                                                                                                 |
| UI                | React 18.3 + TypeScript 5 (`strict`)                                                                                                                                                                          |
| Styling           | Tailwind CSS 3.4 — tokens in `tailwind.config.js`; glass materials, skeleton, focus ring and safe-area utilities in `src/index.css`                                                                           |
| Primitives        | Radix UI DropdownMenu and Popover (menus, basket, notifications); in-house `Modal`, `Sheet`, `Tabs` and `Toggle`, with their own focus management                                                             |
| Forms             | React Hook Form + Zod (product sign-in, site gate)                                                                                                                                                            |
| Motion            | GSAP + Flip for choreography, CSS keyframes for the rest — all gated by `prefers-reduced-motion`                                                                                                              |
| Canvas and 3D     | Konva (sunbed layout editor) and three.js (live WebGL2 sea), both lazy-loaded; the sea falls back to SVG without WebGL2 or under reduced motion                                                               |
| Charts, QR, files | Hand-rolled SVG charts; deterministic faux QR; in-house CSV, PDF, ZIP, `.ics` and unsigned Apple `.pkpass` generators                                                                                         |
| Routing and state | Custom hash router (`src/app/router.ts`); one React context (`src/app/store.tsx`) persisted to `localStorage["slaice.v1"]`                                                                                    |
| i18n              | `t("English text")` + generated JSON dictionaries — English source plus Greek, German, French, Spanish and Italian (machine-translated). The customer surface is translated; staff screens are mostly English |
| Icons             | lucide-react through a registry in `src/lib/icons.tsx`                                                                                                                                                        |

## Project structure

```
src/
  main.tsx               entry: SiteGate → App; reload once on a stale chunk
  App.tsx                shell, global state + persistence, hash sync, layout per persona
  routes.tsx             "persona.page" → screen registry, per-persona fallback
  app/                   store (AppContext, useApp, useT), router, i18n
  api/index.ts           data-access seam (sample data + simulated latency)
  domain/                shared types; prices, fees and the pricing-rule engine
  data/                  seed data: zones & scene, mock records, personas + nav, passes, loyalty,
                         gamification, channels, pricing rules, card designs, GDPR, backgrounds
  components/
    ui/                  design-system kit: buttons, badges, cards, tables, forms, overlays, tabs
    Shell/               top bar, sidebar / bottom tab bar / nav sheet, persona switcher, footer, toasts
    *.tsx                beach scene + sunbed glyphs, live sea, weather FX, sand vignettes, pass cards
                         + designer, wallet pass, privacy centre, security, consent banner, charts
  screens/
    customer/            Home, My Bookings, My Documents
    CustomerWizard.tsx   "Plan my visit" booking wizard
    Checkout.tsx         checkout + confirmation
    PassPurchase.tsx     VIP / Season pass purchase
    auth.tsx             product sign-in
    SiteGate.tsx         stage access gate (demo)
    admin.tsx            all 13 Manager/Admin screens
    cashier.tsx, controller.tsx, accountant.tsx, platform.tsx
  lib/                   icons, motion, GSAP helpers, downloads (CSV/PDF/ZIP/ICS), wallet, image, useAsync
  locales/               el, de, fr, es, it dictionaries (generated by `npm run i18n`)
scripts/i18n.mjs         dictionary generator
docs/                    built site served by GitHub Pages — generated by CI, don't edit by hand
```

## Deployment

GitHub Pages serves the committed `docs/` folder. On every push to `main`,
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci` → typecheck → lint →
build and commits the rebuilt `docs/` back to the branch. The relative Vite base lets the same build
work under the `/Slaice/` sub-path and at a root domain.

## Quality and known limitations

- CI enforces typecheck and lint; the jsx-a11y interaction rules are errors. Prettier is configured
  but not enforced in CI.
- There are no automated tests yet.
- The main app chunk is about 660 kB (≈195 kB gzip), and Vite warns about chunks over 500 kB. Only the
  Konva editor and the three.js sea are code-split, and `admin.tsx` holds all 13 admin screens.
- `@radix-ui/react-dialog`, `-switch`, `-tabs`, `-tooltip` and `-visually-hidden` are installed but not
  imported anywhere.
- Some admin settings don't reach the customer yet and a few flows stop short (for example, the Home
  promo opens the wizard without applying its discount). The full list is spec §22; UX issues are
  tracked in [`UX_REVIEW.md`](UX_REVIEW.md).

_Non-functional mockup · sample data only._
