import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Stepper, DatePickerRow, StickyActionBar } from "../../components/ui";
import { chipLabel, todayISO } from "../../data/beach";
import { LOCKER_PRICE } from "../../domain/pricing";
import { useApp } from "../../app/store";

/* Deterministic 4-digit access PIN for a locker code — stable per id so the
   same locker always shows the same PIN (demo only). */
function lockerPin(id: string) {
  const n = (id.charCodeAt(0) * 137 + parseInt(id.slice(1), 10) * 911) % 9000 + 1000;
  return String(n);
}

/* ============ DAY LOCKER ============
   Reserve-and-assign model (luggage-storage / gym-locker convention): the guest
   chooses how many lockers and which days — the system assigns the locker codes
   and access PINs. No floor map to hunt through. */
export function CustomerLocker() {
  const { addToCart, toast } = useApp();
  const PRICE = LOCKER_PRICE;
  const [selDates, setSelDates] = useState([todayISO()]);
  const [qty, setQty] = useState(1);
  // Free-locker pool (same occupancy rule as before) — we assign the next N
  // free codes rather than make the guest pick one off a grid.
  const freeCodes = useMemo(() => {
    const arr: string[] = [];
    ["A", "B", "C", "D", "E"].forEach((bk) => {
      for (let i = 1; i <= 20; i++) {
        if ((bk.charCodeAt(0) + i * 7) % 5 !== 0) arr.push(`${bk}${String(i).padStart(2, "0")}`);
      }
    });
    return arr;
  }, []);
  const free = freeCodes.length;
  const assigned = useMemo(() => freeCodes.slice(0, qty), [freeCodes, qty]);
  const dayCount = selDates.length;
  const total = qty * PRICE * dayCount;
  const reserve = () => {
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      assigned.forEach((id) => addToCart({ kind: "locker", id: `${id}@${iso}`, label: `Locker ${id}`, sub: `PIN ${lockerPin(id)} · ${sub}`, price: PRICE }));
    });
    toast(`${qty} locker${qty > 1 ? "s" : ""} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
  };

  const perks = [
    { icon: Icon.lock,  title: "Secure & private",   body: "Steel day locker by the beach bar — fits two beach bags, a tablet and your valuables." },
    { icon: Icon.qr,    title: "Open with QR or PIN", body: "Unlock from your phone; we also assign a backup 4-digit PIN, shown on the right." },
    { icon: Icon.clock, title: "All-day access",      body: "Come and go as you like until closing — re-lock it between swims." },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 pb-28 lg:pb-0">
      <div className="space-y-4 min-w-0">
        <Card className="glass-card-solid p-5 relative overflow-hidden">
          <div aria-hidden className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-teal-300/35 to-transparent blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white grid place-items-center shadow-sm shrink-0"><Icon.lock size={22} /></span>
            <div className="min-w-0">
              <div className="font-display font-bold text-navy-900 text-xl">Day locker</div>
              <div className="text-[12.5px] text-slate-600">Keep your phone, keys and valuables safe while you swim. €{PRICE}/locker/day · {free} free today.</div>
            </div>
          </div>
        </Card>

        <Card className="glass-card-solid p-4 overflow-visible">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
            <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
          </div>
          <DatePickerRow value={selDates} onChange={setSelDates} />
        </Card>

        <Card className="glass-card-solid p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-navy-900">How many lockers?</div>
              <div className="text-[12px] text-slate-600">{qty} × €{PRICE} × {dayCount} day{dayCount > 1 ? "s" : ""} · assigned automatically</div>
            </div>
            <Stepper label="lockers" value={qty} onChange={(v) => setQty(Math.max(1, Math.min(free, v)))} min={1} />
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            {perks.map((p, i) => (
              <div key={i} className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 grid place-items-center mb-2"><p.icon size={16} /></span>
                <div className="text-[13px] font-semibold text-navy-900">{p.title}</div>
                <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{p.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="glass-card-solid p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Your lockers</div>
          <div className="rounded-xl bg-teal-50/70 ring-1 ring-teal-200 px-3 py-2.5 flex items-start gap-2.5 mb-3">
            <Icon.bolt size={15} className="text-teal-700 mt-0.5 shrink-0" />
            <div className="text-[12px] text-teal-900 leading-snug">We auto-assign the next free locker{qty > 1 ? "s" : ""} — your code{qty > 1 ? "s" : ""} &amp; PIN unlock the bank by the beach bar.</div>
          </div>
          <div className="space-y-2">
            {assigned.map((id) => (
              <div key={id} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0 text-navy-900">
                  <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-navy-800 to-navy-950 text-white grid place-items-center shrink-0"><Icon.lock size={16} /></span>
                  <div className="leading-tight min-w-0">
                    <div className="font-semibold text-sm">Locker {id}</div>
                    <div className="text-[11px] text-slate-500 tnum">PIN {lockerPin(id)}</div>
                  </div>
                </div>
                <span className="font-semibold tnum shrink-0">€{PRICE * dayCount}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-600">{qty} locker{qty > 1 ? "s" : ""} × {dayCount} day{dayCount > 1 ? "s" : ""}</span><span className="font-bold text-navy-900 tnum text-lg">€{total}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!qty} onClick={reserve}>Add {qty}×{dayCount} to basket</Btn>
          <div className="mt-2 text-center text-[11px] text-slate-500">Code &amp; PIN saved to My Bookings · Secured by Stripe</div>
        </Card>
      </div>

      {/* Mobile: keep the CTA reachable without scrolling. */}
      <StickyActionBar>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-navy-900 truncate">{qty} locker{qty > 1 ? "s" : ""} · €{total}</div>
            <div className="text-[11px] text-slate-500 truncate tnum">{assigned.join(", ") || "—"}</div>
          </div>
          <Btn variant="teal" size="md" disabled={!qty} onClick={reserve}>Add €{total}</Btn>
        </div>
      </StickyActionBar>
    </div>
  );
}
