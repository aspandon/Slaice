/* "Choose for me" (AENR-641): the best free sets for a party, picked before the guest
   taps anything. Adjacent sets in one row first; among those the cheapest, and on a tie
   the row nearest the sea. With no adjacent run long enough, the cheapest sets nearest
   the sea are taken and the pick says they are not together. Pure — easy to test. */

export interface SetLike {
  id: string;
  x: number;
  y: number;
  price: number;
}
export interface BestPick {
  ids: string[];
  total: number;
  /** 0 = the row nearest the sea. */
  rowIdx: number;
  together: boolean;
}

const rowsOf = (sets: readonly SetLike[]) =>
  [...new Set(sets.map((s) => Math.round(s.y)))].sort((a, b) => a - b);

/** Runs of neighbouring sets in one row (a gap wider than ~1.6 steps breaks the run). */
function runsInRow(row: SetLike[]): SetLike[][] {
  const xs = [...row].sort((a, b) => a.x - b.x);
  if (xs.length < 2) return xs.length ? [xs] : [];
  const gaps = xs
    .slice(1)
    .map((s, i) => s.x - xs[i].x)
    .sort((a, b) => a - b);
  const step = gaps[0] || 1;
  const runs: SetLike[][] = [[xs[0]]];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i].x - xs[i - 1].x > step * 1.6) runs.push([xs[i]]);
    else runs[runs.length - 1].push(xs[i]);
  }
  return runs;
}

/**
 * @param free  sets free to book (with their price for the chosen day)
 * @param all   every set in the zone — fixes which row counts as "front"
 * @param n     sets wanted
 * @param onlyRow restrict to one row (0 = front), for the upgrade offer
 */
export function bestSets(
  free: readonly SetLike[],
  all: readonly SetLike[],
  n: number,
  onlyRow?: number,
): BestPick | null {
  if (n < 1 || free.length < n) return null;
  const rows = rowsOf(all.length ? all : free);
  const rowIdx = (s: SetLike) => rows.indexOf(Math.round(s.y));
  let best: BestPick | null = null;
  for (const y of rows) {
    const idx = rows.indexOf(y);
    if (onlyRow !== undefined && idx !== onlyRow) continue;
    for (const run of runsInRow(free.filter((s) => Math.round(s.y) === y))) {
      for (let i = 0; i + n <= run.length; i++) {
        const win = run.slice(i, i + n);
        const total = win.reduce((a, s) => a + s.price, 0);
        if (!best || total < best.total || (total === best.total && idx < best.rowIdx))
          best = { ids: win.map((s) => s.id), total, rowIdx: idx, together: true };
      }
    }
  }
  if (best || onlyRow !== undefined) return best;
  // Nothing adjacent: the cheapest, nearest the sea.
  const pick = [...free]
    .sort((a, b) => a.price - b.price || rowIdx(a) - rowIdx(b) || a.x - b.x)
    .slice(0, n);
  return {
    ids: pick.map((s) => s.id),
    total: pick.reduce((a, s) => a + s.price, 0),
    rowIdx: Math.min(...pick.map(rowIdx)),
    together: false,
  };
}
