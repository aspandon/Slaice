import type { ReactNode } from "react";
import { useApp } from "../app/store";

/* Undo instead of "Are you sure?" (AENR-615): a reversible action happens at once
   and its notice offers Undo for a few seconds (also ⌘Z / Ctrl+Z, see Toasts).
   The caller captures what to put back — usually the slices it is about to change. */
export function useUndoToast() {
  const { toast } = useApp();
  return (message: ReactNode, restore: () => void) =>
    toast(message, {
      tone: "success",
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          restore();
          toast("Undone.", { duration: 2500 });
        },
      },
    });
}
