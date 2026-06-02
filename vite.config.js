import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works under a GitHub Pages project subpath
  // (e.g. aspandon.github.io/Slaice/) as well as at a root domain.
  base: "./",
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
