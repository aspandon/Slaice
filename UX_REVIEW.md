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
| 3.2 | The persona switcher is a production boundary risk      | 🔴 Open [demo-ok] | Unchanged by design: a floating **Demo** pill on customer pages (`src/App.tsx:275`) and a persona chip in the staff top bar. In production the role must come from auth. On phones the pill also overlaps content (N9). |
| 3.3 | My Bookings / My Documents buried in the avatar menu    | 🟡 Partly done    | On phones they're listed under **Account** in the More sheet — two taps (`src/components/Shell/Nav.tsx:38`). On desktop they're still only in the avatar menu.                                                          |
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

#### N1 · "On hold" sets can be booked

- **Evidence:** in the wizard only taken sets are disabled — `dim: state === "u" && !sel`
  (`src/components/sunbedGlyph.ts:101`) drives `disabled` (`src/components/Beach.tsx:72`) — so an
  on-hold set is a live button whose tooltip shows "On hold" next to its price. The spec says only
  available sets are selectable (C-03).
- **Why it matters:** "On hold" means another guest is mid-checkout. Letting a second guest pick it
  invites double bookings and undermines trust in the live map.
- **Fix:** disable on-hold sets like taken ones and keep the tooltip as the explanation; once holds are
  real, also show the guest's own hold (5.2).

#### N2 · Switches have no accessible name

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

- **N9 · The Demo pill covers content on phones [demo-ok].** The fixed pill (`src/App.tsx:275`) sits on
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
