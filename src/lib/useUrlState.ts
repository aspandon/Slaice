import { useState } from "react";
import type { SortState } from "../components/TableTools";
import { readHashQuery, writeHashQuery } from "../app/router";

/** A string kept in the page's URL query (#/persona/page?key=value), so a list's
 *  tab, sort and page survive a refresh and can be shared (AENR-551). The
 *  default value is left out of the URL. */
export function useUrlState(key: string, def: string): [string, (v: string) => void] {
  const [v, setV] = useState(() => readHashQuery().get(key) ?? def);
  const set = (next: string) => {
    setV(next);
    writeHashQuery(next === def ? {} : { [key]: next }, [key]);
  };
  return [v, set];
}

/** Sort and page of an index table, kept in the URL (?sort=-amount&page=2). */
export function useListUrl() {
  const [s, setS] = useUrlState("sort", "");
  const [p, setP] = useUrlState("page", "1");
  const sort: SortState = s ? { key: s.replace(/^-/, ""), dir: s.startsWith("-") ? -1 : 1 } : null;
  const setSort = (u: SortState | ((x: SortState) => SortState)) => {
    const n = typeof u === "function" ? u(sort) : u;
    setS(n ? `${n.dir === -1 ? "-" : ""}${n.key}` : "");
  };
  const page = Math.max(0, (parseInt(p, 10) || 1) - 1);
  const setPage = (n: number) => setP(String(n + 1));
  return { sort, setSort, page, setPage };
}
