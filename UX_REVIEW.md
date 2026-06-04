# Slaice — UX Review & Improvement Backlog

A thorough UX review of the Slaice beach‑SaaS mockup, captured across **desktop
(1440×900)** and **mobile (390×844)** for all 6 personas, every screen, plus key
interactive states (consent banner, zoomed booking grid, journey player, modals,
nav sheets).

- **Method:** Headless Chromium (Playwright), localStorage‑seeded into each
  `persona.page`, screenshotted full‑page at both viewports. 36 screens × 2 +
  9 interactive states.
- **Reviewed against:** Nielsen's 10 usability heuristics, WCAG 2.1/2.2 AA,
  Apple HIG (touch targets / sheets), Baymard Institute checkout research, and
  common B2B‑SaaS conventions (deep‑linking, command palette, marketplace
  checkout).
- **Scope caveat:** This is an intentionally non‑functional mockup ("actions show
  a demo toast"). Findings tagged **[demo‑ok]** are fine for a mockup but would be
  required for production; they're listed so the backlog is complete.

---

## 0. What's already excellent (keep it)

The fundamentals most teams miss are already here, so this review aims higher than
the usual checklist:

- **Accessibility baseline:** `:focus-visible` rings (WCAG 2.4.7), `prefers-reduced-motion`
  honored in both CSS and JS (`motion.jsx`), status conveyed by **icon + text + color**
  (`StatusBadge`, WCAG 1.4.1), iOS 16px inputs to prevent focus‑zoom, `backdrop-filter`
  opacity fallbacks for unsupported engines, safe‑area insets for notched devices.
- **Touch targets:** buttons enforce `min-h-[44px]` (HIG 44pt); steppers are 44px on phones.
- **Interaction craft:** undo toasts on destructive actions (error recovery), loading
  skeletons (visibility of system status), empty states everywhere, hover previews on
  zones, quick‑pick presets, drag‑to‑dismiss sheets.
- **Responsive strategy:** desktop tables collapse to cards on mobile; bottom tab bar +
  nav sheet replace the sidebar; immersive booking gets a bottom‑sheet basket.
- **Brand & visual design:** cohesive glass / indigo+gold system, dependency‑free SVG
  charts, QR, and the aerial beach illustration.

---

## 1. Priority P0 — reads as broken / erodes trust

### 1.1 Count‑up KPIs display `0` / `€0.0` until scrolled into view
**Evidence:** `src/lib/motion.jsx:46‑76` (`useCountUp` initializes `display` to
`format(0)` and only animates via IntersectionObserver at `threshold:0.4`).
Visible in `controller‑scan‑mobile` (**"Scanned today 0"** — should be 1,284;
**"Duplicate scans 0"** — should be 4) and `admin‑reporting‑mobile` (**RevPATB €0.0,
ADR €0.0** — should be €18.4 / €27.1, defined in `src/screens/admin.jsx:377‑378`).
**Why it matters:** On an operational dashboard, a metric that sits at `0` until the
operator happens to scroll it into view looks like missing/broken data and
misrepresents reality (Nielsen: visibility of system status / match to real world).
Count‑up‑from‑zero is a marketing‑page delight pattern, not an ops‑tooling one
(cf. Stripe Dashboard / Linear / Datadog show real numbers instantly).
**Fix:** Render the real value immediately on staff/ops dashboards — either disable
count‑up there, trigger it on mount instead of on scroll, or seed `display` to the
final value when `prefers-reduced-motion` **or** when the card mounts above the fold.
Reserve count‑up for the marketing/landing surface only.

### 1.2 Customer checkout exposes the marketplace's internal economics
**Evidence:** `src/screens/Checkout.jsx:80‑84` shows the **customer**
"Stripe processing (~1.5%)", "**Slaice commission (5%)**", and
"**Tenant receives €X · Slaice receives €Y**"; `:43` shows "application_fee €X".
**Why it matters:** A beachgoer paying €115 should never see the platform's take or
the tenant's payout. Baymard and every marketplace checkout (Airbnb, Booking,
Ticketmaster) show the buyer only what *they* pay. Surfacing the split is confusing and
can erode trust ("why am I being shown their cut?").
**Fix:** Customer sees **Subtotal → (optional booking/service fee) → Total** only. The
commission/payout split already lives in the **Accountant** views — keep it there. For
the demo, hide it behind a "Show platform economics" toggle so the marketplace mechanics
are still demonstrable without leaking into the buyer's eyes.

### 1.3 No URL routing, deep‑linking, or working browser Back/Forward
**Evidence:** `src/App.jsx` holds `persona`/`pageByPersona` in React state +
localStorage; `routes.jsx` is a static map, not a router. The URL never changes.
**Why it matters:** Browser Back/Forward don't move between screens (Nielsen: user
control & freedom), you can't share or bookmark a screen (e.g. a confirmation/QR, a
specific journey, "Plan my visit"), refresh can't restore a deep state, and analytics
can't attribute pageviews. This is the single biggest gap vs. SaaS norms.
**Fix:** Adopt hash or path routing (e.g. `react-router`) mapping `persona.page` ↔ URL;
wire Back/Forward; support deep links for confirmation, My Bookings QR, journeys, and
each persona screen. Keep localStorage only for cart/consent/lang.

---

## 2. Priority P1 — mobile experience

### 2.1 Locker / Parking / Entry‑Ticket: the primary CTA sits below a tall grid on phones
**Evidence:** `CustomerLocker` / `CustomerParking` use `grid lg:grid-cols-[1fr_320px]`
(`customer.jsx:744, 842`); on mobile the selection summary + **"Add to basket"** stack
*below* the grid. Locker has 5 banks × 20 = 100 cells (`customer-locker-mobile` is
extremely tall), so after tapping a locker the user must scroll past everything to find
the total and CTA. The sunbed‑booking flow solves exactly this with a sticky bottom
summary bar — the other three don't reuse it.
**Why it matters:** Hidden primary action + no running feedback near the point of
interaction (Nielsen: visibility of system status).
**Fix:** Add the same sticky mobile action bar (count · total · Add) used in booking to
Locker, Parking, and Entry Ticket. Consider anchoring the selection summary to the top
or making it a collapsible sheet.

### 2.2 Sunbed tap targets are below 44px on phones
**Evidence:** zoomed grid is `grid-cols-8` at 390px (`customer.jsx:422`); the `Sunbed`
SVG is small and the hit area is the glyph, not a padded cell. `state-book-zoom-mobile`
shows dense, tiny umbrellas.
**Why it matters:** WCAG 2.5.5 / HIG 44pt — fat‑finger errors selecting the wrong
sunbed, plus no zoom/pan to disambiguate.
**Fix:** Fewer columns on the smallest breakpoints, pad each bed to a ≥44px hit target,
and/or add pinch‑zoom + a confirm step for the tapped bed.

### 2.3 Customer Home leaves a large empty band before the footer on mobile
**Evidence:** `customer-home-mobile` — content is short, but `min-h-dvh` flex pushes the
footer down, leaving a dead zone.
**Fix:** Don't stretch short pages to full height (let the footer sit under content), or
fill the space with value (an "Upcoming booking" card, "Rebook your usual — Central",
weather, or recently viewed).

### 2.4 Immersive booking rail crowds the map on mobile
**Evidence:** `state-book-zoom-mobile` / `customer-book-mobile` — the Who/When/Where
control rail consumes the top half; the beach map is squeezed.
**Fix:** Collapse the rail to a single summary chip that expands on tap, giving the map
room; or make the rail a horizontally‑scrolling compact strip.

### 2.5 Bottom‑tab labels are truncated to the first word
**Evidence:** `Shell.jsx:532` uses `label.split(" ")[0]` → "Manual / Phone Booking"→
"Manual", "Plan my visit"→"Plan". Mostly readable but a few lose meaning.
**Fix:** Use purpose‑built short labels per nav item rather than naive first‑word split.

---

## 3. Priority P1 — navigation & information architecture

### 3.1 No global search / command palette
For staff personas (Admin has 10 destinations) there's no ⌘K palette or global search to
jump between screens, bookings, or customers. This is now table‑stakes in B2B SaaS
(Linear, Stripe, Notion). **Fix:** add a ⌘K command palette (navigate + search bookings/
users/docs) and a global search field in the top bar for staff.

### 3.2 Persona switcher is a production boundary risk
The top‑bar "View as persona" is a demo affordance (nicely de‑emphasized to a "Demo" chip
on the customer surface, `Shell.jsx:270`). Flagged so it's explicit: in production, role
must come from auth — a customer must never see Cashier/Controller/Platform. **[demo‑ok]**

### 3.3 Core account destinations are buried
My Bookings / My Documents are only reachable from the avatar menu (`Shell.jsx:246‑247`).
They're primary customer tasks. **Fix:** surface them in the customer nav (or a "Profile/
Account" tab) so returning users reach their QR in one tap.

### 3.4 Marketing landing renders inside the app shell
`platform.landing` shows the marketing hero inside the sidebar+topbar chrome
(`platform-landing-desktop`). A real landing page is full‑bleed. **[demo‑ok]** but note
for the production split between marketing site and app.

---

## 4. Priority P1 — accessibility (beyond the strong baseline)

### 4.1 Dialogs don't trap or restore focus, and aren't labelled
**Evidence:** `Modal`/`Sheet` (`ui.jsx:383‑465`) have `role="dialog"`, `aria-modal`, and
Escape — but **no focus move into the dialog on open, no focus trap, no focus return to
the trigger on close, no `aria-labelledby`** linking the title.
**Why it matters:** WCAG 2.4.3 Focus Order + ARIA dialog pattern — keyboard/SR users can
Tab out into the page behind the modal and lose their place.
**Fix:** On open, move focus to the dialog (or first field); trap Tab within; restore
focus to the opener on close; set `aria-labelledby` to the title id.

### 4.2 Hand‑rolled overlays bypass the Modal entirely
**Evidence:** the My‑Bookings QR overlay (`customer.jsx:965`) and My‑Documents viewer
(`customer.jsx:1030`) are bare `<div>`s — no `role="dialog"`, no `aria-modal`, no Escape,
no focus management (they only close on backdrop click).
**Fix:** route both through the shared `Modal` component for consistent semantics.

### 4.3 Stepper buttons lack item context for screen readers
**Evidence:** `ui.jsx:375‑377` — every quantity stepper announces just "Decrease"/
"Increase". On the Entry‑Ticket page there are four (Adult/Resident/Child/Senior); an SR
user can't tell them apart.
**Fix:** pass an item label, e.g. `aria-label="Decrease Adult tickets"`.

### 4.4 Charts have no accessible representation
Dependency‑free SVG charts (`charts.jsx`) are effectively decorative to assistive tech.
**Fix:** add an accessible name/`<title>`/`role="img"` with a text summary, or an
adjacent visually‑hidden data table, for the dashboard/reporting charts.

### 4.5 Audit small‑text contrast over white and over imagery
`text-slate-400/500` secondary text, the "powered by" footer, and `text-white/70` over
the beach hero risk falling below 4.5:1 (WCAG 1.4.3). **Fix:** verify with a contrast
checker; bump the lightest greys one step where they carry meaning.

### 4.6 Internationalization is a switcher without translations
**Evidence:** `LANGS` (EN/ΕΛ/DE/FR) persists `lang`, but copy is hard‑coded English
(only persona blurbs contain Greek). The `<html lang>` doesn't update either.
**Fix [demo‑ok→prod]:** wire an i18n layer (e.g. `react-intl`/`i18next`), translate, and
update `document.documentElement.lang`. Greek matters most for this market.

---

## 5. Priority P2 — e‑commerce / checkout best practices (Baymard)

- **5.1 Add reassurance at checkout:** cancellation/refund policy link, accepted‑cards
  row, a short "what happens next", and (for B2B) a terms checkbox. Today checkout has
  only a one‑line "on success…" note (`Checkout.jsx:73`).
- **5.2 Hold timer for selected sunbeds:** ticketing/airline convention — show
  "we're holding CE‑89/CE‑90 for 09:58" so users don't lose a contested spot mid‑flow.
  The map models an "on hold" state but the user's own selection isn't time‑protected.
- **5.3 Stable confirmation reference:** `Checkout.jsx:106` derives the booking ref from
  `Math.random()` — can theoretically collide and isn't reproducible. Use a sequence.
- **5.4 Bundle/discount logic:** cross‑sell adds flat €10 ticket / €5 locker; a small
  "save €X when bundled" would lift attach rate and match the dynamic‑pricing story.
- **5.5 Cart persistence is silent:** the basket survives reloads (good) but there's no
  "saved" affordance or expiry; consider a subtle "kept for 24h" note.

## 6. Priority P2 — forms, inputs, validation **[demo‑ok]**

- **6.1 Inline validation/error states** are absent (email, ΑΦΜ checksum, vehicle plate
  format). Auth literally signs in on any input. Required for production.
- **6.2 Vehicle plate is optional but described as required for gate recognition**
  (`customer.jsx:894, 832` — reserve works with an empty plate → "—"). Require it, or
  warn that ANPR won't work without it.
- **6.3 Date selection beyond the visible strip:** `DatePickerRow` is a 7‑day chip strip;
  there's no calendar for booking further out. Add a calendar popover for longer horizons.
- **6.4 Use the existing `Btn loading` state** on Pay/Reserve submits so the primary
  action shows progress and disables to prevent double‑submit.

## 7. Priority P2 — visual / layout polish

- **7.1 Short pages float the footer mid‑screen** with a large empty band (cashier issue,
  admin manual/refunds/availability on desktop). Cap content height or top‑anchor the
  footer so it doesn't strand in whitespace.
- **7.2 Onboarding wizard shows an enabled "Back" on step 1 of 4**
  (`platform-onboarding-desktop`). Disable/hide Back on the first step.
- **7.3 Sparse tables** (Availability = 6 rows) leave big empty desktop areas; consider a
  summary row, inline mini‑chart, or denser default.
- **7.4 Map Layout Editor on mobile** is inherently cramped (`admin-map-mobile`); spatial
  editing is a desktop task — consider a "best on desktop" hint or a simplified mobile mode.

## 8. P3 — personalization & delight (nice‑to‑have)

- Surface the known **favourite zone** ("Rebook your usual — Central") on Home/My Bookings
  (the data already references it, `customer.jsx:940`).
- **Add‑to‑Calendar (.ics)** alongside the existing Apple/Google Wallet on confirmation.
- **Weather‑aware nudges** (the booking rail already shows UV/sea/sunset — turn it into a
  recommendation, e.g. "windy Sat — front row sheltered").
- **Post‑visit review / NPS** and a **season‑pass upsell** (the "Season pass" CRM tag
  exists) to close the loyalty loop.

## 9. P3 — performance / technical **[demo‑ok]**

- The zoomed booking renders hundreds of SVG sunbeds; on low‑end phones consider canvas
  or windowing.
- Client‑only persistence (localStorage) is fine for the mockup; production needs a real
  backend, optimistic UI with rollback, and error toasts on failure (not just success).

---

## Suggested sequencing

1. **P0:** count‑up real values on dashboards · hide marketplace split from customer ·
   introduce URL routing + Back/Forward + deep links.
2. **P1 mobile:** sticky CTA on Locker/Parking/Ticket · bigger sunbed targets · Home
   whitespace · booking rail collapse.
3. **P1 IA/a11y:** ⌘K palette + staff search · dialog focus management · route the
   hand‑rolled overlays through `Modal` · contextual stepper labels · chart a11y.
4. **P2:** checkout reassurance + hold timer + stable ref · validation · footer/whitespace
   · onboarding Back.
5. **P3:** personalization, calendar export, i18n content, performance.

_Reviewed on the current `main` project state (full mockup on branch
`claude/modest-planck-KEPM6`). Screenshots for all 36 screens × desktop/mobile +
interactive states were captured during this review._
