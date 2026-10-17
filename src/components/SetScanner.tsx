import { useId, useState } from "react";
import { Icon } from "../lib/icons";
import { Btn } from "./ui";
import { useApp } from "../app/store";
import { ZONES, zoneLayout } from "../data/beach";

/* ---------- Sunbed set scanner (AENR-499 / 527 / 528) ----------
   Finds a set by its QR label (camera simulated — the demo cycles through
   real sample labels, a booking QR and an invalid one) or by typing its code
   (autocomplete, case-insensitive, validated). Booking / ticket QRs are told
   apart from set labels and handed back separately. */

export type ScanHit =
  | { kind: "set"; zoneId: string; setId: string }
  | { kind: "booking"; code: string };

export function useSetLookup() {
  const { beachLayout } = useApp();
  const all = ZONES.flatMap((z) =>
    (beachLayout[z.id] ?? zoneLayout(z)).map((s) => ({ zoneId: z.id, setId: s.id })),
  );
  const find = (raw: string): ScanHit | string => {
    const code = raw.trim().toUpperCase().replace(/^SET:/, "");
    if (!code) return "Enter or scan a code.";
    if (/^#?(BK|TK)-\d+$/.test(code))
      return { kind: "booking", code: code.startsWith("#") ? code : `#${code}` };
    const hit = all.find((x) => x.setId.toUpperCase() === code);
    return hit ? { kind: "set", ...hit } : `“${raw.trim()}” isn’t a sunbed on this beach.`;
  };
  return { all, find };
}

export function SetScanner({
  onHit,
  compact = false,
}: {
  onHit: (h: ScanHit) => void;
  compact?: boolean;
}) {
  const { all, find } = useSetLookup();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [scanning, setScanning] = useState(false);
  const [n, setN] = useState(0);
  const listId = useId();
  const submit = (raw: string) => {
    const r = find(raw);
    if (typeof r === "string") return setErr(r);
    setErr("");
    setCode("");
    onHit(r);
  };
  // Demo camera: cycles sample labels so every path can be shown.
  const scan = () => {
    setScanning(true);
    setErr("");
    window.setTimeout(() => {
      setScanning(false);
      const samples = [
        `SET:${all[(n * 7 + 3) % all.length].setId}`,
        `SET:${all[(n * 11 + 20) % all.length].setId}`,
        "#BK-10428",
        "SET:XX-99",
      ];
      setN((x) => x + 1);
      submit(samples[n % samples.length]);
    }, 900);
  };
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Compact (the Beach page, AENR-699): the viewfinder shows only while scanning, so the
          map starts higher on a phone. */}
      {(!compact || scanning) && (
      <div
        className={`relative mx-auto ${compact ? "w-full h-28" : "w-full max-w-xs h-40"} rounded-2xl ring-2 ring-dashed grid place-items-center overflow-hidden ${scanning ? "ring-teal-500 bg-teal-50" : "ring-teal-400/60 bg-teal-50/40"} text-teal-600`}
      >
        <Icon.qr size={compact ? 36 : 52} />
        {scanning && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-teal-500 shadow-[0_0_8px_#14b8a6]"
            style={{ animation: "setscan 0.9s linear infinite" }}
          />
        )}
        <style>{`@keyframes setscan{0%{top:8px}50%{top:calc(100% - 10px)}100%{top:8px}}`}</style>
      </div>
      )}
      <Btn variant="teal" full icon={Icon.scan} onClick={scan} disabled={scanning}>
        {scanning ? "Scanning…" : "Scan QR (demo camera)"}
      </Btn>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-in`}>
          Sunbed or booking code
        </label>
        <input
          id={`${listId}-in`}
          list={listId}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErr("");
          }}
          placeholder="Type a code, e.g. CE-12"
          autoComplete="off"
          aria-invalid={!!err}
          className="glass-input flex-1 rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-teal-500/70 uppercase placeholder:normal-case"
        />
        <datalist id={listId}>
          {all.map((x) => (
            <option key={x.setId} value={x.setId} />
          ))}
        </datalist>
        <Btn type="submit" variant="outline" disabled={!code.trim()}>
          Find
        </Btn>
      </form>
      {err && (
        <div role="alert" className="text-[12.5px] text-rose-700 flex items-center gap-1.5">
          <Icon.alert size={13} /> {err}
        </div>
      )}
    </div>
  );
}
