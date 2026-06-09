import { lazy } from "react";
import type { ComponentType } from "react";

/* ---------- Stale-chunk recovery ----------
   Production chunks are content-hashed, so every release ships new filenames and
   drops the old ones. A browser tab opened *before* a deploy still runs the old
   index.html; the moment it tries to fetch a lazy chunk (e.g. the Konva map
   editor) that filename is gone and the import 404s with "Failed to fetch
   dynamically imported module". Reloading pulls the fresh index.html + chunk
   names and the navigation continues seamlessly.

   A short time-guard (kept in sessionStorage) means we reload at most once per
   window — so a genuine, persistent failure (offline, a real 5xx) surfaces the
   error instead of looping. */
const RELOAD_KEY = "slaice:chunk-reload-at";
const COOLDOWN_MS = 10_000;

export function reloadOnceForStaleChunk(): boolean {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last <= COOLDOWN_MS) return false; // already reloaded recently — let the error show
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
  window.location.reload();
  return true;
}

/* Drop-in for React.lazy that recovers from a stale-deploy chunk 404. Mirrors
   React's own `lazy` generic (the whole component type, so props infer cleanly). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((err): Promise<{ default: T }> => {
      if (reloadOnceForStaleChunk()) return new Promise(() => { /* hold the boundary until the reload lands */ });
      throw err;
    }),
  );
}
