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
  customer: ["checkout", "confirm", "mybookings", "mydocs", "vip", "season"],
};

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
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const persona = parts[0];
  if (!isPersona(persona)) return {};
  let page: string | undefined = parts[1];
  if (page && !isValidPage(persona, page)) page = undefined;
  return { persona, page };
}

export function buildHash(persona: string, page: string): string {
  return `#/${persona}/${page}`;
}
