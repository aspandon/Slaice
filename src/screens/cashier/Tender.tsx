import { useEffect, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { Btn, Field, Input, Modal, Spinner } from "../../components/ui";
import type { PosTerminal } from "../../domain/finance";
import { OFFLINE_CARD_CAP, OFFLINE_CARD_TOTAL, eur, offlineCardCheck, paidSoFar, r2, type Tender, type TenderKind, type TillSale } from "../../domain/till";

/* ============ Tender ============
   Card (the amount is pushed from the till to the terminal — never typed on
   the terminal), cash with quick-tender buttons and change, voucher / gift
   card as a tender, and any split of the three. "Remaining to pay" is always
   visible; Cancel returns to the basket with the sets still held. */
type CardPhase = "idle" | "waiting" | "processing" | "declined" | "timeout";
type Outcome = "approve" | "decline" | "timeout";
const METHODS: { k: TenderKind; l: string; icon: typeof Icon.card }[] = [
  { k: "card", l: "Card", icon: Icon.card },
  { k: "cash", l: "Cash", icon: Icon.cash },
  { k: "voucher", l: "Voucher", icon: Icon.gift },
];
const CARDS = ["4242", "1881", "0005", "7310"];

export function TenderModal({ total, initial, offline, offlineSales, vouchers, onCancel, onPaid, terminals = [], terminal, onTerminal }: {
  /** POS terminals the card can be sent to (AENR-527); the last used is remembered. */
  terminals?: PosTerminal[];
  terminal?: string;
  onTerminal?: (id: string) => void;
  total: number;
  initial: TenderKind;
  offline: boolean;
  offlineSales: TillSale[];
  vouchers: Record<string, number>;
  onCancel: (taken: Tender[]) => void;
  onPaid: (tenders: Tender[]) => void;
}) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [method, setMethod] = useState<TenderKind>(initial);
  const paid = paidSoFar(tenders);
  const remaining = r2(Math.max(0, total - paid));
  const [amount, setAmount] = useState(String(total));
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [outcome, setOutcome] = useState<Outcome>("approve");
  const [termId, setTermId] = useState(() => terminals.find((x) => x.id === terminal && x.online)?.id ?? terminals.find((x) => x.online)?.id ?? "");
  const term = terminals.find((x) => x.id === termId);
  const [given, setGiven] = useState("");
  const [code, setCode] = useState("");
  const [vErr, setVErr] = useState("");
  const [finishing, setFinishing] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const amt = Math.min(remaining, Math.max(0, Number(amount) || 0));
  const add = (t: Tender) => {
    const next = [...tenders, t];
    setTenders(next);
    const left = r2(total - paidSoFar(next));
    setAmount(String(Math.max(0, left)));
    setGiven("");
    if (left <= 0) {
      setFinishing(true);
      later(offline ? 400 : 900, () => onPaid(next));
    }
  };

  /* Card */
  const cardBlock = offline ? offlineCardCheck(amt, offlineSales) : null;
  const sendToTerminal = () => {
    setPhase("waiting");
    later(1100, () => {
      if (outcome === "timeout") return setPhase("timeout");
      setPhase("processing");
      later(900, () => {
        if (outcome === "decline") return setPhase("declined");
        setPhase("idle");
        add({ kind: "card", amount: amt, ref: CARDS[tenders.length % CARDS.length], terminal: term?.name });
        if (termId) onTerminal?.(termId);
      });
    });
  };

  /* Cash */
  const givenN = Number(given) || 0;
  const cashOk = amt > 0 && (given === "" || givenN >= amt);
  const takeCash = (g = givenN || amt) => add({ kind: "cash", amount: amt, given: Math.max(g, amt) });

  /* Voucher */
  const applyVoucher = () => {
    const c = code.trim().toUpperCase();
    if (!(c in vouchers)) return setVErr(`“${c}” isn’t a valid voucher.`);
    const used = tenders.filter((t) => t.kind === "voucher" && t.ref === c).reduce((a, t) => a + t.amount, 0);
    const bal = r2(vouchers[c] - used);
    if (bal <= 0) return setVErr(`${c} has no balance left.`);
    const take = Math.min(bal, remaining);
    setVErr("");
    setCode("");
    add({ kind: "voucher", amount: take, ref: c });
  };

  const busy = phase === "waiting" || phase === "processing" || finishing;
  return (
    <Modal open onClose={() => !busy && onCancel(tenders)} title="Take payment"
      footer={<Btn variant="ghost" disabled={busy} onClick={() => onCancel(tenders)}>Back to basket</Btn>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Total", total], ["Paid", paid], ["Remaining", remaining]].map(([l, v]) => (
            <div key={l} className={`rounded-xl px-2 py-2 ring-1 ${l === "Remaining" ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 ring-slate-200"}`}>
              <div className={`text-[11px] ${l === "Remaining" ? "text-white/70" : "text-slate-500"}`}>{l}</div>
              <div className="font-display text-xl font-bold tnum" aria-live={l === "Remaining" ? "polite" : undefined}>{eur(Number(v))}</div>
            </div>
          ))}
        </div>
        {offline && (
          <div className="rounded-xl bg-amber-50 text-amber-900 ring-1 ring-amber-600/20 px-3 py-2 text-[12.5px] flex items-start gap-2">
            <Icon.wifiOff size={14} className="mt-0.5 shrink-0" />
            <span>Offline: card works up to <b>€{OFFLINE_CARD_CAP}</b> a sale (€{OFFLINE_CARD_TOTAL} in total until reconnect) — take cash or a voucher for more. The ΑΠΥ is issued on the till and sent to myDATA on reconnect.</span>
          </div>
        )}
        {tenders.length > 0 && (
          <ul className="text-[12.5px] space-y-1">
            {tenders.map((t, i) => (
              <li key={i} className="flex justify-between rounded-lg bg-emerald-50 text-emerald-800 px-3 py-1.5">
                <span className="flex items-center gap-1.5"><Icon.checkCircle size={13} /> {t.kind === "card" ? `Card ···· ${t.ref}${t.terminal ? ` · ${t.terminal.split(" · ")[0]}` : ""}` : t.kind === "cash" ? `Cash (received ${eur(t.given ?? t.amount)})` : `Voucher ${t.ref}`}</span>
                <span className="tnum font-semibold">{eur(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}

        {finishing ? (
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-5 text-center" role="status">
            <Spinner />
            <div className="mt-2 font-semibold text-navy-900">{offline ? "Issuing ΑΠΥ locally…" : "Transmitting ΑΠΥ to myDATA…"}</div>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1.5">
              {METHODS.map((m) => (
                <button key={m.k} type="button" role="radio" aria-checked={method === m.k} disabled={busy} onClick={() => setMethod(m.k)}
                  className={`min-h-[48px] rounded-xl ring-1 font-semibold text-sm flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${method === m.k ? "bg-navy-900 text-white ring-navy-900" : "bg-white/70 ring-slate-200 text-navy-900 hover:bg-white"}`}>
                  <m.icon size={16} />{m.l}
                </button>
              ))}
            </div>

            {method !== "voucher" && (
              <Field label={method === "card" ? "Amount to charge on the card" : "Amount to pay in cash"} hint={tenders.length === 0 && remaining === total ? "Lower it to split the payment." : undefined}>
                <Input type="number" inputMode="decimal" min={0} max={remaining} step="0.5" value={amount} disabled={busy} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            )}

            {method === "card" && (
              <div className="space-y-3">
                {phase === "idle" && (
                  <>
                    {terminals.length > 0 && (
                      <div role="radiogroup" aria-label="POS terminal" className="grid gap-1.5">
                        {terminals.map((x) => (
                          <label key={x.id} className={`flex items-center gap-2 rounded-xl ring-1 px-3 py-2 text-[13px] ${!x.online ? "opacity-50 cursor-not-allowed ring-slate-200" : termId === x.id ? "ring-2 ring-navy-900 bg-white" : "ring-slate-200 bg-white/70 cursor-pointer"}`}>
                            <input type="radio" name="terminal" className="accent-teal-600" disabled={!x.online} checked={termId === x.id} onChange={() => setTermId(x.id)} />
                            <span className="flex-1 font-semibold text-navy-900">{x.name}</span>
                            <span className={`text-[11px] font-semibold ${x.online ? "text-emerald-700" : "text-rose-700"}`}>{x.online ? "Online" : "Offline"}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <fieldset className="rounded-xl ring-1 ring-dashed ring-slate-300 px-3 py-2">
                      <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Demo · terminal outcome</legend>
                      <div className="flex flex-wrap gap-3 text-[13px]">
                        {(["approve", "decline", "timeout"] as Outcome[]).map((o) => (
                          <label key={o} className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} className="accent-teal-600" />
                            {o === "approve" ? "Approve" : o === "decline" ? "Decline" : "Time out"}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {cardBlock && <div role="alert" className="rounded-xl bg-amber-50 ring-1 ring-amber-600/20 text-amber-800 text-[12.5px] px-3 py-2 flex gap-2"><Icon.alert size={14} className="shrink-0 mt-0.5" />{cardBlock}</div>}
                    <Btn variant="teal" size="lg" full icon={Icon.card} disabled={amt <= 0 || !!cardBlock || (terminals.length > 0 && !term)} onClick={sendToTerminal}>Send {eur(amt)} to {term ? term.name.split(" · ")[0] : "terminal"}</Btn>
                  </>
                )}
                {(phase === "waiting" || phase === "processing") && (
                  <div className="rounded-2xl bg-sky-50 ring-1 ring-sky-600/20 p-5 text-center" role="status">
                    <Spinner />
                    <div className="mt-2 font-semibold text-navy-900">{phase === "waiting" ? `Present card on ${term ? term.name : "the terminal"} · ${eur(amt)}` : "Processing…"}</div>
                    <div className="text-[12px] text-slate-500">Stripe Terminal (simulated)</div>
                  </div>
                )}
                {(phase === "declined" || phase === "timeout") && (
                  <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-600/20 p-4" role="alert">
                    <div className="font-semibold text-rose-800 flex items-center gap-2"><Icon.alert size={16} />{phase === "declined" ? "Card declined — insufficient funds (51)" : "Terminal didn’t respond — timed out"}</div>
                    <div className="text-[12.5px] text-rose-700/90 mt-0.5">Nothing was charged. The sets stay on hold while you retry.</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn size="sm" variant="primary" icon={Icon.refund} onClick={() => { setOutcome("approve"); setPhase("idle"); }}>Retry</Btn>
                      <Btn size="sm" variant="outline" icon={Icon.cash} onClick={() => { setPhase("idle"); setMethod("cash"); }}>Pay cash</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => onCancel(tenders)}>Cancel sale</Btn>
                    </div>
                  </div>
                )}
              </div>
            )}

            {method === "cash" && (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (cashOk) takeCash(); }}>
                <div className="grid grid-cols-4 gap-1.5">
                  {[["Exact", amt], ["€20", 20], ["€50", 50], ["€100", 100]].map(([l, v]) => (
                    <button key={l} type="button" disabled={Number(v) < amt || amt <= 0} onClick={() => takeCash(Number(v))}
                      className="min-h-[48px] rounded-xl ring-1 ring-slate-200 bg-white/70 font-semibold text-navy-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                      {l}
                    </button>
                  ))}
                </div>
                <Field label="Cash received (other amount)">
                  <Input type="number" inputMode="decimal" min={0} step="0.5" value={given} onChange={(e) => setGiven(e.target.value)} placeholder={String(amt)} />
                </Field>
                {given !== "" && (
                  <div className={`text-sm font-semibold ${givenN >= amt ? "text-emerald-700" : "text-rose-700"}`} role="status">
                    {givenN >= amt ? `Change due ${eur(givenN - amt)}` : `${eur(amt - givenN)} short`}
                  </div>
                )}
                <Btn type="submit" variant="teal" size="lg" full icon={Icon.cash} disabled={!cashOk}>Take {eur(amt)} cash</Btn>
              </form>
            )}

            {method === "voucher" && (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) applyVoucher(); }}>
                <Field label="Voucher or gift-card code" hint="Scan it or type it — e.g. GIFT-20">
                  <Input value={code} onChange={(e) => { setCode(e.target.value); setVErr(""); }} aria-invalid={!!vErr} autoComplete="off" />
                </Field>
                {vErr && <div role="alert" className="text-[12.5px] text-rose-700">{vErr}</div>}
                <Btn type="submit" variant="teal" full icon={Icon.gift} disabled={!code.trim()}>Apply voucher</Btn>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
