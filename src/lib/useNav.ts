import { FUTURE_PAGES, NAV, navFor } from "../data/personas";
import type { PersonaId } from "../domain/types";
import { useTenantFeatures } from "./useFeatures";

/** The persona's menu items: roadmap previews shown or hidden by the demo switch (AENR-618 / 691),
 *  pages of modules the tenant doesn't have left out (AENR-696). A role the tenant doesn't use
 *  (AENR-716) has no pages at all. */
export function useNav(persona: PersonaId) {
  const { roadmap, module, role } = useTenantFeatures();
  return role(persona) ? navFor(persona, roadmap, module) : [];
}

export type PageAccess =
  | { ok: true }
  | { ok: false; why: "roadmap" | "module" | "role"; module?: string };

/** Whether a page may open for this tenant now, and why not (a direct link to a hidden page). */
export function usePageAccess(persona: PersonaId, page: string): PageAccess {
  const { roadmap, module, role } = useTenantFeatures();
  if (!role(persona)) return { ok: false, why: "role" };
  const it = (NAV[persona] ?? []).find((x) => x.k === page);
  if (it?.module && !module(it.module)) return { ok: false, why: "module", module: it.module };
  const future = it?.badge === "Future" || (FUTURE_PAGES[persona] ?? []).includes(page);
  if (future && !roadmap) return { ok: false, why: "roadmap" };
  return { ok: true };
}
