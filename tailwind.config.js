/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
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
        soft: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.18)",
        float: "0 12px 40px -12px rgba(11,37,69,.45)",
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { "0%": { transform: "scale(.9)", opacity: 0 }, "100%": { transform: "scale(1)", opacity: 1 } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fadeUp .35s ease both",
        "fade-in": "fadeIn .3s ease both",
        pop: "pop .25s ease both",
      },
    },
  },
  plugins: [],
};
