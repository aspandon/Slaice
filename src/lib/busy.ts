/* ============ The page is busy: the sea holds still (AENR-836) ============
   A page change is the moment the guest is waiting on the device: React renders the new page, the
   camera flies, the sand slides. The live seas (LiveSeaCanvas, CoastalSea) skip their frames until
   it is over, so the whole GPU and main thread go to the page; the water picks up where it left off
   (its clock only advances on drawn frames, so nothing jumps). Marks only ever extend the busy window.

   The camera moving (AENR-866) is the one busy moment the video seas sit out too: a paused video
   is a still picture the compositor moves for free, a playing one is a new frame to upload and
   composite on every one of the move's frames. Page changes without a move keep the video playing. */
let until = 0;
let moveUntil = 0;
let moveTimer = 0;
const moveListeners = new Set<(moving: boolean) => void>();

/** The page is busy for the next `ms` milliseconds; `move`: the camera or the shoreline is moving. */
export function markBusy(ms: number, move = false) {
  const now = performance.now();
  until = Math.max(until, now + ms);
  if (!move) return;
  const was = now < moveUntil;
  moveUntil = Math.max(moveUntil, now + ms);
  if (!was) moveListeners.forEach((l) => l(true));
  window.clearTimeout(moveTimer);
  moveTimer = window.setTimeout(() => moveListeners.forEach((l) => l(false)), moveUntil - now);
}

/** Is the page busy at `now` (a rAF / performance.now() timestamp)? */
export function isBusy(now = performance.now()) {
  return now < until;
}

/** Is the camera (or the shoreline) moving right now? */
export function isMoving(now = performance.now()) {
  return now < moveUntil;
}

/** Called with true when a move starts and false when it ends; returns the unsubscribe. */
export function onMove(listener: (moving: boolean) => void) {
  moveListeners.add(listener);
  return () => {
    moveListeners.delete(listener);
  };
}
