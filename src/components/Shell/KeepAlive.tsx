import { Suspense, type ReactNode } from "react";

/* ============ Keep visited tabs ready (AENR-841) ============
   A guest tab the guest has opened stays mounted when they move on — its state, its scroll and
   its images intact — so coming back is instant instead of a fresh render. A hidden tab must cost
   nothing while it waits, so it is *frozen*, not just hidden: the store changes on almost every
   tap, and a hidden tree would re-render with it. `Freeze` suspends it on purpose — React then
   hides it (display: none), keeps its state and skips it on every render until it shows again.
   React 18 has no <Activity>; this is the same idea built from Suspense (as react-freeze does).
   Its layout effects pause while hidden and run again on return, so entrance animations replay. */

// Never settles: a frozen tab stays suspended until `freeze` turns false and React renders it again.
const never: Promise<never> = new Promise(() => undefined);

function Suspender({ freeze, children }: { freeze: boolean; children: ReactNode }) {
  if (freeze) throw never;
  return <>{children}</>;
}

/** Keeps `children` mounted but hidden and inert while `freeze` is true. Only freeze a tree that
 *  has already rendered once (a first render while frozen shows nothing until it thaws). */
export function Freeze({ freeze, children }: { freeze: boolean; children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Suspender freeze={freeze}>{children}</Suspender>
    </Suspense>
  );
}
