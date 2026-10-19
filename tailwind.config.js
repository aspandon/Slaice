import { DURATION as D, EASING as E, DISTANCE } from "./src/lib/motionTokens.ts";

// Motion utilities are generated from the shared tokens (AENR-743) so CSS and
// GSAP move alike: `${D.x}ms ${E.y.css}` everywhere below.
const ms = (k) => `${D[k]}ms`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  // Only emit `hover:` styles on devices that actually support hover (pointer:
  // fine). Without this, tapping a control on a phone/tablet leaves its hover
  // state "stuck" until you tap elsewhere — a cross-browser touch bug.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"Inter"', "system-ui", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        // Display now uses the SF/Inter system stack (no serif); tracking is
        // tightened in the .font-display base layer.
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        // Tenant-branded beach experience (Akti tou Iliou) — navy + teal
        navy: { 950: "#071a30", 900: "#0B2545", 800: "#13315c", 700: "#1d4172", 600: "#2a5589" },
        teal: { 600: "#0D9488", 500: "#14b8a6", 400: "#2dd4bf", 300: "#5EEAD4", 100: "#ccfbf1" },
        // Selected sunbed / accent (from the video)
        coral: { 600: "#e2552f", 500: "#f1683c", 400: "#fb8a63" },
        // SLAiCE platform brand — indigo + gold
        slaice: { 700: "#2f3bb3", 600: "#3a47cc", 500: "#4a57e0", 100: "#e7e9fb" },
        gold: { 600: "#e0a800", 500: "#f2b705", 400: "#ffc933", 300: "#ffdc73" },
        sand: "#E9E3D5",
        ink: "#1E293B",
        // Elevation by role (AENR-549): data sits on solid surfaces; glass is for chrome.
        surface: { DEFAULT: "#F4F6F9", raised: "#FFFFFF", overlay: "#FFFFFF" },
      },
      // Customer type scale (AENR-706): every guest-facing page reads at the
      // Account page's sizes. Back-office roles keep the default scale.
      fontSize: {
        "guest-title": ["26px", { lineHeight: "1.15" }],
        "guest-head": ["19px", { lineHeight: "1.25" }],
        "guest-body": ["15px", { lineHeight: "1.45" }],
        "guest-meta": ["13.5px", { lineHeight: "1.4" }],
        "guest-caption": ["12px", { lineHeight: "1.35" }],
        "guest-over": ["11px", { lineHeight: "1.3" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Ambient elevation: large blur, low alpha, layered — Apple-style depth.
        soft: "0 1px 2px rgba(15,23,42,.04), 0 12px 28px -18px rgba(15,23,42,.18)",
        lift: "0 1px 2px rgba(15,23,42,.04), 0 20px 44px -24px rgba(15,23,42,.26)",
        float: "0 2px 8px -4px rgba(11,37,69,.14), 0 32px 70px -28px rgba(11,37,69,.40)",
        ring: "0 0 0 1px rgba(15,23,42,.05)",
        raised: "0 1px 2px rgba(15,23,42,.05), 0 10px 24px -18px rgba(15,23,42,.20)",
        overlay: "0 2px 8px -4px rgba(11,37,69,.14), 0 32px 70px -28px rgba(11,37,69,.40)",
        glow: "0 0 0 4px rgba(13,148,136,.14)",
        "btn-primary": "0 1px 2px rgba(11,37,69,.24), 0 10px 22px -12px rgba(11,37,69,.45)",
        "btn-teal": "0 1px 2px rgba(13,148,136,.24), 0 10px 22px -12px rgba(13,148,136,.45)",
      },
      transitionTimingFunction: {
        spring: E.spring.css,
        smooth: E.standard.css,
        // Apple's signature decelerate curve.
        ios: E.out.css,
        exit: E.in.css,
      },
      transitionDuration: {
        fast: ms("fast"),
        page: ms("page"),
        base: ms("base"),
        slow: ms("slow"),
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: `translateY(${DISTANCE.nudge}px)` }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeDown: { from: { opacity: 0, transform: `translateY(-${DISTANCE.nudge}px)` }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { "0%": { transform: "scale(.92)", opacity: 0 }, "100%": { transform: "scale(1)", opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: "scale(.97)" }, to: { opacity: 1, transform: "scale(1)" } },
        slideInRight: { from: { opacity: 0, transform: `translateX(${DISTANCE.page}px)` }, to: { opacity: 1, transform: "translateX(0)" } },
        slideUp: { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-5px)" } },
        ripple: { "0%": { transform: "scale(.55)", opacity: "0.85" }, "100%": { transform: "scale(2.4)", opacity: "0" } },
        seaTilt: { "0%,100%": { transform: "rotate(-7deg)" }, "50%": { transform: "rotate(7deg)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
        dive: {
          "0%": { opacity: 0, transform: "scale(1.05)" },
          "28%": { opacity: 1 },
          "68%": { opacity: 1, transform: "scale(1.18)" },
          "100%": { opacity: 0, transform: "scale(1.3)" },
        },
      },
      animation: {
        "fade-up": `fadeUp ${ms("slow")} ${E.out.css} both`,
        "fade-down": `fadeDown ${ms("base")} ${E.out.css} both`,
        "fade-in": `fadeIn ${ms("base")} ${E.standard.css} both`,
        pop: `pop ${ms("base")} ${E.spring.css} both`,
        "scale-in": `scaleIn ${ms("page")} ${E.out.css} both`,
        "slide-in-right": `slideInRight ${ms("page")} ${E.out.css} both`,
        "slide-up": `slideUp ${ms("base")} ${E.spring.css} both`,
        floaty: "floaty 5s ease-in-out infinite",
        ripple: "ripple 4s ease-out infinite",
        "sea-tilt": "seaTilt 4.5s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        dive: `dive ${D.slower + 150}ms ${E.standard.css} both`,
      },
    },
  },
  plugins: [],
};
