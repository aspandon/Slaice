// The verticals Slaice serves on one platform back end (AENR-1137). The beach vertical is the
// app as it was; each further vertical has its own address (`#/<vertical>/<page>`), shell, roles
// and capabilities, and shares the Platform console, sign-in and app store with the beach.
import { useSyncExternalStore } from "react";
import { hashPath } from "../app/router";

export type VerticalId = "beach" | "parking";

export const VERTICALS: readonly { id: VerticalId; label: string; icon: string; blurb: string }[] =
  [
    {
      id: "beach",
      label: "Beach",
      icon: "umbrella",
      blurb: "Sunbeds, entry tickets, lockers and parking at the beach.",
    },
    {
      id: "parking",
      label: "Parking",
      icon: "car",
      blurb: "Car parks on the same platform, with their own roles.",
    },
  ];

/** Where the Parking vertical opens (AENR-1138). */
export const PARKING_HOME = "#/parking/home";

/** The vertical a hash belongs to: `#/parking…` is Parking, everything else the beach. */
export const verticalOf = (hash: string = window.location.hash): VerticalId =>
  /^#\/parking(\/|$)/.test(hashPath(hash)) ? "parking" : "beach";

const subscribe = (on: () => void) => {
  window.addEventListener("hashchange", on);
  window.addEventListener("popstate", on);
  return () => {
    window.removeEventListener("hashchange", on);
    window.removeEventListener("popstate", on);
  };
};
/** The vertical the address names, kept current on Back/Forward and links. */
export const useVertical = (): VerticalId => useSyncExternalStore(subscribe, () => verticalOf());
