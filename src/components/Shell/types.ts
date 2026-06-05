import type { PersonaId } from "../../domain/types";

export interface NavProps {
  persona: PersonaId;
  page: string;
  setPage: (k: string) => void;
}
