// Tiny dependency-free hash router. The app's location is identified by a
// persona + a page; we mirror that into the URL hash (`#/persona/page`) so the
// app is deep-linkable, refresh-stable and works with browser Back/Forward —
// without pulling in react-router or needing any server rewrite (the static
// deploy keeps working).

import { PERSONAS, NAV } from "../data/personas";
import type { PersonaId } from "../domain/types";

export interface Route {
  persona?: PersonaId;
  page?: string;
}

// Customer account/flow destinations that aren't in the primary NAV but are
// still legitimate (deep-linkable) pages.
const EXTRA_PAGES: Partial<Record<PersonaId, string[]>> = {
  customer: ["checkout", "confirm", "vip", "season"],
  // Per-tenant pages: #/platform/tenant/<tenantId>/<section> (AENR-500).
  platform: ["tenant"],
};

// Retired pages that now live elsewhere — old links keep working.
const PAGE_ALIASES: Partial<Record<PersonaId, Record<string, string>>> = {
  // Map Layout Editor merged into Beach (AENR-469), split again into layout /
  // pricing / products (AENR-561); Manual booking and Pay-by-link became one
  // New booking flow (AENR-559).
  // AENR-558 regrouped the sidebar: Dashboard → Today, Beach → Beach layout.
  admin: { map: "layout", availability: "layout", dashboard: "today", manual: "newbooking", paylinks: "newbooking" },
  callcenter: { manual: "newbooking", paylinks: "newbooking" },
  support: { paylinks: "newbooking", redeem: "scan", locker: "issue" },
  // Sell Locker and Redeem Ticket left the till (AENR-605): lockers sell in Sell.
  cashier: { redeem: "issue", locker: "issue" },
  platform: { onboarding: "tenants" },
  customer: { mydocs: "account" }, // receipts moved into Account (AENR-563) // onboarding is a tenant state: Tenants › In onboarding (AENR-566)
  accountant: { invoicing: "documents" }, // e-Invoicing & MyDATA merged into Documents & Payments (AENR-526)
};
export const resolvePage = (persona: PersonaId, page: string) => PAGE_ALIASES[persona]?.[page] ?? page;

const isPersona = (p: string): p is PersonaId => PERSONAS.some((x) => x.id === p);

// A page is valid if it's in the persona's NAV or its extra (flow) pages.
export function isValidPage(persona: PersonaId, page: string): boolean {
  if (!page) return false;
  if ((NAV[persona] || []).some((it) => it.k === page)) return true;
  return (EXTRA_PAGES[persona] || []).includes(page);
}

// Parse `#/persona/page` → { persona, page } (page optional). Returns {} when
// the hash doesn't name a real persona, so callers can fall back to saved state.
export function parseHash(hash: string = window.location.hash): Route {
  const parts = hashPath(hash).replace(/^#\/?/, "").split("/").filter(Boolean);
  const persona = parts[0];
  if (!isPersona(persona)) return {};
  let page: string | undefined = parts[1] && resolvePage(persona, parts[1]);
  if (page && !isValidPage(persona, page)) page = undefined;
  return { persona, page };
}

export function buildHash(persona: string, page: string): string {
  return `#/${persona}/${page}`;
}

/* ---------- Page-level query state ----------
   A page can keep view state in the hash query (`#/admin/dashboard?period=month`)
   so it survives refresh and can be shared. The query belongs to the current
   page: navigating to another page drops it. */
export const hashPath = (hash: string = window.location.hash) => hash.split("?")[0];
export function readHashQuery(hash: string = window.location.hash): URLSearchParams {
  return new URLSearchParams(hash.split("?")[1] ?? "");
}
/** Replace the current page's query params (no new history entry). */
export function writeHashQuery(params: Record<string, string>, drop: string[] = []): void {
  const q = readHashQuery();
  drop.forEach((k) => q.delete(k));
  Object.entries(params).forEach(([k, v]) => q.set(k, v));
  const qs = q.toString();
  window.history.replaceState(window.history.state, "", `${hashPath()}${qs ? `?${qs}` : ""}`);
}

/** Path segments after `#/persona/page` (e.g. a tenant id and section). */
export const subPath = (hash: string = window.location.hash): string[] => hashPath(hash).replace(/^#\/?/, "").split("/").filter(Boolean).slice(2);
