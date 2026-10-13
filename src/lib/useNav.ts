import { useApp } from "../app/store";
import { navFor } from "../data/personas";
import type { PersonaId } from "../domain/types";

/** The persona's menu items, with roadmap previews shown or hidden by the demo switch (AENR-618). */
export function useNav(persona: PersonaId) {
  const { showPreviews } = useApp();
  return navFor(persona, showPreviews);
}
