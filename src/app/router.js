// Tiny dependency-free hash router. The app's location is identified by a
// persona + a page; we mirror that into the URL hash (`#/persona/page`) so the
// app is deep-linkable, refresh-stable and works with browser Back/Forward —
// without pulling in react-router or needing any server rewrite (the static
// deploy keeps working).

import { PERSONAS, NAV } from "../data/personas.js";

// Customer account/flow destinations that aren't in the primary NAV but are
// still legitimate (deep-linkable) pages.
const EXTRA_PAGES = {
  customer: ["checkout", "confirm", "mybookings", "mydocs"],
};

const isPersona = (p) => PERSONAS.some((x) => x.id === p);

function isPage(persona, page) {
  if (!page) return false;
  if ((NAV[persona] || []).some((it) => it.k === page)) return true;
  return (EXTRA_PAGES[persona] || []).includes(page);
}

// Parse `#/persona/page` → { persona, page } (page optional). Returns {} when
// the hash doesn't name a real persona, so callers can fall back to saved state.
export function parseHash(hash = window.location.hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const persona = parts[0];
  if (!isPersona(persona)) return {};
  let page = parts[1];
  if (page && !isPage(persona, page)) page = undefined;
  return { persona, page };
}

export function buildHash(persona, page) {
  return `#/${persona}/${page}`;
}
