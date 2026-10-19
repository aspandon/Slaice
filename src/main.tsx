import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SiteGate } from "./screens/SiteGate";
// Fonts are served from the site itself (AENR-763) — no Google Fonts request on
// the first screen. Inter as one variable file (weight + optical size), split by
// script so a browser fetches only the Latin or Greek part it needs.
import "@fontsource-variable/inter/opsz.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./index.css";
import { reloadOnceForStaleChunk } from "./lib/staleChunk";
import { deviceLang, loadLang, normalizeLang } from "./app/i18n";

// A tab opened before a deploy can fail to preload a renamed chunk. Vite fires
// this event; recover by reloading once into the fresh build.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadOnceForStaleChunk();
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

// Load the visitor's language before the first render (AENR-751): the saved
// choice, else the device's — so a Greek guest never sees a flash of English.
// Only that one dictionary is downloaded; English needs none.
const savedLang = (() => {
  try {
    return (JSON.parse(localStorage.getItem("slaice.v1") || "{}") as { lang?: string }).lang;
  } catch {
    return undefined;
  }
})();
const startLang = savedLang ? normalizeLang(savedLang) : deviceLang();

loadLang(startLang).finally(() =>
  createRoot(root).render(
    <StrictMode>
      <SiteGate>
        <App />
      </SiteGate>
    </StrictMode>,
  ),
);
