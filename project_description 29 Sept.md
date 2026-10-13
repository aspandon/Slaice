# Slaice — Project Description

> **Purpose of this document.** This is the single, self-contained specification of the Slaice
> product _as it exists today_ (a front-end-only, fully navigable mockup). It is written so that an
> AI agent — or a team of agents working in parallel — can understand what Slaice is, who uses it,
> every user journey, every capability, the data the UI works with, the business rules, and the
> design system, and can **recreate the front end faithfully**.
>
> Scope: **front end only.** The backend has not been designed yet; nothing here proposes an API or
> server design. Where the UI _imitates_ a backend (payments, e-invoicing, messaging), this document
> says what the UI shows and flags it as demo behaviour.

---

## Table of contents

0. [How to read this document](#0-how-to-read-this-document)
1. [Product summary](#1-product-summary)
2. [Glossary](#2-glossary)
3. [Current state, environments and access](#3-current-state-environments-and-access)
4. [Multi-tenancy as expressed in the UI](#4-multi-tenancy-as-expressed-in-the-ui)
5. [Personas and roles](#5-personas-and-roles)
6. [Information architecture and routes](#6-information-architecture-and-routes)
7. [Global shell and cross-cutting features](#7-global-shell-and-cross-cutting-features)
8. [User journeys — Customer](#8-user-journeys--customer)
9. [User journeys — Manager / Admin](#9-user-journeys--manager--admin)
10. [User journeys — Cashier](#10-user-journeys--cashier)
11. [User journeys — Controller](#11-user-journeys--controller)
12. [User journeys — Accountant](#12-user-journeys--accountant)
13. [User journeys — Platform / Slaice (super admin)](#13-user-journeys--platform--slaice-super-admin)
14. [Cross-persona end-to-end journeys](#14-cross-persona-end-to-end-journeys)
15. [Capability catalogue](#15-capability-catalogue)
16. [Data model used by the front end](#16-data-model-used-by-the-front-end)
17. [Business rules and calculations](#17-business-rules-and-calculations)
18. [State, persistence and cross-screen wiring](#18-state-persistence-and-cross-screen-wiring)
19. [Architecture and tech stack](#19-architecture-and-tech-stack)
20. [Design system](#20-design-system)
21. [Demo-only features (do not treat as requirements)](#21-demo-only-features-do-not-treat-as-requirements)
22. [Known gaps and inconsistencies](#22-known-gaps-and-inconsistencies)
23. [Recreation guide for an agent team](#23-recreation-guide-for-an-agent-team)
24. [Appendix — seed data](#24-appendix--seed-data)

---

## 0. How to read this document

### Status tags

Every capability, screen and journey step carries one or more tags:

| Tag          | Meaning                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[MVP]**    | Part of the first release. The app shows an "MVP" badge on these nav items.                                                                                                |
| **[Future]** | Roadmap 2027–2029. Fully clickable in the mockup, not in the MVP. The app shows a "Future" badge / orange dot and a "Preview · Roadmap 2027–2029" banner on these screens. |
| **[DEMO]**   | Mockup scaffolding only. Exists to make the prototype explorable. **Not a product requirement.** See §21.                                                                  |
| **[GAP]**    | A known inconsistency between what the UI implies and what it does. The intended behaviour is described. See §22.                                                          |

### Conventions

- Prices are in **euros (€)**, VAT-inclusive, as the customer sees them.
- Dates in the seed data sit in the **2026 summer season** (season ends **30 Sep 2026**).
- Routes are hash routes of the form `#/<persona>/<page>` (see §6).
- File paths refer to this repository (e.g. `src/screens/CustomerWizard.tsx`).
- "Set" / "umbrella set" = **1 umbrella + 2 sunbeds**; one set seats 2 people. Sunbed IDs such as
  `CE-01` identify a _set_.

### Journey maps

Every journey in §8–§13 opens with a **journey map**: a plain-text drawing of its screens and steps,
so the flow can be read at a glance before the detail below it. Cross-persona journeys in §14 are
drawn as **swimlanes** (one row per persona, time running left to right). Figures in the maps
(prices, counts, IDs) are the seed data from §24.

```text
┌─ Title ──────┐  a screen, panel or modal         ──▶  ▼    the next step
│ content      │                                   ◆          a decision or choice
└──────────────┘                                   ●          an outcome / end state
[Button]          something the user taps          ✓  ✗       success / failure
(1)━━━(2)┄┄┄(3)   a stepper: done ━━━, ahead ┄┄┄   o  x  #    sunbed set: free / taken / yours
[DEMO] [GAP]      status tags, as defined above    C-03       another journey in this document
```

### Suggested reading order

- **Product / UX agent:** §1 → §2 → §5 → §8–§14 → §15.
- **Front-end engineer agent:** §1 → §6 → §7 → §16 → §17 → §18 → §19 → §20 → §23.
- **Designer agent:** §1 → §5 → §20 → §8 (Customer) → §9 (Admin map editor).
- **QA agent:** §8–§14 (journeys as test scripts) → §17 (rules as assertions) → §22.

---

## 1. Product summary

**Slaice** ("SLAiCE", tagline _"Live Through Digital"_, positioned as _"Digital Business Capability
as-a-service"_) is a **multi-tenant SaaS platform**. Its first vertical is **organised beaches**:
Slaice registers beach operators as **tenants**, and each tenant gets a branded booking site where
**end customers** can book sunbeds (umbrella sets), entry tickets, day lockers and parking, pay online,
and get in with a QR code.

The anchor tenant used throughout the mockup is **Akti tou Iliou** ("Ακτή του Ηλίου"), a beach in
**Alimos, Greece**, served at `aktitouiliou.slaice.app`.

What the platform covers end to end:

1. **Customer booking.** A guided "Plan my visit" wizard on an illustrated, live beach: pick dates, zone,
   exact sets, guests, locker, parking → basket → Stripe checkout → QR, wallet pass, calendar invite,
   receipt.
2. **Tenant operations.** Managers configure availability, prices, seasonal pricing rules, the beach
   map and sunbed layout, and handle bookings, manual/phone bookings, customers and segments, refunds,
   GDPR requests, campaigns, loyalty, passes and gamification.
3. **On-site operations.** Cashiers sell anonymous tickets and lockers and run cash-register sessions.
   Controllers validate QR codes at the gate and handle walk-ins.
4. **Finance and compliance.** Greek e-invoicing (**myDATA / AADE**: ΑΠΥ, ΤΠΥ, cancellations, credit
   notes), commission and payouts through **Stripe Connect**, VAT reporting, GDPR tooling.
5. **Platform administration (Slaice staff = super admin).** Tenant list and SaaS metrics, tenant
   onboarding with Stripe Connect KYC, per-tenant capability flags, webhook health, compliance and DPA
   posture, breach workflow, future verticals, marketing landing page.

**Business model shown in the UI:** Stripe Connect **direct charges** on the tenant's account plus a
**5% Slaice application fee**; Stripe processing is modelled at **~1.5%**. Tenants also pay a monthly
subscription (tenants show an **MRR** figure).

**Future verticals** (Platform → Verticals): Theatre/Cinema, Events/Concerts and Retail, reusing the
same capability modules (inventory, payments, catalogue/pricing, QR validation, e-invoice, geo map,
loyalty).

---

## 2. Glossary

| Term                            | Meaning                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant**                      | A business registered on Slaice (a beach operator). Has a subdomain `{tenant}.slaice.app`, branding, enabled modules and a Stripe connected account.                                                 |
| **Zone / Store**                | A named area of the beach with its own sunbed layout, base price, colour and code prefix (e.g. _Central_, prefix `CE`). The customer UI sometimes calls zones "stores" (each can show its own logo). |
| **Umbrella set / Set / Sunbed** | 1 umbrella + 2 sunbeds, seats 2. The bookable inventory unit. ID = `<prefix>-<nn>` (e.g. `CE-89`).                                                                                                   |
| **Slot**                        | A set's position within its zone on a normalised 0–100 × 0–100 canvas (x along the shore, y from the sea/front row to the promenade).                                                                |
| **Sunbed state**                | `a` available · `h` on hold · `u` unavailable/taken/blocked.                                                                                                                                         |
| **Sunbed kind**                 | `standard` · `front` (front row) · `cabana`.                                                                                                                                                         |
| **Entry ticket**                | Paid admission to the beach, by category: adult, resident, child, senior.                                                                                                                            |
| **Day locker**                  | A locker rented per day. Sold in the wizard (€5/day) or on site from locker banks.                                                                                                                   |
| **Parking spot**                | A parking space per day, tied to a vehicle plate (read by the gate camera).                                                                                                                          |
| **VIP Pass / VIP credit**       | Prepaid credit (e.g. €500 / €1,000) spent at checkout with a discount (20% by default). Valid to the end of the season.                                                                              |
| **Season Pass**                 | Covers one entry ticket per visit for a month or the whole summer.                                                                                                                                   |
| **myDATA / AADE**               | The Greek tax authority's (AADE) electronic books platform. Every receipt/invoice is transmitted and receives a **MARK** (unique registration number, 15–18 digits).                                 |
| **ΑΠΥ**                         | Απόδειξη Παροχής Υπηρεσιών — retail service receipt (B2C).                                                                                                                                           |
| **ΤΠΥ**                         | Τιμολόγιο Παροχής Υπηρεσιών — service invoice (B2B, e.g. group/corporate tickets).                                                                                                                   |
| **ΑΚΥ**                         | Cancellation document.                                                                                                                                                                               |
| **ΠΙΣ / Credit (5.1)**          | Credit note (myDATA invoice type 5.1), issued on refunds.                                                                                                                                            |
| **ΑΦΜ**                         | Greek VAT/tax number.                                                                                                                                                                                |
| **invoiceType 2.1 / payment 7** | myDATA codes displayed on receipts (service receipt; payment method 7 = online/card via Stripe).                                                                                                     |
| **Stripe Connect Standard**     | Tenant payments model: each tenant has a Stripe connected account; KYC flags `details_submitted`, `charges_enabled`, `payouts_enabled`.                                                              |
| **Application fee**             | Slaice's 5% cut of each charge.                                                                                                                                                                      |
| **DSAR**                        | Data Subject Access Request (GDPR Art. 15–22): access, erasure, portability, rectification, restriction/objection.                                                                                   |
| **ROPA**                        | Record of Processing Activities (GDPR Art. 30).                                                                                                                                                      |
| **DPA**                         | Data Processing Agreement (tenant ↔ Slaice); also "supervisory authority" in the breach workflow.                                                                                                    |
| **RevPATB**                     | Revenue per available sunbed (a yield KPI).                                                                                                                                                          |
| **ADR**                         | Average daily rate per set.                                                                                                                                                                          |
| **Z-report**                    | End-of-shift cash-register summary.                                                                                                                                                                  |
| **Persona**                     | A role-specific surface of the app (Customer, Manager/Admin, Cashier, Controller, Accountant, Platform).                                                                                             |

---

## 3. Current state, environments and access

- **What exists:** a **non-functional but fully navigable React mockup** covering every persona, both
  MVP and Future features. There is **no backend, no database, no real payments, no real messaging,
  no real myDATA transmission.** All data is deterministic sample data. Buttons that would call a
  backend show a demo toast or a simulated multi-step progress.
- **Stage URL:** <https://aspandon.github.io/Slaice/> (e.g. `#/customer/home`). Served by GitHub Pages
  from the `docs/` folder, which CI rebuilds from `main` on every push.
- **Access:** the stage site is behind a **site gate** (one fixed e-mail + password, checked
  client-side against SHA-256 hashes). The credentials are held by the project owner and are
  deliberately **not** stored in this document. After the gate, the product's own **demo sign-in**
  appears (magic link or SSO; any input signs you in). **[DEMO]**
- **Local run:** `npm install` → `npm run dev` (http://localhost:5173). Checks: `npm run typecheck`,
  `npm run lint`, `npm run build`.
- **Documentation in the repo:** `README.md` and `UX_REVIEW.md` were brought up to date on **29 Sep
  2026**, verified against `main` @ `ba18313`. `README.md` is the quick start: what Slaice is, how to
  run and deploy it, the persona map, the tech stack and the folder structure. `UX_REVIEW.md` is the UX
  backlog: every original finding re-graded against the code (resolved, superseded, partly done,
  regressed or open), plus new findings N1–N9. Neither describes the retired Feature Inventory / User
  Journeys explorer any more, and both record that the ⌘K command palette, the booking hold timer and
  the bundle discount are no longer in the code. **This document remains the full specification and
  wins on any conflict.**

---

## 4. Multi-tenancy as expressed in the UI

Slaice is designed as multi-tenant. The mockup shows **one tenant's operational surfaces** (Akti tou
Iliou) plus the **platform console** that manages all tenants.

| Concept                              | How it appears                                                                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant identity                      | Name, subdomain (`{tenant}.slaice.app`), country (GR/CY), contact e-mail, VAT number (ΑΦΜ), default language, brand colour, logo.                                                                                                                 |
| Tenant branding on the customer site | Tenant logo (large, centred) at the top of every customer page; tenant name/logo in checkout and sign-in; tenant-chosen **beach background** (preset or uploaded photo); per-zone logos; **"powered by SLAiCE"** credit in the footer and wizard. |
| Tenant lifecycle status              | `Lead` → `Setup` → `Live` (Platform → Tenants).                                                                                                                                                                                                   |
| Stripe onboarding status             | `pending` → `onboarding` → `KYC review` → `charges ✓`.                                                                                                                                                                                            |
| Tenant modules (coarse)              | `Booking`, `Ticket`, `Invoice`, `Pay`.                                                                                                                                                                                                            |
| Capability flags (fine)              | 12 modules per tenant: Sunbed Booking, Entry Ticket, e-Invoice/MyDATA, Payments, Reporting, Day Locker, Parking, Cash Register, Loyalty, Reviews, Catalogue, Geo Map. Toggled by the super admin. **[Future]**                                    |
| Data roles (GDPR)                    | Tenant = **data controller** (e.g. "Akti tou Iliou AE"); Slaice = **processor**; Stripe, AWS (Frankfurt), myDATA/AADE etc. = **sub-processors**. EU data residency (Frankfurt).                                                                   |
| Money flow                           | Customer pays the **tenant's** Stripe account (direct charge); Slaice takes a 5% application fee; Stripe fees ~1.5%; tenant receives the net.                                                                                                     |
| Seed tenants                         | 12 tenants (5 Live, 4 Setup, 3 Lead) — see §24.                                                                                                                                                                                                   |

> Tenant isolation, tenant resolution by subdomain and cross-tenant customer accounts are **not**
> implemented in the front end; the customer surface is hard-wired to Akti tou Iliou.

---

## 5. Personas and roles

All seven personas share one app. In the mockup a **persona switcher** lets anyone view any persona
**[DEMO]**; in production each persona is a role with its own permissions.

| Persona               | Greek label (source) | Who                                                      | Purpose                                                                                                                  | Default page | Surface style                               |
| --------------------- | -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------- |
| **Customer**          | Πελάτης              | Beach guest (demo user: _Elena M._, `elena@example.com`) | Online booking, tickets, QR entry, documents, passes, rewards                                                            | `home`       | Consumer, immersive beach scene, no sidebar |
| **Manager / Admin**   | Διαχειριστής         | Tenant manager                                           | Configuration, availability, pricing, map, bookings, CRM, reporting, refunds, GDPR, marketing                            | `dashboard`  | Staff console: sidebar + top bar            |
| **Call Center**       | Τηλεφωνικό κέντρο    | Phone agents                                             | Phone bookings (A-05) and booking lookup: search, filter, resend QR, notes, escalate to a manager — no export or refunds | `manual`     | Staff console                               |
| **Cashier**           | Ταμίας               | On-site cashier at the entrance                          | Anonymous on-site tickets, printing, redeem, cash register, locker sales                                                 | `issue`      | Staff console                               |
| **Controller**        | Ελεγκτής             | Gate staff                                               | QR validation, walk-ins, pay-on-site tickets, same-day release                                                           | `scan`       | Staff console                               |
| **Accountant**        | Λογιστής             | Tenant's accountant                                      | e-Invoicing & myDATA, commission & payouts, VAT                                                                          | `invoicing`  | Staff console                               |
| **Platform / Slaice** | Slaice staff         | Slaice internal team — the **super admin**               | Tenants, onboarding, capability flags, webhooks, compliance, verticals, landing page                                     | `tenants`    | Staff console (indigo brand)                |

---

## 6. Information architecture and routes

Routing is a tiny custom hash router: `#/<persona>/<page>`. Deep links work, refresh keeps the
location, Back/Forward work. Unknown pages fall back to the persona's default page. The last page
visited **per persona** is remembered.

### Customer

| Route                   | Screen                                    | Nav          | Tag   |
| ----------------------- | ----------------------------------------- | ------------ | ----- |
| `#/customer/home`       | Home                                      | Home         | —     |
| `#/customer/plan`       | Plan my visit (booking wizard, immersive) | Plan         | [MVP] |
| `#/customer/mybookings` | My Bookings                               | Account area | —     |
| `#/customer/mydocs`     | My Documents                              | Account area | —     |
| `#/customer/checkout`   | Checkout                                  | (flow page)  | [MVP] |
| `#/customer/confirm`    | Confirmation                              | (flow page)  | —     |
| `#/customer/vip`        | Buy / top up VIP Pass                     | (flow page)  | —     |
| `#/customer/season`     | Buy / manage Season Pass                  | (flow page)  | —     |

### Manager / Admin

| Route                  | Screen                                                           | Short label (mobile) | Tag      |
| ---------------------- | ---------------------------------------------------------------- | -------------------- | -------- |
| `#/admin/dashboard`    | Dashboard                                                        | Home                 | [MVP]    |
| `#/admin/availability` | Beach, Availability & Pricing (old `#/admin/map` redirects here) | Beach                | [MVP]    |
| `#/admin/display`      | Live Display (entrance screen)                                   | Display              | [MVP]    |
| `#/admin/bookings`     | Bookings                                                         | Bookings             | [MVP]    |
| `#/admin/manual`       | Manual / Phone Booking                                           | Manual               | [MVP]    |
| `#/admin/users`        | Users & Segments                                                 | Users                | [MVP]    |
| `#/admin/reporting`    | Reporting & Analytics                                            | Reports              | [MVP]    |
| `#/admin/refunds`      | Refunds                                                          | Refunds              | [MVP]    |
| `#/admin/privacy`      | Privacy & GDPR                                                   | Privacy              | [MVP]    |
| `#/admin/rbac`         | RBAC                                                             | RBAC                 | [MVP]    |
| `#/admin/communicate`  | Communicate                                                      | Comms                | [Future] |
| `#/admin/loyalty`      | Loyalty                                                          | Loyalty              | [Future] |
| `#/admin/passes`       | Passes                                                           | Passes               | [Future] |
| `#/admin/gamification` | Gamification                                                     | Badges               | [Future] |

### Call Center

| Route                   | Screen                 | Tag   |
| ----------------------- | ---------------------- | ----- |
| `#/callcenter/manual`   | Manual / Phone Booking | [MVP] |
| `#/callcenter/bookings` | Bookings (lookup)      | [MVP] |
| `#/callcenter/paylinks` | Pay-by-link            | [MVP] |

### Cashier

| Route                    | Screen        | Tag      |
| ------------------------ | ------------- | -------- |
| `#/cashier/issue`        | Issue Ticket  | [MVP]    |
| `#/cashier/transactions` | Transactions  | [MVP]    |
| `#/cashier/redeem`       | Redeem Ticket | [Future] |
| `#/cashier/register`     | Cash Register | [Future] |
| `#/cashier/locker`       | Sell Locker   | [Future] |

### Controller

| Route                 | Screen          | Tag   |
| --------------------- | --------------- | ----- |
| `#/controller/scan`   | Gate Validation | [MVP] |
| `#/controller/beach`  | Beach Status    | [MVP] |
| `#/controller/walkin` | Walk-in Sale    | [MVP] |

### Support Agent (AENR-533)

Every Controller and Cashier page plus pay-by-link, grouped in the navigation as Gate · Beach · Till ·
Reservations; phone-first like the Controller. Staff get the role in Admin › RBAC (view-as works).

| Route                    | Screen                                | Tag      |
| ------------------------ | ------------------------------------- | -------- |
| `#/support/scan`         | Gate Validation                       | [MVP]    |
| `#/support/beach`        | Beach Status                          | [MVP]    |
| `#/support/walkin`       | Walk-in Sale (channel Support)        | [MVP]    |
| `#/support/issue`        | Issue Ticket                          | [MVP]    |
| `#/support/transactions` | Transactions                          | [MVP]    |
| `#/support/register`     | Cash Register                         | [Future] |
| `#/support/redeem`       | Redeem Ticket                         | [Future] |
| `#/support/locker`       | Sell Locker                           | [Future] |
| `#/support/paylinks`     | Pay-by-link reservations (also Admin) | [MVP]    |

### Accountant

| Route                     | Screen               | Tag   |
| ------------------------- | -------------------- | ----- |
| `#/accountant/invoicing`  | e-Invoicing & MyDATA | [MVP] |
| `#/accountant/commission` | Commission & Payouts | [MVP] |

### Platform / Slaice

| Route                              | Screen                    | Tag      |
| ---------------------------------- | ------------------------- | -------- |
| `#/platform/tenants`               | Tenants                   | [MVP]    |
| `#/platform/tenant/<id>/<section>` | Tenant page (21 sections) | [MVP]    |
| `#/platform/onboarding`            | Tenant Onboarding         | [MVP]    |
| `#/platform/superadmin`            | Super Admin               | [Future] |
| `#/platform/compliance`            | Compliance & DPA          | [MVP]    |
| `#/platform/verticals`             | Verticals                 | [Future] |
| `#/platform/landing`               | Landing Page (slaice.app) | [Future] |

---

## 7. Global shell and cross-cutting features

### 7.1 Entry sequence

1. **Site gate** **[DEMO]** — full-screen login in front of the whole app (e-mail + password,
   show/hide password toggle, validation). Unlock is remembered per device.
2. **Product sign-in** — tenant-branded split screen. Left (desktop only): beach illustration with the
   tenant logo, subdomain, headline _"Relax. Reserve. Repeat."_, three benefits (pick your exact spot
   on a live beach map · instant QR straight to the gate · digital receipts automatically) and
   "powered by SLAiCE". Right: **e-mail magic link** (Zod-validated e-mail; "Check your inbox" state;
   "Continue (demo)") or **SSO**: Google, Microsoft, Apple, Facebook. Any input signs in **[DEMO]**.
3. **Cookie consent banner** — shown until a decision is recorded (see §7.6).

### 7.2 Customer shell

- Full-bleed **beach backdrop** behind every customer page (see §20.6), large **tenant logo** centred
  at the top (links to Home), **SiteFooter** "powered by SLAiCE".
- **Floating action cluster**, fixed top-right:
  - **Basket** popover: item count badge, line items with kind icon, remove (with **Undo** toast),
    subtotal, **Checkout**, **Empty basket** (with Undo), **Continue planning**. Empty state with a
    "Plan my visit" button.
  - **Notifications** popover: persona-specific feed with unread dots, "Mark all read", "Settings"
    (Notification settings modal: channels Push / E-mail / SMS; categories: booking updates, weather
    alerts, offers & promotions, receipts & documents).
  - **Language** menu: English, Ελληνικά, Deutsch, Français, Español, Italiano.
  - **Account** menu (avatar "EM"): My bookings, My documents, Account settings, Sign out.
- **Bottom tab bar** on phones (always visible, including inside the wizard), with a **More** sheet
  when a persona has more than 5 destinations.
- **Persona switcher "DEMO" pill**, bottom-right **[DEMO]**.
- **Scene demo panel**, bottom-left on Home: time-of-day slider + weather picker **[DEMO]**. The live
  sea, weather and time-of-day scene is **FUTURE** (badge in the panel and on the admin Atmosphere
  card); the MVP baseline is the static illustrated beach.
- In the booking wizard the logo and footer step aside (immersive mode) and the shoreline animates up
  so the sand fills the screen.

### 7.3 Staff shell (all non-customer personas)

- **Top bar** (sticky, glass): current page icon + title (on phones it opens the navigation sheet),
  notifications, language, account menu, **persona switcher** showing the current persona **[DEMO]**.
- **Sidebar** (desktop): persona header, nav items with the **MVP / Future** indicator (orange dot for
  Future), and a footnote _"Non-functional mockup. No payments or backend — actions show a demo note."_
  **[DEMO]**
- **Bottom tab bar + navigation sheet** on phones, with purpose-built short labels.
- Future screens show a **FutureBanner**: _"Preview · Roadmap 2027–2029 — fully clickable mockup, not
  part of the MVP."_

### 7.4 Account settings (customer)

Modal with sections:

- **Profile:** full name, e-mail, phone, language.
- **Notifications:** push, e-mail, SMS (critical only), marketing offers (toggles).
- **Saved payment methods:** list of cards (•••• last4, expiry), remove with Undo, "Add card" (demo:
  Stripe SetupIntent flow). Empty state.
- **Privacy & data:** opens the **Privacy Centre** (§7.5).
- **Security:** **Change password** modal and **Enable 2FA** modal.
  - _Change password:_ current / new / confirm, show-hide, strength meter (4 bars), requirements
    (8+ chars, upper & lowercase, a number, a symbol); valid when current is filled, score ≥ 3, confirm
    matches and new ≠ current.
  - _Enable 2FA:_ step 1 scan QR / copy setup key (issuer Slaice); step 2 enter 6-digit code
    (refreshes every 30 s); step 3 recovery codes (copy / download `slaice-recovery-codes.txt`) →
    "Two-factor authentication enabled."

### 7.5 Privacy Centre (customer self-service GDPR)

Modal with four tabs:

1. **Your data** — "Export my data (ZIP)" builds a real ZIP with `my-data.json` (profile, consents,
   bookings, documents, processors) and `summary.pdf` (GDPR Art. 15 & 20). Cards for each data right:
   access & portability, rectification, restrict/object, erasure.
2. **Consents** — toggles for Analytics and Marketing, timestamp of last decision, "Re-open cookie
   banner".
3. **Who sees it** — processors table (party, role, location, legal basis) and retention table.
4. **Delete** — explains a **30-day grace period**, and that invoices (ΑΠΥ/ΤΠΥ) and their myDATA
   records are **kept 5 years** under Greek tax law; "Request erasure" → confirm modal.

### 7.6 Cookie consent

Banner: _"We value your privacy"_ with **Manage** (per-purpose toggles: Strictly necessary — always
on; Analytics; Marketing), **Reject non-essential**, **Accept all**, links to Privacy Policy and
Cookie Policy. The decision is stored with a timestamp and can be changed any time (Account → Privacy
& data).

### 7.7 Toasts and feedback

- Toast stack with tone (success / error / info / warn), optional **action** button (e.g. Undo), auto
  dismiss (4.2 s; 6.5 s when there is an action).
- Every async list has explicit **loading** (skeletons), **error** (retry) and **empty** states.
- Destructive actions offer Undo or a confirmation modal.
- **Spotlight**: a navigation can carry a hint that scrolls to and pulses a target element
  (`data-spotlight`) and optionally shows a tip toast.

### 7.8 Internationalisation

- English is the source language. Strings are wrapped as `t("English text")`.
- Five more languages (el, de, fr, es, it) are **machine-generated** dictionaries
  (`npm run i18n`, `src/locales/*.json`); missing strings fall back to English.
- `<html lang>` follows the selected language; dates use `Intl` (`en-GB` for English).
- Coverage: the **customer surface** is translated; **staff screens are largely English-only**.
- MVP languages are **English and Greek**. German, French, Spanish and Italian stay selectable but carry
  a **FUTURE** badge in the language menu and the account-settings language select (`mvp` flag on
  `LANGUAGES` in `src/app/i18n.ts`).

---

## 8. User journeys — Customer

Each journey: **ID · name**, trigger, steps, outcome, rules and states.

### C-01 · Sign in

```text
 first visit / after sign-out
        │
        ▼
 ┌───────────────────┐        ┌──────────────────────────────────────────────┐
 │ Site gate  [DEMO] │        │ Product sign-in  (tenant-branded split view) │
 │ e-mail + password ├───────▶│ left: beach art · "Relax. Reserve. Repeat."  │
 └───────────────────┘        └──────────────────────┬───────────────────────┘
   unlock remembered                                 ◆ how?
   per device                     ┌──────────────────┴──────────────────┐
                                  ▼                                     ▼
                     E-mail ─▶ [Send magic link]          SSO ─▶ Google · Microsoft
                       │  ✗ invalid ─▶ inline error              Apple · Facebook
                       ▼        (role="alert")                        │
                  "Check your inbox" ─▶ [Continue (demo)]             │
                                  │                                   │
                                  └─────────────────┬─────────────────┘
                                                    ▼
                         ● Signed in ─▶ last customer page (default Home)
                           └─ consent not decided yet? ─▶ cookie banner (§7.6)
```

- **Trigger:** first visit or after sign-out.
- **Steps:** (site gate [DEMO]) → enter e-mail → "Send magic link" → "Check your inbox" → "Continue";
  or tap an SSO provider (Google / Microsoft / Apple / Facebook).
- **Validation:** e-mail required and must be valid (inline error, `role="alert"`).
- **Outcome:** signed in, lands on the last customer page (default Home). Consent banner appears if
  undecided.

### C-02 · Explore Home

```text
 ┌─ Home  #/customer/home ─────────────────────────────────────────────────────────┐
 │                          [ tenant logo ]             [basket][bell][lang][EM]   │
 │ ┌─ 1 Hero (whole card = button) ───────────┐  ┌─ 5 Your rewards ──── 1 ready ─┐ │
 │ │ Good morning, Elena · Sunny 28°          │  │ Tiered · Gold        [Claim]  │ │
 │ │ Plan your full beach day in 60 seconds   │  │ Milestones [#######-] 8/10    │ │
 │ │ (*) 240 sunbeds free today · from €18    │  │ Happy hours          Use it > │ │
 │ │ [ Start guided booking > ]               │  └───────────────────────────────┘ │
 │ └──────────────────────────────────────────┘  ┌─ 6 VIP ───────┐┌─ 7 Season ───┐ │
 │ ┌─ 2 Weekend promo ──┐ ┌─ 3 Rebook usual ───┐ │ gold card art ││ blue card art│ │
 │ │ 20% off front row  │ │ Central · front row│ │ from €500   > ││ from €120  > │ │
 │ │ Claim >         x  │ │ Book again >       │ └───────────────┘└──────────────┘ │
 │ └────────────────────┘ ├─ 4 Your badges 3/6 ┤                                   │
 │                        │ [*][*][*][ ][ ][ ] │                                   │
 │ [8 scene demo] [DEMO]  └────────────────────┘                        [Demo ▾]   │
 └─────────────────────────────────────────────────────────────────────────────────┘

 WHERE EACH TILE LEADS
 1 Hero ─────────────┐
 2 Promo · Claim ────┤                            [GAP] promo discount not applied;
 3 Book again ───────┼──▶ Plan my visit (C-03)          nothing is pre-selected
 5 Perk · Use it ────┘
 5 Claim ────────────────▶ toast "Reward ready — show this at the gate"  [GAP] not tracked
 6 VIP tile ─────────────▶ #/customer/vip     (C-08)
 7 Season tile ──────────▶ #/customer/season  (C-09)
```

The Home page is the customer's dashboard. Elements:

Tiles 2, 4, 5, 6 and 7 are roadmap features and carry a **FUTURE** badge (`NotMvpBadge`); the VIP
and Season pass pages they open show the roadmap banner.

1. **Hero card** (whole card is a button → opens the wizard):
   - Chip: weather icon + greeting by scene hour (< 12 "Good morning", < 18 "Good afternoon", else
     "Good evening") + ", Elena · <Weather> <temp>°".
   - Headline _"Plan your full beach day **in 60 seconds**"_ (the last words shimmer) and sub-copy
     _"Guests, dates, sunbeds, locker, parking — one guided flow with a live total."_
   - **Live availability:** "N sunbeds free today · from €X" — N = count of available sets across all
     zones (from the admin-published layouts), X = lowest zone base price (€18).
   - CTA **Start guided booking**.
2. **Weekend promo** (dismissible): "20% off front-row sunbeds — This weekend only · gates open
   09:00–20:00" → **Claim** opens the wizard. **[GAP]** the discount is not applied.
3. **Rebook your usual:** "Central · front row — your favourite zone last season" → **Book again**
   opens the wizard. **[GAP]** nothing is pre-selected.
4. **Your badges:** gamification achievements, earned in colour, locked greyed with a lock and progress
   tooltip; counter "3/6".
5. **Your rewards** (tall tile): active loyalty schemes sorted _claimable → in progress → perk_;
   "N ready" badge. Row types:
   - **Claim** (e.g. Tiered membership Gold → "Free parking + late checkout"): **Claim** button → toast
     "Reward ready — … Show this at the gate to redeem."
   - **Progress** (e.g. Visit milestones 8/10 visits): progress bar.
   - **Perk** (e.g. Happy hours 20% off weekdays 09:00–11:00): **Use it** → wizard.
6. **VIP Pass tile:** membership card art (gold) with holder, number, QR, validity; subtitle shows the
   balance when held; "Get VIP pass — from €500" → `#/customer/vip`; **Reset** when held **[DEMO]**.
7. **Season Pass tile:** membership card art (sky blue); "Get Season pass — from €120" or "Manage pass"
   → `#/customer/season`; **Reset** **[DEMO]**.
8. **Scene demo panel** (bottom-left) **[DEMO]**.

Entrance motion: full choreography once per session, then a quick card stagger on return.

### C-03 · Plan my visit (booking wizard) — the core journey [MVP]

```text
 ENTRY  hero CTA · Claim · Book again · Use it · "Plan my visit" · Plan tab
          │   (shoreline animates up — the sand fills the screen)
          ▼
 ┌─ glass menu over the sea ────────────────────────────────────────────────────┐
 │ ◀ Leave                                                              1 / 5   │
 │   (1)━━━━━━━━━━(2)┄┄┄┄┄┄┄┄┄┄(3)┄┄┄┄┄┄┄┄┄┄(4)┄┄┄┄┄┄┄┄┄┄(5)                    │
 │  Beach       Guests      Locker     Parking      Review                      │
 │  reached stations jump back · forward only via Continue                      │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  Total €110 (animated)                        [◀ Back / Home]  [Continue ▶]  │
 └──────────────────────────────────────────────────────────────────────────────┘
   the beach (sand) below is the tappable surface · guidance bar · powered by SLAiCE

 (1) BEACH ─ "Pick your zone, sunbeds & days"
   Dates  [Today][Tomorrow][Thu 1][Fri 2]…▶ [calendar]   ◆ several days? ─▶ up to 7
   ┌─ phase ZONES ────────────────────┐   tap   ┌─ phase SETS ─────────────────────┐
   │ ≥768×560: panoramic clusters     │ ──────▶ │ SEA / FRONT ROW                  │
   │   Akanthus  Central  Macaw …     │  zoom   │  x x o o h o o x   o available   │
   │   "from €X · N free"             │         │  o o x o o o h o   h on hold     │
   │ phones: zone cards               │ ◀────── │  o o o # # o o o   x taken # you │
   └──────────────────────────────────┘  back   │ PROMENADE                        │
     changing zone clears the picks             └──────────────────────────────────┘
   pick fx: umbrella pops ─▶ sand ripple ─▶ "+€25" chip flies ─▶ Total pulses
   summary: "2 umbrella sets · CE-01, CE-04 · €50 × 1 day"  [Clear]

 (2) GUESTS ─ "Tell us who's coming"
   Quick picks  [Solo] [Couple] [Family · 4] [Group · 6]      [+ Add Entry tickets]
   Individual 13+  €10   [−] 4 [+]      ◀── auto: 2 adults per picked set,
   Alimos resident  €6   [−] 0 [+]          until the guest edits
   Child 6–12       €5   [−] 0 [+]
   Senior 65+       €7   [−] 0 [+]      ◆ guests > 2 × sets? ─▶ amber warning

 (3) LOCKER (optional)          ◆ [Yes, add lockers] / [No, skip]
   qty [−] 1 [+] × €5/day       multi-day ─▶ ◆ [all days] / [specific days: chips]

 (4) PARKING SPOT (optional)    ◆ [Yes, reserve parking] / [No, skip]
   qty [−] 1 [+] × €15/day      multi-day ─▶ ◆ [all days] / [specific days]
   plates:  1 spot ─▶ one plate (or one per day if "Same car plate" is off)
            N spots ─▶ one plate per spot           missing ─▶ "plate pending"

 (5) REVIEW ─ rows with [Edit] ─▶ jump back to that step
   Beach · Dates · Guests · Entry tickets · Day locker · Parking Spot
   [Confirm · €110]  (disabled while total = €0)
          │
          ▼
   basket lines (§17.2) ─▶ toast "Booking ready — 5 items added" ─▶ menu morphs ─▶ C-04

 SAND VIGNETTES (after step 1, read-only)
   picked sets ──▶ + towels (guests) ──▶ + locker cabin × qty ──▶ + car with plate × qty
```

**Trigger:** hero CTA, Claim, Book again, Use it, "Plan my visit" buttons, the Plan tab.

**Layout:** a glass menu panel over the sea (top) + the tappable beach (sand) below + a guidance bar
(bottom) + "powered by SLAiCE". Header: **Leave** (back to Home), step counter "n / 5", and a
**progress rail** drawn as a footpath across the sand with 5 stations (tap a reached station to jump
back; forward only via Continue). Footer:
live **Total €** (animated) + **Back/Home** + **Continue** (or **Confirm · €total** on the last step).

**Step 1 — Beach** ("Pick your zone, sunbeds & days")

1. **Dates** — "When are you coming?": a horizontal strip of 7 date chips (Today, Tomorrow, weekday +
   date) with arrows and a full calendar modal. Toggle **"Book several days at once"** enables
   multi-select up to **7 days**; turning it off keeps only the first date.
2. **Choose a zone** — phase _zones_:
   - Tablet/desktop (≥ 768 px wide and ≥ 560 px tall): a **panoramic beach** — each zone's real umbrella
     rows laid out as a cluster on the sand, auto-spaced so they never overlap, with name, optional
     logo, "from €X · N free". Selected zone highlighted.
   - Phones: compact **zone cards**.
   - Guidance: "**Tap a zone on the beach** to choose where you'll sit — the sea is at the top."
3. **Pick sets** — phase _sets_: tapping a zone zooms the "camera" in (FLIP animation) to the zone's
   full set layout on the sand (sea at top = front row). Tap available sets to toggle them.
   - Legend: Available · On hold · Taken · Yours. Only **available** sets are selectable **[GAP]**
     (on-hold sets can currently be picked too — §22).
   - Feedback: umbrella pops open, sand ripple, a price chip flies into the total which pulses.
   - Summary chip: "N umbrella sets · CE-01, CE-04 · €X × D days" + **Clear**.
   - **Back** (or the menu) returns to the zones overview (reverse zoom). Changing zone **clears** the
     picked sets.

**Step 2 — Guests** ("Tell us who's coming")

- Categories with steppers: **Individual (13+)** €10 · **Alimos resident** €6 (proof required at gate)
  · **Child (6–12)** €5 (under 6 free) · **Senior 65+** €7 (ID required).
- **Auto-fill:** until the guest edits the numbers, headcount = **2 adults per picked set** ("We
  pre-filled 2 per set. Change the headcount below if you need to.").
- **Quick picks:** Solo (1 adult), Couple (2 adults), Family · 4 (2 adults + 2 kids), Group · 6
  (6 adults, "Friends day").
- Toggle **Add Entry tickets** (one ticket per guest) — or continue without tickets.
- Warning when guests > 2 × sets: "That's fewer seats than guests — add a set on the Beach step if you
  need more."

**Step 3 — Locker** (optional, "Add a day locker")

- **Yes, add lockers** / **No, skip lockers**. Quantity stepper ("How many lockers?").
- Multi-day trips: **Yes — all days** or **Yes — specific days** (day chips).
- Note: "Pick exact lockers later from My Bookings". Price **€5 per locker per day**.

**Step 4 — Parking Spot** (optional, "Reserve a spot")

- **Yes, reserve parking** / **No, skip parking** ("Walking or public transport").
- Quantity ("How many spots?"), €15 per spot per day; day scope (all / specific days) on multi-day trips.
- **Vehicle plates** ("Used by the gate camera to let you in automatically"):
  - 1 spot: one plate, or **per day** when "Same car plate" is switched off (default on).
  - Several spots: one plate **per spot**.
  - Missing plates show "plate pending".

**Step 5 — Review** ("Confirm & checkout")

- Rows with **Edit** (jumps back to the step): Beach (zone · N sets · IDs), Dates, Guests (total +
  breakdown), Entry tickets (per category or "Not included"), Day locker (qty · days or "Not added"),
  Parking Spot (spots · days · plates or "Not added").
- **Confirm · €total** (disabled when the total is €0).

**On confirm:** the booking is exploded into **basket lines** (see §17.2), a toast "Booking ready — N
items added to your basket.", and the menu panel **morphs** into the Checkout summary.

**Beach vignettes:** after step 1 the picked sets stay on the sand (read-only) and each step adds a
vignette — towels for guests, a locker cabin (×qty), the car with its plate on a parking pad (×qty).

**States:** zero sets → total €0 and Confirm disabled; Continue is never blocked on earlier steps.

#### Several stores in one booking (AENR-524)

- Opt-in switch in the Beach step: **Book in more than one store** (off by default — the single-store flow is
  unchanged). With it on, switching store keeps the picks; the overview shows a "N picked" badge per store;
  the menu lists the picks **grouped by store** with per-store subtotals, removable one by one, and the total
  across stores. All stores use the same date(s).
- Turning it off with picks in several stores asks **which store to keep** (or cancel) — picks are never
  dropped silently.
- Every pick is priced per store and date by the shared engine and checked against live availability; a set
  taken or put on hold since it was picked is flagged and must be replaced before checkout.
- One basket, one payment; Review, Confirmation, My Bookings and Admin › Bookings list the sets grouped by store
  under one booking reference.

### C-04 · Checkout [MVP]

```text
 from C-03 (menu morphs in) · basket popover [Checkout] · deep link
        │
        ▼
 ┌─ Your basket · 5 items ──────────┐   ┌─ Akti tou Iliou ───────────────────┐
 │ [set] Sunbed CE-01  Central  €25 │   │ Subtotal                   €110.00 │
 │ [set] Sunbed CE-02  Central  €25 │   │ − Season pass · 1 entry     −€10   │
 │ [tkt] Individual × 4  Entry  €40 │   │ − Paid with VIP credit      −€X    │
 │ [lkr] Day locker 1   Tue      €5 │   │ ─────────────────────────────────  │
 │ [car] Parking spot ΙΖΡ-1234  €15 │   │ Total / Pay now              €Y    │
 │ swipe left / trash ─▶ [Undo]     │   │ Use a pass: VIP [on] Season [on]   │
 │ [Empty basket] ─▶ [Undo]         │   │ Show platform economics  [DEMO]    │
 └──────────────────────────────────┘   └─────────────────┬──────────────────┘
   empty ─▶ "Plan my visit"                               │
                                                          ◆ cash due?
                                      ┌─── > €0 ──────────┴─── = €0 ──────────┐
                                      ▼                                       ▼
                          [Pay €Y] ─▶ Stripe redirect            [Confirm · paid with pass]
                          "Secure payment on tenant's account"   no card charged
                          ─▶ [Simulate successful payment] [DEMO]
                                      │                                       │
                                      └───────────────────┬───────────────────┘
                                                          ▼
                                                 Confirmation (C-05)
 reassurance: Secured by Stripe · VISA MC AMEX APPLE · free cancellation up to 24 h
 ◀ Back to planning ─▶ C-03
```

- **Basket** list: kind icon, label, sub-line (zone/date/plate), price, remove (trash or **swipe left**
  on touch) with **Undo**; **Empty basket** with Undo. Empty state → "Plan my visit".
- **Summary panel** (tenant logo + name): Subtotal → pass deductions → **Total / Pay now**. "VAT
  included where applicable."
- **Use a pass** (only if held): toggle **VIP credit** (balance, % off) and/or **Season pass** (covers
  1 entry). See §17.4 for the maths. A note shows credit used, amount saved and new balance.
- **Pay €X** → Stripe redirect screen (Stripe-branded spinner, "Secure payment on <tenant>'s account")
  → **Simulate successful payment** **[DEMO]**. If passes cover everything: **Confirm · paid with pass**
  (no card charged).
- Reassurance: "Secured by Stripe · we never store card details", accepted brands (VISA, MC, AMEX,
  APPLE), "Free cancellation up to 24h before your visit", Refund policy / Terms links (demo toasts).
- **Back to planning**. Footnote: _"On success: booking confirmed via webhook, QR e-mailed, and an ΑΠΥ
  auto-issued to MyDATA."_
- **Show platform economics** toggle **[DEMO]**: Stripe ~1.5%, Slaice 5%, tenant net.

#### Sign-in, service fees, saved card, notifications (AENR-532)

- **Browse as a guest** on the sign-in screen; at **Pay**, a guest is asked to sign in or create an account and
  comes back to the same basket.
- **Service fees** come from the tenant's customer fee lines (Platform › Tenants › Fees, AENR-521): shown per
  item ("+€2.50 fee" per set, "+€0.50" per entry person) and as total lines; removing an item removes its fee.
- The **Stripe step** (simulated) shows the total, takes a card and offers **Save card for faster checkout**; the
  next booking offers "Pay with Visa ···· 4242".
- On success the booking is saved on the account (its sets become booked on every map); the confirmation lists
  the sets by store, "Link + QR by e-mail & SMS" and "ΑΠΥ e-mailed · MARK".
- **My Bookings** shows for each booking: booking code, sunbed code(s), section, date, guest name, status, price
  and the QR.
- Ticket categories (incl. AMEA with its note) and lockers come from Admin (AENR-529/530).

### C-05 · Confirmation

```text
 ✓ check springs in + confetti ─▶ "Payment successful" ─▶ #BK-10429 ─▶ QR flips in
                                                                        │
      ┌─────────────────────┬──────────────────────┬────────────────────┼──────────────────┐
      ▼                     ▼                      ▼                    ▼                  ▼
 Apple Wallet         Google Wallet        [View my bookings]   [Add to calendar]   [View receipt]
 unsigned .pkpass     "Save to Wallet"      clears basket        downloads .ics      clears basket
 (order by platform)  link                  ─▶ C-06                                  ─▶ C-07

 pills:  Stripe paid · QR e-mailed · ΑΠΥ → MyDATA ✓
 [GAP] leaving any other way keeps the basket full
```

- Animated check (confetti), "Payment successful", booking reference **#BK-NNNNN** (sequential), a
  **QR code** (flips in), **Add to Apple Wallet / Google Wallet** (platform-detected order),
  status pills (Stripe paid · QR e-mailed · ΑΠΥ → MyDATA ✓).
- Actions: **View my bookings**, **Add to calendar** (downloads a real `.ics`), **View receipt** (→ My
  Documents). The first and last clear the basket. **[GAP]** the basket is not cleared if the guest
  leaves another way.
- Wallet: Apple produces a structurally valid, **unsigned** `.pkpass` ZIP (pass.json, manifest,
  icons); Google copies/opens a "Save to Wallet" link with EventTicket claims. Signing is server-side in
  production.

### C-06 · My Bookings

```text
 ┌ Active bookings ┐ ┌ This season  € · n ┐ ┌ Next visit ┐
 └─────────────────┘ └────────────────────┘ └────────────┘
 "Your season in review": visits · favourite zone · savings · spend · visits/month sparkline
 [All] [Active] [Past]                                     [E-mail all QRs] (demo)
    │
    ├─ loading ─▶ skeleton rows
    ├─ error ───▶ message + [Retry]
    ├─ empty ───▶ filter-specific empty state
    ▼
 Booking · Item · Date · Status (Confirmed/Used/Cancelled/Unpaid/Refunded/Pending) · € · [QR]
                                                                                         │
                                           ┌─ Entry QR · #BK-… ─────────────┐            │
                                           │ QR · Apple / Google Wallet     │ ◀──────────┘
                                           │ [Resend by e-mail]             │
                                           └────────────────────────────────┘
```

- KPI cards: Active bookings, This season (€ total, count), Next visit.
- **"Your season in review"** banner: visits, favourite zone, savings, spend, visits/month sparkline.
- Tabs **All / Active / Past**; **E-mail all QRs** (demo).
- Table: Booking, Item, Date, Status (Confirmed / Used / Cancelled / Unpaid / Refunded / Pending),
  Price, **QR**. The QR modal shows the entry QR, wallet buttons and **Resend by e-mail**.
- Loading skeletons, error with retry, filter-specific empty states.

### C-07 · My Documents

```text
 ┌ Receipts (ΑΠΥ) ┐ ┌ Total spend ┐ ┌ myDATA 100% ┐
 └────────────────┘ └─────────────┘ └─────────────┘
 [All] [ΑΠΥ] [ΤΠΥ] [Credit notes]                    [Download all (ZIP)] ─▶ real PDFs
    │
    ▼
 ΑΠΥ-2026-004281 · for · date · amount · MyDATA ✓ · [View] [PDF]
                                                      │      └─▶ downloads the PDF
                                                      ▼
            ┌─ ΑΠΥ-2026-004281 ────────────────────────────────────────┐
            │ Akti tou Iliou AE · ΑΦΜ                                  │
            │ description          net      VAT      gross             │
            │ Sunbed CE-89       24.19     5.81      30.00             │
            │ QR · MARK 400001020304002281 · invoiceType 2.1 · pay 7   │
            │                                       [Download] [Close] │
            └──────────────────────────────────────────────────────────┘
```

- KPI cards: receipts this season (ΑΠΥ count), total spend, myDATA status 100%.
- Tabs **All / ΑΠΥ / ΤΠΥ / Credit notes**; **Download all (ZIP)** bundles real generated PDFs.
- Table: Document number, For, Date, Amount, Status "MyDATA ✓", **View** / **PDF**.
- View modal: issuer (Akti tou Iliou AE, ΑΦΜ), lines (description · net · VAT · gross), total, QR,
  **MARK**, "invoiceType 2.1 · payment 7"; Download.

### C-08 · Buy a VIP Pass (prepaid credit)

```text
 Home VIP tile ─▶ #/customer/vip
      │
      ▼
 (1) SELECT ─────────▶ (2) TERMS ──────────▶ (3) PAY ──────────────▶ (4) DONE
  "Prepay credit,       prepaid · 20% off      Stripe redirect          "You're now a VIP
   save on everything"  on credit-paid part    ─▶ [Simulate payment]     member"
  ┌───────────┐┌───────────┐ valid to season end     [DEMO]                 wallet buttons
  │   €500    ││  €1,000   │ non-refundable                               pills: Stripe paid ·
  │ spends    ││ spends    │ personal · no cash                            Credit added · ΑΠΥ ✓
  │ like €625 ││like €1,250│ [ ] I have read and                         [Back to home]
  └───────────┘└───────────┘     agree (required)                        [Plan a visit]
  packs + % come from Passes (A-12)                                            │
                                                                               ▼
 buy again ─▶ balance tops up                           VIP credit usable at checkout (C-04)
```

1. **Select:** hero "Prepay credit, save on everything"; credit packs (default €500 and €1,000 — admin
   configurable), each showing "Spends like €X · 20% off" and validity to season end.
2. **Terms:** bullet list (prepaid, spendable on any service; discount applies to the credit-paid
   part; valid to season end, unused balance expires, non-refundable; personal, non-transferable; no
   cash value; misuse may lead to cancellation) + mandatory **"I have read and agree"** checkbox.
3. **Pay with Stripe** → redirect → simulate **[DEMO]**.
4. **Done:** "You're now a VIP member", wallet buttons, pills (Stripe paid · Credit added · ΑΠΥ →
   MyDATA ✓), Back to home / Plan a visit. Buying again **tops up** the balance.

### C-09 · Buy a Season Pass

```text
 Home Season tile ─▶ #/customer/season
      │
      ▼
 (1) SELECT ────────────────▶ (2) TERMS ─────────────▶ (3) PAY ──────────▶ (4) DONE
  ┌─ Monthly ─────┐┌─ Whole summer ─┐  one entry per visit    Stripe redirect   "Your entry is
  │ €120          ││ €350           │  entry only · personal  ─▶ [Simulate]      covered every
  │ 1 month from  ││ to 30 Sep 2026 │  photo ID may be asked     [DEMO]          visit"
  │ purchase      ││ (season end)   │  non-refundable once                       │
  └───────────────┘└────────────────┘  activated · [ ] agree                     ▼
                                                           covers 1 adult entry at checkout (C-04)
 held pass ─▶ tile shows "Manage pass"
```

Same four-phase flow: plans **Monthly** (€120, valid one month from purchase) or **Whole summer**
(€350, to season end); terms (one entry per visit, entry only, personal, photo ID may be requested,
non-refundable once activated); pay; done ("Your entry is covered every visit").

### C-10 · Manage account, privacy and security

```text
 [EM ▾] account menu
 ├─ My bookings ────────────────────────────────▶ C-06
 ├─ My documents ───────────────────────────────▶ C-07
 ├─ Account settings (modal)
 │   ├─ Profile ········ name · e-mail · phone · language
 │   ├─ Notifications ·· push · e-mail · SMS (critical only) · marketing offers
 │   ├─ Saved cards ···· •••• 4242 [remove ─▶ Undo] · [Add card] (SetupIntent, demo)
 │   ├─ Privacy & data ─▶ PRIVACY CENTRE
 │   │     ├─ Your data ··· [Export my data (ZIP)] ─▶ my-data.json + summary.pdf
 │   │     ├─ Consents ···· analytics / marketing toggles · [Re-open cookie banner]
 │   │     ├─ Who sees it · processors · retention
 │   │     └─ Delete ······ [Request erasure] ─▶ confirm ─▶ 30-day grace
 │   │                      (ΑΠΥ/ΤΠΥ + myDATA records kept 5 years)
 │   └─ Security
 │         ├─ Change password: current ─▶ new (strength [###-] ≥ 3) ─▶ confirm ─▶ ✓
 │         └─ Enable 2FA: scan QR / copy key ─▶ 6-digit code ─▶ recovery codes ─▶ ✓
 └─ Sign out ───────────────────────────────────▶ C-01
 [globe] language: English · Ελληνικά · Deutsch · Français · Español · Italiano
```

See §7.4–§7.6: profile, notification preferences, saved cards, change password, 2FA, data export,
consents, erasure request, cookie preferences, language.

### C-11 · Notifications

```text
 [bell •3] ─▶ ┌─ Notifications ─────────────── [Mark all read] ┐
              │ • Booking confirmed — Central CE-89, QR ready  │
              │ • Weather alert — re-confirm 24 h before       │
              │ • Weekend offer · 20% off front row            │
              │   Receipt ready — ΑΠΥ transmitted to MyDATA    │
              │                                    [Settings]  │
              └───────────────────────────────────────┬────────┘
                                                      ▼
              channels  Push · E-mail · SMS   ×   categories  booking updates ·
              weather alerts · offers & promotions · receipts & documents ─▶ [Save]
```

Customer feed examples: booking confirmed (QR ready), weather alert (re-confirm 24 h before), weekend
offer, receipt ready (ΑΠΥ transmitted). Mark individual / all as read; open settings.

---

## 9. User journeys — Manager / Admin

### A-01 · Dashboard [MVP]

```text
 ‹ [Day] [Week] [Month] [Year] [Custom] ›  13 – 19 Jul 2026          [Export] ─▶ CSV
   └─ one period drives every tile, delta, chart and the export (X-11)
 ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
 │ Revenue · week │ │ Bookings · week│ │ Occupancy      │ │ Avg basket     │
 │ €101.5k  +x%   │ │ 2,190     +x%  │ │ 73%      +xpp  │ │ €46      +€x   │
 └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
 ┌──────────────────────────────┐ ┌───────────────────────┐ ┌──────────────────────┐
 │ Revenue bars (peaks marked)  │ │ Revenue by capability │ │ Occupancy by zone    │
 │  _.-=#=-._  (peaks in teal)  │ │ Sunbeds 62% · Tickets │ │ Macaw   ######## 91% │
 │                              │ │ 28% · Other 10%       │ │ Central ######   71% │
 └──────────────────────────────┘ └───────────────────────┘ └──────────────────────┘
 Export = one multi-section CSV: KPIs + every chart series
```

- **Period control** (X-11): Day / Week / Month / Year / Custom, default Week. Every KPI, its delta
  ("vs previous week"…), every chart and the **Export** (multi-section CSV, dates in the file name)
  follow it. Kept in the URL (`?period=month`, `?from=…&to=…`).
- KPI cards: Revenue, Bookings, Occupancy and Avg basket for the period, each with its change against
  the previous equal-length period. Values come from the shared sample analytics
  (`src/data/analytics.ts`), so the Dashboard, Reporting and Refunds agree for the same dates.
- Charts: Revenue bar chart (peaks highlighted), Revenue by capability donut (Sunbeds 62% · Tickets
  28% · Other 10%), Occupancy by zone (horizontal bars, full width). Individual bookings are on Bookings
  (A-04), not the Dashboard.

### A-02 / A-03 · Beach, Availability & Pricing [MVP] (merged, AENR-469)

```text
 [Sunbeds & pricing]  [Zones & availability]  [Seasonal & day rules]
 ┌─ store chips ─ Prices on [date] ─ [Select & move | Paint category | Add landmark] ─ [Canvas | List | Preview as customer] ─ Undo Redo ┐
 │ Select… (row / column / category / type / state / step-free / all / invert)   12 sets selected · 2 categories                         │
 │ canvas: sets tinted by category + code, € for the date, ♿, landmarks; drag on sand = box select; paint = press & sweep             │
 └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 inspector: selection (category · type · state · step-free · persons — "mixed" when it differs; price trace)
            Price for dates (from → to · days · € → apply, overlaps flagged) · categories (name · code · colour · €) · date overrides
            layout tools (grid with numbering MC-01 or A1, add set, copy layout to another store, store logo)
 DRAFT — N unsaved changes  [Discard] [Publish]   → wizard, Cashier and display update together
```

- One nav item (**Beach, Availability & Pricing**); `#/admin/map` redirects here.
- **Sunbeds & pricing** (`src/screens/beach/Workspace.tsx`): every edit goes into one draft (layouts of
  all stores, price categories, date overrides, landmarks) with Undo / Redo (buttons and ⌘Z / ⇧⌘Z); a
  bar shows the number of unsaved changes with **Discard** and **Publish** (simulated processing); leaving
  the page with unsaved changes asks for confirmation.
- **Price categories** per store (seeded Front row FR, Standard ST, Back BK, assigned by row; the back
  row keeps the store's "from" price): name, code, colour from a fixed palette, €/day. Colour is never
  the only signal — every set shows the code and the legend lists the count per category.
- **Paint category**: pick a category, press and sweep over sets. **Selection**: click, ⇧/⌘-click,
  drag a rectangle on the sand, or the _Select…_ menu (row, column, category, type, state, step-free, all,
  invert); a live counter shows sets and categories selected. The **List** view is the keyboard /
  screen-reader alternative (checkboxes per set and select all).
- **Price for dates**: apply a € price to the selection for a date range, optionally weekdays or
  weekends only, with a before → after preview and an overlap warning (the newest override wins).
  **Precedence**: sunbed date override › seasonal / weekday rules › category price › set default —
  shown as a trace for a single selected set. Pricing is resolved by `resolvePrice` (`src/domain/pricing.ts`),
  used by the booking wizard (each chosen date priced on its own), the Cashier till and the canvas.
- **Sunbed attributes**: type (Standard, Front row, Cabana, Daybed, VIP), state (Available / On hold /
  Blocked), step-free (♿, shown to guests), persons.
- **Landmarks**: bar, shower, WC, lifeguard, entrance, ramp, path — placed by clicking the sand, dragged,
  labelled; shown in the booking wizard, the Cashier map and the preview.
- **Layout tools**: grid generator with numbering `MC-01…` or row letter + number `MC-A1…`; add, duplicate,
  remove sets; **copy a store's layout** (numbering and categories) to another store; store logo.
- **Preview as customer** renders the draft for the chosen date with prices, unavailable sets and landmarks.
- **Zones & availability**: open / closed per store for today with a reason (live: closed stores can't be
  booked online or sold at the till); the zone map (positions, name, prefix, colour, rows × columns,
  background); Atmosphere card.
- **Seasonal & day rules**: the existing rule list and price preview (rules apply on top of category
  prices).

#### Till: categories, lockers, VAT and one entry ticket (AENR-531)

- Issue Ticket lists the tenant's ticket categories with today's price and the eligibility note (e.g. AMEA),
  and a **Lockers** card per bank with today's price and live availability — ticket-only, locker-only and mixed
  sales are allowed; locker codes (e.g. A-07) are handed out with the sale.
- The basket shows each line, the subtotal, **net + VAT per rate** (demo rates: sunbeds and lockers 24%,
  entry tickets 13% — confirmed by the accountant) and the total.
- The receipt carries **one entry QR for everyone on the sale** ("Entry pass · 3 people"), the locker codes,
  the VAT per rate and the ΑΠΥ with its MARK. The _Sell Locker_ roadmap page points to Issue Ticket.

#### Entry tickets & lockers (AENR-529, AENR-530)

- Two tabs in Beach, Availability & Pricing (`src/screens/beach/Extras.tsx`, rules in `src/domain/extras.ts`),
  edited as a draft with **Save** / **Discard** and validation (names, price ≥ €0, end ≥ start; overlapping
  rules are flagged — the rule lower in the list wins).
- **Entry tickets**: tenant categories — name, short label, eligibility note shown to guests and staff, base
  price, on / off, order. Seed: Normal (13+), AMEA (proof at the gate, €0), Alimos resident, Child, Senior.
  Switching a category off hides it from the wizard and the till.
- **Lockers**: banks (name, Standard / Large / Premium, base €/day, number of lockers, on / off) and the
  **locker provider** (simulated _LockerLink_): status, last sync, _Sync now_, a demo outage and per bank /
  date the available count (sample feed, or a value "reported by the provider"). Offline → locker sales pause
  in the wizard and the till; a bank at 0 can't be sold that day. Lockers sold through Slaice lower the count.
- **Prices by period, in bulk** for both: pick several categories / banks, a date range or one day, several
  days or a whole month, every day / weekdays / weekends, and a price; a week preview shows the effective price
  per item (weekends shaded).
- One source of truth (`useExtras`): the booking wizard (headcount and locker steps, each day priced on its
  own; locker type with availability), the Cashier till, the Controller / Support walk-in sale and
  pay-by-link.

#### Layout drafts, versions & scheduling (AENR-514)

- The canvas is always a **draft** (badge "Draft · name — N changes from live, not visible to customers yet").
  **Save draft** under a name (e.g. "Summer 2027"); open, duplicate or delete saved drafts
  (`src/screens/beach/Versions.tsx`, rules in `src/domain/layoutVersions.ts`).
- **Publish…** opens a dialog: version name; **what changes** per store (added / removed / moved / category
  changed, and pricing); **affected bookings** — a removed or moved set with bookings on or after the effective
  date is listed, and publishing stays blocked until each is resolved: _Reassign to_ the nearest free set of the
  same category (the guest is notified — demo) or _Keep the set until_ the booking's date; **Publish now** or
  **Schedule** from a date. Publishing runs validate → apply → notify (a demo switch makes apply fail).
- Every map resolves the layout **by date**: before a scheduled version's date the current layout, from it the
  new one (the workspace shows "Live layout on this date: vN"). Price changes publish immediately.
- **Version history**: number, name, effective date, author, change summary, Live / Scheduled badges; **View**
  (read-only, per store) and **Restore as draft**.
- Sample advance bookings on specific sets live in `src/data/futureBookings.ts`.

#### Demand pricing suggestions (AENR-513)

- In **Calendar & rules**, under the calendar (`src/screens/beach/Demand.tsx`, `suggestPrice` in
  `src/domain/pricing.ts`). Per price category: on / off, weekday min–max €, weekend min–max €, step.
- **Suggestions for the next 14 days** (from the back-office day, date selectable): current → suggested price
  with a plain-language reason ("82% booked 5 days out, pace +30% vs usual — near the top of the band") and the
  expected revenue effect; **Accept / Reject** per row, **Accept all**, and a **lock** per date / category.
- The suggestion is a pure function of occupancy on the books (sample data), days to go and booking pace vs the
  usual weekday: busy, near and fast-selling dates move toward the band's top, quiet ones to its minimum.
- Accepting creates a one-day **date override** (source _Suggestion_) on the category's sets that aren't booked
  yet, so the calendar, the canvas and the booking wizard show the new price and existing bookings keep theirs.
- **Auto-apply once a day** (opt-in) with a demo _Run today's update_; every change is logged (date, category,
  old → new, reason, Accepted / Auto) and can be **reverted** per entry. Never outside a band, never on booked
  sets, never on a locked date.

#### Entrance live display (AENR-519)

- **Admin › Live Display** (`#/admin/display`): zones to show and their order, rotate overview → each zone
  (6–30 s per view), prices, QR, weather, languages (English ↔ Greek rotate), theme (dark / light / high
  contrast) and landscape / portrait; a live preview frame; **Open on another screen** (pop-up window) and
  **Copy display link**. Cashier (Issue Ticket) and Controller (Gate) have an _Open live display_ shortcut.
- **`#/display`** — chrome-less and read-only (no shell, sign-in, cookie banner or guest data): headline "N
  sunbed sets free now · from €X", clock and weather, the overview map with each zone in its position (free /
  total, fill bar and a text level: Plenty free · Filling up · Almost full · Full · Closed today), a per-zone
  view with every set marked Free ✓ / On hold … / Taken (hatched) / Out of service ✕ and a text legend, the
  booking QR and today's prices. Full screen by double-click or the button (hides after 3 s); Esc exits.
- **Live data**: today's walk-in availability from the same store as the till and the Controller. Windows of
  the app sync through the browser `storage` event — a till sale or a status change updates the screen
  without a reload. Footer "Updated hh:mm" with a heartbeat; offline for 2 min → "Offline — showing
  availability from hh:mm". Sizes in `vmin` for 3–5 m reading; reduced motion → instant cuts.

#### Inventory: holds, sales-channel status & stop-sell (AENR-512)

- Live operations, applied immediately (not part of the layout draft), in the workspace inspector
  (`src/screens/beach/Inventory.tsx`, rules in `src/domain/inventory.ts`):
  - **Hold** the selected sets for a date range with a reason (VIP · Maintenance · Event / group ·
    Weather · Other + note) and an optional release date-time; held sets show On hold with a lock and the
    reason (wizard, Cashier map, canvas tag "🔒 HELD") and can't be booked. Release by hand, or
    automatically at the release time (logged).
  - **Sales channel status** per set and date range: _Not available online_ (walk-in & phone), _Available
    online only_, _Available walk-in only_ (Cashier), _Phone only_; optional automatic release of unsold
    sets to everyone N days before at HH:MM. The canvas tags sets WALK-IN / PHONE / STAFF / ONLINE.
  - **Stop-sell online** per store (or one price category) and date range with a reason: the booking
    wizard shows "not available online — ask at the beach" and can't continue; the Cashier keeps selling.
- **Availability summary** for the chosen date ("48 total · 8 held · 6 walk-in / staff · 0 phone · 2
  booked/blocked · 32 free online"), the list of active holds / allocations / stop-sells, an activity log,
  and a **demo clock** (+1 h, fast-forward to the next release, reset) to show expiries and releases.
- Every map resolves availability per channel: the booking wizard as **online**, the Cashier till as
  **walk-in** (`useLiveSlots(channel)`), so a set kept for walk-ins is unavailable online but sellable at
  the till until its release time.

#### Calendar & rules (AENR-511)

- **Month calendar per store** (`src/screens/beach/Calendar.tsx`): each day shows the effective price per
  price category, expected occupancy % and badges for date restrictions; weekends in indigo; closed days
  greyed. Click a day to see how each category's price is built (category → rules, in order) plus the
  booking-time rules (early-bird, last-minute, multi-day) that may apply.
- **Select days** by drag, Shift-click, ⌘-click or the keyboard (arrows move, Space selects,
  Shift+arrows extends, Esc clears; each day has an accessible label with prices and restrictions), then:
  **Price change** (± %, ± € or set €, optionally limited to categories); **Restriction** (minimum stay,
  maximum stay, booking window, same-day cut-off time, closed with a reason); a **seasonal template**
  (Low / Mid / High / Peak, % editable per tenant); **Copy this week forward** to the same weekdays until a
  date (copies only what was set within that week). **Undo** reverts the last change.
- **Rule types**: standard (season / weekdays / specific dates, optional category scope), early-bird
  (booked ≥ N days ahead), last-minute (same day from HH:MM), multi-day (stay ≥ N consecutive days).
  The precedence list shows rules in the order they apply; a sunbed date override wins over all.
- **Effect for guests and staff**: the booking wizard disables dates that are closed, outside the
  booking window or past the same-day cut-off (with the reason), refuses stays that break a minimum /
  maximum stay (message + Continue disabled), and prices each day with the booking context — early-bird /
  last-minute show as a "booking discount / same-day supplement" line under the total. Closed days also
  close the store at the Cashier till. Pure functions: `resolvePrice` (with `PriceContext`),
  `checkRestrictions`, `dateBlock` in `src/domain/pricing.ts`.

### A-04 · Bookings [MVP]

```text
 [Search: ID · name · surname · phone · items]      [Export] ─▶ CSV, one row per item
        │
        ▼
 Booking ▲▼ │ Name ▲▼ │ Surname ▲▼ │ Phone │ Items │ Date ▲▼ │ Channel │ Status │ € ▲▼
                                           │                   │
            2 sets + parking + locker ─────┘   Online · Walk-in · Phone · Cashier
            = "4 items · one booking"

 ◀ 1 2 3 ▶  30 rows per page              row ─▶ [Resend QR]
                                                    │
                                                    ▼
                                            ┌─ Resend QR ────────────────┐
                                            │ ◆ Email · Viber · SMS      │
                                            │    (shows the destination) │
                                            │ [Resend via …] ─▶ toast    │
                                            └────────────────────────────┘
```

- Visit-date filter: the shared period control (X-11), default **All dates**.
- **Filters** (shared `FilterBar`, `src/domain/filters.ts`): Channel, Status, Amount (more than / less
  than / between, validated), Item type (sunbed / entry ticket / locker / parking) and Zone. AND across
  filters, OR within one; they combine with search, sorting and pagination (page resets). Active
  filters show as removable chips with **Clear all** and a count ("5 of 68 bookings"); they persist in
  the URL (`?channel=Online&amount=gt:40`), and **Export** writes exactly the filtered rows.
- Search (ID, name, surname, phone, items), **sortable** columns (Booking, Name, Surname, Date,
  Amount), pagination (30 per page), **Export** CSV (one row per booking _item_; total on the first
  item row).
- Columns: Booking, Name, Surname, Phone, Items (a booking can hold several sets + parking + locker +
  tickets, stacked with "N items · one booking"), Date, Channel badge (Online / Walk-in / Phone /
  Cashier), Status, Amount, **Resend QR**.
- **Resend QR** modal: choose **Email / Viber / SMS** (shows the destination) → "Resend via …".

### A-05 · Manual / Phone Booking [MVP]

Shared by Manager / Admin and the **Call Center** role (`#/callcenter/manual`, its landing page) —
the same screen. Call Center also gets **Bookings** (A-04) as a lookup: search and filter, Resend QR
and **Notes** with **Escalate to a manager** (escalated bookings show an _Escalated_ badge to admins);
no Export and no refunds.

```text
 ┌─ Form ─────────────────────────────┐  ┌─ Live beach coverage ──────────────┐
 │ Customer name / e-mail / phone     │  │ o o x o o o     tap an available   │
 │ Zone ◆  ·  Sunbed code  ·  Date    │  │ o # o o x o     set ─▶ fills the   │
 │ Mark as ◆ Unpaid · Comp · VIP ·    │  │ x o o o o o     sunbed code        │
 │           Pay later                │  │ (published layout; taken = dimmed) │
 └────────────────────────────────────┘  └────────────────────────────────────┘

 [Reserve & send QR] ─▶ ◆ channel Email / Viber / SMS
        │
        ▼
 ● result card: QR · "Reserved · Unpaid" · "QR sent via … to …"
        │
        ▼
 Bookings (A-04) status Unpaid · channel Phone ─▶ guest pays later or at the gate
```

- Form: customer name, e-mail, phone, zone, sunbed code, date, **Mark as** (Unpaid (manual) / Comp /
  VIP / Pay later).
- **Live beach coverage** mini-map of the zone's published layout: tap an available set to fill the
  code; taken sets are dimmed.
- **Reserve & send QR** → channel picker (Email / Viber / SMS) → result card with QR, "Reserved ·
  Unpaid", "QR sent via … to …; the customer can pay later or present the QR at the gate".
- Side panel: block without payment (phone, VIP comps, pay-later), QR by e-mail/Viber/SMS, settle
  later in Bookings. Manual bookings appear in reporting with channel = Phone.

### A-06 · Users & Segments [MVP]

```text
 [Search]   filter ◆ All · VIP · Season pass · Regular · New            [New tag] (demo)
 rule:  every guest starts New ──(15 visits)──▶ Regular      VIP / Season pass = by hand

 Name · Surname · Phone · Email · Visits · Tags · [Edit] · [Profile]     ★ = important guest
                                                    │         │
        ┌───────────────────────────────────────────┘         ▼
        ▼                                    ┌─ Guest profile (side drawer) ───────────┐
 ┌─ Edit user ─────────────────────────┐    │ Overview · Bookings · Payments · Passes │
 │ first · surname · e-mail (checked)  │    │ & loyalty · Messages · Notes ·          │
 │ phone · visits this season          │    │ Preferences · Privacy                   │
 │ auto segment (read-only)            │    │ [New booking] [Message] [Resend QR]     │
 │ VIP [on/off] · Season pass [on/off] │    │                         [Edit details]  │
 │                       [Save]        │    └─────────────────────────────────────────┘
 └─────────────────────────────────────┘
```

- **Segments** (`src/screens/users/`, `src/domain/segments.ts`, `src/data/guests.ts`): chips for All guests,
  the built-in VIP, Season pass, Regular and New (the New → Regular visit threshold is editable from the
  Regular segment) and the tenant's saved segments, each with a live count. **New segment** opens a
  builder: name, colour, dynamic or static, AND / OR, conditions on visits, spend, avg spend, first /
  last visit, days since last visit, channel, favourite zone, items bought, party size, pass, loyalty
  tier, refunds, language, city, marketing consent and tags, with a live preview of who matches.
  Segment actions: edit, duplicate, export CSV, message (→ Communicate), delete. **New tag** creates
  real tags (name + colour) assignable in Edit user. Segments, tags and edits persist in `localStorage`.
- **Lifecycle & value** (`src/domain/lifecycle.ts`): every guest has a stage — First visit → Active →
  Regular, or At risk / Lapsed after N days without a visit (thresholds in **Lifecycle rules**) — and an
  RFM score (recency, frequency, monetary 1–5 by quintile) with a label (Champions, Loyal, Potential,
  Needs attention, At risk, Hibernating). A stage strip shows counts and % and filters on click. Optional
  columns (**Columns** menu, remembered): Lifecycle, RFM, Lifetime spend, Last visit, Next visit
  (predicted from the guest's average gap). Stage and RFM label are also segment-builder fields.
- **Power tools** (`src/screens/users/GuestTools.tsx`, `src/lib/csv.ts`): ad-hoc filters (visits, spend,
  days since last visit, lifecycle, channel, zone, pass, consent, tag) in the shared filter bar; sortable
  Name / Surname / Visits / Spend / Last visit; 25 per page with a count; checkbox selection with select
  all matching → bulk **Tag** (add / remove), **Add to segment** (new or existing static), **Message**
  (consent-aware: guests without consent for the channel are skipped and counted), **Export** and
  **Erasure request** (flags the guests for Privacy & GDPR). **Import CSV** in the browser: column
  mapping (auto-guessed), preview with row errors and duplicate warnings, merge duplicates or add as
  new. **Duplicates** lists guests sharing an e-mail or phone and merges them (visits, spend and tags
  combined).
- Rule banner: every guest starts **New** and becomes **Regular** after **15 visits**; **VIP** and
  **Season pass** are assigned by hand.
- Table: Name, Surname, Phone, Email, Visits, Tags, **Edit**, **Profile**; a star marks important guests.
- **Edit user** modal: first name, surname, e-mail (validated), phone, visits this season; automatic
  segment shown read-only; manual segment toggles (VIP — "High-value guest perks"; Season pass —
  "Unlimited entry this season").
- **Guest profile** (`src/screens/users/GuestProfile.tsx`): a side drawer (full screen on phones) with
  tabs — **Overview** (visits, lifetime spend, avg basket, last visit, lifecycle stage, RFM, predicted next
  visit, **Important guest** flag, tags with quick add, segments the guest is in, language / city /
  channel / favourite zone / party size / customer since, tenant **custom fields** such as Birthday and
  Company) · **Bookings** (history with status, export) · **Payments** (charges and refunds) · **Passes &
  loyalty** · **Messages** (confirmations, campaigns, booking notes) · **Notes** (internal staff notes with
  author and time) · **Preferences** (zone, sunbed, party size, arrival time, accessibility needs,
  preferred contact) · **Privacy** (per-channel marketing consent with date and source, change logged;
  **Export guest data**, **Request erasure**, link to Privacy & GDPR). Actions: **New booking** (opens
  Manual / Phone Booking prefilled), **Message** (Communicate), **Resend QR** (simulated), **Edit
  details**. Notes, preferences, consent, custom fields and the important flag persist in `localStorage`.
- The demo customer's purchased passes show as pass-derived tags (wallet icon).

### A-07 · Reporting & Analytics [MVP]

```text
 ┌───────────┬─────────┬───────────┬──────────┬──────────┬───────────┬─────────┬───────────┬──────────┬──────────┐
 │ Executive │ Revenue │ Occupancy │ Bookings │ Channels │ Customers │ Tickets │ Operations│ Payments │ Invoices │
 └─────┬─────┴────┬────┴─────┬─────┴────┬─────┴────┬─────┴─────┬─────┴────┬────┴─────┬─────┴────┬─────┴────┬─────┘
       │          │          │          │          │           │          │          │
   9 KPIs    capability  heatmap    lead time   channel ×   new vs     ticket    period ─▶
   + charts  zone · tx   time×zone  cancel %    role        returning  history   ops + docs
       │
       └─ insight from the period ("Weekends run 21% fuller…") ─▶ [Set a rule] ─▶ A-02

 one period control for all tabs (X-11, default Season) · every tab ─▶ [Export CSV] as displayed
```

Ten tabs, all following one **period control** (X-11: Day / Week / Month / Year / Season / Custom,
default Season, kept when switching tabs and in the URL). Each tab exports to CSV exactly as displayed,
with the dates in the title rows and file name. Season and Year compare with the same dates last year;
shorter periods with the previous equal-length window. A period with no open days (off-season) shows
a "beach was closed" empty state.

1. **Executive** — starts with **Bookings, payments & AADE** (AENR-521, below), then Revenue, Bookings, Avg occupancy, Online share, Refund rate, RevPATB, ADR,
   Ancillary attach, No-show; revenue over time (hours / days / weeks / months by range length),
   revenue mix, booking pace vs the same period last year; an insight computed from the period
   (weekend vs weekday fill, busiest zone) → **Set a rule** opens Availability & Pricing.
2. **Revenue** — by capability, sunbed revenue by zone, latest transactions.
3. **Occupancy** (`src/screens/reporting/OccupancyTab.tsx`, `src/data/occupancy.ts`) — filters:
   capacity (sunbed sets / day lockers / parking), days (all / weekdays / weekends), zone, sunbed type
   (standard / front row / cabana), channel. KPIs with deltas: avg and peak occupancy, sold-out days,
   RevPATB, ADR, no-show rate. Occupancy over time vs last year (dashed); by zone; when the beach fills
   up (by hour); weekday × hour heatmap; zone × time heatmap; beach map coloured per set (hot / cold
   sets); booked vs checked in vs no-show per zone; 14-day on-the-books forecast vs last year with
   **Set a pricing rule**; sold-out zones and how early; all metrics by zone. CSV exports all of it.
4. **Bookings** — avg lead time, online vs other, cancellation, sets/booking; volume over time.
5. **Channels** (`src/screens/reporting/ChannelsTab.tsx`, `src/data/channelReport.ts`) — a scorecard per
   channel (Online / Walk-in / Phone / Cashier: revenue and change, share, bookings, avg basket, items per
   booking, lead time, cancellation / refund, no-show, new guests, fees and net) with **View bookings**
   (opens Bookings filtered by that channel and the same dates); sortable comparison table; revenue by
   channel over time; share donut; product mix per channel; sales by staff member; bookings by hour and
   weekday per channel; online funnel (visits → plan started → checkout → paid). Totals reconcile with
   the Executive tab.
6. **Customers** — new vs returning, season-pass holders, VIP segment revenue, top customers (scaled
   to the period).
7. **Tickets** — ticket history within the period.
8. **Operations** (renamed from Daily ops) — totals per capability for the period (count, gross,
   refunds, net) and documents issued (ΑΠΥ / ΤΠΥ / credit notes ΠΑΠΥ·ΠΤΠΥ, pending transmission); **By day** switch adds a breakdown per day (per week /
   month for long ranges) whose rows add up to the totals; exported with the CSV.

**Overview · Payments · Invoices (AENR-521)** — modelled on a benchmark beach-admin dashboard, in the
app's own palette (`src/screens/reporting/FinanceTabs.tsx`, `src/data/finance.ts`). The period is read
as **arrival (visit) dates**; a **Section** chip row (All + each store, in the URL as `?section=`) filters
all three; **Export CSV** and **Export PDF** (a one-page PDF with the key figures and the main table).

- **Overview** (top of Executive): Sunbed bookings (confirmed sets, avg/day, peak day) · Captured
  payments & revenue (captured + service fees, number of captures) · Transmitted to AADE
  (transmitted / issued, %, pending badge, "View documents" → Invoices); confirmed sets per arrival day
  (weekday / weekend colours, average line); table by section (bookings, share, captured, transmitted).
- **Payments**: total transactions · captured value · service fees with a per-fee breakdown (units × rate)
  · platform fees (before VAT) · VAT on platform fees (settlement frequency) · Stripe / bank fees (≈ % of
  captured; demo 1.5% + €0.25) · Stripe payouts (paid, in transit) · saved-cards usage; saved vs new card
  bar; recent payouts (date, masked bank, amount, Paid / In transit / Scheduled); daily trends (avg
  transactions and revenue per day, peak day, chart with average). A note shows the active fee model.
- **Invoices**: ΑΠΥ (receipts), ΤΠΥ (invoices), ΠΑΠΥ / ΠΤΠΥ (credit notes) with count and %; transmitted
  via the tenant's e-invoicing provider (Elorus by default) with pending count; total; distribution bar;
  table by section with count and % per type.
- Numbers come from the deterministic sample generator per section and day (so rows add up to the totals)
  plus the Cashier till's real demo activity (card captures, ΑΠΥ, credit notes on refunds, pending
  transmissions) on the business day. Ticket-only till sales report under "Entrance (tickets only)".
- The **fee model** comes from the tenant's settings (P-01 › Fees): changing a fee changes the report.
- The **Accountant** has the same Payments and Invoices reports read-only (`#/accountant/reports`).

### A-08 · Refunds [MVP]

```text
 ‹ [All dates] [Day] [Week] [Month] [Season] [Custom] ›   KPIs: refunded · pending · rate · top reason   [Export]
 #TX-88210 · date · name · amount · reason · Pending ──▶ [Refund]
                                                            │
        ┌───────────────────────────────────────────────────┘
        ▼
 ┌─ Issue refund ─────────────────────────────────┐
 │ Refund type ◆ Full  │  Partial (€1 … charge)   │
 │ Reason ◆ Weather · Double booking ·            │
 │          Customer request · Service issue      │
 │ note: reverses the fee, issues a credit note   │
 │              [Refund €X via Stripe]            │
 └────────────────────────────────────────────────┘
        │
        ▼
 Authorizing ─▶ Reversing charge ─▶ MyDATA credit ─▶ E-mailing ─▶ ✓ Refund complete
 with Stripe    + application fee   note (5.1)        customer      re_3PqA2k…f4d

 row becomes Refunded (partial: "−€X refunded") ─▶ credit note in F-01 and C-07
```

- Period control (X-11; All dates / Day / Week / Month / Season / Custom, default Month) filters the
  KPIs, the list and the **Export** CSV.
- KPIs: Refunded in the period (€, count, change — from the shared analytics, so it matches Reporting),
  Pending review and Top reason (from the listed requests), Refund rate (change in pp).
- Table: Transaction, Date, Name, Surname, Phone, Amount (partial refunds show "−€X refunded"), Reason,
  Status (Pending / Refunded), **Refund** action.
- **Issue refund** modal: Refund type (Full / Partial — amount between €1 and the charge, with helper
  text), Reason (Weather / Double booking / Customer request / Service issue), note "Reverses the
  application fee and auto-issues a credit note to MyDATA" → **Refund €X via Stripe** → animated steps:
  Authorizing with Stripe → Reversing the charge & application fee → Issuing MyDATA credit note (5.1) →
  E-mailing the customer → **Refund complete** (Stripe refund id).

### A-09 · Privacy & GDPR [MVP]

Roles: the tenant (beach operator) is the **controller**; Slaice is the **processor**. Code:
`src/screens/privacy/*`, rules in `src/domain/gdpr.ts`, seeded state in `src/data/gdpr.ts`
(`privacy` slice of the app store).

```text
 banners: breach on the 72h clock · new DPA version to sign · new sub-processor (objection window)
 KPIs: open requests (overdue) · due ≤ 10 days · avg resolution · open breaches   — all from the data
 [Requests] [Consent] [Policies & cookies] [Register & DPIA] [Retention] [Processors & DPO] [Breaches]

 Request: Received ─▶ Verifying identity ─▶ In progress ─▶ (Extended +1/+2 mo) ─▶ Completed | Refused
          due = received + 1 calendar month (31 Jan → 28/29 Feb); extension needs a reason + notice
          inside the first month; refusal records the ground + complaint-rights notice (Hellenic DPA)
          steps per type · Art. 19 "Notify recipients" · every action → audit trail (exportable)
```

- **Requests (AENR-484):** one queue for requests from the customer Privacy Centre (verified by the
  account login) and requests staff log from e-mail, phone or in person. Types: Access, Portability,
  Rectification, Erasure, **Restriction** (Art. 18, separate from Objection), Objection. Overdue
  requests are flagged at the top. Identity verification records method, who and when. Rectification,
  erasure and restriction include **Notify recipients** (Stripe, messaging provider, accountant
  export). Completing a restriction flags the guest **Processing restricted** (shown on the guest
  profile; Communicate sends them nothing); completing an objection withdraws their marketing
  consents.
- **Consent (AENR-485):** an append-only **consent log** per guest — purpose, granted / withdrawn,
  source (cookie banner, Privacy Centre, checkout, staff, unsubscribe link, sign-up), wording and the
  notice version. It is the single source of truth: Communicate, the guest profile and the Privacy
  Centre all read it. Opt-in rates and withdrawals are computed from it; drill into one guest's
  history.
- **Policies & cookies (AENR-485):** privacy and cookie policies are versioned (Draft → Published →
  Superseded, effective date, changelog). Publishing a **material** privacy-policy change re-asks
  returning customers in the cookie banner; their new choice records the new version. A cookie
  inventory (name, provider, category, purpose, duration, first/third party) feeds the banner's
  Manage view and the cookie policy. The banner's policy links open the published policies.
- **Register & DPIA (AENR-486):** editable Art. 30 record — every mandatory field validated
  (purpose, lawful basis, data subjects, personal data, recipients, transfers + safeguard, retention
  linked to the Retention tab, security measures); legitimate-interest activities can't be saved
  without an **LIA** (purpose, necessity, balancing tests, outcome, review date); profiling flagged
  (disclosed in the notice, objectable). DPIA register with the EDPB screening criteria (two or more →
  DPIA likely required), status, owner and review date; seeded for gate CCTV and customer profiling.
  Export as CSV and PDF.
- **Retention (AENR-486):** schedule per category (tax-mandated rows locked, incl. a child-ticket row);
  every change is logged (who, when, old → new); **Run anonymisation** logs a run with record counts;
  nightly scheduled runs are listed.
- **Processors & DPO (AENR-487):** the DPO / privacy contact (shown in the Privacy Centre and the
  notice); the Slaice DPA (version, signed date, PDF, re-sign when Slaice publishes a new version);
  Slaice's sub-processors (read-only) with location, **transfer safeguard** (EU, adequacy, EU-US DPF,
  SCCs) and TIA; new sub-processors show a 30-day objection window with **Object**.
- **Breaches (AENR-488):** every incident documented (facts, data, people and records affected,
  consequences, measures, risk). A **72-hour clock** runs from awareness — or from Slaice's
  notification for processor incidents. The draft to the Hellenic DPA carries every Art. 33(3)
  element and can be filed in phases. High-risk incidents need a plain-language message to the people
  affected, sent through Communicate. An incident can't be closed without a notifiable yes / no
  decision and its reason.
- **Customer side:** Privacy Centre with per-channel marketing consent (e-mail, SMS, Viber, push),
  requests for access, rectification, restriction, objection and erasure (they land in the queue),
  open requests, the DPO contact and policy links, and a children's-data section. Accounts need an
  **18+ confirmation** at sign-in and at checkout sign-in (AENR-489); child tickets record only type
  and count.
- **Platform › Compliance & DPA:** Slaice adds sub-processors (TIA required outside the EU; every
  tenant is notified), publishes DPA versions, and reports incidents to the affected tenants, which
  then appear in each tenant's breach register.

### A-14 · RBAC — staff users & roles [MVP]

```text
 [Search] [Role ▾] [Status ▾]                                        [+ Add user]
 Name · e-mail │ Phone │ Role │ Status (Active / Invited / Suspended) │ Last sign-in │ [View as] [⋯]
                                                                         ⋯ ─▶ Edit · Simulate acceptance
                                                                              · Suspend (reason) · Reactivate · Delete
 What each role can open: Admin · Call Center · Cashier · Controller · Accountant ─▶ [View as role]
 Audit trail: who changed what, when

 View as ─▶ banner "Viewing as <name> · <role> — Exit preview" ─▶ nav = that role's pages only
          └─ any other page ─▶ Access denied ─▶ [Go to my start page]
```

- **Users:** search; filter by role and status; table of name/e-mail, phone, role, status (with the
  suspension reason), last sign-in.
- **Add user:** name, e-mail (validated, unique), phone, role (radio cards with what each role does) →
  **Invited** (invitation simulated) → **Simulate acceptance** → **Active**.
- **Edit**, **Suspend** (reason required) / **Reactivate**, **Delete** (confirmation). The last active
  Manager / Admin can't be suspended, deleted or given another role.
- **Roles → pages** come from `NAV` in `src/data/personas.ts` (one source). Platform / Slaice is not a
  tenant role.
- **View as** a user or a role: the app shows only that role's pages, with a persistent banner and
  **Exit preview**; opening any other page shows **Access denied**. The persona switcher is hidden
  while previewing. Only active users can be previewed.
- Every change is listed in the **Audit trail**. Users, audit and the preview persist in
  `localStorage` **[DEMO]** — enforcement is client-side navigation filtering.

### A-10 · Communicate [Future]

```text
 ┌─ 1 · Channels ───────────────────┐  ┌─ 2 · Compose campaign ───────────────┐
 │ Push    ● connected (in-app)     │  │ Audience ◆ All · VIP · Regulars ·    │
 │ E-mail  ○ [Set up channel]       │  │   Season pass …  ─▶ est. reach       │
 │ Viber   ○ [Set up channel]       │  │ Channel ◆ Push · E-mail · Viber · SMS│
 │ SMS     ○ [Set up channel]       │  │   not connected? ─▶ [Set up →]       │
 ├──────────────────────────────────┤  │ Message ◆ promote a loyalty offer    │
 │ provider ◆ ─▶ API key / token    │  │   (pre-filled) or write your own     │
 │ ─▶ sender ─▶ [Connect & verify]  │  │ channel-true preview                 │
 │ ─▶ SPF+DKIM / Viber approval /   │  │ [Review] ─▶ [Send to N users]        │
 │    sender-ID rules ─▶ ● connected│  │         ─▶ ✓ Campaign sent           │
 └──────────────────────────────────┘  └──────────────────────────────────────┘
 Loyalty (A-11) [Promote] ──▶ lands here with the offer pre-loaded   [DEMO] keys never stored
```

- **Channel connections:** Push (in-app, connected by default), E-mail, Viber, SMS. **Set up channel**
  modal: provider (E-mail: SendGrid, Mailgun, Postmark, Amazon SES, Custom SMTP · Viber: Viber Business
  Messages, Vonage, Infobip · SMS: Twilio, Vonage, Apifon (GR), Infobip), credential (API key/token),
  sender (from-address / sender name / sender ID) → **Connect & verify** with provider-specific steps
  (e.g. SPF + DKIM for e-mail, Viber approval, sender-ID regulations). Disconnect. Keys are never stored
  **[DEMO]**.
- **Compose campaign:** Audience segment (All users / VIP / Regulars / Season pass…) with estimated
  reach, Channel (Push / E-mail / Viber / SMS, connection dot; warning + "Set up →" if not connected),
  **Promote a loyalty offer** (pre-fills the message) or write a custom message, channel-true
  **preview** → **Review campaign** → **Send to N users** → "Campaign sent". A promoted offer's CTA can
  open the customer view.
- Deep link from Loyalty → **Promote** pre-loads the offer.

- **Tabs (AENR-490 / 492):** Compose · Messages · Campaigns · Automations · Channels & rules (tab kept in
  the URL as `?tab=`). A **demo clock** (+1 hour, +1 day, _Jump to next send_; also advances in real
  time) drives scheduled sends while the app is open.
- **Messages library (AENR-490):** saved messages with thumbnail, channels, languages, promo code,
  status Draft / Ready; create, edit, duplicate, archive / restore, _Use in campaign_. Editor: name,
  channels, language versions EN (required) / EL / DE / FR / ES / IT (others fall back to English),
  title + text with **bold** / _italic_, personalisation tokens `{first_name}` `{favourite_zone}`
  `{points}` `{beach}` with fallback values, an image from the library (tenant images, zone logos,
  uploads compressed in the browser) with **required alt text** and a crop focus shown at each
  channel's ratio, a CTA (Plan my visit / promotion / pass / URL), loyalty offer + promo code, and
  _Send test to me_ **[DEMO]**. Channel-true previews: e-mail (mobile / desktop), Viber, rich push
  (title/text limits), SMS (text only, short link, character + part counter; image dropped with a
  warning). An opt-out footer is added on every channel.
- **One delivery model (AENR-492):** campaigns and automations share the same guardrails — consent per
  channel (with a fallback order for automations), quiet hours (default 21:00–09:00; push / Viber /
  SMS move to the end, e-mail exempt), a frequency cap across both (default 2 promotional messages per
  7 days) and skipping guests with an open refund. Every send writes one log line per guest
  (delivered or the skip reason), shown in the guest profile's **Messages** tab.
- **Campaigns:** Send now, Schedule (date + time, Europe/Athens) or Recurring (weekday + time between
  two dates — one send per occurrence, each with its own results). The audience segment is evaluated
  at each send; estimated reach is stored at scheduling. List and month **calendar**; statuses
  Scheduled / Sending / Sent / Paused / Cancelled; pause, resume, cancel, duplicate, skip one
  occurrence. Results: delivered, opened (not for SMS), clicked, bookings and revenue attributed,
  unsubscribes, skips — sample data.
- **Automations:** list (status Active / Paused / Draft, trigger, audience, sent, conversions), create
  from templates or scratch. Builder: trigger (booking confirmed, before / after the visit, no visit
  for N days, birthday, checkout abandoned, points reached, pass expiring, **low occupancy forecast**
  for a zone and weekday checked on a set day and time, sunny weekend, enters a segment) → conditions
  (segment, language, favourite zone) → delay → message steps from the library (optional follow-ups N
  days later) → channel fallback order → active window. _Simulate trigger_ **[DEMO]** (low occupancy:
  live forecast or an assumed %); each occurrence fires once; pausing stops new sends immediately;
  activity log per automation.

### A-11 · Loyalty [Future]

```text
 ┌ Visit      ┐┌ Happy hours ┐┌ Tiered     ┐┌ Bundle ┐┌ Bring a ┐┌ Birthday ┐┌ + Custom ┐
 │ milestones ││ & early-bird││ membership ││ perks  ││ friend  ││ week     ││ scheme   │
 └─────┬──────┘└──────┬──────┘└─────┬──────┘└───┬────┘└────┬────┘└────┬─────┘└────┬─────┘
       └──────────────┴─────────────┴───────────┼──────────┴──────────┴───────────┘
                                                ▼
  [Configure] ─▶ typed fields ─▶ [Save] ─▶ [enable / pause] ─▶ Home "Your rewards" (C-02)
                                     └──▶ [Promote] ─▶ Communicate, pre-filled (A-10)

  TIMED OFFERS   reward ─▶ store ─▶ when ◆ weekday mornings · weekends · all month ·
                 happy hour 17–19 · date range ─▶ [Publish offer] ─▶ list (remove)
  REGULARS       5+ visits 10% off │ 10+ 15% + coffee │ 20+ VIP front row + parking
                 ─▶ audience counts ─▶ channel ─▶ send
```

- **Scheme cards** (pick to set up): Visit milestones, Happy hours & early-bird, Tiered membership,
  Bundle perks, Bring a friend, Birthday week, plus **Add a custom scheme**. Each card: blurb, example,
  configured summary, **enable/pause** toggle, configure, **Promote** (→ Communicate). Custom schemes
  can be removed.
- **Config modal** per scheme with typed fields (select / number / time / text) — see §17.7.
- **Timed offers:** reward (e.g. 20% off sunbeds), store (All stores / a zone), when (Weekday mornings /
  Weekends / All month / Happy hour 17:00–19:00 / Specific date range) → **Publish offer**; list with
  remove.
- **Send offer to regulars:** visit-based tiers (5+ visits → 10% off; 10+ → 15% off + free coffee; 20+ →
  VIP: front row + free parking) with audience counts, channel picker.
- Enabled schemes appear on the customer Home "Your rewards" tile.

### A-12 · Passes [Future]

```text
 ┌─ Tab · Pricing ────────────────────┐  ┌─ Tab · Card designer ──────────────┐
 │ VIP packs  €500  €1,000  [+][–]    │  │ Designs: VIP credit · Season pass  │
 │ Spend discount  20 %               │  │ edit on the live card: colours ·   │
 │ Season monthly €120 · summer €350  │  │ wave · texts · logo (drag) · QR    │
 │ [Save pricing] ─▶ C-08 / C-09 live │  │ Draft ─▶ [Review & publish] ─▶     │
 └────────────────────────────────────┘  │ Apple + Google renditions ─▶ ✓     │
                                         └────────────────────────────────────┘
 [GAP] published card designs don't drive the customer's cards yet
```

- **Pricing tab:** VIP **credit packs** (add/remove packs), **spend discount** (%), Season **Monthly (€)**
  and **Whole summer (€)** → **Save pricing** (live on the customer purchase flow).
- **Card designer tab:** a list of card designs (VIP credit, Season pass; duplicate). Edit on a live
  card: background top/bottom colours, wave accent, text elements (title, subtitle, holder, number,
  valid-until: text, size, colour, tracking), **logo** (upload/replace, size %, drag to position),
  **QR** (show/hide, size, drag). Draft → **Review & publish** (preview incl. Apple Wallet and Google
  Wallet renditions) → published.
- **[GAP]** published designs do not yet drive the customer's cards.

### A-13 · Gamification [Future]

```text
 ┌─ Badges ───────────────────────────────────────────────────────────────────┐
 │ First Splash  [icon ▾] [colour: sun ▾]  When [visits ▾] reaches [ 1 ]  [–] │
 │ Sun Seeker    …                              visits             5          │
 │ Big Spender   …                              spend (€)        500          │
 └────────────────────────────────────────────────────────────────────────────┘
 [+ Add badge] ─▶ [Save badges] ─▶ Home "Your badges" (C-02)
                                   earned = colour · locked = grey + lock + progress
```

- Achievements list: name, icon (curated summer set), colour (sun, coral, gold, teal, sky, sea), rule
  "When **visits / bookings / spend (€)** reaches **N**". Add / remove, **Save badges** (live on the
  customer Home).
- Seed badges: First Splash (1 visit), Sun Seeker (5), Big Spender (€500), Beach Regular (10), Wave
  Rider (20), Summer Legend (30).

---

## 10. User journeys — Cashier

### K-01 · Issue on-site ticket — the till [MVP]

```text
 shift strip: SH-0205 · cashier · till · since 09:00   ● Online / Offline (n queued)  [Simulate offline]
 ┌─ Quick keys ─────────────────────────────────────────────┐   ┌─ Basket ─────────────────────┐
 │ [1 Adult] [2 Adults] [Adult+Child] [2 Residents] [1 set] │   │ 2 × Adult              €20   │
 │ [Couple day · save €5] [Family day · save €10]           │   │ Sunbed set MC-01 · Macaw €35 │
 ├─ 1 · Entry tickets  Adult · Resident · Child · Senior ───┤   │   ⏱ held for this till 4:59  │
 ├─ 2 · Store  Akanthus 48 free · from €30 … Bolivar closed ┤   │ SUMMER10 −€2.50  [promo][Discount]
 ├─ 3 · Sunbeds  live map (free / on hold / booked)  [Any free set]  + Attach customer (optional)
 └──────────────────────────────────────────────────────────┘   │ Total €52.50 (incl. VAT)     │
                                                                │ [Card] [Cash] [Split/voucher]│
                                                                └──────────────┬───────────────┘
   Tender: Card (amount pushed to the terminal; demo outcome approve / decline / time out)
           Cash (Exact · €20 · €50 · €100 · other → change due) · Voucher (balance) · any split
        ▼
   ✓ Paid · R-1006 · ΑΠΥ Α-2406 · MARK …  (change due)   receipt: Print · Email · SMS · Show QR · None
   [New sale]  ─▶  last sale kept 30 s for a quick reprint
```

- **One basket** for entry tickets (Adult / Resident / Child / Senior, prices from the shared
  `TICKET_PRICES`), sunbed sets and **bundles** (Couple day, Family day: one basket line, components on
  the receipt, saving shown as a discount). **Quick keys** make the common sale one tap; a ticket-only
  sale is three taps (quick key → Cash → Exact).
- **Store** chips show live free count and today's from-price (pricing rules applied); closed
  (`CLOSED_STORES`) or full stores are disabled with the reason. **Sunbeds**: the store's live map; only
  free sets can be picked; **Any free set** auto-assigns the best one (front row, then cheapest).
- **Holds:** sets in the basket are held for this till for 5 minutes (On hold in the customer wizard
  and on the other screens), released when removed, cleared or abandoned, and re-checked at payment.
- **Discounts & promo codes** (AENR-508): presets with a reason (Staff −50%, Local group −10%,
  Late afternoon −20% on sets); an open amount needs a **manager PIN**. Promo codes are validated
  (dates, store scope, minimum spend, usage limit) with the reason shown when rejected — e.g. SUMMER10 is
  valid for Central only. Vouchers / gift cards (GIFT-20, GIFT-50) are a tender with a balance.
- **Payment:** card (approved / declined with Retry · Pay cash · Cancel sale / timed out), cash with
  quick-tender buttons and change due, voucher, or any split — "Remaining" is always visible; leaving
  the tender screen keeps the basket and the holds. Nothing is recorded until fully paid.
- **After payment:** the sets become booked for today everywhere (customer wizard, Admin › Bookings
  with channel Cashier), the ΑΠΥ goes to myDATA (simulated MARK; _pending_ offline; demo failure), and
  the cashier picks the receipt: Print, Email, SMS, Show QR or No receipt.
- **Shift required:** selling needs an open shift (K-03); without one the page shows the open-shift
  form.
- **Offline** (AENR-510): demo toggle in the shift strip. Sales continue; card is capped at €50 per sale
  and €200 in total; sunbeds come from the cached map with a warning; ΑΠΥ issued locally (pending).
  **Reconnect** syncs the queue ("Syncing n sales…"); a set booked online meanwhile is a conflict to
  resolve in Transactions (move to another free set, or refund it with a manager PIN).

### K-01a · Today's transactions [MVP]

- Every till sale of the day (`src/screens/cashier/Transactions.tsx`): time, receipt, items, total,
  tender, how the receipt was sent, status (Completed / Part refunded / Refunded / Voided) and myDATA
  status (Sent / Pending / Failed). Search by receipt no., last 4 card digits, amount or phone.
- Open a sale (side panel): the receipt (tenant legal details, items, VAT, tenders, change, ΑΠΥ and
  MARK + QR, entry QR, set IDs); **Reprint** (marked COPY, same ΑΠΥ / MARK), **Email**, **SMS**, **Retry**
  a failed myDATA transmission, and **Void / refund** (AENR-506):
  - whole sale or single lines (ticket quantities, single sets); **void** when the sale is in the open
    shift, otherwise **refund** with a credit note linked to the original ΑΠΥ; back to the original
    tender; reason required (note for Other); warning if entry tickets were probably already used;
  - a **manager PIN** is needed without refund permission, for any cash refund and above €50 (demo PINs
    1234, 5678); a wrong PIN changes nothing;
  - refunded sets are free again for today; refunds show in Admin › Refunds with channel Cashier,
    reason and approver; the shift's expected cash drops for cash refunds.
- Demo switch: **fail next myDATA transmission**.

### K-02 · Redeem ticket [Future]

```text
 ┌─ Ticket code ─────────┐
 │ TK-55119              │ ──[Redeem ticket]──▶ ◆ already used?
 └───────────────────────┘                       ├─ no  ─▶ ✓ Valid — admitted
                                                 └─ yes ─▶ ✗ Already used — cannot reuse
                                                              (mock: code contains "used")
 ─▶ Recent redemptions list
 online QR tickets are scanned by the Controller instead (G-01)
```

- Enter a ticket code/number (e.g. `TK-55119`) → **Redeem ticket** → "Valid — admitted ✓" or "Already
  used — cannot reuse" (mock rule: codes containing "used" are already used).
- Recent redemptions list. QR scanning is not required for cashier-issued tickets; online QR tickets
  are scanned by the Controller.
- Roadmap preview: Future badge, the roadmap banner under the header and a Future dot in the nav, like
  Cash Register and Sell Locker.

### K-03 · Cash register — shift & drawer [Future]

```text
 NO SHIFT ──[Open shift: cashier · till · float]──▶ OPEN SHIFT ──[Close shift (Z)]──▶ CLOSED (locked)
                                                        │
   expected cash = float + cash sales + paid in − paid out − cash refunds
   KPIs: expected cash · card · sales · refunds/voids     tender mix (card / cash / voucher)
   ledger: float · sales · refunds · voids · paid in / out · no sale
   [Paid in] [Paid out] [No sale (manager PIN)]   [X report] (snapshot)   [Close shift (Z)]
   Z close: blind count → expected / counted / variance (note required above €2) · card batch ✓
```

- Roadmap preview (Future badge and banner) but fully working, because Issue Ticket needs an open
  shift. **Open shift** with cashier, till and opening float. During the shift: live totals by tender,
  sales, refunds / voids and discounts; **Paid in / Paid out** with reason; **No sale** drawer opens need
  a manager PIN and are logged.
- **X report**: read-only snapshot (sales, discounts, voids, refunds, tenders, ticket counts by
  category, sets by store, float, paid in / out, cash refunds, expected cash).
- **Close shift (Z)**: optional blind count, then expected vs counted and the variance; above the €2
  tolerance a note is required. The Z report is shown and the shift is locked; selling needs a new shift.
- **Past shifts** with variance and their Z reports; managers also see them in Admin › Reporting ›
  Operations.

### K-04 · Sell a locker [Future]

```text
 Locker bank ◆ A Entrance €5 · B Pool side €5 · C North gate €5 · D Family €7 · E Premium €9
                              (each shows free / 30)
        │
        ▼
 ┌─ Bank A · Entrance ──────────────────────────────────────────┐
 │ A01 A02 A03 A04 A05 A06 A07 A08 A09 A10                      │
 │ [ ] [x] [ ] [ ] [x] [ ] [*] [ ] [ ] [x]      [ ] free        │
 │ A11 A12 …                                    [x] taken       │
 │                                              [*] selected    │
 └──────────────────────────────────────────────────────────────┘
        │
        ▼
 [Charge €5] ─▶ ● "Locker sold · A07" + QR slip ─▶ [Print slip]
                  └─ locker marked taken · ΑΠΥ auto-issued
```

- **Locker banks** (A Entrance, B Pool side, C North gate — €5; D Family area — €7; E Premium — €9),
  30 lockers each, showing free/total.
- Grid of lockers (free / taken / selected) → **Charge €X** → "Locker sold · A07" with QR slip →
  **Print slip**. Inventory is marked taken; ΑΠΥ auto-issued.

---

## 11. User journeys — Controller

### G-01 · Gate validation [MVP]

```text
 ┌─ Viewfinder ──────────┐
 │   [  QR in frame  ]   │
 │ ───── scan line ───── │ ──[Scan QR]──▶ Scan result modal ─▶ ◆ result (random [DEMO])
 │                       │
 └───────────────────────┘
      ├─ Valid ─────▶ "admit the guest" ─▶ [Admit guest] ─▶ ✓ Admitted — gate opened
      ├─ Already used ▶ "validated earlier today" ─▶ [Override & admit] (only if sure)
      └─ Invalid ───▶ "not recognised — do not admit" (no admit button)

 ─▶ Recent validations (tap a row for detail): #BK-… / #TK-… · zone·set · state
 Gate analytics: scanned 1,284 · 312/hr (peak 11–13) · no-shows 2.8% · duplicates 4
 Other actions:  [Walk-in sale] G-03 · [Add ticket (pay on site)] G-03 · [Beach status] G-02
```

- **Scan QR** (camera viewfinder simulation with scan line) → **Scan result** modal:
  - **Valid** — "admit the guest" → **Admit guest** ("✓ Admitted — gate opened").
  - **Already used** — "validated earlier today. Override only if you're sure" → **Override & admit**.
  - **Invalid** — "not recognised — do not admit" (no admit button).
  - Scan outcomes are random in the mockup **[DEMO]**.
- **Recent validations** list (tap for detail): booking/ticket id, zone·set or ticket type, state badge.
- **Gate analytics:** Scanned today 1,284, Throughput 312/hr (peak 11:00–13:00), No-shows 2.8%,
  Duplicate scans 4; throughput by hour chart.

### G-02 · Beach status — scan a set, check in, release [MVP] (AENR-499)

```text
 [Today | Tomorrow | date]  Store ◆
 ┌─ Scan QR (demo camera) ─┐   or type a code (autocomplete, CE-12)
 └─────────────────────────┘   or tap any set on the map (every state can be opened)
 ─▶ Set panel: CE-12 · status badge · store · type · price for the date · booking (ref, guest, paid)
      [Check in] (booked) · [Release for the rest of the day] (booked / vacated) · [Walk-in sale on CE-12] (free)
      Set status: Put on hold · Out of service · Make available · Mark vacated   (+ reason / note)
      History: every change with who, when, reason
```

- Find a set by its **QR label** (`SET:<code>`, printed from Admin › Beach › Sunbeds & pricing ›
  _Print QR labels_), by typing its code (case-insensitive, validated) or by tapping it. A booking /
  ticket QR is recognised and told apart; an unknown code says so.
- **Statuses** (`src/domain/sunbedOps.ts`): Available, Booked, Occupied (checked in), Vacated, On hold,
  Out of service. Only valid transitions are offered; hold, out of service and freeing a booked set need a
  reason (Broken · Cleaning · Weather · Private event · Other + note). Several sets can be changed at once.
- Changes apply to the chosen date and update **every map live** — the booking wizard, the Cashier till
  and the walk-in sale — and are kept in the set's history.

### G-03 · Walk-in sale on the beach [MVP] (AENR-528, AENR-527)

```text
 Scan / type / tap the free set ─▶ Basket: set(s) + optional entry tickets ─▶ [Cash] | [Card · POS]
   Card: choose the POS terminal (Terminal 1 · Entrance / 2 · Bar / 3 · Mobile; offline ones disabled)
 ─▶ one confirmation books the set and records the payment ─▶ ΑΠΥ to myDATA ─▶ receipt (SMS / print / QR)
```

- Uses the Cashier till's sale record (channel _Controller_ or _Support_), so the sale shows in Cashier ›
  Transactions and as a **Walk-in** booking in Admin › Bookings. A set that isn't free (booked, held, out of
  service, kept for another channel) can't be added — the reason is shown.
- **POS terminals** are configured per tenant (Platform › Tenants › Fees & e-invoicing): name and online
  state. The last terminal used is remembered; receipts, Transactions and the X/Z report show the
  terminal, and the Z report splits card takings per terminal.
- The Cashier till has the same **Scan set QR** entry, which jumps to the set's store and adds it.
- The gate page's _Walk-in_ and _Add ticket (pay on site)_ open this page; _Beach status_ opens G-02.

### G-04 · Pay-by-link reservations [MVP] (AENR-534)

For a guest who isn't at the beach yet — Support Agent, Call Center and Admin (`#/…/paylinks`).

```text
 Date ◆ Store ◆ ─▶ tap free sets (+ optional tickets) ─▶ guest (find existing or type) ─▶ SMS / e-mail
   ─▶ Pay within 30 min / 2 h / end of day ─▶ [Reserve & send link · €X]
   ─▶ sets show "Reserved — awaiting payment" in the wizard, the till and every staff map
 Guest opens https://pay.slaice.gr/l/pl-48xx (simulated Stripe page) ─▶ [Pay] ─▶ booking confirmed
   automatically, QR + ΑΠΥ sent, sets Booked, Admin › Bookings channel Pay-by-link
 Not paid by the deadline ─▶ Expired, sets released automatically
```

- **List** with status tabs (Awaiting payment · Paid · Expired · Cancelled), countdown, history; actions
  Open link (the guest's page, with approve / decline demo), Copy, Resend, +30 min (also revives an
  expired one), Cancel.
- Status is derived from the demo clock (`src/domain/payLink.ts`); the page's _+30 min_ advances the same
  clock as the inventory panel, to show expiry.

## 12. User journeys — Accountant

### F-0M · Month-end [MVP] (AENR-588) — the Accountant's landing page

- `#/accountant/monthend` (`?month=YYYY-MM` keeps the choice). Month chips for the season up to today; the
  default is the last complete month, the current month is marked **in progress**.
- Month card: documents issued (gross, VAT), sent to myDATA (pending / rejected), card charges (count,
  fees), payouts (paid, in transit, scheduled) — all from the same ledger as Documents & Payments.
- **Exceptions to clear:** documents rejected by myDATA (blocking), not yet transmitted (blocking for a
  closed month, a check for the current one), payouts in transit, card refunds without a credit note.
  Each opens Documents & Payments filtered to those records (`?tab=…&status=…&from=…&to=…`) or the
  payouts page.
- **VAT summary** by rate from the document lines, and **documents by type**.
- **Export month** in a layout for Generic CSV, Epsilon Net (Pylon), SoftOne or Entersoft (semicolon and
  decimal comma for the Greek packages, UTF-8 BOM, myDATA type codes).

### F-00 · Documents & Payments [MVP] (AENR-526)

- `#/accountant/documents` (old `#/accountant/invoicing` links redirect), read-only, two tabs, with the shared
  period control, section chips, filters (type, myDATA status, channel) and search (number, MARK, receipt,
  amount). Data: `src/data/ledger.ts`, built from the same per-day / per-section figures as Reporting plus the
  demo's real activity (Cashier sales and refunds, online bookings, paid pay-by-links — badged _Live_).
- **Documents**: ΑΠΥ, ΤΠΥ, ΠΑΠΥ, ΠΤΠΥ and cancellations with series / number, date and time, counterparty
  (retail customer, or company + VAT no. for ΤΠΥ), store and channel, net, VAT, total, payment method, MARK and
  status (sent / pending / failed). Credits and cancellations link to the original document and the original
  lists its credits (both clickable in the document view, which also has the lines and a PDF).
- **Payments**: one row per card charge — time, transaction id, booking / receipt, store and channel, card
  brand ···last4 and POS terminal, amount, fee, net, payout date and status (captured / in payout / paid out /
  refunded). Totals equal Reporting › Payments for the same period and section (shown under the totals).
- **Accounting CSV** of exactly the filtered rows (UTF-8, Greek kept): date, time, myDATA type code, type,
  series, number, counterparty and VAT no., net, VAT rate, VAT, total, method, MARK, original document, store,
  channel, status; **CSV per line** for documents; period and filters in the ASCII file name.

### F-01 · e-Invoicing & MyDATA [MVP]

```text
 banner: ΑΠΥ/ΤΠΥ + myDATA records kept 5 years — exempt from customer erasure
 KPIs: docs today 738 (726 ΑΠΥ · 12 ΤΠΥ) · transmitted 100% · cancellations · credit notes
 [All] [Issued] [Cancellations] [Credit notes]   [Search]   sort ▲▼   8/page   [Export]
        │
        ▼
 number · type · MARK · amount · status · date · [View] [PDF]
          │      │      │        │
          │      │      │        └─ MyDATA ✓ · Retry queue (failed transmission) · Issued
          │      │      └─ negatives in red (cancellations, credit notes)
          │      └─ shortened; click to copy
          └─ ΑΠΥ · ΤΠΥ · Cancellation · Credit (5.1)

 [View] ─▶ document viewer                [PDF] ─▶ download
 ┌─ ΑΠΥ-2026-004281 ──────────────────────┐
 │ Akti tou Iliou AE · ΑΦΜ                │
 │ line            Net    VAT 24%   Total │
 │ Sunbed CE-89  24.19     5.81     30.00 │
 │ MARK · invoiceType 2.1 · payment 7     │
 └────────────────────────────────────────┘
```

- Banner: issued ΑΠΥ/ΤΠΥ and their myDATA records are retained **5 years** and exempt from customer
  erasure (legal obligation overrides the right to erasure).
- KPIs: Docs today 738 (726 ΑΠΥ · 12 ΤΠΥ), Transmitted 100%, Cancellations, Credit notes.
- Tabs **All / Issued / Cancellations / Credit notes**, search, sortable columns (Document, Type,
  Amount, Status, Date), pagination (8 per page), **Export** CSV.
- Table: document number, type (ΑΠΥ / ΤΠΥ / Cancellation / Credit (5.1)), **MARK** (shortened, click to
  copy), amount (negatives in red), status (MyDATA ✓ / Retry queue / Issued), date, **View** / **PDF**.
- View modal: issuer, lines with **Net / VAT 24% / Total**, total gross, MARK · invoiceType 2.1 ·
  payment 7.

### F-02 · Commission & Payouts [MVP]

```text
 Season gross      Stripe fees        Slaice 5%          Tenant net
   €704k    ──▶  − €10.2k (~1.5%) ──▶ − €35.2k      ──▶  = €658.6k

 ┌─ Gross → net (this month) ─┐ ┌─ Monthly payouts May–Sep ──────────────┐
 │ gross                      │ │ May   €48k ####                        │
 │ − Stripe fee               │ │ …                                      │
 │ − Slaice 5%                │ │ Aug  €241k ####################  peak  │
 │ = tenant net               │ │ season totals            [Export CSV]  │
 └────────────────────────────┘ └────────────────────────────────────────┘
 VAT by rate: 24% standard · 13% reduced (F&B) · 6% super-reduced
 myDATA transmission health: 99.6% ok
 Payout reconciliation: Stripe balance ─▶ in transit to bank ─▶ fees withheld ─▶ unreconciled
```

- KPIs: Season gross €704k, Stripe fees −€10.2k (~1.5%), Slaice 5% −€35.2k, Tenant net €658.6k.
- **Gross → net (this month)** table; **Monthly payouts** (May–Sep: gross, Stripe fee, Slaice 5%, tenant
  net + season totals); **Export** CSV.
- **VAT collected by rate:** 24% standard, 13% reduced (F&B), 6% super-reduced.
- **myDATA transmission** health donut (99.6% ok).
- **Payout reconciliation:** Stripe balance, In transit to bank, Fees withheld, Unreconciled.

---

## 13. User journeys — Platform / Slaice (super admin)

### P-00 · Tenant pages, View-as, plans and lifecycle [MVP] (AENR-500, 515, 517, 518)

- **Tenant page** `#/platform/tenant/<id>/<section>` (`src/screens/tenant/`, rules in `src/domain/tenants.ts`,
  `src/domain/plans.ts`): the single place for a tenant's settings. The Platform sidebar lists every tenant
  (status dot, pinned first, search, collapse; tenants still onboarding under _In onboarding_, opening the
  wizard at their step; closed tenants drop out). **⌘/Ctrl K** opens a switcher (name, subdomain, ID, ΑΦΜ;
  recent first) that keeps the current section.
- **Header**: logo, name, tenant ID (copy), lifecycle badge (tooltip with reason, date and actor), plan,
  environment tag (Sandbox / Demo — excluded from portfolio MRR unless switched on), data region, account
  manager; **⋯** menu — View as tenant user, Preview customer site, Send onboarding / remediation link, Copy ID,
  Export data, Suspend / Reactivate.
- **Sections** come from a registry (id, label, icon, group, edit permission, badge): _Account_ — Overview
  (Actions required ordered by severity with Send link / Tenant completed it, KPIs, health, activity), Profile
  (+ contacts by role, ownership transfer), Contract & account, Subscription & billing, Usage & limits;
  _Product_ — Modules, Locations & capacity, Branding & domain (DNS verify), Localisation, Release channel;
  _Money_ — Payments (Stripe flags and requirements, fees & POS terminals, payout schedule), Invoicing & tax;
  _Access & trust_ — Users & roles (+ Slaice access, support grant, View-as history), Security, Compliance,
  Integrations; _Support_ — Support (tickets, internal notes, one timeline), Health score (transparent 0–100
  with weights), Audit log (actor type, filters, CSV), Data export (Queued → Preparing → Ready, 7-day links),
  Danger zone. Every section has loading, error (demo switch in ⋯), read-only (Slaice role Viewer / Support)
  states; edits are a draft with Save, sensitive fields ask for a reason and go to the Audit log with old → new;
  leaving a dirty section asks first.
- **Plans** (Super Admin › Plans): Starter / Pro / Resort Group with price, modules, limits (hard / soft) and
  commission; editing creates a new version and tenants stay on theirs until _Migrate_. **Change plan** on a
  tenant previews gained / lost modules, limits that would be exceeded (hard limits block) and the prorated
  amount. **Modules** show their source — plan, override (reason, expiry; reverts and is logged on expiry),
  beta or blocked (e.g. Payments without Stripe charges); the Super Admin matrix edits the same overrides.
  **Usage meters** show ≥ 80% Near limit and ≥ 100% Over limit in text. MRR is derived from plan + add-ons.
- **View as tenant user**: reason (≥ 10 chars), ticket, scope (read-only default / read & write), role,
  15–60 min. Starts at once if the tenant granted support access, else sends an owner request (demo approve /
  decline; requests expire after 7 days); break-glass for Slaice Admins is flagged Emergency. A persistent
  banner shows tenant, role, scope and the countdown (warning at 2 min, auto-end, demo −10 min). Read-only
  disables mutating controls; payouts / bank / exports / plan / refunds are blocked in every session; customer
  phones are masked with a logged Reveal; pages and changes (e.g. ticket price €10 → €11) go to the tenant's
  Audit log as “Slaice staff while viewing as”. Ending returns to the tenant page (focus back on ⋯) with a
  summary; Super Admin › Support access log and the tenant's RBAC page (“Slaice support accessed your account”)
  list every session.
- **Lifecycle** (Danger zone): onboarding → live ⇄ paused by tenant / suspended by Slaice → offboarding →
  closed, allowed transitions only. **Suspend** with reason, impact (online / cashier / staff sign-in), the
  customer-site message and now / in 7 days, type-the-name confirmation — the customer site (Preview customer
  site) shows the message and takes no bookings, the till can be paused, existing tickets still validate at the
  gate. **Reactivate** shows what is restored. **Offboard** runs 7 steps — confirm, export, settle money (a
  pending payout fails the step until retried), disconnect integrations, revoke access, retention window 30 / 90
  days (restorable, “Offboarding · deletes on …”), then automatic deletion to **Closed** with a downloadable
  deletion certificate (legal records retained). A demo clock (+7 / +30 / +90 days) drives expiries.
- **Tenants (P-01)** becomes a portfolio view: KPIs and MRR from plans, saved views (Needs attention, In
  onboarding, Renewing in 30 days, At risk, Over limit, Trial ending, Closed), filters, search, plan / health /
  actions columns, CSV; rows open the tenant page. **Onboarding (P-02)** saves progress per tenant and _Go live_
  lands on the new tenant's Overview. **Compliance (P-04)** rows open each tenant's Compliance section.

### P-01 · Tenants [MVP]

```text
 KPIs: active tenants · pipeline · GMV €704k · Slaice fees €35.2k
 SaaS: MRR €18.6k (ARR €223k) · NRR 112% · churn 1.1%/mo · ARPA €1,062

 ONBOARDING FUNNEL                                     avg time-to-activate 6.5 days
   Leads         48  ########################
   Trials        22  ###########
   KYC passed    14  #######
   Live          11  ######                      (# = 2 tenants)

 TENANT LIFECYCLE    Lead ──────▶ Setup ──────▶ Live
 STRIPE STATUS       pending ─▶ onboarding ─▶ KYC review ─▶ charges ✓

 [Onboard tenant] ─▶ P-02
 Tenants table ─▶ [Edit] ─▶ name · subdomain · Stripe · status · MRR · modules ─▶ [Save]
 Capability flags · Akti tou Iliou (MVP on / roadmap off) ─[Manage in Super Admin]▶ P-03
```

- **Onboard tenant** → P-02.
- KPIs: Active tenants (Live), Pipeline (Setup + Lead), Platform GMV €704k, Slaice fees €35.2k; SaaS
  metrics: MRR €18.6k (ARR €223k, sparkline), Net revenue retention 112%, Logo churn 1.1%/mo, ARPA
  €1,062.
- **MRR · last 12 months** line chart (AENR-589): built from each tenant's go-live date and current plan
  - add-ons, so it only rises when a tenant goes live; the current month is dashed (month to date) and
    the caption shows MRR now and ARR. `#/platform/tenant` without an id opens the last tenant viewed, or
    the Tenants list (AENR-590). **Onboarding funnel** (Leads 48 → Trials 22 → KYC passed 14 → Live 11; avg
    time-to-activate 6.5 days).
- Tenants table: name, subdomain, Stripe status, modules, MRR, status, **Edit** (modal: name,
  subdomain, Stripe status, status, MRR, modules Booking/Ticket/Invoice/Pay).
- **Fees** (AENR-521, `src/screens/PlatformFinance.tsx`): the tenant's fee lines — name, charged
  (per online set / per entry person / % of captured value / per booking), amount, paid by (guest =
  service fee, tenant = platform fee), VAT %, active, active-from date; add / remove; platform-fee
  settlement (monthly / weekly); **e-invoicing provider** (Elorus, Epsilon Digital, SoftOne or direct
  myDATA) with a simulated Connect. Demo defaults (placeholders): €2.50 per online set, €0.50 per online entry person, 5%
  platform fee — exact pricing still to be confirmed. Reporting › Payments computes from these.
- **Capability flags · Akti tou Iliou** summary (enabled MVP vs roadmap-disabled) → Manage in Super
  Admin.

### P-02 · Tenant onboarding wizard [MVP]

```text
   (1)━━━━━━━━━━━━━━━(2)━━━━━━━━━━━━━━━(3)━━━━━━━━━━━━━━━(4)
  Tenant          Branding &         Stripe            Map &
  details         modules            Connect           go-live

 (1) name · subdomain.slaice.app · country ◆ GR/CY · contact e-mail · ΑΦΜ · language
 (2) brand colour · logo upload · modules:
       on:  Sunbed Booking · Entry Ticket · e-Invoice/MyDATA · Payments (Stripe)
       off: Day Locker · Parking · Cash Register
 (3) create connected account (Standard) ─▶ onboarding link (KYC) ─▶ check:
       details_submitted ✓ ─▶ charges_enabled ✓ ─▶ payouts_enabled ✓
 (4) [Configure map] ─▶ admin Map Layout Editor (A-03)
     [Go live] ─▶ ● tenant resolves at its subdomain

 [◀ Back] disabled on step 1                                          [Continue ▶]
```

4 steps with a stepper:

1. **Tenant details** — name, subdomain (`{tenant}.slaice.app`), country (Greece / Cyprus), contact
   e-mail, VAT number (ΑΦΜ), default language.
2. **Branding & modules** — brand colour swatches, logo upload, module toggles (Sunbed Booking, Entry
   Ticket, e-Invoice / MyDATA, Payments (Stripe) on by default; Day Locker, Parking, Cash Register off).
3. **Stripe Connect** (Standard) — create connected account + onboarding link (KYC); check
   `details_submitted`, `charges_enabled`, `payouts_enabled` before going live.
4. **Map & go-live** — **Configure map** (→ admin Map Editor) and **Go live** (tenant resolves at its
   subdomain).

### P-03 · Super Admin [Future]

```text
 CAPABILITY FLAGS PER TENANT          Akti tou  Demo      Glyfada  Kavouri
                                      Iliou     Beach #2  Bay      Coast
 Sunbed Booking                       [on]      [on]      [on]     [on]
 Entry Ticket                         [on]      [  ]      [on]     [on]
 e-Invoice / MyDATA                   [on]      [  ]      [  ]     [on]
 Payments                             [on]      [on]      [on]     [on]
 Reporting                            [on]      [  ]      [  ]     [on]
 Day Locker · Parking · Cash Register [  ]      [  ]      [  ]     [  ]
 Loyalty · Reviews · Catalogue · Geo  [  ]      [  ]      [  ]     [  ]
                                      click a switch ─▶ module on/off for that tenant

 STRIPE WEBHOOKS  (the signed endpoint verifies Stripe-Signature before processing)
   checkout.session.completed ──── healthy
   payment_intent.succeeded ────── healthy
   payment_intent.payment_failed ─ healthy
   charge.refunded ─────────────── healthy
   account.updated ─────────────── healthy
```

- **Capability flags per tenant** matrix: 12 modules × tenants, toggles.
- **Stripe webhooks** health: `checkout.session.completed`, `payment_intent.succeeded`,
  `payment_intent.payment_failed`, `charge.refunded`, `account.updated` — "healthy"; signed endpoint
  verifies `Stripe-Signature`.

### P-04 · Compliance & DPA [MVP]

```text
 [DPA pack] (PDF, demo)   [Posture report] (demo)
 KPIs: data residency EU (Frankfurt) · sub-processors (all DPA-signed) · incidents 0 · SLA 72 h
 Tables: sub-processors (purpose · region · DPA) · per-tenant DPA & posture

 Breach register "All clear" ──[Start workflow]──▶  72-HOUR BREACH WORKFLOW

  1 Assess severity ─▶ 2 Contain & ─▶ 3 Notifiable? ─▶ 4 Notify supervisory ─▶ 5 Notify
    & scope             remediate      Art. 33/34       authority               tenants &
                                                                                subjects
  ─▶ 6 Log to the breach register ─▶ [File & close] ─▶ ● closed
  |<───────── 72-hour window: steps 1–4, authority notified within 72 h (Art. 33) ─────────>|
```

- Actions: **DPA pack** (PDF, demo), compliance posture report (demo).
- KPIs: Data residency EU (Frankfurt), sub-processors count (all DPA-signed), Open incidents 0, Breach
  SLA 72h.
- Tables: **Sub-processors** (Stripe, AWS Frankfurt, myDATA/AADE, …: purpose, region, DPA) and
  **Per-tenant DPA & posture** (DPA status, residency, DPO, last review).
- **Breach notification register** ("All clear") + **Start workflow** → 72-hour workflow: Assess
  severity & scope → Contain & remediate → Assess notifiability (Art. 33/34) → Notify the supervisory
  authority → Notify affected tenants & subjects → Log to the breach register → **File & close**.

### P-05 · Verticals [Future]

```text
 ┌ Theatre / Cinema ─────┐ ┌ Events / Concerts ────┐ ┌ Retail Market ──────────┐
 │ seats per show,       │ │ tiered/zone seating,  │ │ product catalogue, cash │
 │ showtimes, seat-class │ │ timed entry, QR       │ │ register, e-invoice &   │
 │ pricing               │ │ validation            │ │ accounting              │
 └───────────────────────┘ └───────────────────────┘ └─────────────────────────┘

 CAPABILITY REUSE      Beach (MVP)   Theatre/Cinema  Events        Retail
 Calendar & inventory  sunbeds/day   seats/show      seats/event   stock units
 Payments              Stripe        Stripe          Stripe        Stripe + POS
 Catalogue / pricing   zone/sunbed   seat class      tier/zone     products
 QR & validation       beach entry   theatre entry   venue entry   —
 e-Invoice / MyDATA    ΑΠΥ           ΑΠΥ/ΤΠΥ         ΑΠΥ/ΤΠΥ       ΑΠΥ/ΤΠΥ
 Geo map / layout      beach layout  seat map        venue map     store map
 Loyalty / reviews     roadmap       points/NPS      points/NPS    loyalty
```

Cards for Theatre/Cinema, Events/Concerts, Retail Market, and a **cross-business capability reuse**
matrix (Calendar & inventory, Payments, Catalogue/pricing, QR & validation, e-Invoice/MyDATA, Geo
map/layout, Loyalty/reviews × Beach / Theatre / Events / Retail).

### P-06 · Landing page (slaice.app) [Future]

```text
 ┌─ slaice.app  (preview inside the app shell) ─────────────────────┐
 │ SLAiCE · Live Through Digital                                    │
 │                                                                  │
 │ Digital Multi-Product Platform                                   │
 │ Digital Business Capability as-a-service                         │
 │ [Request a demo]   [Explore capabilities]                        │
 ├──────────────────────────────────────────────────────────────────┤
 │ Beach │ Theatre & Events │ Retail │ Compliant: Stripe + MyDATA   │
 └──────────────────────────────────────────────────────────────────┘
 buttons ─▶ demo toasts · Future: served full-bleed at the root domain
```

Public marketing page preview: SLAiCE logo, "Digital Multi-Product Platform", "Digital Business
Capability as-a-service", **Request a demo** / **Explore capabilities**, use-case cards (Beach, Theatre &
Events, Retail, Compliant: Stripe + MyDATA).

---

## 14. Cross-persona end-to-end journeys

| ID   | Journey                    | Path                                                                                                                                                                                                                                                             |
| ---- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-01 | **Book → enter → account** | Customer books in the wizard (C-03) → pays (C-04) → QR + ΑΠΥ (C-05) → Controller scans QR (G-01) → booking shows in Admin Bookings (A-04) and Reporting (A-07) → ΑΠΥ with MARK in Accountant invoicing (F-01) → net payout after Stripe + 5% fee (F-02).         |
| X-02 | **Layout publish**         | Admin designs a zone's sets and publishes (A-03) → customer wizard shows that exact arrangement and availability (C-03) → Home "N sunbeds free today" updates (C-02) → Manual booking mini-map uses it (A-05).                                                   |
| X-03 | **Refund**                 | Admin issues a full/partial refund (A-08) → Stripe charge + application fee reversed → credit note 5.1 to myDATA (F-01 "Credit notes") → customer sees the credit note in My Documents (C-07).                                                                   |
| X-04 | **Loyalty campaign**       | Admin configures/enables a scheme (A-11) → Promote → Communicate pre-filled (A-10) → customer sees the reward on Home "Your rewards" (C-02).                                                                                                                     |
| X-05 | **Passes**                 | Admin sets pass pricing (A-12) → customer buys VIP/Season (C-08/C-09) → pass applied at checkout (C-04) → user gets a pass-derived tag in Users & Segments (A-06).                                                                                               |
| X-06 | **Phone booking**          | Call agent reserves a set without payment (A-05) → QR sent by e-mail/Viber/SMS → status Unpaid in Bookings → settled on arrival.                                                                                                                                 |
| X-07 | **Walk-in / same-day**     | Controller releases same-day sets (G-04) or books a walk-in (G-02) → channel Walk-in in reporting.                                                                                                                                                               |
| X-08 | **Tenant go-live**         | Platform onboards a tenant with Stripe KYC (P-02) → sets capability flags (P-03) → tenant admin configures the map (A-03) → customers book.                                                                                                                      |
| X-09 | **GDPR request**           | Customer exports data / requests erasure (§7.5) → request appears in the Admin DSAR queue (A-09) → handled with legal holds on invoices → breach/compliance oversight at platform level (P-04).                                                                  |
| X-10 | **Atmosphere**             | Admin toggles weather effects / time-of-day lighting (A-03 Atmosphere) → every customer page renders the same scene (C-02, C-03, C-04).                                                                                                                          |
| X-11 | **Period control**         | One `PeriodPicker` + `src/domain/period.ts` (resolve, compare, granularity, URL) + `src/data/analytics.ts` (deterministic per-day sample figures) shared by Dashboard (A-01), Reporting (A-07), Bookings (A-04) and Refunds (A-08). Demo "today" is 19 Jul 2026. |

### 14.1 Journey maps

**X-01 · Book → enter → account**

```text
 CUSTOMER    │ C-03 book ──▶ C-04 pay ──▶ C-05 QR + ΑΠΥ
             │                                 │
 CONTROLLER  │                                 ├──▶ G-01 scan QR ──▶ ✓ admitted
             │                                 │
 ADMIN       │                                 ├──▶ A-04 Bookings · A-07 Reporting
             │                                 │
 ACCOUNTANT  │                                 └──▶ F-01 ΑΠΥ with MARK ──▶ F-02 net payout
             │                                                       (gross − Stripe − 5%)
```

**X-02 · Layout publish**

```text
 ADMIN       │ A-03 design a zone's sets ──▶ [Publish to wizard]
             │                                      │
 CUSTOMER    │                                      ├──▶ C-03 wizard shows that exact layout
             │                                      ├──▶ C-02 Home "N sunbeds free today"
             │                                      │
 ADMIN       │                                      └──▶ A-05 Manual booking mini-map
```

**X-03 · Refund**

```text
 ADMIN       │ A-08 [Refund] full / partial
             │        │
 STRIPE      │        └──▶ charge + application fee reversed
             │                     │
 ACCOUNTANT  │                     └──▶ credit note 5.1 to myDATA (F-01 "Credit notes")
             │                                   │
 CUSTOMER    │                                   └──▶ C-07 credit note in My Documents
```

**X-04 · Loyalty campaign**

```text
 ADMIN       │ A-11 configure + enable scheme ──▶ [Promote] ──▶ A-10 Communicate (pre-filled)
             │              │                                        │
             │              │                                        └──▶ [Send to N users]
 CUSTOMER    │              └──▶ C-02 Home "Your rewards" ──▶ Claim / Use it ─▶ C-03
```

**X-05 · Passes**

```text
 ADMIN       │ A-12 set pass pricing (packs · discount · season prices)
             │        │
 CUSTOMER    │        └──▶ C-08 / C-09 buy VIP or Season ──▶ C-04 pass applied at checkout
             │                        │
 ADMIN       │                        └──▶ A-06 pass-derived tag on the user
```

**X-06 · Phone booking**

```text
 CALL AGENT  │ A-05 reserve a set, no payment ──▶ [Reserve & send QR]
             │                                          │
 CUSTOMER    │                                          ├──▶ QR by e-mail / Viber / SMS
             │                                          │
 ADMIN       │                                          └──▶ A-04 status Unpaid · channel Phone
             │                                                        │
 CONTROLLER  │                                          arrival ──▶ G-01 scan ─▶ settled on site
```

**X-07 · Walk-in / same-day**

```text
 CONTROLLER  │ G-04 release unsold sets ──────────┐     G-02 walk-in booking ──┐
             │                                    │                            │
 CUSTOMER    │                                    └──▶ bookable online today   │
             │                                                                 │
 ADMIN       │                                     A-07 channel "Walk-in" ◀────┘
```

**X-08 · Tenant go-live**

```text
 PLATFORM    │ P-02 onboard + Stripe KYC ──▶ P-03 capability flags
             │                                      │
 ADMIN       │                                      └──▶ A-03 configure the map ──▶ publish
             │                                                                       │
 CUSTOMER    │                              customers book at {tenant}.slaice.app ◀──┘
```

**X-09 · GDPR request**

```text
 CUSTOMER    │ §7.5 Privacy Centre: export data / request erasure
             │        │
 ADMIN       │        └──▶ A-09 DSAR queue ──▶ handle ──▶ legal hold on invoices (5 y)
             │                                                    │
 PLATFORM    │                                                    └──▶ P-04 compliance / breach
             │                                                         oversight
```

**X-10 · Atmosphere**

```text
 ADMIN       │ A-03 Atmosphere: weather fx · daylight · weather · scene clock
             │        │
 CUSTOMER    │        ├──▶ C-02 Home
             │        ├──▶ C-03 wizard          one scene state: every customer page
             │        └──▶ C-04 checkout        renders the same sky, sea and light
```

---

## 15. Capability catalogue

| #   | Capability                                                                       | Persona(s)                      | Status              | Where            |
| --- | -------------------------------------------------------------------------------- | ------------------------------- | ------------------- | ---------------- |
| 1   | Magic-link + SSO sign-in (Google, Microsoft, Apple, Facebook)                    | Customer                        | MVP                 | §7.1             |
| 2   | Tenant-branded customer site (logo, background, per-zone logos)                  | Customer / Admin                | MVP                 | §4, A-03         |
| 3   | Live availability on Home                                                        | Customer                        | MVP                 | C-02             |
| 4   | Guided booking wizard (dates, zone, exact sets, guests, locker, parking, review) | Customer                        | MVP                 | C-03             |
| 5   | Multi-day booking (≤ 7 days) with per-service day scopes                         | Customer                        | MVP                 | C-03             |
| 6   | Entry tickets by category (adult/resident/child/senior)                          | Customer / Cashier / Controller | MVP                 | C-03, K-01, G-03 |
| 7   | Day locker booking                                                               | Customer                        | MVP (flag: roadmap) | C-03             |
| 8   | Parking booking with licence plates                                              | Customer                        | MVP (flag: roadmap) | C-03             |
| 9   | Basket with undo, swipe-to-delete                                                | Customer                        | MVP                 | C-04             |
| 10  | Stripe hosted checkout (tenant-branded, Connect direct charge)                   | Customer                        | MVP                 | C-04             |
| 11  | VIP prepaid credit with spend discount                                           | Customer / Admin                | Future (pricing)    | C-08, A-12       |
| 12  | Season pass (monthly / summer) covering entry                                    | Customer / Admin                | Future (pricing)    | C-09, A-12       |
| 13  | QR booking confirmation + e-mail                                                 | Customer                        | MVP                 | C-05             |
| 14  | Apple / Google Wallet passes                                                     | Customer                        | MVP                 | C-05             |
| 15  | Add to calendar (.ics)                                                           | Customer                        | MVP                 | C-05             |
| 16  | My Bookings with QR re-send                                                      | Customer                        | MVP                 | C-06             |
| 17  | My Documents (ΑΠΥ/ΤΠΥ/credit notes, PDF, ZIP)                                    | Customer                        | MVP                 | C-07             |
| 18  | Account settings, saved cards, change password, 2FA                              | Customer                        | MVP                 | §7.4             |
| 19  | Privacy Centre (export, consents, processors, erasure)                           | Customer                        | MVP                 | §7.5             |
| 20  | Cookie consent with granular purposes                                            | All                             | MVP                 | §7.6             |
| 21  | Notifications feed + preferences                                                 | All                             | MVP                 | §7.2             |
| 22  | 6 languages (EN source + 5 machine-translated)                                   | All (customer fully)            | MVP                 | §7.8             |
| 23  | Rewards on Home (loyalty progress, claim)                                        | Customer                        | Future              | C-02             |
| 24  | Badges (gamification)                                                            | Customer / Admin                | Future              | C-02, A-13       |
| 25  | Admin dashboard with export                                                      | Admin                           | MVP                 | A-01             |
| 26  | Zone availability & base prices                                                  | Admin                           | MVP                 | A-02             |
| 27  | Seasonal / weekday pricing rules with preview                                    | Admin                           | MVP                 | A-02             |
| 28  | Zone map editor (drag, identity, grid)                                           | Admin                           | MVP                 | A-03             |
| 29  | Sunbed layout editor (drag, snap, multi-select, state/type/price, publish)       | Admin                           | MVP                 | A-03             |
| 30  | Beach background presets / photo upload                                          | Admin                           | MVP                 | A-03             |
| 31  | Customer-scene atmosphere controls                                               | Admin                           | MVP                 | A-03             |
| 32  | Bookings list (search, sort, paginate, CSV, resend QR via Email/Viber/SMS)       | Admin                           | MVP                 | A-04             |
| 33  | Manual / phone booking without payment                                           | Admin, Call Center              | MVP                 | A-05             |
| 34  | CRM users with auto + manual segments, edit, activity                            | Admin                           | MVP                 | A-06             |
| 35  | Reporting (8 tabs, CSV per tab)                                                  | Admin                           | MVP                 | A-07             |
| 36  | Refunds (full/partial, reasons, Stripe + credit note)                            | Admin                           | MVP                 | A-08             |
| 37  | DSAR handling workflows, consent audit, retention, ROPA                          | Admin                           | MVP                 | A-09             |
| 38  | Messaging channel connections (E-mail/Viber/SMS providers)                       | Admin                           | Future              | A-10             |
| 39  | Campaigns to segments with loyalty offers                                        | Admin                           | Future              | A-10             |
| 40  | Loyalty schemes (6 built-in + custom), timed offers, regulars offers             | Admin                           | Future              | A-11             |
| 41  | Pass pricing + wallet card designer                                              | Admin                           | Future              | A-12             |
| 42  | On-site anonymous ticket sales + printing                                        | Cashier                         | MVP                 | K-01             |
| 43  | Ticket redemption                                                                | Cashier                         | Future              | K-02             |
| 44  | Cash register shifts, X / Z reports, reconciliation, paid in / out               | Cashier                         | Future              | K-03             |
| 45  | On-site locker sales from locker banks                                           | Cashier                         | Future              | K-04             |
| 46  | QR gate validation (valid/used/invalid, override)                                | Controller                      | MVP                 | G-01             |
| 47  | Walk-in booking, pay-on-site tickets, same-day release                           | Controller                      | MVP                 | G-02..G-04       |
| 48  | Gate throughput analytics                                                        | Controller                      | MVP                 | G-01             |
| 49  | myDATA document ledger (ΑΠΥ/ΤΠΥ/ΑΚΥ/5.1), MARK, PDF, CSV                         | Accountant                      | MVP                 | F-01             |
| 50  | Commission & payouts, VAT by rate, reconciliation                                | Accountant                      | MVP                 | F-02             |
| 51  | Tenant list + SaaS metrics (MRR, NRR, churn, ARPA, funnel)                       | Platform                        | MVP                 | P-01             |
| 52  | Tenant onboarding wizard with Stripe Connect KYC                                 | Platform                        | MVP                 | P-02             |
| 53  | Capability flags per tenant, webhook health                                      | Platform                        | Future              | P-03             |
| 54  | Compliance: sub-processors, tenant DPAs, 72h breach workflow                     | Platform                        | MVP                 | P-04             |
| 55  | Verticals (theatre, events, retail)                                              | Platform                        | Future              | P-05             |
| 56  | Marketing landing page                                                           | Platform                        | Future              | P-06             |
| 57  | Live WebGL sea, weather and time-of-day scene                                    | Customer                        | Future (FUTURE)     | §20.6            |

---

## 16. Data model used by the front end

These are the shapes the UI works with today (`src/domain/types.ts`, `src/data/*`). They describe the
front end's vocabulary, not a backend schema.

### 16.1 Core types

```ts
type PersonaId = "customer" | "admin" | "cashier" | "controller" | "accountant" | "platform";
type LangCode = string; // "en" | "el" | "de" | "fr" | "es" | "it"

// Inventory
interface Zone {
  id: string;
  name: string;
  avail: number;
  total: number;
  from: number /* base € */;
  color: string;
  prefix: string;
}
type SunbedState = "a" | "h" | "u"; // available · on hold · unavailable
type SunbedKind = "standard" | "front" | "cabana";
interface SunbedSlot {
  id: string;
  x: number;
  y: number /* 0–100 */;
  state: SunbedState;
  price: number;
  kind?: SunbedKind;
}
interface ZoneMapItem {
  id;
  name;
  prefix;
  color;
  total: number;
  rows: number;
  cols: number;
  x: number;
  y: number; /* % of canvas */
}

// Cart
type CartKind = "sunbed" | "ticket" | "locker" | "parking";
interface CartItem {
  kind: CartKind;
  id: string /* unique per kind, "<code>@<ISO date>" */;
  label: string;
  sub: string;
  price: number;
}

// Tickets
type TicketCategory = "adult" | "resident" | "child" | "senior";

// Customer bookings & documents
type BookingStatus = "Confirmed" | "Used" | "Cancelled" | "Unpaid" | "Refunded" | "Pending";
interface CustomerBooking {
  id: string;
  item: string;
  date: string;
  status: BookingStatus;
  price: number;
  state: "active" | "past";
}
interface CustomerDocument {
  id: string;
  for: string;
  date: string;
  amt: string;
  mark: string;
  lines: [desc, net, vat, gross][];
}

// CRM
interface Customer {
  id: number;
  name;
  first;
  last;
  email;
  phone;
  bookings: number /* visits */;
  spend: number;
  tags: string[];
  lastVisit: string;
}

// Admin bookings & refunds
interface AdminBooking {
  id;
  who /* first name or "Walk-in" */;
  items: string[];
  date;
  channel: "Online" | "Walk-in" | "Phone" | "Cashier";
  status;
  amount: number;
}
interface AdminRefund {
  tx;
  who;
  amount: number;
  reason;
  status: "Refunded" | null /* pending */;
  date;
  refundAmount?: number;
}

// Consent
interface Consent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
  ts: string | null;
}

// Branding
type BeachBackground =
  | { kind: "preset"; id: string }
  | { kind: "custom"; src: string /* data URL */; name?: string };

// Passes
type SeasonPlan = "monthly" | "summer";
interface VipPass {
  balance: number;
  purchased: number;
  validUntil: string;
}
interface SeasonPass {
  plan: SeasonPlan;
  validUntil: string;
}
interface CustomerPasses {
  vip: VipPass | null;
  season: SeasonPass | null;
}
interface PassPricing {
  vipTiers: number[];
  vipDiscount: number /* 0–1 */;
  seasonMonthly: number;
  seasonSummer: number;
}

// Pricing rules
type PriceRuleDays = "all" | "weekday" | "weekend";
type PriceRuleMode = "set" | "addAbs" | "addPct";
interface PriceRule {
  id;
  label;
  zone: string /* id | "all" */;
  from: string;
  to: string /* ISO */;
  days: PriceRuleDays;
  mode: PriceRuleMode;
  amount: number;
  enabled: boolean;
}

// Messaging channels
type ChannelKey = "push" | "email" | "viber" | "sms";
interface ChannelConnection {
  connected: boolean;
  provider?: string;
  sender?: string;
  connectedAt?: string;
}

// Wallet card design
interface CardText {
  x;
  y /* % */;
  text: string;
  size: number;
  color: string;
  tracking?: number;
  weight?: number;
  align?: "left" | "center" | "right";
}
interface PassDesign {
  id;
  name;
  bg: [string, string];
  wave: string;
  title: CardText;
  subtitle: CardText;
  holder: CardText;
  number: CardText;
  validUntil: CardText;
  logo: { src: string | null; x; y; scale: number };
  qr: { show: boolean; x; y; scale: number };
  published: boolean;
}

// Loyalty
interface LoyaltyState {
  config: Record<schemeId, { enabled: boolean; values: Record<string, string | number> }>;
  customIds: string[];
}
type RewardState =
  | { kind: "claim"; reward; note? }
  | { kind: "progress"; reward; current; target; unit; note? }
  | { kind: "perk"; reward; note? };

// Gamification
type GameMetric = "visits" | "bookings" | "spend";
interface Achievement {
  id;
  name;
  icon: string;
  color: string;
  metric: GameMetric;
  threshold: number;
}

// Scene
type WeatherKind = "sunny" | "windy" | "overcast" | "rainy";
interface SceneFx {
  weather: boolean;
  daytime: boolean;
}
```

### 16.2 Identifier formats

| Entity                 | Format                   | Example              |
| ---------------------- | ------------------------ | -------------------- |
| Sunbed booking         | `#BK-NNNNN` (sequential) | `#BK-10428`          |
| Entry ticket           | `#TK-NNNNN`              | `#TK-55120`          |
| Parking                | `#PK-NNNN`               | `#PK-4080`           |
| Locker booking         | `#LK-NNNN`               | `#LK-9921`           |
| Set / sunbed           | `<ZONE PREFIX>-<nn>`     | `CE-89`              |
| Locker (on site)       | `<Bank letter><nn>`      | `A07`                |
| Parking spot (on site) | `P<nn>`                  | `P12`                |
| Retail receipt         | `ΑΠΥ-YYYY-NNNNNN`        | `ΑΠΥ-2026-004281`    |
| Service invoice (B2B)  | `ΤΠΥ-YYYY-NNNNNN`        | `ΤΠΥ-2026-000118`    |
| Cancellation           | `ΑΚΥ-YYYY-NNNNNN`        | `ΑΚΥ-2026-000044`    |
| Credit note            | `ΠΙΣ-YYYY-NNNNNN`        | `ΠΙΣ-2026-000012`    |
| myDATA MARK            | 18-digit number          | `400001020304002281` |
| Payment transaction    | `#TX-NNNNN`              | `#TX-88210`          |
| Refund (Stripe)        | `re_…`                   | `re_3PqA2k…f4d`      |
| Cash session           | `#CS-NNN`                | `#CS-204`            |
| DSAR                   | `DSAR-NNN`               | `DSAR-204`           |
| Incident               | `INC-NNN`                | `INC-014`            |
| VIP / Season pass ref  | `VIP-NNNN` / `SEA-NNNN`  | `VIP-4881`           |
| Pass card number       | `NO. NNNN`               | `NO. 0042`           |
| Pricing rule           | `r-<base36 time>`        | `r-aug-weekend`      |

### 16.3 Relationships (as the UI implies them)

- A **tenant** has many **zones**; a zone has many **sunbed slots** (layout) and one base price.
- A **booking** belongs to a customer (or "Walk-in"), has a **channel**, a **status**, one date, and
  **several items** (sets, tickets, locker, parking) with one total.
- A **payment** can yield one or more **fiscal documents** (ΑΠΥ/ΤΠΥ); a **refund** yields a **credit
  note**; a **cancellation** yields an ΑΚΥ.
- A **customer** has passes (0–1 VIP, 0–1 Season), segments (auto + manual), loyalty progress and
  badges, consents, saved cards.
- **Pricing rules** apply to one zone or all zones over a date window.
- **Loyalty schemes** and **achievements** are tenant configuration read by the customer Home.

---

## 17. Business rules and calculations

### 17.1 Prices (defaults, `src/domain/pricing.ts`)

| Item                         | Price                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Adult entry (Individual 13+) | €10                                                                               |
| Alimos resident              | €6 (proof required at gate)                                                       |
| Child 6–12                   | €5 (under 6 free)                                                                 |
| Senior 65+                   | €7 (ID required)                                                                  |
| Day locker (wizard)          | €5 per locker per day                                                             |
| Parking spot                 | €15 per spot per day                                                              |
| Umbrella set                 | per set; seeded as zone base price + {0, 5, 10} by position (zones start €18–€35) |
| Locker banks (cashier)       | €5 (A, B, C), €7 (D Family), €9 (E Premium)                                       |
| Slaice application fee       | 5% of subtotal                                                                    |
| Stripe processing            | ~1.5% of subtotal                                                                 |

### 17.2 Wizard → basket explosion

For the chosen dates `D` (1–7 ISO dates):

- **Sets:** for each date × each picked set → `sunbed` line `id = "<setId>@<date>"`, price = set price.
- **Tickets** (if "Add Entry tickets" is on): for each date × each category with n > 0 → `ticket` line
  `id = "<category>@<date>"`, label `"<category label> × n"`, price = n × category price.
- **Lockers:** for each locker date × each locker `i` → `locker` line `id = "LK<i>@<date>"`, €5.
- **Parking:** for each parking date × each spot `i` → `parking` line `id = "P<i>@<date>"`, €15, sub
  line shows the plate (per-spot plate when > 1 spot, else the per-day plate).
- Duplicate `kind + id` lines are ignored when added to the basket.
- **Grand total** = Σsets × days + Σtickets × days + lockers × locker days × 5 + spots × parking days × 15.

Locker/parking day scope: "all days" = every chosen date; "specific days" = a subset (only with
multi-day). Removing a trip date prunes it from the service subsets.

### 17.3 Headcount

- One set seats 2. Until edited, guests = **2 adults × number of sets**.
- Warn if total guests > 2 × sets.

### 17.4 Passes at checkout

Let `total` = basket subtotal, `entryTotal` = sum of ticket lines, `d` = VIP discount (default 0.20).

1. **Season pass** (if held and toggled on): covers **one adult entry per visit**:
   `seasonCovered = min(€10, entryTotal)` (0 if no tickets).
2. `afterSeason = total − seasonCovered`.
3. **VIP credit** (if held and toggled on): the balance `B` settles up to `B / (1 − d)` of order value:
   `vipCover = min(afterSeason, B / (1 − d))`; balance debited = `vipCover × (1 − d)`; saved =
   `vipCover × d`.
4. `cashDue = afterSeason − vipCover` → paid by card via Stripe. If `cashDue = 0` the order is
   "Confirm · paid with pass".
5. VIP credit pack preview: "Spends like `amount / (1 − d)`".

### 17.5 Pricing rules

- A rule matches a zone/date if it is enabled, its zone is that zone or `all`, the date is within
  `[from, to]` (inclusive, ISO string compare), and the weekday matches (`weekend` = Sat/Sun,
  `weekday` = Mon–Fri, `all`).
- Effective price = base, then **each matching rule applied in list order** (later rules compound):
  `set` → amount; `addAbs` → price + amount; `addPct` → price × (1 + amount/100). Result rounded to
  cents, **never negative**.
- Effect labels: "Set to €X", "+€X" / "−€X", "+X%" / "−X%".

### 17.6 Segments

- Automatic: **New** by default; **Regular** when visits **> 15**.
- Manual: **VIP**, **Season pass** (assigned by staff). A purchased pass also shows as a pass-derived
  tag.

### 17.7 Loyalty schemes (config fields → customer reward state)

| Scheme                   | Fields (default)                                                                                                                                                          | Customer state                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Visit milestones         | every N visits (10), reward (Free sunbed / Free entry / Free coffee / 20% off next visit)                                                                                 | progress `visits % N` of N; **claim** once ≥ N visits      |
| Happy hours & early-bird | discount (10/15/20/30% off), days (Weekdays/Weekends/Every day), from–to (09:00–11:00)                                                                                    | perk                                                       |
| Tiered membership        | Silver from 3 visits (10% off sunbeds), Gold from 6 (free parking + late checkout), VIP from 12 (front row + free coffee)                                                 | progress to Silver, then **claim** the current tier's perk |
| Bundle perks             | when they book (a set / front-row set / any 2 sets / an entry ticket) → they get (coffee / drink / locker / 2nd set half price), when (any time / before noon / weekdays) | perk                                                       |
| Bring a friend           | inviter gets / new guest gets (€5 off, €10 off, 10% off, free coffee / free entry)                                                                                        | perk ("Share your code")                                   |
| Birthday week            | treat, window (on the day / birthday week / month)                                                                                                                        | **claim** in birthday week, else perk                      |
| Custom                   | name, reward (6 options), applies to (all stores / a zone), when                                                                                                          | perk                                                       |

Default live schemes: milestones, tiers, happy hours, referral, bundle. Demo customer stats: 8 visits,
0 referrals, not birthday week.

### 17.8 Gamification

Badge earned when `metric value ≥ threshold` (metrics: visits, bookings, spend €). Demo stats: 8 visits,
12 bookings, €640 spend.

### 17.9 Refunds

- Full refund = charge amount; partial = integer €1 … charge.
- Reasons: Weather, Double booking, Customer request, Service issue.
- Effects: reverse Stripe charge **and** application fee; issue credit note 5.1 to myDATA; e-mail the
  customer.

### 17.10 Tax and fiscal documents

- Every sale issues a myDATA document with a MARK: **ΑΠΥ** (B2C receipts), **ΤΠΥ** (B2B, e.g. groups of 12
  or 24), **ΑΚΥ** cancellations, **5.1 credit notes** on refunds.
- VAT shown at 24% standard (also 13% reduced F&B and 6% super-reduced in VAT reports). Lines show
  net / VAT / gross.
- Documents failing transmission sit in a **Retry queue**.

### 17.11 GDPR and retention

| Data                                | Retention       | Basis                             |
| ----------------------------------- | --------------- | --------------------------------- |
| Bookings & QR tickets               | 24 months       | Contract / legitimate interest    |
| Invoices (ΑΠΥ/ΤΠΥ) & myDATA records | **5 years**     | Greek tax law — overrides erasure |
| Marketing consents & history        | until withdrawn | Consent                           |

- DSARs have a **30-day** statutory deadline; erasure applies legal holds to invoices.
- Account erasure: **30-day grace period**.
- Breach notification to the supervisory authority within **72 hours**.

### 17.12 Other rules

- Free cancellation up to **24 h** before the visit (stated at checkout).
- Password policy: ≥ 8 chars, upper & lower case, number, symbol (≥ 3 of 4), differs from current.
- 2FA: TOTP 6-digit code, recovery codes.
- VIP credit and summer Season pass valid to **season end (30 Sep 2026)**; monthly pass valid one month
  from purchase.
- Scene clock range **05:30–21:30**; golden hour peaks ~19:30; default 10:00.

---

## 18. State, persistence and cross-screen wiring

### 18.1 Global app state

A single React context (`src/app/store.tsx`, provided in `src/App.tsx`) exposes: toast, navigation
(`go(persona, page, hint)`, `dive()` to the wizard), persona, signedIn, language, **cart**, spotlight
hint, **consent**, **background**, **beachLayout** (zoneId → slots), **zoneLogos**, **passes**,
**passPricing**, **loyalty**, **achievements**, **zoneMap**, **priceRules**, **channels**, **passCards**,
**weather**, **dayTime**, **sceneFx**, and their setters.

### 18.2 Persistence (mockup: the browser is the store)

- Everything above (plus the last page per persona) is saved to **`localStorage["slaice.v1"]`** and
  restored on load. Writes are wrapped in try/catch (private mode / quota).
- Site-gate unlock: `localStorage["slaice.gate.v1"] = "1"`.
- Screen-local state (e.g. admin table edits, users edits, refunds rows, tenants edits, cash session,
  DSAR progress) lives only in component state and **resets on reload**.

### 18.3 Which admin settings reach the customer today

| Admin setting                                           | Reaches customer?      | Consumer                                                               |
| ------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Sunbed layout per zone (Publish to wizard)              | **Yes**                | Wizard zone clusters + set grid, Home "free today", Manual booking map |
| Store (zone) logos                                      | **Yes**                | Wizard zone overview                                                   |
| Beach background                                        | **Yes**                | Customer backdrop, map editor canvas                                   |
| Pass pricing (packs, discount, season prices)           | **Yes**                | Home tiles, VIP/Season purchase, checkout                              |
| Loyalty scheme config                                   | **Yes**                | Home "Your rewards"; Communicate offers                                |
| Achievements                                            | **Yes**                | Home "Your badges"                                                     |
| Atmosphere (weather / daytime switches, weather, clock) | **Yes**                | All customer pages                                                     |
| Pricing rules                                           | **No** [GAP]           | Admin preview only                                                     |
| Zone map positions / identity / grid                    | **No** [GAP]           | Admin editor only                                                      |
| Zone open/closed toggle                                 | **No** [GAP]           | Admin table only                                                       |
| Wallet card designs                                     | **No** [GAP]           | Admin designer only                                                    |
| Channel connections                                     | Admin only (by design) | Communicate                                                            |
| Capability flags / tenant modules                       | **No** [GAP]           | Platform screens only                                                  |

### 18.4 Data-access seam

`src/api/index.ts` is the single boundary for list data (`listCustomerBookings`,
`listCustomerDocuments`, `listCustomers`, `listZones`), each resolving sample data after **450 ms**
of simulated latency [DEMO]. Screens consume it via `useAsync()` which returns a status union
`loading | error | success` + `refetch`. Other staff tables use `useMockLoad()` (650 ms skeleton).
Many screens still import `src/data/*` constants directly.

---

## 19. Architecture and tech stack

| Area       | Choice                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build      | Vite 5 (`base: "./"`, output to `docs/`, targets Chrome/Edge 88, Firefox 78, Safari 14)                                                                 |
| UI         | React 18.3, TypeScript 5 (strict)                                                                                                                       |
| Styling    | Tailwind CSS 3.4 (theme tokens in `tailwind.config.js`) + utility layer in `src/index.css` (materials, skeleton, reveal, sheen, focus ring, safe areas) |
| Primitives | Radix UI DropdownMenu + Popover; in-house `Modal`, `Sheet`, `Tabs`, `Toggle` (Radix Dialog/Switch/Tabs/Tooltip/VisuallyHidden installed, unused)        |
| Forms      | React Hook Form + Zod (sign-in, site gate)                                                                                                              |
| Icons      | lucide-react via an icon registry (`src/lib/icons.tsx`)                                                                                                 |
| Motion     | GSAP (+ Flip) for choreography; CSS keyframes for simple cases; all gated by `prefers-reduced-motion`                                                   |
| Canvas     | Konva / react-konva (sunbed layout editor, lazy chunk)                                                                                                  |
| 3D         | three.js WebGL2 live sea shader (lazy chunk; falls back to SVG)                                                                                         |
| Charts     | Hand-rolled SVG: BarChart, HBarChart, LineChartMini, Donut, Sparkline, StackedBar, Funnel                                                               |
| Files      | In-house generators: CSV (single + multi-section), **PDF**, **ZIP**, **.ics**, Apple **.pkpass** (unsigned), Google Wallet save link                    |
| QR         | Deterministic **faux QR** pattern (not scannable) — production needs a real QR encoder                                                                  |
| Routing    | Custom hash router (`src/app/router.ts`) + route registry (`src/routes.tsx`)                                                                            |
| State      | One React context + `localStorage` (see §18)                                                                                                            |
| i18n       | `t()` + generated JSON dictionaries (`scripts/i18n.mjs`, Google Translate endpoint)                                                                     |
| Quality    | `tsc --noEmit`, ESLint 9 (typescript-eslint, react-hooks, jsx-a11y as errors), Prettier (not enforced in CI)                                            |
| Tests      | None yet                                                                                                                                                |
| CI/CD      | GitHub Actions on push to `main`: `npm ci` → typecheck → lint → build → commit `docs/` → GitHub Pages                                                   |
| Chunks     | `react`, `radix`, `icons`, `vendor`, lazy `BeachCanvas` (konva), lazy `LiveSeaCanvas` (three)                                                           |

### Folder structure

```
src/
  main.tsx               entry: SiteGate → App; stale-chunk reload
  App.tsx                shell, global state, persistence, hash sync, layout per persona
  routes.tsx             "persona.page" → screen registry + per-persona fallback
  app/
    store.tsx            AppContext, useApp, useT, useSpotlight
    router.ts            parseHash / buildHash / isValidPage
    i18n.ts              languages, translate, locale
  api/index.ts           data-access seam (simulated latency)
  domain/
    types.ts             shared domain types
    pricing.ts           prices, fees, cart totals, pricing-rule engine
  data/                  seed data: beach (zones, facilities, weather, scene clock), mock (customers,
                         bookings, docs, refunds, cashier, accountant, tenants, reporting), personas
                         (+ NAV), passes, loyalty, gamification, channels, pricing, passDesigns, gdpr,
                         backgrounds
  components/
    ui/                  design-system kit (primitives, feedback, data, forms, overlays, Tabs, SwipeRow)
    Shell/               TopBar, Sidebar/NavSheet/BottomTabBar, PersonaSwitcher, SiteFooter, Toasts
    Beach.tsx            beach backdrop (presets, parallax), Sunbed glyphs, parking/locker backdrops
    BeachCanvas.tsx      Konva sunbed editor
    LiveSeaCanvas.tsx    three.js sea
    WeatherFx.tsx        rain / wind particle canvas
    CustomerBackdrop.tsx scene resolution (weather × daytime) for all customer pages
    SandScene.tsx        wizard vignettes (towels, locker, car)
    SceneDemoPanel.tsx   demo weather/time control
    PassCard.tsx, PassDesigner.tsx, WalletPass.tsx, BackgroundPicker.tsx, PrivacyCenter.tsx,
    Security.tsx, ConsentBanner.tsx, TableTools.tsx (sort/pager), charts.tsx, Brand.tsx, LifeRing.tsx
  screens/
    customer/            CustomerHome, CustomerBookings, CustomerDocs
    CustomerWizard.tsx   booking wizard
    Checkout.tsx         checkout + confirmation
    PassPurchase.tsx     VIP / Season purchase
    auth.tsx             product sign-in
    SiteGate.tsx         stage access gate [DEMO]
    admin.tsx            13 admin screens
    cashier.tsx, controller.tsx, accountant.tsx, platform.tsx
  lib/                   icons, motion (reduced motion, count-up, reveal), fx (GSAP helpers, FLIP
                         stash, confetti, magnetic/tilt), download (CSV/PDF/ZIP/ICS), wallet, image
                         (downscale uploads), useAsync, staleChunk
  locales/               el, de, fr, es, it JSON
```

---

## 20. Design system

### 20.1 Brand and aesthetic

- **Two brands:** the **tenant** brand on the customer surface (Akti tou Iliou: navy + teal, sun logo,
  sand and sea) and the **SLAiCE platform** brand (indigo + gold, "SLA**i**CE" with a gold _i_).
- **Aesthetic:** Apple-leaning, calm, premium. Translucent **glass** chrome over an illustrated beach
  for customers; clean opaque cards on a near-white canvas for staff. Coral marks the user's
  selection. Status is never colour-only (icon + text + colour).

### 20.2 Colour tokens (Tailwind)

| Token                      | Values                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `navy`                     | 950 `#071a30`, 900 `#0B2545`, 800 `#13315c`, 700 `#1d4172`, 600 `#2a5589`                                              |
| `teal`                     | 600 `#0D9488`, 500 `#14b8a6`, 400 `#2dd4bf`, 300 `#5EEAD4`, 100 `#ccfbf1`                                              |
| `coral` (selection accent) | 600 `#e2552f`, 500 `#f1683c`, 400 `#fb8a63`                                                                            |
| `slaice` (platform)        | 700 `#2f3bb3`, 600 `#3a47cc`, 500 `#4a57e0`, 100 `#e7e9fb`                                                             |
| `gold`                     | 600 `#e0a800`, 500 `#f2b705`, 400 `#ffc933`                                                                            |
| `sand` / `ink`             | `#E9E3D5` / `#1E293B`                                                                                                  |
| Page background            | `#f6f8fb` with a fixed teal/indigo radial wash                                                                         |
| Focus ring                 | 2 px `#0d9488`, 2 px offset (`:focus-visible` only)                                                                    |
| Persona colours            | customer `#0D9488`, admin `#0B2545`, cashier `#0ea5e9`, controller `#f59e0b`, accountant `#a855f7`, platform `#3a47cc` |
| Zone colours               | Akanthus `#6366f1`, Central `#0ea5e9`, Macaw `#ef4444`, Bestbuy `#22c55e`, Main `#f59e0b`, Bolivar `#a855f7`           |
| Gradients                  | `grad-sea` (navy → teal), `grad-beach`, `grad-slaice` (indigo + gold glow)                                             |

### 20.3 Typography, radius, elevation, motion tokens

- **Fonts:** system stack — SF Pro Text/Display on Apple, Inter elsewhere; mono IBM Plex Mono.
  `font-display` is used for headings with tight tracking (−0.022em); body tracking −0.011em; tabular
  numbers (`tnum`) for all money and counts.
- **Radii:** cards `rounded-2xl/3xl`, extra `4xl` (2 rem); inputs and buttons `rounded-xl` (~14 px).
- **Shadows:** `soft`, `lift`, `float` (ambient, layered, low alpha), `ring`, `glow`, `btn-primary`,
  `btn-teal`.
- **Easings:** `spring` (.34,1.56,.64,1), `smooth` (.4,0,.2,1), `ios` (.22,1,.36,1).
- **Animations:** fade-up/down/in, pop, scale-in, slide-in-right, slide-up (sheets), shimmer
  (skeletons), floaty, ripple, sea-tilt, dive. UI motion 150–350 ms; all disabled under reduced motion.
- **Materials:** `.glass` (translucent + blur, for chrome), `.glass-flat` (frosted look without
  backdrop-filter, for customer cards), `.glass-card`, `.glass-input`, `.glass-dark`, with opaque
  fallbacks where `backdrop-filter` is unsupported.

### 20.4 Component kit (`src/components/ui`)

| Component                                                                                                      | Variants / notes                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Btn`                                                                                                          | variants: primary (navy), teal, coral, dark, indigo, tint, ghost, outline, light, danger; sizes sm (36 px) / md (44 px) / lg (48 px); icon, loading, full width, disabled |
| `Badge`                                                                                                        | tones: slate, green, amber, red/rose, blue, indigo, mvp, future, …                                                                                                        |
| `StatusBadge`                                                                                                  | status → icon + colour + label (Confirmed, Used, Cancelled, Unpaid, Refunded, MyDATA ✓, …)                                                                                |
| `Card`                                                                                                         | hover / press / sheen options                                                                                                                                             |
| `StatCard`                                                                                                     | label, value, sub, tone, trend, optional sparkline, count-up (or `instant` on ops dashboards)                                                                             |
| `Table`                                                                                                        | sticky frosted header on ≥ sm; **reflows into stacked label:value cards on phones**; right-aligned numeric columns                                                        |
| `SortHeader`, `Pager`                                                                                          | sortable headers, pagination (TableTools)                                                                                                                                 |
| `Tabs`                                                                                                         | segmented control, optional icons, horizontal scroll                                                                                                                      |
| `Modal`                                                                                                        | In-house dialog (portal): initial focus, Tab trap, focus return, Escape, `aria-labelledby`; `wide` option, footer slot                                                    |
| `Sheet`                                                                                                        | bottom sheet with drag-to-dismiss (phones)                                                                                                                                |
| `ConfirmModal`                                                                                                 | destructive confirmations                                                                                                                                                 |
| `Field`, `Input`, `Select`                                                                                     | 16 px inputs on phones (no iOS zoom)                                                                                                                                      |
| `Toggle`, `Stepper` (≥ 44 px on phones), `DatePickerRow` (chip strip + calendar modal, single/multi, max days) |
| `SwipeRow`                                                                                                     | swipe-left-to-delete                                                                                                                                                      |
| Feedback                                                                                                       | `Skeleton`, `TableSkeleton`, `CardGridSkeleton`, `EmptyState`, `ErrorState` (retry), `FutureBanner`, `StickyActionBar`, `BackToTop`, `Spinner`                            |
| Data                                                                                                           | `PageHead` (renders only the actions row; titles live in the top bar), `ContextPanel` (side explainer)                                                                    |

### 20.5 Responsive behaviour

- Mobile-first; touch targets ≥ 44 px; hover styles only on hover-capable devices; safe-area insets.
- Staff: sidebar on desktop → bottom tab bar + nav sheet ("More") on phones; tables → cards.
- Customer: action cluster fixed top-right; bottom tab bar on phones; wizard overview switches from the
  panoramic beach to zone cards on small screens; the map editor recommends a larger screen.

### 20.6 The customer scene

- Layered illustrated beach (sky, clouds, sea, shoreline, sand, vegetation) with **8 presets** or a
  custom photo; a decorative **floating life-ring**; parallax.
- **Live sea:** a WebGL2 three.js shader (lazy, DPR-capped, phones included) that reacts to wind,
  sun glint, dusk warmth, night and clouds; falls back to SVG if WebGL2 is missing or motion is reduced.
- **Weather** (demo): sunny / windy / overcast / rainy — sea agitation, backdrop dim, sun glint,
  clouds drifting right-to-left at per-weather speed, rain and wind-gust particles.
- **Time of day:** dawn half-light, daylight, golden-hour warmth (muted by cloud cover), blue dusk.
- **Shoreline animation:** the sand rises from 20% to 60% of the view when entering the wizard.
- One scene resolution for all customer pages, so Home, wizard and checkout always match.

### 20.7 Accessibility

`:focus-visible` rings, full keyboard operation (lint-enforced: no click-only static elements),
focus management in menus (Radix) and dialogs (in-house trap + return), `aria-label`s on icon
buttons, `role="switch"` + `aria-checked` on toggles, `aria-pressed` on chips, charts with accessible
names, status via icon + text, `<html lang>` sync, reduced-motion honoured in CSS and JS, 16 px inputs
on phones, 44 px targets. Known gaps — unnamed switches, sub-44 px sunbed targets on phones,
small-text contrast — are tracked in `UX_REVIEW.md`.

---

## 21. Demo-only features (do not treat as requirements)

| Feature                                                      | Where                   | Production replacement                                    |
| ------------------------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| Site gate (fixed credentials, client-side hash)              | `SiteGate.tsx`          | Hosting-level auth for stage, none for production         |
| "Any input signs you in" magic link / SSO                    | `auth.tsx`              | Real auth provider                                        |
| Persona switcher ("DEMO" pill, top-bar persona menu)         | Shell                   | Role-based access per signed-in user                      |
| Scene demo panel (weather + time slider)                     | Customer Home           | Real weather feed / real local time (admin switches stay) |
| "Simulate successful payment"                                | Checkout, pass purchase | Stripe Checkout redirect + webhook                        |
| "Show platform economics"                                    | Checkout                | Remove from customer UI                                   |
| Reset pass buttons                                           | Home tiles              | Remove                                                    |
| Random scan results                                          | Controller              | Real QR decode + validation                               |
| Hard-coded user "Elena M." / "Elena V." and her stats        | Everywhere              | Signed-in user                                            |
| Hard-coded KPIs, charts, notification feeds, reach counts    | Staff screens           | Real data                                                 |
| Simulated latency (450/650 ms)                               | `api/`, `useMockLoad`   | Real requests                                             |
| Toasts "Demo — …" (print, e-mail, SMS, publish, DPA pack, …) | Many                    | Real side effects                                         |
| "Saved to this browser" persistence                          | All config              | Server persistence                                        |
| Faux QR codes, unsigned `.pkpass`                            | Confirmation, passes    | Real QR encoding, server-signed passes                    |
| Sidebar footnote "Non-functional mockup…"                    | Staff shell             | Remove                                                    |

---

## 22. Known gaps and inconsistencies

Fix these when recreating (the intended behaviour is stated):

1. **Pricing rules are not applied to customer prices.** The wizard should price each set with
   `effectivePrice(base, zone, date, rules)` per chosen date.
2. **Zone map positions/identity don't drive the customer overview**, which uses fixed block positions.
   The zone map should be the single source for zone placement and identity.
3. **Zone open/closed** (Availability) doesn't hide or disable zones in the wizard.
4. **Wallet card designs** (Passes → Card designer) don't drive the customer's VIP/Season cards or
   wallet passes.
5. **Capability flags aren't enforced**: Akti tou Iliou has Day Locker and Parking flagged as roadmap,
   but the wizard sells both.
6. **Home promo "20% off front-row"** and **"Rebook your usual"** only open the wizard; the promo isn't
   applied and nothing is pre-selected.
7. **Cashier ticket categories** omit Senior and hard-code prices instead of using the shared pricing
   module; the controller's pay-on-site modal also hard-codes prices.
8. **Basket after payment** is cleared only via "View my bookings" / "View receipt".
9. **Loyalty "Claim"** only shows a toast; nothing is redeemed or tracked.
10. **Staff screens are mostly untranslated.**
11. ~~**README / UX_REVIEW** describe features that no longer exist (explorer, ⌘K palette, hold timer,
    bundle discount).~~ **Resolved 29 Sep 2026:** both files now match the code (see §3). UX-level
    issues — accessibility, touch targets, contrast, microcopy — are tracked in `UX_REVIEW.md`.
12. **QR codes are not scannable** (faux pattern).
13. **No automated tests**; Prettier formatting is not enforced in CI.
14. Screens are eagerly loaded (main chunk ~660 kB); `admin.tsx` holds 13 screens (~2,900 lines).
15. No RBAC structure formed yet for both users and tenants.
16. **On-hold sets are selectable** in the wizard: only taken sets are disabled
    (`src/components/sunbedGlyph.ts`). Only available sets should be selectable (C-03).

---

## 23. Recreation guide for an agent team

### 23.1 Principles

- Keep the **persona / page** information architecture and the hash-route contract from §6.
- Build every async surface with explicit **loading / error / empty / success** states and every
  control with its full interaction state set.
- Drive all colours, spacing, radii, shadows and motion from **tokens** (§20).
- Put business rules in **pure functions** (pricing, pass maths, pricing rules, segments, loyalty
  progress) shared by every screen that needs them (§17).
- Put all data access behind **one seam** so a backend can replace sample data without touching screens.
- Respect reduced motion and keyboard access from the first commit.

### 23.2 Workstreams (parallelisable)

| #   | Workstream                       | Deliverables                                                                                                                                                                                                       | Depends on |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| W1  | **Foundation & design system**   | Vite + React + TS strict, Tailwind tokens, `index.css` materials, UI kit (§20.4), icons, motion helpers, i18n layer, hash router, app store + persistence, toasts, lint/typecheck/CI                               | —          |
| W2  | **Shell & identity**             | Site gate [DEMO], sign-in, consent banner, top bar (basket, notifications, language, account), sidebar, bottom tab bar, nav sheet, persona switcher [DEMO], account settings, Privacy Centre, change password, 2FA | W1         |
| W3  | **Beach rendering**              | Beach backdrop + presets, sunbed glyphs, customer backdrop, live sea (three.js, lazy), weather FX, time-of-day, life-ring, sand vignettes                                                                          | W1         |
| W4  | **Customer booking**             | Home, wizard (all steps, FLIP zoom, basket explosion), checkout with passes, confirmation (QR, wallet, ICS), My Bookings, My Documents (PDF/ZIP), VIP/Season purchase                                              | W1, W2, W3 |
| W5  | **Tenant configuration (Admin)** | Availability & pricing rules, Map editor (zone map + Konva sunbed editor + background + logos + atmosphere), Passes (pricing + card designer), Loyalty, Gamification                                               | W1, W3     |
| W6  | **Tenant operations (Admin)**    | Dashboard, Bookings, Manual booking, Users & Segments, Reporting (8 tabs, CSV), Refunds, Privacy & GDPR, Communicate                                                                                               | W1, W2     |
| W7  | **On-site ops**                  | Cashier (issue, redeem, register, locker), Controller (scan, walk-in, tickets, same-day)                                                                                                                           | W1, W2     |
| W8  | **Finance**                      | Accountant invoicing + commission & payouts                                                                                                                                                                        | W1, W2     |
| W9  | **Platform**                     | Tenants, onboarding wizard, super admin, compliance & breach workflow, verticals, landing                                                                                                                          | W1, W2     |
| W10 | **QA**                           | Journey scripts from §8–§14, rule assertions from §17, a11y and responsive checks, reduced-motion checks                                                                                                           | all        |

### 23.3 Acceptance checklist (per journey)

- [ ] Every route in §6 renders, deep-links, survives refresh, and works with Back/Forward.
- [ ] C-03: pick 2 sets in Central for 1 day, auto 4 adults, 1 locker, 1 parking spot with plate →
      Review shows all rows → Confirm → basket has 5 lines (2 sets, 1 ticket line "× 4", locker,
      parking) → with Central sets at €25: €25 + €25 + €40 + €5 + €15 = **€110**.
- [ ] Multi-day: 3 days × same picks → 3× each per-day line; specific-day locker only on chosen days.
- [ ] Checkout with a Season pass and tickets deducts €10; with VIP credit applies the discount formula
      (§17.4); fully covered orders skip Stripe.
- [ ] Publishing a zone layout in the Map editor changes what the wizard shows for that zone and the
      Home "free today" count.
- [ ] Pricing rule editor validation and preview match §17.5 exactly.
- [ ] Refund modal enforces €1…charge for partial refunds and walks the 4 steps.
- [ ] Users: > 15 visits → Regular; VIP/Season toggles persist within the session.
- [ ] Every table reflows to cards on a 390 px wide screen; every control is keyboard-operable with a
      visible focus ring; motion stops under reduced motion.
- [ ] All [DEMO] features are isolated so they can be removed without touching product code.

---

## 24. Appendix — seed data

### Zones (anchor tenant)

| Zone     | Prefix | Colour    | Total sets | Available | From |
| -------- | ------ | --------- | ---------- | --------- | ---- |
| Akanthus | AK     | `#6366f1` | 100        | 67        | €30  |
| Central  | CE     | `#0ea5e9` | 125        | 83        | €25  |
| Macaw    | MC     | `#ef4444` | 24         | 16        | €35  |
| Bestbuy  | BE     | `#22c55e` | 89         | 69        | €22  |
| Main     | MA     | `#f59e0b` | 65         | 44        | €28  |
| Bolivar  | BO     | `#a855f7` | 86         | 57        | €18  |

Default wizard layout per zone: 8 columns × 6 rows = 48 sets; the admin grid generator allows up to 120
sets and 16 per row.

### Beach facilities (map pins)

Beach bar, Sunset bar, Restrooms ×2, Outdoor shower ×2, First aid.

### Weather presets (demo)

| Weather  | Temp | Wind | Dim  | Glint | Cloud speed   |
| -------- | ---- | ---- | ---- | ----- | ------------- |
| Sunny    | 28°  | 0.22 | 0    | 1     | 0 (clear sky) |
| Windy    | 24°  | 1    | 0.10 | 0.75  | 85            |
| Overcast | 22°  | 0.45 | 0.26 | 0.12  | 7             |
| Rainy    | 19°  | 0.70 | 0.34 | 0.05  | 22            |

### Pass pricing defaults

VIP credit packs €500 and €1,000; spend discount 20%; Season monthly €120; Season whole summer €350;
season end 30 Sep 2026.

### Tenants (platform)

| Tenant            | Subdomain               | Stripe     | Modules                       | Status | MRR   |
| ----------------- | ----------------------- | ---------- | ----------------------------- | ------ | ----- |
| Akti tou Iliou    | aktitouiliou.slaice.app | charges ✓  | Booking, Ticket, Invoice, Pay | Live   | €4.2k |
| Kavouri Coast     | kavouri.slaice.app      | charges ✓  | Booking, Ticket, Invoice, Pay | Live   | €2.8k |
| Sun & Sea Paros   | sunseaparos.slaice.app  | charges ✓  | Booking, Ticket, Invoice, Pay | Live   | €3.1k |
| Blue Lagoon Beach | bluelagoon.slaice.app   | charges ✓  | Booking, Ticket, Pay          | Live   | €1.9k |
| Naxos Sands       | naxossands.slaice.app   | charges ✓  | Booking, Invoice, Pay         | Live   | €2.2k |
| Glyfada Bay       | glyfada.slaice.app      | KYC review | Booking, Ticket               | Setup  | —     |
| Demo Beach #2     | beach2.slaice.app       | onboarding | Booking                       | Setup  | —     |
| Mykonos Shore     | mykonosshore.slaice.app | KYC review | Booking, Ticket               | Setup  | —     |
| Rhodes Bay Club   | rhodesbay.slaice.app    | onboarding | Booking                       | Setup  | —     |
| Paralia Sun       | paraliasun.slaice.app   | pending    | —                             | Lead   | —     |
| Saronida Beach    | saronida.slaice.app     | pending    | —                             | Lead   | —     |
| Vouliagmeni Cove  | vouliagmeni.slaice.app  | pending    | —                             | Lead   | —     |

### Messaging channels

| Channel | Setup                    | Providers                                            | Sender                                    |
| ------- | ------------------------ | ---------------------------------------------------- | ----------------------------------------- |
| Push    | none (in-app, connected) | In-app                                               | Akti tou Iliou                            |
| E-mail  | API key                  | SendGrid, Mailgun, Postmark, Amazon SES, Custom SMTP | from-address (e.g. hello@aktitouiliou.gr) |
| Viber   | API token                | Viber Business Messages, Vonage, Infobip             | sender name                               |
| SMS     | API key                  | Twilio, Vonage, Apifon (GR), Infobip                 | alphanumeric sender ID (e.g. AKTI)        |

### Other seeds

- **Customers:** 24 sample Greek customers with visits, spend, tags and last visit (`src/data/mock.ts`).
- **Admin bookings:** ~68 bookings across channels and statuses (32 detailed + 36 generated history).
- **Refunds:** 12 transactions (3 pending).
- **Accountant documents:** 19 (ΑΠΥ, ΤΠΥ, ΑΚΥ, credit notes; one in the retry queue).
- **Monthly payouts:** May–Sep (gross €48k → €241k peak in August).
- **Locker banks:** A–E, 30 lockers each.
- **Cash sessions:** current `#CS-204` + 8 past sessions.
- **GDPR:** consent purposes, processors, retention, data rights, DSAR queue (10), ROPA, sub-processors,
  breaches (none open), tenant DPAs.
- **Background presets:** Azure Bay, Turquoise, Sunset, Slate Minimal, Akti tou Iliou (default), Palm
  Cove, Golden Hour, Hidden Cove.
- **Languages:** English, Ελληνικά, Deutsch, Français, Español, Italiano.
