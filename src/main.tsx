import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SiteGate } from "./screens/SiteGate";
import "./index.css";
import { reloadOnceForStaleChunk } from "./lib/staleChunk";

// A tab opened before a deploy can fail to preload a renamed chunk. Vite fires
// this event; recover by reloading once into the fresh build.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadOnceForStaleChunk();
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <SiteGate>
      <App />
    </SiteGate>
  </StrictMode>,
);
