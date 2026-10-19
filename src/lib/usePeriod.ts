import { useCallback, useState } from "react";
import type { Period } from "../domain/period";
import { periodFromParams, periodToParams } from "../domain/period";
import { readHashQuery, writeHashQuery } from "../app/router";

/** A page's selected period, kept in the URL (`?period=month`, `?from=…&to=…`)
 *  so a refresh or a shared link shows the same dates. */
export function usePeriod(fallback: Period): [Period, (p: Period) => void] {
  const [period, setState] = useState<Period>(() => periodFromParams(readHashQuery(), fallback));
  const setPeriod = useCallback((p: Period) => {
    setState(p);
    writeHashQuery(periodToParams(p), ["period", "from", "to"]);
  }, []);
  return [period, setPeriod];
}
