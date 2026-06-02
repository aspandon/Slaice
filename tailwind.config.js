/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
      },
      colors: {
        // Tenant-branded beach experience (Akti tou Iliou) — navy + teal
        navy: { 950: "#071a30", 900: "#0B2545", 800: "#13315c", 700: "#1d4172", 600: "#2a5589" },
        teal: { 600: "#0D9488", 500: "#14b8a6", 400: "#2dd4bf", 300: "#5EEAD4", 100: "#ccfbf1" },
        // Selected sunbed / accent (from the video)
        coral: { 600: "#e2552f", 500: "#f1683c", 400: "#fb8a63" },
        // SLAiCE platform brand — indigo + gold
        slaice: { 700: "#2f3bb3", 600: "#3a47cc", 500: "#4a57e0", 100: "#e7e9fb" },
        gold: { 600: "#e0a800", 500: "#f2b705", 400: "#ffc933" },
        sand: "#E9E3D5",
        ink: "#1E293B",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -14px rgba(15,23,42,.16)",
        lift: "0 1px 2px rgba(15,23,42,.05), 0 10px 30px -12px rgba(15,23,42,.22), 0 2px 8px -4px rgba(15,23,42,.08)",
        float: "0 18px 50px -16px rgba(11,37,69,.40), 0 4px 12px -6px rgba(11,37,69,.18)",
        ring: "0 0 0 1px rgba(15,23,42,.06)",
        glow: "0 0 0 4px rgba(13,148,136,.14)",
        "btn-primary": "0 1px 2px rgba(11,37,69,.30), 0 8px 18px -8px rgba(11,37,69,.45)",
        "btn-teal": "0 1px 2px rgba(13,148,136,.30), 0 8px 18px -8px rgba(13,148,136,.45)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.34,1.56,.64,1)",
        smooth: "cubic-bezier(.4,0,.2,1)",
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeDown: { from: { opacity: 0, transform: "translateY(-8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { "0%": { transform: "scale(.92)", opacity: 0 }, "100%": { transform: "scale(1)", opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: "scale(.97)" }, to: { opacity: 1, transform: "scale(1)" } },
        slideInRight: { from: { opacity: 0, transform: "translateX(16px)" }, to: { opacity: 1, transform: "translateX(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-5px)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fadeUp .4s cubic-bezier(.4,0,.2,1) both",
        "fade-down": "fadeDown .3s cubic-bezier(.4,0,.2,1) both",
        "fade-in": "fadeIn .3s ease both",
        pop: "pop .28s cubic-bezier(.34,1.56,.64,1) both",
        "scale-in": "scaleIn .2s cubic-bezier(.4,0,.2,1) both",
        "slide-in-right": "slideInRight .35s cubic-bezier(.4,0,.2,1) both",
        floaty: "floaty 5s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
