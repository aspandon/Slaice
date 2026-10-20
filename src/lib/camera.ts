import { useSyncExternalStore } from "react";
import { useTenantFeatures } from "./useFeatures";
import { prefersReducedMotion } from "./motion";

/* ---------- One beach, one camera (AENR-784) ----------
   Every guest screen is a shot of the same beach; moving between screens moves
   the camera (CustomerBackdrop tweens it with GSAP). This module is the whole
   feature's logic — pure shot maths plus a tiny store the booking wizard writes
   its step and zone to — so switching it off (the tenant's One-beach camera feature) or
   deleting it leaves the backdrop exactly as it was. */

/** The tenant's "One-beach camera" switch (Platform › tenant › Features); reduced motion always keeps the still backdrop. */
export function useCameraOn(): boolean {
  return useTenantFeatures().feature("guest.camera") && !prefersReducedMotion();
}

/* The wizard tells the camera where the guest is (step, phase, zone). */
export interface WizardShot {
  step: string;
  phase: "zones" | "sets";
  zoneId: string;
}
let wizard: WizardShot | null = null;
const subs = new Set<() => void>();
export function setWizardShot(next: WizardShot | null) {
  if (
    next?.step === wizard?.step &&
    next?.phase === wizard?.phase &&
    next?.zoneId === wizard?.zoneId
  )
    return;
  wizard = next;
  subs.forEach((f) => f());
}
export function useWizardShot(): WizardShot | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => wizard,
  );
}

/* The camera layer is larger than the viewport so pans and zooms never show an edge. */
export const MARGIN_X = 0.14; // of the viewport width, each side
export const MARGIN_Y = 0.06; // of the viewport height, top and bottom

/* The oversized layer has more pixels than the screen; the live WebGL sea renders at a
   proportionally lower resolution so its per-frame cost stays what it was (soft water hides it). */
const LAYER_AREA = (1 + 2 * MARGIN_X) * (1 + 2 * MARGIN_Y);
let seaScale = 1;
export const setCameraLayer = (on: boolean) => {
  seaScale = on ? 1 / Math.sqrt(LAYER_AREA) : 1;
};
/** Multiplier for the sea's pixel ratio. */
export const seaPixelScale = () => seaScale;

/** Where a point along the beach (a share of the camera layer, 0–1) sits on screen at rest. */
export const worldToScreenX = (wx: number) => -MARGIN_X + wx * (1 + 2 * MARGIN_X);
/** A zone's spot along the beach from its map position (0–100), kept clear of the layer's edges. */
export const zoneWorldX = (mapX: number) => 0.18 + (Math.max(0, Math.min(100, mapX)) / 100) * 0.64;

/** The sand-top fraction to draw inside the oversized layer so the shoreline stays where it was on screen. */
export const layerShoreline = (screen: number) => (screen + MARGIN_Y) / (1 + 2 * MARGIN_Y);

export interface Shot {
  /** Pan along the shore, as a share of the viewport width (negative = walk to the right). */
  pan: number;
  /** Zoom, ≥ 1. */
  zoom: number;
  /** Where to zoom toward, as viewport fractions (0–1): that point stays put. */
  focusX: number;
  focusY: number;
}

/** Walk along the shore with the tab order (pages slide in from the same side). */
const ALONG: Record<string, number> = { home: 0, mybookings: -0.05, wallet: -0.09, account: -0.12 };

/**
 * The shot for a screen. `shore` is the on-screen shoreline (sand-top fraction), `zoneX` the
 * chosen zone's place along the beach (camera-layer share, 0–1) when one is known.
 */
export function shotFor(
  page: string,
  wiz: WizardShot | null,
  shore: number,
  zoneX: number | null,
  wide: boolean,
): Shot {
  const centre = { pan: 0, zoom: 1, focusX: 0.5, focusY: shore };
  if (page === "plan") {
    // In the wizard the camera zooms about a point down on the sand, not on the waterline: the
    // shoreline is curved, and pivoting on it let one end sink into the first rows of sets.
    // Pivoting below it lifts the whole waterline as the camera closes in.
    const sand = { ...centre, focusY: Math.min(0.95, shore + 0.15) };
    // Until the wizard reports in (its code loads on demand), frame the first step.
    const w = wiz ?? { step: "when", phase: "zones", zoneId: "" };
    const zx = worldToScreenX(zoneX ?? 0.5);
    // Zoom toward the zone's place along the beach and bring it toward the middle of the free
    // beach — on desktop the booking panel takes the right third, so that middle is at a third.
    const toward = (k: number) => ({ focusX: zx, pan: ((wide ? 0.34 : 0.5) - zx) * k });
    switch (w.step) {
      case "when":
        return { ...sand, zoom: 1.08 }; // dive down to the shore
      case "beach":
        return w.phase === "sets" ? { ...sand, zoom: 1.3, ...toward(0.7) } : { ...sand, zoom: 1.12 };
      case "people":
        return { ...sand, zoom: 1.18, ...toward(0.45) };
      default:
        return centre; // Pay: pull back to the wide shot
    }
  }
  if (page === "checkout") return centre;
  if (page in ALONG) return { ...centre, pan: ALONG[page] };
  return { ...centre, zoom: 1.05 }; // a page deeper in (a pass, a document): a step closer
}

/**
 * The layer transform for a shot: zooming about the focus point is a scale about the layer's
 * centre plus the translation that keeps the focus still, clamped so no edge ever shows.
 */
export function cameraTransform(s: Shot, vw: number, vh: number) {
  const tx = (1 - s.zoom) * (s.focusX - 0.5) * vw + s.pan * vw;
  const ty = (1 - s.zoom) * (s.focusY - 0.5) * vh;
  const roomX = (((1 + 2 * MARGIN_X) * s.zoom - 1) / 2) * vw;
  const roomY = (((1 + 2 * MARGIN_Y) * s.zoom - 1) / 2) * vh;
  const clamp = (v: number, r: number) => Math.max(-r, Math.min(r, v));
  return { x: clamp(tx, roomX), y: clamp(ty, roomY), scale: s.zoom };
}
