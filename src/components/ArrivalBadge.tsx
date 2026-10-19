import { Badge } from "./ui";
import { ARRIVAL_LABEL, arrivalProgress, arrivalStage, type EntryState } from "../domain/entry";

const TONE = { expected: "slate", inProgress: "amber", arrived: "green" } as const;

/* Where a booking's group stands at the gate (follow-up to AENR-715): Expected,
   In progress · 2 of 4 entries · 1 of 2 sets, or Arrived. Staff and guest screens
   share it; guest screens pass `t`. */
export function ArrivalBadge({
  st,
  t = (x) => x,
  detail = true,
}: {
  st: EntryState;
  t?: (x: string) => string;
  /** Show what has come in next to In progress (off where space is tight). */
  detail?: boolean;
}) {
  const stage = arrivalStage(st);
  const label = t(ARRIVAL_LABEL[stage]);
  const extra =
    stage === "inProgress" && detail
      ? ` · ${arrivalProgress(st, t)}`
      : stage === "arrived" && st.total > 1
        ? ` · ${st.total}`
        : "";
  return (
    <Badge tone={TONE[stage]}>
      {label}
      {extra}
    </Badge>
  );
}
