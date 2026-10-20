import { useEffect } from "react";
import type { BeachPreset } from "../../data/backgrounds";
import type { SeaEnv } from "../LiveSeaCanvas";

/* Placeholder until the Coastal sea lands (AENR-811): falls straight back to Classic. */
export default function CoastalSea({
  onFail,
}: {
  preset: BeachPreset;
  dy: number;
  env: SeaEnv;
  tier: "desktop" | "mobile";
  onFail: () => void;
}) {
  useEffect(onFail, [onFail]);
  return null;
}
