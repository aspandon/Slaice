import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works under a GitHub Pages project subpath
  // (e.g. aspandon.github.io/Slaice/) as well as at a root domain.
  base: "./",
  plugins: [react()],
  // Transpile down to the oldest engines we commit to (kept in sync with the
  // `browserslist` in package.json): Chrome/Edge 88, Firefox ESR, Safari 14.
  // This guarantees the bundle parses on every browser in our support matrix.
  build: {
    target: ["chrome88", "edge88", "firefox78", "safari14"],
    rollupOptions: {
      output: {
        // Split heavy vendor code out of the app chunk for better long-term
        // caching and to keep any single chunk comfortably under budget.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "react";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@radix-ui") || id.includes("@floating-ui")) return "radix";
          return "vendor";
        },
      },
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
