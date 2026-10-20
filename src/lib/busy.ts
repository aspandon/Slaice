/* ============ The page is busy: the sea holds still (AENR-836) ============
   A page change is the moment the guest is waiting on the device: React renders the new page, the
   camera flies, the sand slides. The live seas (LiveSeaCanvas, CoastalSea) skip their frames until
   it is over, so the whole GPU and main thread go to the page; the water picks up where it left off
   (its clock only advances on drawn frames, so nothing jumps). The video sea keeps playing — the
   video decoder costs the page nothing. Marks only ever extend the busy window. */
let until = 0;

/** The page is busy for the next `ms` milliseconds. */
export function markBusy(ms: number) {
  until = Math.max(until, performance.now() + ms);
}

/** Is the page busy at `now` (a rAF / performance.now() timestamp)? */
export function isBusy(now = performance.now()) {
  return now < until;
}
