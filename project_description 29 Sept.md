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
- **Documentation in the repo:** `README.md` and `UX_REVIEW.md` are partly out of date (they mention a
  Feature Inventory / User Journeys explorer, a ⌘K command palette, a booking hold timer and a bundle
  discount — none of these exist in the current code). **This document supersedes them.**

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

All six personas share one app. In the mockup a **persona switcher** lets anyone view any persona
**[DEMO]**; in production each persona is a role with its own permissions.

| Persona                                    | Greek label (source)      | Who                                                             | Purpose                                                                                       | Default page | Surface style                               |
| ------------------------------------------ | ------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------- |
| **Customer**                               | Πελάτης                   | Beach guest (demo user: _Elena M._, `elena@example.com`)        | Online booking, tickets, QR entry, documents, passes, rewards                                 | `home`       | Consumer, immersive beach scene, no sidebar |
| **Manager / Admin** (incl. **Call Agent**) | Διαχειριστής / Call Agent | Tenant manager; a call agent ≈ admin minus tenant configuration | Configuration, availability, pricing, map, bookings, CRM, reporting, refunds, GDPR, marketing | `dashboard`  | Staff console: sidebar + top bar            |
| **Cashier**                                | Ταμίας                    | On-site cashier at the entrance                                 | Anonymous on-site tickets, printing, redeem, cash register, locker sales                      | `issue`      | Staff console                               |
| **Controller**                             | Ελεγκτής                  | Gate staff                                                      | QR validation, walk-ins, pay-on-site tickets, same-day release                                | `scan`       | Staff console                               |
| **Accountant**                             | Λογιστής                  | Tenant's accountant                                             | e-Invoicing & myDATA, commission & payouts, VAT                                               | `invoicing`  | Staff console                               |
| **Platform / Slaice**                      | Slaice staff              | Slaice internal team — the **super admin**                      | Tenants, onboarding, capability flags, webhooks, compliance, verticals, landing page          | `tenants`    | Staff console (indigo brand)                |

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

| Route                  | Screen                 | Short label (mobile) | Tag      |
| ---------------------- | ---------------------- | -------------------- | -------- |
| `#/admin/dashboard`    | Dashboard              | Home                 | [MVP]    |
| `#/admin/availability` | Availability & Pricing | Pricing              | [MVP]    |
| `#/admin/map`          | Map Layout Editor      | Map                  | [MVP]    |
| `#/admin/bookings`     | Bookings               | Bookings             | [MVP]    |
| `#/admin/manual`       | Manual / Phone Booking | Manual               | [MVP]    |
| `#/admin/users`        | Users & Segments       | Users                | [MVP]    |
| `#/admin/reporting`    | Reporting & Analytics  | Reports              | [MVP]    |
| `#/admin/refunds`      | Refunds                | Refunds              | [MVP]    |
| `#/admin/privacy`      | Privacy & GDPR         | Privacy              | [MVP]    |
| `#/admin/communicate`  | Communicate            | Comms                | [Future] |
| `#/admin/loyalty`      | Loyalty                | Loyalty              | [Future] |
| `#/admin/passes`       | Passes                 | Passes               | [Future] |
| `#/admin/gamification` | Gamification           | Badges               | [Future] |

### Cashier

| Route                | Screen        | Tag      |
| -------------------- | ------------- | -------- |
| `#/cashier/issue`    | Issue Ticket  | [MVP]    |
| `#/cashier/redeem`   | Redeem Ticket | [MVP]    |
| `#/cashier/register` | Cash Register | [Future] |
| `#/cashier/locker`   | Sell Locker   | [Future] |

### Controller

| Route               | Screen          | Tag   |
| ------------------- | --------------- | ----- |
| `#/controller/scan` | Gate Validation | [MVP] |

### Accountant

| Route                     | Screen               | Tag   |
| ------------------------- | -------------------- | ----- |
| `#/accountant/invoicing`  | e-Invoicing & MyDATA | [MVP] |
| `#/accountant/commission` | Commission & Payouts | [MVP] |

### Platform / Slaice

| Route                   | Screen                    | Tag      |
| ----------------------- | ------------------------- | -------- |
| `#/platform/tenants`    | Tenants                   | [MVP]    |
| `#/platform/onboarding` | Tenant Onboarding         | [MVP]    |
| `#/platform/superadmin` | Super Admin               | [Future] |
| `#/platform/compliance` | Compliance & DPA          | [MVP]    |
| `#/platform/verticals`  | Verticals                 | [Future] |
| `#/platform/landing`    | Landing Page (slaice.app) | [Future] |

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
- **Scene demo panel**, bottom-left on Home: time-of-day slider + weather picker **[DEMO]**.
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

---

## 8. User journeys — Customer

Each journey: **ID · name**, trigger, steps, outcome, rules and states.

### C-01 · Sign in

- **Trigger:** first visit or after sign-out.
- **Steps:** (site gate [DEMO]) → enter e-mail → "Send magic link" → "Check your inbox" → "Continue";
  or tap an SSO provider (Google / Microsoft / Apple / Facebook).
- **Validation:** e-mail required and must be valid (inline error, `role="alert"`).
- **Outcome:** signed in, lands on the last customer page (default Home). Consent banner appears if
  undecided.

### C-02 · Explore Home

The Home page is the customer's dashboard. Elements:

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

**Trigger:** hero CTA, Claim, Book again, Use it, "Plan my visit" buttons, the Plan tab.

**Layout:** a glass menu panel over the sea (top) + the tappable beach (sand) below + a guidance bar
(bottom) + "powered by SLAiCE". Header: **Leave** (back to Home), step counter "n / 5", and a
**progress rail** drawn as a footpath across the sand with 5 stations (tap a station to jump). Footer:
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
   - Legend: Available · On hold · Taken · Yours. Only **available** sets are selectable.
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

### C-04 · Checkout [MVP]

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

### C-05 · Confirmation

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

- KPI cards: Active bookings, This season (€ total, count), Next visit.
- **"Your season in review"** banner: visits, favourite zone, savings, spend, visits/month sparkline.
- Tabs **All / Active / Past**; **E-mail all QRs** (demo).
- Table: Booking, Item, Date, Status (Confirmed / Used / Cancelled / Unpaid / Refunded / Pending),
  Price, **QR**. The QR modal shows the entry QR, wallet buttons and **Resend by e-mail**.
- Loading skeletons, error with retry, filter-specific empty states.

### C-07 · My Documents

- KPI cards: receipts this season (ΑΠΥ count), total spend, myDATA status 100%.
- Tabs **All / ΑΠΥ / ΤΠΥ / Credit notes**; **Download all (ZIP)** bundles real generated PDFs.
- Table: Document number, For, Date, Amount, Status "MyDATA ✓", **View** / **PDF**.
- View modal: issuer (Akti tou Iliou AE, ΑΦΜ), lines (description · net · VAT · gross), total, QR,
  **MARK**, "invoiceType 2.1 · payment 7"; Download.

### C-08 · Buy a VIP Pass (prepaid credit)

1. **Select:** hero "Prepay credit, save on everything"; credit packs (default €500 and €1,000 — admin
   configurable), each showing "Spends like €X · 20% off" and validity to season end.
2. **Terms:** bullet list (prepaid, spendable on any service; discount applies to the credit-paid
   part; valid to season end, unused balance expires, non-refundable; personal, non-transferable; no
   cash value; misuse may lead to cancellation) + mandatory **"I have read and agree"** checkbox.
3. **Pay with Stripe** → redirect → simulate **[DEMO]**.
4. **Done:** "You're now a VIP member", wallet buttons, pills (Stripe paid · Credit added · ΑΠΥ →
   MyDATA ✓), Back to home / Plan a visit. Buying again **tops up** the balance.

### C-09 · Buy a Season Pass

Same four-phase flow: plans **Monthly** (€120, valid one month from purchase) or **Whole summer**
(€350, to season end); terms (one entry per visit, entry only, personal, photo ID may be requested,
non-refundable once activated); pay; done ("Your entry is covered every visit").

### C-10 · Manage account, privacy and security

See §7.4–§7.6: profile, notification preferences, saved cards, change password, 2FA, data export,
consents, erasure request, cookie preferences, language.

### C-11 · Notifications

Customer feed examples: booking confirmed (QR ready), weather alert (re-confirm 24 h before), weekend
offer, receipt ready (ΑΠΥ transmitted). Mark individual / all as read; open settings.

---

## 9. User journeys — Manager / Admin

### A-01 · Dashboard [MVP]

- Period tabs **Day / Week / Month / Year** (chart series change per period); **Export** (multi-section
  CSV of KPIs + every chart series + latest bookings).
- KPI cards: Revenue (7d) €33.4k (+12%), Bookings (7d) 1,284 (+8%), Occupancy 71% (+3pp), Avg basket
  €41 (+€2).
- Charts: Revenue bar chart (peaks highlighted), Revenue by capability donut (Sunbeds 62% · Tickets
  28% · Other 10%), Occupancy by zone (horizontal bars), Latest bookings table (+ View all → Bookings).

### A-02 · Availability & Pricing [MVP]

- **Tab "Availability":** table per zone — sunbeds, available, base price, **Open** toggle, status badge
  (Open / Closed). **Publish** (demo toast). **[GAP]** open/closed does not reach the customer wizard.
- **Tab "Seasonal & day pricing":**
  - Rule list: name, effect badge ("Set to €40", "+€10", "−10%"), zone · days · period, enable toggle,
    edit, remove. Empty state.
  - **Rule editor modal:** Rule name (auto-suggested from period + days), Apply to (All zones / a
    zone), Days (Every day / Weekdays Mon–Fri / Weekends Sat & Sun), Period (from → to date inputs +
    month presets), Price change (Set price to € / Increase by € / Change by %), Amount. Validation: end
    ≥ start; `set` needs amount > 0; others need amount ≠ 0. **Live preview** of before → after on a
    representative zone and matching date.
  - **Price preview:** pick a date → effective price per zone (struck-through base → new price),
    weekend/weekday badge.
  - Seed rules: "August weekends" +€10 (all zones, 1–31 Aug 2026, weekends); "July weekday
    early-bird" −10% (1–31 Jul 2026, weekdays).
  - **[GAP]** rules are not yet applied to customer prices.

### A-03 · Map Layout Editor [MVP]

Two tabs plus an Atmosphere card:

1. **Zone map:** a canvas showing the tenant's beach background. Drag zones to position them (pointer
   drag, clamped); select a zone to edit **name, code prefix, colour, rows × columns**; add / remove
   zones (at least one must remain); **Background** picker; **Save layout** (also auto-saves, debounced).
   Hint on small screens: best on a larger screen. **[GAP]** zone positions do not drive the customer
   overview.
2. **Sunbed layout** (per zone, zone chips at the top): an interactive canvas (Konva) from _SEA · FRONT
   ROW_ (top) to _PROMENADE_ (bottom).
   - Drag sets to arrange; click to select; ⇧/⌘-click for multi-select; **Snap to grid** toggle.
   - Side panel: **Store logo** (upload/replace/remove, downscaled to 256 px); **Grid generator**
     (umbrella sets count ≤ 120, columns per row ≤ 16 → Generate); **Add**, **Copy** (duplicate),
     **Reset** (default grid), remove.
   - For the selection: **availability** (Available / On hold / Blocked), **type** (Standard / Front
     row / Cabana), **price (€/day)**, position.
   - Counter "N sets · M available · K selected".
   - **Publish to wizard** → customers see exactly this arrangement when they open the zone.
3. **Atmosphere** card (visible on both tabs): switches **Weather effects** (sea state, rain, cloud
   cover & scene tint) and **Time-of-day lighting**; current weather (Sunny 28° / Windy 24° / Overcast
   22° / Rainy 19°); **scene clock** slider (tip: ~19:30 gives golden hour). "Cosmetic only — booking is
   unaffected."

**Background picker** (modal): preset groups _Clean gradients_ and _Illustrated scenes_ (Azure Bay,
Turquoise, Sunset, Slate Minimal, Akti tou Iliou [default], Palm Cove, Golden Hour, Hidden Cove) or
**Your own photo** (JPG/PNG/WebP, downscaled to ≤ 1600×900) → preview → **Use background**.

### A-04 · Bookings [MVP]

- Search (ID, name, surname, phone, items), **sortable** columns (Booking, Name, Surname, Date,
  Amount), pagination (30 per page), **Export** CSV (one row per booking _item_; total on the first
  item row).
- Columns: Booking, Name, Surname, Phone, Items (a booking can hold several sets + parking + locker +
  tickets, stacked with "N items · one booking"), Date, Channel badge (Online / Walk-in / Phone /
  Cashier), Status, Amount, **Resend QR**.
- **Resend QR** modal: choose **Email / Viber / SMS** (shows the destination) → "Resend via …".

### A-05 · Manual / Phone Booking [MVP]

- Form: customer name, e-mail, phone, zone, sunbed code, date, **Mark as** (Unpaid (manual) / Comp /
  VIP / Pay later).
- **Live beach coverage** mini-map of the zone's published layout: tap an available set to fill the
  code; taken sets are dimmed.
- **Reserve & send QR** → channel picker (Email / Viber / SMS) → result card with QR, "Reserved ·
  Unpaid", "QR sent via … to …; the customer can pay later or present the QR at the gate".
- Side panel: block without payment (phone, VIP comps, pay-later), QR by e-mail/Viber/SMS, settle
  later in Bookings. Manual bookings appear in reporting with channel = Phone.

### A-06 · Users & Segments [MVP]

- Search, tag filters **All / VIP / Season pass / Regular / New**, **New tag** (demo).
- Rule banner: every guest starts **New** and becomes **Regular** after **15 visits**; **VIP** and
  **Season pass** are assigned by hand.
- Table: Name, Surname, Phone, Email, Visits, Tags, **Edit**, **Activity**.
- **Edit user** modal: first name, surname, e-mail (validated), phone, visits this season; automatic
  segment shown read-only; manual segment toggles (VIP — "High-value guest perks"; Season pass —
  "Unlimited entry this season").
- **Activity** modal: stats (visits, total spend, avg/visit, last visit) and a recent-activity timeline
  (account created, sunbed booking, entry tickets, payment received, checked in at the gate, loyalty
  stamp earned, opened a campaign), **Message**, **Edit profile**.
- The demo customer's purchased passes show as pass-derived tags (wallet icon).

### A-07 · Reporting & Analytics [MVP]

Eight tabs, each exportable to CSV exactly as displayed:

1. **Executive** — Season revenue €704k, Total bookings 26,040, Avg occupancy 68%, Online share 40%,
   Refund rate 1.4%, RevPATB €18.4, ADR €27.1, Ancillary attach 0.7, No-show 2.8%; revenue by month,
   revenue mix, booking pace vs last year; insight card ("Macaw hits 91% by noon… consider dynamic
   weekend pricing" → **Set a rule**, currently a demo toast; it should open the pricing rules).
2. **Revenue** — by capability, by zone, all transactions (filterable).
3. **Occupancy** — by zone, utilisation heatmap (week × zone).
4. **Bookings** — avg lead time, online vs walk-in, cancellation, sets/booking; volume by day.
5. **Channels** — sales by channel & role (Online / Walk-in / Cashier), channel by week.
6. **Customers** — new vs returning, season-pass holders, VIP segment revenue, top customers.
7. **Tickets** — ticket history.
8. **Daily ops** — daily operations for a date; documents issued (ΑΠΥ/ΤΠΥ, all transmitted).

### A-08 · Refunds [MVP]

- Period tabs (Week / Month / Season), **Export** CSV.
- KPIs: Refunded this month (€, count), Pending review, Refund rate, Top reason.
- Table: Transaction, Date, Name, Surname, Phone, Amount (partial refunds show "−€X refunded"), Reason,
  Status (Pending / Refunded), **Refund** action.
- **Issue refund** modal: Refund type (Full / Partial — amount between €1 and the charge, with helper
  text), Reason (Weather / Double booking / Customer request / Service issue), note "Reverses the
  application fee and auto-issues a credit note to MyDATA" → **Refund €X via Stripe** → animated steps:
  Authorizing with Stripe → Reversing the charge & application fee → Issuing MyDATA credit note (5.1) →
  E-mailing the customer → **Refund complete** (Stripe refund id).

### A-09 · Privacy & GDPR [MVP]

- KPIs: Open requests, Due ≤ 10 days (30-day statutory deadline), Consent rate, Avg resolution.
- Tabs:
  1. **Data requests** — DSAR queue (ID, type, subject, received, due in N days, status: In progress /
     Awaiting ID / Completed). **Handle request** runs a type-specific step workflow:
     - _Access / Portability:_ Verify identity → Locate personal data → Compile export → Send secure
       download.
     - _Erasure:_ Verify identity → Locate → **Apply legal holds** (invoices kept 5 years) → Erase the
       rest → Confirm to subject.
     - _Rectification:_ Verify → Locate the record → Apply correction (re-issue affected receipts) →
       Confirm.
     - _Restriction / Objection:_ Verify → Identify processing → Restrict processing → Confirm.
  2. **Consent audit** — purposes (necessary / analytics / marketing e-mail / SMS / push) with opt-in %.
  3. **Retention** — schedule per data category (value + unit: hours/days/months/years), tax-mandated
     rows flagged.
  4. **Processing register (ROPA)** — activity, purpose, data categories, legal basis, retention.

### A-10 · Communicate [Future]

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

### A-11 · Loyalty [Future]

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

- **Pricing tab:** VIP **credit packs** (add/remove packs), **spend discount** (%), Season **Monthly (€)**
  and **Whole summer (€)** → **Save pricing** (live on the customer purchase flow).
- **Card designer tab:** a list of card designs (VIP credit, Season pass; duplicate). Edit on a live
  card: background top/bottom colours, wave accent, text elements (title, subtitle, holder, number,
  valid-until: text, size, colour, tracking), **logo** (upload/replace, size %, drag to position),
  **QR** (show/hide, size, drag). Draft → **Review & publish** (preview incl. Apple Wallet and Google
  Wallet renditions) → published.
- **[GAP]** published designs do not yet drive the customer's cards.

### A-13 · Gamification [Future]

- Achievements list: name, icon (curated summer set), colour (sun, coral, gold, teal, sky, sea), rule
  "When **visits / bookings / spend (€)** reaches **N**". Add / remove, **Save badges** (live on the
  customer Home).
- Seed badges: First Splash (1 visit), Sun Seeker (5), Big Spender (€500), Beach Regular (10), Wave
  Rider (20), Summer Legend (30).

---

## 10. User journeys — Cashier

### K-01 · Issue on-site ticket [MVP]

- Categories with steppers: Adult €10, Resident €6, Child €5 (anonymous tickets).
- **Charge €X (card)** (Stripe Terminal) or **Cash** → "Ticket issued · Paid" card with QR, "ΑΠΥ
  auto-issued to MyDATA" → **Print ticket** (ESC/POS receipt printer).
- Side panel "How it works": pick categories → take payment → print the QR. Tickets validate at the
  gate scanner. **[GAP]** no Senior category; prices are hard-coded here.

### K-02 · Redeem ticket [MVP]

- Enter a ticket code/number (e.g. `TK-55119`) → **Redeem ticket** → "Valid — admitted ✓" or "Already
  used — cannot reuse" (mock rule: codes containing "used" are already used).
- Recent redemptions list. QR scanning is not required for cashier-issued tickets; online QR tickets
  are scanned by the Controller.

### K-03 · Cash register session [Future]

- **No open session:** explanation, **Open session**, table of **past sessions** (session id, cashier,
  date, duration, cash, card, transactions, status).
- **Open session:** KPIs (session id + cashier, open since + duration, cash in, card in); **Tender mix**
  (card vs cash bar); **Shift stats** (transactions, avg transaction, items/receipt, voids/refunds,
  busiest hour); **Cash reconciliation** (opening float, expected drawer, counted, **variance** with a
  shortfall warning); ledger table (time, type: Float in / Sale / Handover / Refund, item, method,
  amount).
- Actions: **Print Z-report**, **Record handover**, **Close session** (statistics + CSV ready).

### K-04 · Sell a locker [Future]

- **Locker banks** (A Entrance, B Pool side, C North gate — €5; D Family area — €7; E Premium — €9),
  30 lockers each, showing free/total.
- Grid of lockers (free / taken / selected) → **Charge €X** → "Locker sold · A07" with QR slip →
  **Print slip**. Inventory is marked taken; ΑΠΥ auto-issued.

---

## 11. User journeys — Controller

### G-01 · Gate validation [MVP]

- **Scan QR** (camera viewfinder simulation with scan line) → **Scan result** modal:
  - **Valid** — "admit the guest" → **Admit guest** ("✓ Admitted — gate opened").
  - **Already used** — "validated earlier today. Override only if you're sure" → **Override & admit**.
  - **Invalid** — "not recognised — do not admit" (no admit button).
  - Scan outcomes are random in the mockup **[DEMO]**.
- **Recent validations** list (tap for detail): booking/ticket id, zone·set or ticket type, state badge.
- **Gate analytics:** Scanned today 1,284, Throughput 312/hr (peak 11:00–13:00), No-shows 2.8%,
  Duplicate scans 4; throughput by hour chart.

### G-02 · Walk-in booking

Modal: zone, sunbed code, guests (stepper ≥ 1), payment (Card (Stripe) / Cash) → **Reserve & charge €X**
(zone base price) → added to recent validations, "QR printed".

### G-03 · Add ticket (pay on site)

Modal: Adult (13+) €10, Alimos resident €6, Child (6–12) €5, Senior €7 → **Charge €X via Stripe**
("QR e-mailed").

### G-04 · Open same-day availability

Modal: per zone stepper (0–24 sets) of unsold sunbeds to **release for instant online booking today** →
**Publish N sets**.

---

## 12. User journeys — Accountant

### F-01 · e-Invoicing & MyDATA [MVP]

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

- KPIs: Season gross €704k, Stripe fees −€10.2k (~1.5%), Slaice 5% −€35.2k, Tenant net €658.6k.
- **Gross → net (this month)** table; **Monthly payouts** (May–Sep: gross, Stripe fee, Slaice 5%, tenant
  net + season totals); **Export** CSV.
- **VAT collected by rate:** 24% standard, 13% reduced (F&B), 6% super-reduced.
- **myDATA transmission** health donut (99.6% ok).
- **Payout reconciliation:** Stripe balance, In transit to bank, Fees withheld, Unreconciled.

---

## 13. User journeys — Platform / Slaice (super admin)

### P-01 · Tenants [MVP]

- **Onboard tenant** → P-02.
- KPIs: Active tenants (Live), Pipeline (Setup + Lead), Platform GMV €704k, Slaice fees €35.2k; SaaS
  metrics: MRR €18.6k (ARR €223k, sparkline), Net revenue retention 112%, Logo churn 1.1%/mo, ARPA
  €1,062.
- **MRR growth** line chart; **Onboarding funnel** (Leads 48 → Trials 22 → KYC passed 14 → Live 11; avg
  time-to-activate 6.5 days).
- Tenants table: name, subdomain, Stripe status, modules, MRR, status, **Edit** (modal: name,
  subdomain, Stripe status, status, MRR, modules Booking/Ticket/Invoice/Pay).
- **Capability flags · Akti tou Iliou** summary (enabled MVP vs roadmap-disabled) → Manage in Super
  Admin.

### P-02 · Tenant onboarding wizard [MVP]

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

- **Capability flags per tenant** matrix: 12 modules × tenants, toggles.
- **Stripe webhooks** health: `checkout.session.completed`, `payment_intent.succeeded`,
  `payment_intent.payment_failed`, `charge.refunded`, `account.updated` — "healthy"; signed endpoint
  verifies `Stripe-Signature`.

### P-04 · Compliance & DPA [MVP]

- Actions: **DPA pack** (PDF, demo), compliance posture report (demo).
- KPIs: Data residency EU (Frankfurt), sub-processors count (all DPA-signed), Open incidents 0, Breach
  SLA 72h.
- Tables: **Sub-processors** (Stripe, AWS Frankfurt, myDATA/AADE, …: purpose, region, DPA) and
  **Per-tenant DPA & posture** (DPA status, residency, DPO, last review).
- **Breach notification register** ("All clear") + **Start workflow** → 72-hour workflow: Assess
  severity & scope → Contain & remediate → Assess notifiability (Art. 33/34) → Notify the supervisory
  authority → Notify affected tenants & subjects → Log to the breach register → **File & close**.

### P-05 · Verticals [Future]

Cards for Theatre/Cinema, Events/Concerts, Retail Market, and a **cross-business capability reuse**
matrix (Calendar & inventory, Payments, Catalogue/pricing, QR & validation, e-Invoice/MyDATA, Geo
map/layout, Loyalty/reviews × Beach / Theatre / Events / Retail).

### P-06 · Landing page (slaice.app) [Future]

Public marketing page preview: SLAiCE logo, "Digital Multi-Product Platform", "Digital Business
Capability as-a-service", **Request a demo** / **Explore capabilities**, use-case cards (Beach, Theatre &
Events, Retail, Compliant: Stripe + MyDATA).

---

## 14. Cross-persona end-to-end journeys

| ID   | Journey                    | Path                                                                                                                                                                                                                                                     |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-01 | **Book → enter → account** | Customer books in the wizard (C-03) → pays (C-04) → QR + ΑΠΥ (C-05) → Controller scans QR (G-01) → booking shows in Admin Bookings (A-04) and Reporting (A-07) → ΑΠΥ with MARK in Accountant invoicing (F-01) → net payout after Stripe + 5% fee (F-02). |
| X-02 | **Layout publish**         | Admin designs a zone's sets and publishes (A-03) → customer wizard shows that exact arrangement and availability (C-03) → Home "N sunbeds free today" updates (C-02) → Manual booking mini-map uses it (A-05).                                           |
| X-03 | **Refund**                 | Admin issues a full/partial refund (A-08) → Stripe charge + application fee reversed → credit note 5.1 to myDATA (F-01 "Credit notes") → customer sees the credit note in My Documents (C-07).                                                           |
| X-04 | **Loyalty campaign**       | Admin configures/enables a scheme (A-11) → Promote → Communicate pre-filled (A-10) → customer sees the reward on Home "Your rewards" (C-02).                                                                                                             |
| X-05 | **Passes**                 | Admin sets pass pricing (A-12) → customer buys VIP/Season (C-08/C-09) → pass applied at checkout (C-04) → user gets a pass-derived tag in Users & Segments (A-06).                                                                                       |
| X-06 | **Phone booking**          | Call agent reserves a set without payment (A-05) → QR sent by e-mail/Viber/SMS → status Unpaid in Bookings → settled on arrival.                                                                                                                         |
| X-07 | **Walk-in / same-day**     | Controller releases same-day sets (G-04) or books a walk-in (G-02) → channel Walk-in in reporting.                                                                                                                                                       |
| X-08 | **Tenant go-live**         | Platform onboards a tenant with Stripe KYC (P-02) → sets capability flags (P-03) → tenant admin configures the map (A-03) → customers book.                                                                                                              |
| X-09 | **GDPR request**           | Customer exports data / requests erasure (§7.5) → request appears in the Admin DSAR queue (A-09) → handled with legal holds on invoices → breach/compliance oversight at platform level (P-04).                                                          |
| X-10 | **Atmosphere**             | Admin toggles weather effects / time-of-day lighting (A-03 Atmosphere) → every customer page renders the same scene (C-02, C-03, C-04).                                                                                                                  |

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
| 33  | Manual / phone booking without payment                                           | Admin (Call Agent)              | MVP                 | A-05             |
| 34  | CRM users with auto + manual segments, edit, activity                            | Admin                           | MVP                 | A-06             |
| 35  | Reporting (8 tabs, CSV per tab)                                                  | Admin                           | MVP                 | A-07             |
| 36  | Refunds (full/partial, reasons, Stripe + credit note)                            | Admin                           | MVP                 | A-08             |
| 37  | DSAR handling workflows, consent audit, retention, ROPA                          | Admin                           | MVP                 | A-09             |
| 38  | Messaging channel connections (E-mail/Viber/SMS providers)                       | Admin                           | Future              | A-10             |
| 39  | Campaigns to segments with loyalty offers                                        | Admin                           | Future              | A-10             |
| 40  | Loyalty schemes (6 built-in + custom), timed offers, regulars offers             | Admin                           | Future              | A-11             |
| 41  | Pass pricing + wallet card designer                                              | Admin                           | Future              | A-12             |
| 42  | On-site anonymous ticket sales + printing                                        | Cashier                         | MVP                 | K-01             |
| 43  | Ticket redemption                                                                | Cashier                         | MVP                 | K-02             |
| 44  | Cash register sessions, Z-report, reconciliation, handover                       | Cashier                         | Future              | K-03             |
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
| 57  | Live WebGL sea, weather and time-of-day scene                                    | Customer                        | Built (visual)      | §20.6            |

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
| Primitives | Radix UI (Dialog, DropdownMenu, Popover, Switch, Tabs, Tooltip, VisuallyHidden)                                                                         |
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
| `Modal`                                                                                                        | Radix dialog, focus trap, return focus, `wide` option, footer slot                                                                                                        |
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
Radix focus management, `aria-label`s on icon buttons, `aria-pressed` on toggles/chips, charts with
accessible names, status via icon + text, `<html lang>` sync, reduced-motion honoured in CSS and JS,
16 px inputs on phones, 44 px targets.

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
11. **README / UX_REVIEW** describe features that no longer exist (explorer, ⌘K palette, hold timer,
    bundle discount).
12. **QR codes are not scannable** (faux pattern).
13. **No automated tests**; Prettier formatting is not enforced in CI.
14. Screens are eagerly loaded (main chunk ~660 kB); `admin.tsx` holds 13 screens (~2,900 lines).
15. No RBAC structure formed yet for both users and tenants. 

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
