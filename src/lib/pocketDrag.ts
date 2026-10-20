import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { DUR, EASE } from "./fx";

/* ============================================================================
   pocketDrag (AENR-791) — the confirmation's pass is dragged into a wallet.

   Picked up, the pass shrinks around the finger so it can be aimed; thrown or
   dropped over a pocket (≥ 40 % overlap) it slides in behind the pocket's
   front, the pocket pulses and `onDrop` opens that wallet's add sheet. Dropped
   anywhere else it springs home. `putBack()` lifts it out of the pocket again
   once the sheet closes. Only created when motion is allowed — the wallet
   badges stay the keyboard / screen-reader path. Lives apart from fx.ts so
   Draggable and InertiaPlugin load with the checkout chunk only.
   ============================================================================ */

gsap.registerPlugin(Draggable, InertiaPlugin);

/** The pass's size once picked up, at most, in px — small enough to aim at one pocket. */
const LIFTED_W = 220;
const LIFTED_H = 250;
/** The pass's size going into a pocket, at most, in px. */
const TUCKED_W = 96;
const TUCKED_H = 110;

export interface PocketDrag {
  enable: () => void;
  putBack: () => void;
  kill: () => void;
}

export function pocketDrag({
  pass,
  trigger,
  area,
  onDrop,
}: {
  /** The ticket that moves. */
  pass: HTMLElement;
  /** Where a press starts a drag (the whole pass, or its header strip on touch). */
  trigger: HTMLElement;
  /** The column the pass may travel in; its `[data-pocket]` children are the targets. */
  area: HTMLElement;
  onDrop: (pocket: HTMLElement) => void;
}): PocketDrag {
  const pockets = () => Array.from(area.querySelectorAll<HTMLElement>("[data-pocket]"));
  // The transform origin (local px) — the grab point while dragging, so the pass shrinks around the finger.
  let ox = 0;
  let oy = 0;
  let tuck: gsap.core.Timeline | null = null;

  // The pocket under the pass: the one it covers most, of those it covers by at least 40 %.
  const over = (d: Draggable) => {
    const r = pass.getBoundingClientRect();
    let best: HTMLElement | null = null;
    let most = 0;
    for (const p of pockets()) {
      if (!d.hitTest(p, "40%")) continue;
      const q = p.getBoundingClientRect();
      const a =
        Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) *
        Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
      if (a > most) [best, most] = [p, a];
    }
    return best;
  };
  const mark = (hit: HTMLElement | null) =>
    pockets().forEach((p) => p.toggleAttribute("data-over", p === hit));

  // While the pass is in hand the pockets dock to the bottom of the screen (sticky, so nothing below
  // moves) — on a phone they sit under the fold, out of a finger's reach otherwise.
  const dock = (on: boolean) =>
    area.querySelector("[data-pocket-dock]")?.toggleAttribute("data-docked", on);

  // The hint sits over the slot; it steps aside while the pass goes in.
  const showHint = (on: boolean) => {
    const el = area.querySelector("[data-pocket-hint]");
    if (el)
      gsap.to(
        el,
        on
          ? { autoAlpha: 1, duration: DUR.xs, clearProps: "opacity,visibility" }
          : { autoAlpha: 0, duration: DUR.xs },
      );
  };

  const home = () => {
    dock(false);
    showHint(true);
    gsap.to(pass, {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: DUR.md,
      ease: EASE.spring,
      overwrite: true,
      onComplete: () => {
        gsap.set(pass, {
          clearProps: "transform,transformOrigin,zIndex,clipPath,opacity,visibility",
        });
        drag.update();
      },
    });
  };

  // Slide into the pocket: hover over its slot at pocket size, then drop in behind its front.
  const tuckInto = (pocket: HTMLElement) => {
    drag.disable();
    drag.tween?.kill();
    mark(null);
    showHint(false);
    const r = pass.getBoundingClientRect();
    const q = pocket.getBoundingClientRect();
    const front =
      pocket.querySelector<HTMLElement>("[data-pocket-front]")?.getBoundingClientRect() ?? q;
    const x0 = Number(gsap.getProperty(pass, "x"));
    const y0 = Number(gsap.getProperty(pass, "y"));
    const s0 = Number(gsap.getProperty(pass, "scale"));
    const w = pass.offsetWidth;
    const h = pass.offsetHeight;
    // The untransformed top-left, from what's on screen now.
    const lx = r.left - (x0 + ox * (1 - s0));
    const ly = r.top - (y0 + oy * (1 - s0));
    const s = Math.min(TUCKED_W / w, TUCKED_H / h);
    // Centred over the pocket, standing on the front's lip.
    const tx = q.left + q.width / 2 - (w * s) / 2;
    const ty = front.top + 4 - h * s;
    const x = tx - lx - ox * (1 - s);
    const y = ty - ly - oy * (1 - s);
    tuck = gsap
      .timeline({
        onComplete: () => {
          gsap.fromTo(
            pocket,
            { scale: 1 },
            {
              scale: 1.05,
              duration: 0.12,
              yoyo: true,
              repeat: 1,
              ease: "power1.out",
              clearProps: "transform",
            },
          );
          gsap.delayedCall(0.26, () => onDrop(pocket));
        },
      })
      .set(pass, { zIndex: 10 })
      .to(pass, { x, y, scale: s, rotation: 0, duration: DUR.sm, ease: EASE.out })
      // Down through the lip: whatever has gone in is clipped off, as if the pocket swallows it.
      .addLabel("in")
      .fromTo(
        pass,
        { clipPath: "inset(0% 0% 0% 0%)" },
        { y: y + h * s, clipPath: "inset(0% 0% 100% 0%)", duration: DUR.sm, ease: EASE.in },
      )
      .set(pass, { autoAlpha: 0 });
  };

  const [drag] = Draggable.create(pass, {
    type: "x,y",
    trigger,
    inertia: true,
    // The QR button and the map link stay taps — they never start a drag.
    dragClickables: false,
    minimumMovement: 6,
    zIndexBoost: true,
    autoScroll: 1,
    edgeResistance: 0.75,
    throwResistance: 2500,
    minDuration: 0.1,
    maxDuration: 0.6,
    cursor: "grab",
    activeCursor: "grabbing",
    onPressInit(this: Draggable, e: PointerEvent | TouchEvent | MouseEvent) {
      // The finger may roam the confirmation column, and down to the bottom of the pockets. Read from
      // the event: a press on the QR button (a clickable) fires this without updating pointerX/Y.
      const pt = "changedTouches" in e ? e.changedTouches[0] : e;
      if (!pt) return;
      const a = area.getBoundingClientRect();
      const pocketsBottom = Math.max(
        ...pockets().map((p) => p.getBoundingClientRect().bottom),
        a.bottom,
      );
      const x0 = Number(gsap.getProperty(pass, "x"));
      const y0 = Number(gsap.getProperty(pass, "y"));
      this.applyBounds({
        minX: x0 + a.left - pt.clientX,
        maxX: x0 + a.right - pt.clientX,
        minY: y0 + Math.min(0, a.top - pt.clientY),
        maxY: y0 + pocketsBottom - pt.clientY + 24,
      });
    },
    onDragStart(this: Draggable) {
      dock(true);
      const r = pass.getBoundingClientRect();
      const w = pass.offsetWidth;
      const h = pass.offsetHeight;
      const s = Math.min(0.7, LIFTED_W / w, LIFTED_H / h);
      // The grab point (local px). Picked by its header, the pass would hang below the finger — so the
      // origin is placed where shrinking brings the pass's centre under the finger: o = (g − s·c) / (1 − s).
      const gx = (this.pointerX - window.scrollX - r.left) * (w / r.width);
      const gy = (this.pointerY - window.scrollY - r.top) * (h / r.height);
      ox = (gx - (s * w) / 2) / (1 - s);
      oy = (gy - (s * h) / 2) / (1 - s);
      gsap.set(pass, { transformOrigin: `${ox}px ${oy}px` });
      gsap.to(pass, {
        scale: s,
        rotation: -3,
        duration: DUR.xs,
        ease: EASE.out,
        overwrite: "auto",
      });
    },
    onDrag(this: Draggable) {
      mark(over(this));
    },
    onThrowUpdate(this: Draggable) {
      mark(over(this));
    },
    onDragEnd(this: Draggable) {
      const hit = over(this);
      if (hit) tuckInto(hit);
      else if (!this.isThrowing) {
        mark(null);
        home();
      }
    },
    onThrowComplete(this: Draggable) {
      if (!this.enabled()) return;
      const hit = over(this);
      if (hit) tuckInto(hit);
      else {
        mark(null);
        home();
      }
    },
  });
  // Off until the pass has printed.
  drag.disable();

  return {
    enable: () => drag.enable(),
    // Up out of the slot, then (above everything again) home to its place.
    putBack: () => {
      const tl = tuck;
      tuck = null;
      tl?.tweenFromTo(tl.duration(), "in", {
        duration: DUR.xs,
        ease: "none",
        onComplete: () => {
          gsap.set(pass, { zIndex: Draggable.zIndex++ });
          home();
          drag.enable();
        },
      });
    },
    kill: () => {
      tuck?.kill();
      drag.kill();
    },
  };
}
