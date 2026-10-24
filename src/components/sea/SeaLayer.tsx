import { lazy, Suspense } from "react";
import type { BeachPreset } from "../../data/backgrounds";
import type { SeaStyle } from "../../domain/features";
import type { SeaEnv } from "../LiveSeaCanvas";

/* ============ The sea a tenant swaps in (AENR-813) ============
   Coastal (a lightweight realistic shader, AENR-811) or Video (a looping aerial
   video of real water, AENR-814), drawn in place of the Classic water — above the
   painted sea, which stays underneath as the loading state, and below the sand.
   Blender (AENR-827) is a rendered loop of the whole beach, sea and sand: the host
   draws it over the drawn land instead.
   Each is its own lazy chunk, fetched only by the tenants and devices that use it.
   `onFail` (no WebGL2, a lost context, a video that won't play) brings Classic back. */
const CoastalSea = lazy(() => import("./CoastalSea"));
const VideoSea = lazy(() => import("./VideoSea"));
const BlenderSea = lazy(() => import("./BlenderSea"));

export function SeaLayer({
  style,
  preset,
  dy,
  env,
  tier,
  onFail,
}: {
  style: Exclude<SeaStyle, "classic">;
  preset: BeachPreset;
  dy: number;
  env: SeaEnv;
  tier: "desktop" | "mobile";
  onFail: () => void;
}) {
  return (
    <Suspense fallback={null}>
      {style === "coastal" ? (
        <CoastalSea preset={preset} dy={dy} env={env} tier={tier} onFail={onFail} />
      ) : style === "blender" ? (
        <BlenderSea dy={dy} env={env} tier={tier} onFail={onFail} />
      ) : (
        <VideoSea dy={dy} env={env} tier={tier} onFail={onFail} />
      )}
    </Suspense>
  );
}
