import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Discriminated-union async state. Modelling it this way means a consuming
 * screen renders loading / error / success from a single `switch` and the
 * impossible combinations boolean flags allow (`isLoading && isError`) simply
 * cannot be represented.
 */
export type Async<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "error"; data: undefined; error: Error }
  | { status: "success"; data: T; error: undefined };

export type AsyncResult<T> = Async<T> & { refetch: () => void };

/**
 * Dependency-free async data hook. Stale responses are ignored so rapid
 * re-fetches never flash old data, and `refetch` re-runs on demand.
 *
 * This is the seam a real backend slots into later: the `fn` passed in goes
 * from `() => Promise.resolve(mock)` to `() => fetch(...).then(r => r.json())`
 * and not a single call site changes. No database or server is required for it
 * to work today — it simply awaits whatever promise it is handed.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncResult<T> {
  const [state, setState] = useState<Async<T>>({
    status: "loading",
    data: undefined,
    error: undefined,
  });
  const [tick, setTick] = useState(0);

  // Hold the latest fn in a ref so it doesn't need to be an effect dependency
  // (callers usually pass a fresh inline closure each render).
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: undefined, error: undefined });
    fnRef
      .current()
      .then((data) => {
        if (active) setState({ status: "success", data, error: undefined });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            status: "error",
            error: err instanceof Error ? err : new Error(String(err)),
            data: undefined,
          });
        }
      });
    return () => {
      active = false;
    };
    // `tick` drives manual refetches; `deps` are the caller's inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}
