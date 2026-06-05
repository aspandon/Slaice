import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Input, Field, DatePickerRow, StickyActionBar } from "../../components/ui";
import { chipLabel, todayISO } from "../../data/beach";
import { useApp } from "../../app/store";

/* ============ PARKING ============
   Reserve-and-assign model (SpotHero / airport-parking convention): the guest
   enters a plate and we assign the best free spot near the entrance — the
   barrier camera reads the plate on arrival. No lot map to pick from. */
export function CustomerParking() {
  const { addToCart, toast } = useApp();
  const PRICE = 15;
  const [selDates, setSelDates] = useState([todayISO()]);
  const [plate, setPlate] = useState("");
  const taken = useMemo(() => new Set(["P3", "P7", "P12", "P18", "P21", "P24", "P29", "P33", "P40", "P44", "P47"]), []);
  const freeSpots = useMemo(() => Array.from({ length: 50 }, (_, i) => `P${i + 1}`).filter((s) => !taken.has(s)), [taken]);
  const spot = freeSpots[0]; // best available, nearest the entrance
  const free = freeSpots.length;
  const dayCount = selDates.length;
  const total = PRICE * dayCount;
  const reserve = () => {
    if (!plate.trim()) { toast("Add a vehicle plate so the barrier can recognise you.", { tone: "warn" }); return; }
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      addToCart({ kind: "parking", id: `${spot}@${iso}`, label: `Parking ${spot}`, sub: `${plate} · ${sub}`, price: PRICE });
    });
    toast(`Parking spot ${spot} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
  };

  const perks = [
    { icon: Icon.scan,     title: "Plate recognition",  body: "The barrier camera reads your plate — no ticket, the gate just opens." },
    { icon: Icon.umbrella, title: "Steps from the sand", body: "Shaded lot beside the main entrance, a short walk to every zone." },
    { icon: Icon.qr,       title: "Backup QR",          body: "Can't read the plate? Show the QR from My Bookings at the barrier." },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 pb-28 lg:pb-0">
      <div className="space-y-4 min-w-0">
        <Card className="glass-card-solid p-5 relative overflow-hidden">
          <div aria-hidden className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-300/35 to-transparent blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slaice-500 to-slaice-700 text-white grid place-items-center shadow-sm shrink-0"><Icon.car size={22} /></span>
            <div className="min-w-0">
              <div className="font-display font-bold text-navy-900 text-xl">Parking spot</div>
              <div className="text-[12.5px] text-slate-600">Reserve a spot by the entrance — we assign it and the gate reads your plate. €{PRICE}/spot/day · {free} of 50 free.</div>
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
          <Field label="Vehicle plate" hint="Used by the gate camera to let you in automatically — required.">
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. ΙΖΡ-1234" className="uppercase tnum" />
          </Field>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            {perks.map((p, i) => (
              <div key={i} className="rounded-xl ring-1 ring-slate-200 bg-white/70 p-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-slaice-700 grid place-items-center mb-2"><p.icon size={16} /></span>
                <div className="text-[13px] font-semibold text-navy-900">{p.title}</div>
                <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{p.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-4 h-max">
        <Card className="glass-card-solid p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Your parking</div>
          {/* Assigned-spot hero so the guest sees their spot code at a glance. */}
          <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 text-white p-4 mb-3 relative overflow-hidden">
            <div aria-hidden className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/5 blur-2xl" />
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold flex items-center gap-1.5"><Icon.bolt size={12} /> Assigned spot</div>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shrink-0"><Icon.car size={20} /></span>
              <span className="font-display font-bold text-3xl tnum">{spot}</span>
              <span className="ml-auto text-[11px] text-white/70 text-right leading-tight">near the<br />entrance</span>
            </div>
          </div>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between"><span className="text-slate-600">Plate</span><span className="font-semibold text-navy-900 tnum">{plate || "—"}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">Days</span><span className="font-semibold text-navy-900 tnum">{dayCount}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-sm"><span className="text-slate-600">1 spot × {dayCount} day{dayCount > 1 ? "s" : ""}</span><span className="font-bold text-navy-900 tnum text-lg">€{total}</span></div>
          <Btn variant="teal" full size="lg" className="mt-3" disabled={!plate.trim()} onClick={reserve}>{!plate.trim() ? "Enter your plate" : `Add ${dayCount}×€${PRICE} to basket`}</Btn>
          {!plate.trim() && <div className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1"><Icon.info size={12} /> A plate is required — the barrier reads it on arrival.</div>}
          <div className="mt-2 text-center text-[11px] text-slate-500">Spot &amp; QR saved to My Bookings · Secured by Stripe</div>
        </Card>
      </div>

      {/* Mobile: plate + CTA reachable without scrolling. */}
      <StickyActionBar>
        <div className="flex items-center gap-2">
          <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="Plate e.g. ΙΖΡ-1234" className="uppercase tnum flex-1 min-w-0" aria-label="Vehicle plate" />
          <Btn variant="teal" size="md" disabled={!plate.trim()} onClick={reserve}>{plate.trim() ? `€${total}` : "Add"}</Btn>
        </div>
      </StickyActionBar>
    </div>
  );
}
