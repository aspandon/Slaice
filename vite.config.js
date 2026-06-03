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
  build: { target: ["chrome88", "edge88", "firefox78", "safari14"] },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
