# Slaice — UX Review & Improvement Backlog

> **Status: re-verified on 29 Sep 2026** against `main` at commit `ba18313`. Every finding was
> re-checked in the current code, and the visual ones in a real browser. File:line references point
> at that commit. The full product specification is
> [`project_description 29 Sept.md`](project_description%2029%20Sept.md); where the two disagree, the
> spec wins.

## How this review works

- **Original review.** A UX review of the Slaice beach-SaaS mockup at **desktop (1440×900)** and
  **mobile (390×844)** for all six personas and every screen, plus key interactive states. Method:
  headless Chromium (Playwright), localStorage seeded into each screen, full-page screenshots —
  36 screens × 2 viewports + 9 interactive states. Reviewed against Nielsen's 10 usability
  heuristics, WCAG 2.1/2.2 AA, Apple HIG (touch targets, sheets), Baymard Institute checkout research
  and common B2B-SaaS conventions (deep-linking, command palette, marketplace checkout).
- **What changed since.** The app moved to TypeScript and was substantially redesigned. The separate
  Sunbed, Entry Ticket, Locker and Parking pages became one immersive **Plan my visit** wizard, and
  the Feature Inventory / User Journeys explorer was retired. Several fixes from the implementation
  pass are no longer in the code: the ⌘K palette, the hold timer, the bundle discount, ≥ 44 px
  sunbed targets, ΑΦΜ validation and the required parking plate. The old "all items addressed" status
  had stopped being true.
- **Re-verification (29 Sep 2026).** Each original item was re-checked against the source. The
  visual items were re-captured with Playwright + Chromium at the same two viewports (site gate,
  sign-in and consent seeded; reduced motion on for stable captures). `npm run typecheck`,
  `npm run lint` and a production build all pass. New issues found along the way are **N1–N9**.
- **Scope caveat.** This is an intentionally non-functional mockup. Findings tagged **[demo-ok]** are
  fine for a mockup but would be needed for production; they stay listed so the backlog is complete.

**Status key:** ✅ Resolved · 🔁 Superseded (the screen was redesigned; the finding no longer applies
as written) · 🟡 Partly done · 🔴 Open · ⏪ Regressed (was fixed; the fix is no longer in the code)

---

## Summary

Of the **38** original items: **15** ✅ resolved, **2** 🔁 superseded, **8** 🟡 partly done, **5** ⏪
regressed and **8** 🔴 open (4 of them [demo-ok]). This revision adds **9 new findings**.

Most urgent now:

1. **N1** — sunbed sets marked "On hold" can be picked and booked.
2. **N2** — 15 of the 18 on/off switches have no accessible name.
3. **The wizard on phones** — 31 px sunbed targets (2.2 ⏪), a menu that takes 44% of the screen
   (2.4), and the floating action cluster covering the step counter (N3).
4. **Trust copy** — optional parking plate (6.2 ⏪), "Stripe paid" on orders paid entirely by a pass
   (N4), internal jargon at checkout (N5), a locker feature the UI promises but doesn't have (N6).
5. **Contrast** — 9–11 px `text-slate-400` labels at ≈ 2.4–2.6:1 (4.5).

---

## Status of the original backlog

Numbers 1.1–7.4 are the original ones; 8.1–9.3 were numbered in this revision.

### P0 — reads as broken / erodes trust

| #   | Finding                                           | Status      | Where it stands (29 Sep 2026)                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Count-up KPIs showed `0` until scrolled into view | ✅ Resolved | `useCountUp` animates once on mount, not on scroll (`src/lib/motion.tsx:78`). Ops figures render instantly via `StatCard instant`: the Controller gate KPIs (`src/screens/controller.tsx:94`) and Reporting › Executive (`src/screens/admin.tsx:1444`). Reduced motion shows the final value. |
| 1.2 | Customer checkout exposed the marketplace split   | ✅ Resolved | The buyer sees Subtotal → pass deductions → Total / Pay now. The Stripe and Slaice split sits behind a **Show platform economics** demo toggle (`src/screens/Checkout.tsx:182`, `:212`).                                                                                                      |
| 1.3 | No URL routing, deep links or Back/Forward        | ✅ Resolved | A custom hash router, `#/<persona>/<page>` (`src/app/router.ts`), kept in sync with push/replaceState and popstate/hashchange (`src/App.tsx:146`). Every persona page and every customer flow page deep-links.                                                                                |

### P1 — mobile experience

| #   | Finding                                                    | Status         | Where it stands (29 Sep 2026)                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Locker / Parking / Entry-Ticket CTAs sat below a tall grid | 🔁 Superseded  | Those pages no longer exist. Tickets, lockers and parking are wizard steps, and the wizard's glass panel pins the running total and Back / Continue in its footer (`src/screens/CustomerWizard.tsx:442`).                                                        |
| 2.2 | Sunbed tap targets below 44 px                             | ⏪ Regressed   | The ≥ 44 px fix didn't survive the move to the immersive wizard: every set is a **31×31 px** button at 390×844 (49 px at 1440×900). See [Open work](#22--sunbed-targets-are-31-px-on-phones-regressed).                                                          |
| 2.3 | Home left an empty band before the footer                  | ✅ Resolved    | Home now carries the hero, weekend offer, _Rebook your usual_, badges, rewards and both pass cards (2,362 px tall at 390×844); the footer follows the content.                                                                                                   |
| 2.4 | Booking controls crowded the map on phones                 | 🟡 Partly done | The Who/When/Where rail became a glass menu over the sea, and the sets now lay out below it instead of underneath it. In the set-picking phase, though, the menu is 373 px of the 844 px viewport (44%), which is what squeezes the sets into 31 px cells (2.2). |
| 2.5 | Bottom-tab labels truncated to the first word              | ✅ Resolved    | Purpose-built `short` labels per nav item in `src/data/personas.ts` ("Pricing", "Manual", "Comms", "Badges"…), with the first-word fallback only when one is missing (`src/components/Shell/Nav.tsx:141`).                                                       |

### P1 — navigation & information architecture

| #   | Finding                                                 | Status            | Where it stands (29 Sep 2026)                                                                                                                                                                                           |
| --- | ------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | No global search / ⌘K command palette for staff         | ⏪ Regressed      | A palette and a top-bar search field shipped once; neither is in the code now. Staff navigate by sidebar (desktop) or tab bar + nav sheet (phones), and Admin has grown to 13 destinations.                             |
| 3.2 | The persona switcher is a production boundary risk      | 🔴 Open [demo-ok] | Unchanged by design: a floating **Demo** pill on customer pages (`src/App.tsx:275`) and a persona chip in the staff top bar. In production the role must come from auth. On phones it now docks in the top bar (N9, AENR-575). |
| 3.3 | My Bookings / My Documents buried in the avatar menu    | ✅ Resolved (AENR-563) | Home · Plan a visit · My bookings · Wallet · Account are a top nav on desktop and the five phone tabs; receipts open from each booking and are all listed in Account (`src/components/Shell/Nav.tsx` `CustomerNav`). |
| 3.4 | The marketing landing page renders inside the app shell | 🔴 Open [demo-ok] | `#/platform/landing` still renders inside the staff sidebar and top bar (checked at 1440×900).                                                                                                                          |

### P1 — accessibility

| #   | Finding                                                          | Status         | Where it stands (29 Sep 2026)                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | Dialogs didn't move, trap or restore focus, and weren't labelled | ✅ Resolved    | The in-house `Modal` and `Sheet` (`src/components/ui/overlays.tsx:9`, `:39`) move focus in, trap Tab, return focus to the opener, close on Escape and set `aria-labelledby`. They are not Radix Dialog; `@radix-ui/react-dialog` is installed but unused.                                                                                                                                                                                                          |
| 4.2 | Hand-rolled overlays bypassed `Modal`                            | 🟡 Partly done | Both named overlays — the My Bookings QR and the My Documents viewer — now use `Modal` (`src/screens/customer/CustomerBookings.tsx:65`, `CustomerDocs.tsx:63`). A new hand-rolled one has appeared: the date-picker calendar (`src/components/ui/forms.tsx:207`) closes on Escape but has no initial focus, focus trap or return, and no accessible name.                                                                                                          |
| 4.3 | Steppers announced only "Decrease" / "Increase"                  | ✅ Resolved    | `Stepper` takes a `label`, so a button reads "Decrease Individual (13+)" (`src/components/ui/forms.tsx:49`); every call site passes one.                                                                                                                                                                                                                                                                                                                           |
| 4.4 | Charts had no accessible representation                          | ✅ Resolved    | Bar, horizontal-bar, line and donut charts are `role="img"` with a generated data summary, and sparklines are `aria-hidden` (`src/components/charts.tsx`). One small gap: `StackedBar` exposes its split only through `title` tooltips (`charts.tsx:163`).                                                                                                                                                                                                         |
| 4.5 | Small-text contrast                                              | 🔴 Open        | Measured: 9–11 px `text-slate-400` labels sit at ≈ 2.4–2.6:1. See [Open work](#45--small-text-contrast).                                                                                                                                                                                                                                                                                                                                                           |
| 4.6 | A language switcher without translations                         | 🟡 Partly done | Six languages (English plus five machine-translated), `<html lang>` follows the choice, and the customer surface is translated. Still open: staff screens are mostly English; a few customer strings bypass `t()` (sunbed button names and tooltips, `src/components/Beach.tsx:74`, `:88`; the Review step's "2 adults, 1 child", `CustomerWizard.tsx:1297`; the stepper verbs); and no native speaker has reviewed the machine translations (Greek matters most). |

### P2 — e-commerce / checkout (Baymard)

| #   | Finding                         | Status       | Where it stands (29 Sep 2026)                                                                                                                                                                                                          |
| --- | ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Add reassurance at checkout     | ✅ Resolved  | "Secured by Stripe", a card-brand row, free cancellation up to 24 h, refund-policy and terms links (demo toasts) and a VAT note (`src/screens/Checkout.tsx:196`–`:205`). The "what happens next" line still needs plain language (N5). |
| 5.2 | Hold timer for selected sunbeds | ⏪ Regressed | Shipped once; not in the code now. Other guests' holds show as "On hold", but the guest's own picks aren't held — and on-hold sets can be picked (N1).                                                                                 |
| 5.3 | Stable confirmation reference   | ✅ Resolved  | Sequential `BK-10429`, `BK-10430`… (`Checkout.tsx:19`). The counter restarts on reload, which is fine for a mockup; production references come from the server.                                                                        |
| 5.4 | Bundle / "save €X" pricing      | ⏪ Regressed | Shipped once; the wizard now prices every line flat. The Loyalty "Bundle perks" scheme is a separate Future feature, and the Home "20% off front-row" promo isn't applied either (spec §22, item 6).                                   |
| 5.5 | Cart persistence is silent      | 🔴 Open      | The basket persists in `localStorage["slaice.v1"]` with no "saved" or expiry cue.                                                                                                                                                      |

### P2 — forms, inputs, validation [demo-ok]

| #   | Finding                                                | Status                   | Where it stands (29 Sep 2026)                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | No inline validation                                   | 🟡 Partly done           | Zod-validated e-mail on the product sign-in and the site gate, and an inline e-mail check in Admin › Users › Edit (`src/screens/admin.tsx:1191`). Still unvalidated: the ΑΦΜ in tenant onboarding (`src/screens/platform.tsx:240`, which was validated once — this part regressed), e-mail and phone in Manual booking (`admin.tsx:1041`) and the plate format in the wizard. |
| 6.2 | Vehicle plate optional though the gate camera needs it | ⏪ Regressed             | Optional again: a missing plate reads "plate pending" in Review and "—" in the basket, with no warning. See [Open work](#62--the-parking-plate-is-optional-again-regressed).                                                                                                                                                                                                  |
| 6.3 | No calendar beyond the 7-day strip                     | ✅ Resolved              | `DatePickerRow` has a chip strip plus a calendar modal, single or multi-day, capped at 7 days in the wizard (`src/components/ui/forms.tsx:64`, `:165`).                                                                                                                                                                                                                       |
| 6.4 | Use the `Btn` loading state on submits                 | 🟡 Partly done [demo-ok] | Used for change password, 2FA verification, data export and the site gate (`src/components/Security.tsx:89`, `:234`; `PrivacyCenter.tsx:77`; `src/screens/SiteGate.tsx:194`), but not on money actions (Pay, Reserve & send QR, Charge). Checkout's Pay switches straight to the redirect screen, so it can't double-submit.                                                  |

### P2 — visual / layout polish

| #   | Finding                                    | Status        | Where it stands (29 Sep 2026)                                                                                                                                            |
| --- | ------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1 | Short pages stranded the footer mid-screen | ✅ Resolved   | The content region grows (`flex-1`), so on short pages the footer sits at the bottom of the viewport (`src/App.tsx:255`–`:266`; checked on Cashier › Issue at 1440×900). |
| 7.2 | Onboarding "Back" enabled on step 1        | ✅ Resolved   | `disabled={step === 0}` (`src/screens/platform.tsx:284`).                                                                                                                |
| 7.3 | Sparse tables leave empty desktop areas    | 🔴 Open (low) | Availability gained a "Seasonal & day pricing" tab, but the Availability tab itself is still a 6-row table on a wide canvas.                                             |
| 7.4 | Map Layout Editor is cramped on phones     | ✅ Resolved   | "Best on a larger screen" hints on both editor tabs (`src/screens/admin.tsx:409`, `:594`).                                                                               |

### P3 — personalisation & delight

| #   | Finding                                          | Status         | Where it stands (29 Sep 2026)                                                                                                   |
| --- | ------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | Surface the favourite zone ("Rebook your usual") | 🟡 Partly done | The tile is on Home, but **Book again** opens the wizard with nothing pre-selected (spec §22, item 6); it isn't on My Bookings. |
| 8.2 | Add-to-Calendar (`.ics`)                         | ✅ Resolved    | A real `.ics` download on Confirmation (`src/screens/Checkout.tsx:298`).                                                        |
| 8.3 | Weather-aware nudges                             | 🔴 Open        | The Home greeting chip shows the scene's weather, but nothing turns it into advice.                                             |
| 8.4 | Post-visit review / NPS and a season-pass upsell | 🟡 Partly done | Season and VIP pass cards and purchase flows exist; there's no post-visit review or NPS.                                        |

### P3 — performance / technical [demo-ok]

| #   | Finding                                    | Status            | Where it stands (29 Sep 2026)                                                                                                                                                                                                                         |
| --- | ------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1 | Hundreds of SVG sunbeds in the zoomed view | 🔁 Superseded     | The wizard shows one zone at a time: 48 sets by default, at most 120 from the admin grid generator.                                                                                                                                                   |
| 9.2 | Client-only persistence                    | 🔴 Open [demo-ok] | By design for the mockup (spec §18). Production needs a backend, optimistic UI with rollback, and error toasts on failure.                                                                                                                            |
| 9.3 | Code-split the bundle (deferred)           | 🔴 Open [demo-ok] | The main chunk has grown from 531 kB to **660 kB** (≈ 195 kB gzip), and Vite warns above 500 kB. Only the Konva editor and the three.js sea are lazy; all 13 admin screens share one file. Split per persona with `React.lazy` in the route registry. |

---

## Open work

Details for the items that need action, most urgent first. N-numbers are new in this revision.

### P1

#### N1 · "On hold" sets can be booked — ✅ Resolved (12 Oct 2026, AENR-520)

- **Resolution:** `Sunbed` disables on-hold sets (unless they are the guest's own pick) and keeps "On
  hold" in the tooltip and accessible name. The wizard now overlays the live per-date status from the
  shared store (`useLiveSlots`): sets sold at the Cashier till are unavailable, sets in a till basket
  show On hold, and closed stores have no bookable sets.

- **Evidence:** in the wizard only taken sets are disabled — `dim: state === "u" && !sel`
  (`src/components/sunbedGlyph.ts:101`) drives `disabled` (`src/components/Beach.tsx:72`) — so an
  on-hold set is a live button whose tooltip shows "On hold" next to its price. The spec says only
  available sets are selectable (C-03).
- **Why it matters:** "On hold" means another guest is mid-checkout. Letting a second guest pick it
  invites double bookings and undermines trust in the live map.
- **Fix:** disable on-hold sets like taken ones and keep the tooltip as the explanation; once holds are
  real, also show the guest's own hold (5.2).

#### N2 · Switches have no accessible name — ✅ Resolved (12 Oct 2026, AENR-504)

- **Resolution:** `Toggle` now requires a name at compile time (`label` or `ariaLabel`), every use
  passes one, and the "Always on" cookie switch is `disabled` with "Always on" in its name.

- **Evidence:** `Toggle` renders `role="switch"` + `aria-checked` but is only named when given `label`
  (`src/components/ui/forms.tsx:37`). 15 of its 18 uses have no name: the visible text sits in a
  sibling element instead. Among them are Checkout's VIP credit and Season pass switches
  (`src/screens/Checkout.tsx:167`, `:176`), "Book several days at once"
  (`src/screens/CustomerWizard.tsx:619`), the cookie-banner purposes
  (`src/components/ConsentBanner.tsx:63`), the Privacy Centre consents, notification settings, and the
  admin rule, zone, segment and loyalty-scheme toggles. Screen readers announce "switch, on" with no
  subject (WCAG 4.1.2). The "Always on" cookie switch also has a no-op `onChange` instead of being
  disabled.
- **Fix:** make a name mandatory on `Toggle` (`label` or `aria-labelledby` pointing at the row title),
  and render the always-on switch as `disabled`, with the reason in its name.

#### 2.2 · Sunbed targets are 31 px on phones (regressed)

- **Evidence:** measured at 390×844 on Central's default 8×6 layout: 48 buttons, each 31×31 px (49 px
  at 1440×900). Cell size is min(64 px, 8.5% of the sand width, 0.84 × the nearest-neighbour
  distance), floored at 26 px (`src/screens/CustomerWizard.tsx:882`–`:893`).
- **Why it matters:** it passes the WCAG 2.2 AA minimum (2.5.8, 24 px) but misses the 44 px target this
  review set (Apple HIG, WCAG 2.5.5) on the most important tap in the product, where a wrong tap costs
  money.
- **Fix:** decouple the hit area from the glyph — give each button the full grid pitch (≈ 43×41 px
  here) with the glyph centred — and/or let phones pinch-zoom or scroll the sand. Freeing height from
  the menu (2.4) helps as well.

#### N3 · The action cluster hides the wizard's step counter on phones

- **Evidence:** the customer's floating basket / notifications / language / account cluster is
  `fixed top-3 right-3 z-40` (`src/components/Shell/TopBar.tsx:107`). At 390×844 it lands on the
  wizard header's "1 / 5" counter (`src/screens/CustomerWizard.tsx:381`) in both the zone and the set
  phase. Desktop is fine, because the panel is centred. On the same screen the progress rail's
  labels truncate ("Parking S…").
- **Fix:** on phones, reserve the cluster's width in the wizard header or move the cluster into the
  menu, and use a short "Parking" label in the rail.

#### 2.4 · The wizard menu takes 44% of a phone screen (partly done)

- **Evidence:** in the set-picking phase the glass menu is 373 px tall on an 844 px viewport; with the
  legend bar and the tab bar below, the sand gets well under half the screen for 48 sets.
- **Fix:** in the set phase on phones, collapse the menu to a one-line summary (zone · picks · total ·
  Continue) that expands on tap.

#### 4.5 · Small-text contrast

- **Evidence:** `text-slate-400` (#94a3b8) is 2.56:1 on white and 2.41:1 on the `#f6f8fb` page, and
  lower on glass. It carries real text in the wizard's upcoming-step labels (10 px,
  `src/screens/CustomerWizard.tsx:577`), locked badge names on Home (9 px,
  `src/screens/customer/CustomerHome.tsx:267`), calendar weekday headers (10 px,
  `src/components/ui/forms.tsx:224`) and the nav sheet's "Account" heading (11 px,
  `src/components/Shell/Nav.tsx:40`). There are 70 uses across `src/`, some legitimately on icons or
  disabled states. `text-slate-500` passes on white (4.76:1) but falls just short on the page
  background (4.47:1).
- **Fix:** move text off slate-400 (slate-500 on white, slate-600 on tinted or glass surfaces) and keep
  slate-400 for icons, placeholders and disabled states. Add a named "secondary text" token so this
  doesn't drift back.

#### Also open at P1

- **4.2 · Calendar dialog focus:** render the date picker through `Modal`, or reuse its
  `useDialogFocus`, and give the dialog its title as a name.
- **4.6 · i18n:** route the remaining customer strings through `t()`, then have a native speaker review
  the Greek.
- **3.1 · ⌘K / staff search:** bring back a palette that navigates and searches bookings, users and
  documents — Admin now has 13 destinations.
- **3.3 · Account in one tap:** add a customer **Bookings** tab on phones (the tab bar only has Home and
  Plan, then More) and a visible link on desktop.

### P2

#### 6.2 · The parking plate is optional again (regressed)

- **Evidence:** a spot can be reserved without a plate. Review then reads "plate pending" and the
  basket line "—" (`src/screens/CustomerWizard.tsx:1251`, `:339`). Only the single-day, single-spot
  form explains that the gate camera uses the plate, and nothing warns that automatic entry won't work
  without it.
- **Fix:** require a plate before Confirm when parking is on, or flag the gap in Review ("Add a plate
  for automatic entry") with a link back to the step.

#### N4 · Orders paid entirely by a pass confirm as "Payment successful · Stripe paid"

- **Evidence:** when VIP credit or a Season pass covers the whole order, Checkout says "Settled from
  your pass · no card charged", but `finish()` (`src/screens/Checkout.tsx:56`) lands on the same
  Confirmation, which always shows "Payment successful" and a "Stripe paid" pill (`:276`, `:288`).
- **Fix:** pass the settlement method to `Confirmation` and adapt its title and pills (for example
  "Booked with your pass · no card charged").

#### N5 · Checkout's "what happens next" is internal jargon

- **Evidence:** under the basket: _"On success: booking confirmed via webhook, QR e-mailed, and an ΑΠΥ
  auto-issued to MyDATA."_ (`src/screens/Checkout.tsx:138`). The Confirmation pill "ΑΠΥ → MyDATA ✓"
  has the same problem.
- **Fix:** plain language for guests, such as "After payment we'll e-mail your QR and a tax receipt,
  also kept in My Documents". Keep the myDATA detail on staff screens.

#### N6 · The Locker step promises a feature that doesn't exist

- **Evidence:** _"Pick exact lockers later from the My Bookings QR."_
  (`src/screens/CustomerWizard.tsx:1051`), but My Bookings has no locker picking. The sentence is also
  split: "QR." sits outside `t()`, so no translation can reorder it.
- **Fix:** build the picker or change the copy to what actually happens; translate the sentence as one
  string.

#### N7 · Whole cards are single buttons

- **Evidence:** the Home hero is one `<button>` wrapping the page's only `<h1>`, a paragraph, the live
  availability line and the CTA (`src/screens/customer/CustomerHome.tsx:92`–`:121`); _Rebook your
  usual_ is built the same way (`:148`). A button's children are presentational, so the `<h1>` drops
  out of heading navigation, and the button's accessible name becomes the whole card's text.
- **Fix:** keep the heading and copy as plain content and make only the CTA a real button. If the
  whole card must stay clickable, stretch the CTA over it with a pseudo-element.

#### N8 · Some state is visual only

- **Evidence:** the Guests quick picks (`src/screens/CustomerWizard.tsx:926`) and the Yes/No choice
  cards on the Locker and Parking steps (`:1210`) show selection by colour alone, with no
  `aria-pressed`. Zone cards and date chips do have it. Locked badges' progress ("8/10 visits") exists
  only in a `title` tooltip (`src/screens/customer/CustomerHome.tsx:262`), out of reach on touch and
  keyboard.
- **Fix:** add `aria-pressed` (or radio-group semantics for the mutually exclusive Yes/No cards) and
  show badge progress as text.

#### Also open at P2

- **6.1 · Validation:** add an ΑΦΜ checksum in onboarding, e-mail and phone checks in Manual booking,
  and a plate format in the wizard.
- **5.5 · Silent cart persistence:** add a quiet "Saved on this device" note in the basket, and an
  expiry once holds exist.

### Low priority and deferred

- **N9 · The Demo pill covers content on phones [demo-ok].** ✅ Resolved (AENR-575): on phones the Demo menu (persona, scene clock, weather) docks in the top bar and nothing floats. The fixed pill (`src/App.tsx:275`) sits on
  the wizard's legend / guidance bar and, at the initial scroll position, on the right end of
  Checkout's **Pay** button (390×844). Hide it inside the wizard and checkout on phones, or move
  persona switching into the account menu.
- **5.2 · Hold timer** and **5.4 · bundle pricing:** revisit once holds and pricing are real. First
  apply the Home promo and the pricing rules through the shared pricing module (spec §22, items 1
  and 6).
- **7.3 · Sparse Availability table**, **8.1 / 8.3 / 8.4 · personalisation** — see the tables above.
- **3.2, 3.4, 9.2, 9.3 [demo-ok]** — production concerns, see the tables above.

---

## What's already excellent (keep it)

Re-checked on 29 Sep 2026 — all of this still holds:

- **Accessibility baseline:** `:focus-visible` rings; `prefers-reduced-motion` honoured in CSS and in
  every JS-driven animation (`src/lib/motion.tsx`, the GSAP helpers in `src/lib/fx.ts`); status shown
  by icon + text + colour (`StatusBadge`, WCAG 1.4.1); dialogs that trap and return focus; 16 px inputs
  on phones to prevent focus-zoom; near-opaque fallbacks where `backdrop-filter` is unsupported;
  safe-area insets for notched devices; `<html lang>` kept in sync; jsx-a11y interaction rules
  enforced as lint errors.
- **Touch targets:** `Btn` enforces a 44 px minimum at the default size, steppers are 44 px on phones,
  and nav-sheet rows are 52 px.
- **Interaction craft:** undo toasts on destructive actions; skeleton, error-with-retry and empty
  states on async lists; quick-pick presets; swipe-to-delete in the basket; drag-to-dismiss sheets;
  the FLIP camera zoom into a zone, the price chip that flies into the running total, and the wizard
  panel morphing into the checkout summary.
- **Responsive strategy:** tables reflow into cards on phones; a bottom tab bar and nav sheet replace
  the sidebar; the wizard switches from the panoramic beach to zone cards on small screens.
- **Brand & visual design:** a clear split between the tenant brand (navy + teal) and the SLAiCE
  platform brand (indigo + gold); glass chrome over an illustrated beach; a live WebGL sea with an SVG
  fallback; one shared scene state across every customer page.

---

## Suggested sequencing

1. **Correctness & a11y quick wins:** N1 (disable on-hold sets) · N2 (name every switch) · 4.2
   (calendar focus) · N8 (state semantics).
2. **The wizard on phones, in one pass:** 2.2 (targets) · 2.4 (collapsible menu) · N3 (header
   overlap).
3. **Trust copy:** 6.2 (plate) · N4 (pass-only confirmation) · N5 (jargon) · N6 (locker promise) · 5.5
   (saved-cart note).
4. **Contrast & language:** 4.5 · 4.6 · N7 (card semantics).
5. **Staff productivity:** 3.1 (palette + search) · 3.3 (one-tap bookings) · 7.3.
6. **Deferred:** the [demo-ok] items, P3 personalisation, and 5.2 / 5.4 once there's a backend.

---

## History

- **Original review** — 36 screens × 2 viewports + 9 interactive states, captured on the earlier JSX
  version of the mockup.
- **Implementation pass** — seven commits on `claude/modest-planck-KEPM6` addressed every item; this
  file then reported "all items addressed".
- **29 Sep 2026 re-verification (this revision)** — after the TypeScript migration and the booking
  wizard redesign, every item was re-checked against `main` @ `ba18313` and re-graded, and N1–N9
  were added. The earlier version of this file, including each finding's full original write-up and
  evidence, is in git history.
- **12 Oct 2026 screen-by-screen review** — proposals were logged as Orbit epics AENR-538…544.
  Resolved so far: data credibility D1–D4 (AENR-545 Executive / Dashboard tiles reconcile with the
  finance block, AENR-546 Refunds KPIs from the listed rows, AENR-547 one demo calendar for every
  tenant-side persona, AENR-548 lifecycle stage as the one meaning of "Regular"), F1 / P1 / P2
  (AENR-588, 589, 590), and till & gate K1, K2, G1, G2 (AENR-584 tablet till, 585 offline banner,
  586 full-screen scan result, 587 beach status by exception; defects AENR-591, 592 fixed on the way),
  and back-office operations A1–A5 (AENR-579 booking tabs + drawer + timeline, 580 live beach map,
  581 guest row → profile + saved views, 582 reports in the brand system, 583 refund decision queue),
  and the design system & app shell X1–X10 (AENR-549…557: solid data surfaces, one page header,
  index-table standard, one vocabulary, ⌘K palette, notification inbox, KPI context, date picker,
  one palette), and navigation & IA I1–I9 (AENR-558 admin sidebar by job, 559 one New booking flow,
  560 Today, 561 beach split, 562 reports in groups, 563 customer navigation in plain sight, 564
  full-screen gate scanner, 565 support access in Privacy, 566 platform marketing apart; defects
  AENR-595 Unpaid badge tone and AENR-596 staff top-bar title at 390 px fixed on the way), and the
  customer journey C1–C12 (AENR-567…578: Home leads with the next visit, a map with tiers and a spot
  sheet, all-in price and cancellation deadline, date step with weather / price / alternatives, ticket
  confirmation, My bookings by visit with self-service, plain-language receipts and invoices, trusted
  checkout with wallets and deposit, no overlapping header on phones, passes in the beach's brand with
  personal savings, one Wallet, Release my day; defect AENR-597 booking refs fixed on the way), and
  the live display's Day / Night / Auto look (AENR-594), and every export in PDF and CSV from one
  report definition, each downloaded and reviewed (AENR-593).
- **13 Oct 2026 — Apple-style UX review.** Every screen walked again at 1440 and 390 px for a simpler,
  friendlier, more Apple-like feel; 33 proposals sent to the owner to pick from (no tickets yet).
  Defect AENR-599 fixed on the way: Month-end exceptions no longer squeeze into a one-word column on
  phones, and long line charts (MRR) show every other month label on phones so labels never overlap.
- **AENR-605 — one place to sell.** The till is Sell, Sales and Cash register. Sell Locker (which only
  pointed to Issue Ticket) and Redeem Ticket (the gate's job) left the Cashier and Support navigation;
  old links redirect (cashier → Sell, support redeem → Gate). Issue Ticket is now called Sell.
- **AENR-601 — change a price by tapping the day.** Pricing & calendar has two tabs: Calendar (each day
  shows one "from" price and how full it is; tap, type, Enter, with Undo in the toast) and Advanced
  (restrictions, templates, rule order, demand pricing, pricing rules). On phones the month is a week
  list with the editor under the tapped day. Also fixed: the pricing rules panel overflowed at 390 px.
- **AENR-600 — Today is a to-do list you can finish.** Each Needs attention item has its own action:
  Release all no-shows (Undo), Approve €X refunds with an in-place confirmation, Re-send to myDATA,
  Sync an offline till, Open for the rest; done items collect under Done today. No-show set codes
  open on demand, and a closed zone no longer counts as no-shows (Today showed 24 instead of 17).
- **AENR-608 — switch cashier without signing out.** The till strip names who is selling and has a
  Switch cashier button: the next person types their own PIN (set in Team & roles), optionally counts
  the drawer, and sales carry their name. Five wrong PINs need a manager PIN. X / Z reports split
  totals by cashier and list hand-overs. (Spec K-04 Sell a locker marked retired after AENR-605.)
- **AENR-612 — booking wizard in three steps.** When & where, Who, Pay. Locker and parking are one
  optional "Add a locker or parking" row on Pay (opened inline, nothing added by default); several
  days and several zones sit behind "More options"; the footer shows guidance instead of €0 before
  the first pick; the header reads "Step 1 of 3 · When & where".
- **AENR-618 — hide what isn't ready.** Roadmap (Future) pages leave the sidebar, phone tabs, page
  menu and ⌘K by default; "Show roadmap previews" in the persona menu brings them back under "Coming
  next". Direct links still open a preview with its banner.
- **AENR-620 — the visit in Apple / Google Wallet.** The existing wallet badges now also sit on the
  Home next-visit card and every upcoming visit, show only the device's wallet (both on desktop), and
  are remembered: "In Apple Wallet ✓", with the pass following a move and voided on cancel. (The
  review said the visit lived only inside the site — the confirmation and QR dialog already had the
  badges; the gaps were memory, placement and move / cancel.) Defect AENR-627: ##BK ref fixed.
- **AENR-617 — one obvious next step.** A shared "…" menu (destructive last, in red; long-press on
  touch). Visit cards went from eight buttons to Show QR + Wallet + "…"; the booking drawer shows Resend
  QR + "…"; Team & roles and segment menus moved onto the same component.
- **AENR-606 — charge in one move.** The till shows one "Charge €X" button that opens on the last-used
  tender (no more three disabled buttons on an empty basket), quick keys show their price, and
  "Repeat last sale" rebuilds the previous basket with fresh sets — a repeat sale is Repeat → Charge.
- **AENR-607 — offline just works.** The till no longer shows "Online" all day; the offline banner and
  chip appear only while offline, and queued sales sync on reconnect by themselves. "Simulate till
  offline" moved from the cashier's screen into the persona (demo) menu.
- **AENR-609 — the gate scans by itself.** No Scan QR button: the camera stays live, results return to
  scanning on their own, repeats within 5 s are ignored; "Demo arrivals" simulates the queue.
- **AENR-615 — undo instead of "Are you sure?".** Segment delete and campaign cancel no longer ask
  first; they happen with Undo (and ⌘Z / Ctrl+Z). Live beach moves and releases and drawer moves gained
  Undo. Confirmations remain for refunds, payouts, erasure and deleting people or tenants.
- **AENR-616 — read first, edit when you mean to.** Ticket categories, locker banks and guest policies
  open as read-only rows; Edit opens the fields, Done validates and applies, Cancel drops the draft;
  on/off switches apply at once. A stray keystroke can no longer change a live price.
- **AENR-623 — routine decisions run by themselves.** A refund policy approves routine requests
  (weather, closures; up to a cap) as they arrive, and no-shows go back on sale at 11:00 with a
  one-hour Undo on Today. Both are on by default and can be switched off.
- **AENR-624 — lists open where the work is.** Bookings opens on Today (then the last tab used; a
  search looks through everything); dates and filters sit in one Filters sheet with chips for what's
  active. Guests lost the explanation banner (now "About stages") and its separate filter row.
- **AENR-602 — pair a TV with a code.** An unpaired display shows a 4-digit code; typing it under
  Live display › Pair a screen turns that screen into the display. Paired screens can be renamed or
  removed; Auto (sunrise / sunset) is the default look for new setups.
- **AENR-603 — staff bookings remember the last choices.** New booking keeps the agent's last zone,
  payment choice, channel and link deadline, and starts from the caller's mobile: a known number fills
  in the guest, a new one needs only a name.
- **AENR-604 — one focused answer in Reports.** Overview opens on one sentence (revenue, change vs the
  comparison period) and four tiles that open their own report; the full detail is one tap below. The
  overview's card figure is now “Card payments captured”, so only one figure is called revenue.
  AENR-628 fixed Reports › Occupancy scrolling sideways at 390px.
- **AENR-611 — “Book again” in one tap.** Home's Book again opens Pay with the usual zone, sets, party
  and extras on the next day they're free; Edit on any row changes it.
- **AENR-613 — it remembers who's coming.** The last party is saved on the account and pre-selected
  next time as “Your usual”.
- **AENR-610 — Home shows what matters right now.** QR first on the morning of a visit, extras while at
  the beach, receipt and Book again afterwards, the opening date off-season. Previewable from the
  persona menu.
- **AENR-619 — rewards apply themselves.** Checkout takes the best earned reward off as a removable
  line; Claim buttons and the reward voucher are gone from Home and Wallet.
- **AENR-621 — everything about the account in one list.** Account is a settings list (Companions,
  Payment methods, Receipts, Notifications, Language, Privacy, Sign-in & security, Sign out); each row
  opens one page. The settings dialogs are gone and the demo profile is the same everywhere.
- **AENR-622 — sign in without forms.** Continue with Apple / Google or a passkey in one tap; e-mail
  is behind “Use e-mail instead”; the 18+ confirmation moved to the first booking; the cookie banner no
  longer covers the sign-in buttons.
- **AENR-614 — month-end fixes what it can.** Prepare month re-sends pending documents and drafts the
  missing credit notes; rejected documents get one review sheet; Close unlocks when nothing blocks.
- **AENR-625 — exports remember your choice.** After the first export a report's control is a split
  button (Export · PDF in one click, ▾ for the other format); Month-end keeps its layout.
  AENR-629 fixed staff avatar menus showing the guest's name and customer links.
- **AENR-626 — language set automatically.** The first visit uses the browser's language when offered;
  picking one saves it, and Automatic returns to following the device.
- **Further Improvements sprint — defects.** AENR-636 Cash register is part of the till again (no preview
  flag), so cashiers can close their shift. AENR-664 Refunds (and any page header with a period picker)
  fits 390px. AENR-639 Home rewards strip wraps cleanly on phones. AENR-655 closed zones on Today show a
  grey striped bar. AENR-633 Pricing calendar, Products › Effective prices and Beach layout open on the demo
  day. AENR-657 the demo tenant's Day Locker and Parking modules are on. AENR-666 multi-zone booking has an
  “Add sets in another zone” button and an “All zones” back. AENR-645 Today, Live beach and the gate follow
  one arrival model (guests arrive 09:00–11:00 on the demo clock; no-shows only after 11:00). AENR-643
  Commission & Payouts and Platform GMV come from the same figures as Reports, up to today.
- **AENR-630 — Today starts with the to-do.** Needs attention is the main column (first on phones);
  the four numbers, occupancy by zone and weather sit beside it.
- **AENR-654 — the till uses the whole screen.** No sidebar; Sell · Sales · Register as top tabs; the
  phone keeps the total and Charge pinned at the bottom (it used to render below the screen).
- **AENR-640 — Pay where it says Pay.** The wizard's Pay step shows the checkout panel and takes the
  payment; the separate basket page is only for guests who leave and come back.
- **AENR-641 — Choose for me.** Opening a zone lands on the best free sets for the party (side by side,
  cheapest, nearest the sea) with "Front row instead (+€X)"; tap a set to swap it, Clear to start over.
- **AENR-651 — the set card.** Tapping a set on Live beach shows the guest, phone, party, paid / due,
  arrived / expected and notes, with one action that fits: Check in, Take payment, Release or Sell.
- **AENR-650 — the whole beach, then a zone.** Live beach opens on every zone with its counts; tap to zoom
  in. Staff pages pick a zone from chips with live counts instead of a dropdown.
- **AENR-647 — maps on a phone.** Staff maps open zoomed on what matters with 44px sets, pan and pinch
  (or −/+), and a Map | List toggle with the same selection.
- **AENR-660 — the beach is the screen.** Desktop: beach on the left two-thirds, steps and total in a
  right column. Phones: full-width beach with pinch-zoom and a bottom sheet (total + Continue lowered).
- **AENR-659 — one visit, one card.** The basket groups a day's sunbed, tickets and parking into one card with one Remove; Empty basket sits in the “…” menu; platform economics moved to the Demo menu.
- **AENR-649 — slimmer customer header.** Phones: a small logo beside the icon bar; the basket is a bag with a count, only when used.
- **AENR-648 — Wallet shows what you hold.** Credit and rewards first; only owned passes look like cards; the rest are offer rows.
- **AENR-642 — accountant pages with distinct names.** Month-end · Documents · Payments & payouts · Reports; old links redirect.
- **AENR-638 — the modules matrix opens read-only.** Edit → switch → one reason → Done (with Undo); a stray click changes nothing.
- **AENR-652 — calmer refund decisions.** Queue first, brand-colour Approve €X, Partial… on demand, policy behind Rules.
- **AENR-663 — staff maps show who is there.** Booked solid, free outlined, a clock on guests not arrived yet.
- **AENR-656 — the drawer's main button follows the booking.** Take payment, Check in, Resend QR or Receipt; the QR is a compact row.
- **AENR-634 — Bookings: when, then status.** Today · Upcoming · Past · All plus non-zero status chips; one line per booking; Arrival column today.
- **AENR-635 — New booking follows the call.** Caller · When · Zone and sets (pre-picked) · Tickets · Payment, total and button pinned.
- **AENR-637 — Controller: Gate and Beach.** Walk-in merged into Beach: a free set's card sells in place; one scanner per tab.
- **AENR-631 — Beach layout: canvas plus one inspector.** Stop-sell, date overrides and drafts & versions are tabs; the inspector follows the selection.
- **AENR-644 — one guest record.** Favourite zone, party, channel and the card name agree across My bookings, Home, Wallet and the admin profile.
- **AENR-632 — Live display preview stays in view.** Pinned beside the settings; pairing folds to one row once paired.
- **AENR-661 — daily screens start with content.** Their description moved behind a “?” next to the title.
- **AENR-646 — the avatar is who is signed in.** Per persona from Team & roles; on the till the active cashier.
- **AENR-662 — one wallet that fits.** At most one wallet button per visit card; the other in “…”.
- **AENR-653 — Guests: one Guest column and the next visit.** One primary action in the profile; Important folded into VIP.
- **AENR-667 (defect) — zones hug the sea.** On tall or wide windows the zone overview no longer drifts away from the shoreline.
- **AENR-665 — one Charge button.** The controller's walk-in uses the till's Charge €X with the remembered tender.
- **AENR-669 — a beach front.** Desktop: the sea comes down to mid-screen and every zone stands in one front row along the water, across the whole width.
- **AENR-670 — your zone stays on the sand.** Who and Pay show the zone you booked in with your sets; the zone row sits mid-sand.
- **AENR-671 — the beach logo in the wizard.** Shown large over the sea on desktop, as on Home.
- **AENR-672 — the logo glides with the sand.** From the Home header to its place over the sea and back.
- **AENR-690 — Release channel removed** from the Platform tenant pages.
- **AENR-717 — staff can hold several roles** and switch between them from the account menu.
- **AENR-683 / 684 — Pay: card first; Apple Pay, Google Pay and Klarna marked FUTURE.**
- **AENR-678 — Live display rotates any combination of languages**, in an order the manager sets.
- **AENR-707 — a slim set card**: zone as title, the view, row and "2 sunbeds + 1 umbrella".
- **AENR-709 — “Book in more than one zone” always visible** on Where.
- **AENR-710 — no hover tint on zones.**
- **AENR-695 — search fields no longer look cut off**: the palette shows focus as a teal underline, and text fields draw their focus ring inside the box so no panel can clip it.
- **AENR-692 — Today: the four number tiles above Needs attention.**
- **AENR-685 / 687 — guest receipts and invoices as professional PDFs**, an invoice generator after the company details, and no CSV option.
- **AENR-719 — Call Center “Refund requests” page**; requests reach the manager’s queue and the decision flows back.
- **AENR-686 — Wallet: passes first, then upcoming entry QRs**, one centred column, rewards marked FUTURE.
- **AENR-712 — Who starts with 2 tickets per set** (5 sets → 10), the usual party one tap away.
- **AENR-713 — Quick picks: Solo, Adult ×2, ×3, ×4.**
- **AENR-708 — no landmark badges on the sand** (lifeguard, entrance, showers…) in the wizard or the staff maps; they stay in the layout editor.
- **AENR-724 — Onboard tenant works again**: it opens the four-step wizard (new tenant or resume a draft) through to Go live.
- **AENR-682 — wizard footer shows only the total**; the unreadable grey line and the dead “all-in” toggle are gone.
- **AENR-674 — Live beach: pick any season date** beside Today / Tomorrow.
- **AENR-676 — Refunds: the four tiles above the decision queue.**
- **AENR-675 — Live beach: Live state / Heatmap beside Today / Tomorrow**, above the zone chips.
- **AENR-679 — rewards strip on Home marked FUTURE.**
- **AENR-688 — My bookings "season in review" in the app's light card style.**
- **AENR-681 — no deposit option.** Checkout always takes the full amount; one fewer decision before paying.
- **AENR-703 — Show QR on desktop opens a modal**, not a white full screen; phones keep the full screen for the gate.
- **AENR-704 — Add a locker or parking shows only those two**; entry tickets stay in My bookings › Add extras.
- **AENR-673 — four steps: When, Where, Who, Pay.** The day gets its own step; Where never lets a guest continue without a set unexplained — an inline notice says what to tap, with Pick for me and Entry tickets only.
- **AENR-658 — a calm first step.** No total or refund warning before a set is picked; the terms show once, on Pay.
