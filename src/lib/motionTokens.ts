/* ============================================================================
   Motion tokens (AENR-743) — the single source for how things move.

   Read by two consumers so CSS and GSAP never drift apart:
   - tailwind.config.js builds the `animate-*`, `duration-*` and `ease-*`
     utilities from these values;
   - src/lib/fx.ts exposes them to GSAP (seconds + GSAP ease names).

   Policy (spec §20.3):
   - Motion explains a change — where something came from, where it went, what
     changed. It never decorates or delays an action.
   - UI feedback uses `fast`, element enters/exits `base`, page and step
     changes `page`, choreography (the zone zoom, the payment moment) `slow`
     and `slower`. Nothing interactive waits longer than `slow`.
   - Enter with `out` (decelerate), leave with `in` (accelerate), move between
     two resting places with `standard`; `spring`/`pop` only for small
     confirmations (a tick, a badge, a picked set).
   - Travel follows the user's direction: forward and deeper move left/up,
     back moves right/down, by `distance.page` at most.
   - Reduced motion: no travel, scale or parallax — content changes in place
     (an opacity cross-fade of `fast` at most). Every animation is gated.
   ============================================================================ */

/** Durations in milliseconds. */
export const DURATION = {
  /** Press, hover, toggle, a picked set. */
  fast: 180,
  /** Page and wizard-step transitions. */
  page: 240,
  /** Elements entering or leaving: sheets, popovers, toasts. */
  base: 300,
  /** Choreography: reveals, the zone zoom. */
  slow: 550,
  /** Long, rare moments: celebration, the dive. */
  slower: 850,
  /** The one-beach camera moving between screens (AENR-784) — backdrop only, never blocks a tap.
   *  900 since AENR-819: shorter, so it settles with the page instead of trailing it. */
  camera: 900,
  /** The shoreline sliding between Home and the booking beach (AENR-823). */
  shore: 780,
} as const;

/** Easing curves: the CSS cubic-bezier and the closest GSAP built-in. */
export const EASING = {
  /** Between two resting states. */
  standard: { css: "cubic-bezier(.4,0,.2,1)", gsap: "power2.inOut" },
  /** Entering — fast start, gentle landing (Apple's decelerate). */
  out: { css: "cubic-bezier(.22,1,.36,1)", gsap: "power3.out" },
  /** Leaving — gentle start, quick exit. */
  in: { css: "cubic-bezier(.4,0,1,1)", gsap: "power2.in" },
  /** Small overshoot for confirmations. */
  spring: { css: "cubic-bezier(.34,1.56,.64,1)", gsap: "back.out(1.7)" },
  /** Bigger overshoot for a tick or a badge popping in. */
  pop: { css: "cubic-bezier(.34,1.8,.64,1)", gsap: "back.out(2.2)" },
} as const;

/** Travel distances in px. */
export const DISTANCE = {
  /** Small lift or settle (fade-up, a picked set). */
  nudge: 8,
  /** Wizard step and tab change. */
  page: 28,
} as const;

export type DurationToken = keyof typeof DURATION;
export type EasingToken = keyof typeof EASING;
