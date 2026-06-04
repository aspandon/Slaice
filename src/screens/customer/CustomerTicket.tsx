import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Card, Btn, Badge, PageHead, Stepper, Toggle, Input, Field, DatePickerRow, StickyActionBar } from "../../components/ui";
import { chipLabel, todayISO } from "../../data/beach";
import { useApp } from "../../app/store";

/* ============ ENTRY TICKET ============ */
export function CustomerTicket() {
  const { addToCart, toast } = useApp();
  const cats = [
    { k: "adult", t: "Adult", p: 10, d: "Standard entry" },
    { k: "resident", t: "Alimos resident", p: 6, d: "Proof required at gate" },
    { k: "child", t: "Child (6–12)", p: 5, d: "Under 6 free" },
    { k: "senior", t: "Senior 65+", p: 7, d: "ID required" },
  ];
  const [selDates, setSelDates] = useState([todayISO()]);
  const [qty, setQty] = useState<Record<string, number>>({ adult: 2, resident: 0, child: 1, senior: 0 });
  const [biz, setBiz] = useState(false);
  const [vat, setVat] = useState("");
  const dayCount = selDates.length;
  const perDay = cats.reduce((a, c) => a + c.p * qty[c.k], 0);
  const total = perDay * dayCount;
  const n = Object.values(qty).reduce((a, b) => a + b, 0);
  // Greek ΑΦΜ is 9 digits — only enforced when a B2B invoice (ΤΠΥ) is requested.
  const vatOk = !biz || /^\d{9}$/.test(vat.trim());

  const pay = () => {
    if (biz && !vatOk) { toast("Enter a valid 9-digit ΑΦΜ for the invoice.", { tone: "warn" }); return; }
    selDates.forEach((iso) => {
      const sub = chipLabel(iso).sub;
      cats.forEach((c) => qty[c.k] > 0 && addToCart({ kind: "ticket", id: `${c.k}@${iso}`, label: `${c.t} × ${qty[c.k]}`, sub: `Entry ticket · ${sub}`, price: c.p * qty[c.k] }));
    });
    toast(`${n} ticket${n > 1 ? "s" : ""} × ${dayCount} day${dayCount > 1 ? "s" : ""} added to your basket.`, { tone: "success" });
    setQty({ adult: 0, resident: 0, child: 0, senior: 0 });
  };

  const aboutItems = [
    { icon: Icon.bolt,    title: "Dynamic pricing", body: "Resident, child, senior categories adapt automatically — no coupons needed." },
    { icon: Icon.receipt, title: "ΑΠΥ or ΤΠΥ",      body: "Personal receipt by default; toggle the B2B switch to issue a service invoice with VAT details." },
    { icon: Icon.ticket,  title: "Add at checkout", body: "Tickets can also be bundled during a sunbed booking — same QR at the gate." },
  ];

  return (
    <div className="animate-fade-up space-y-4 max-w-3xl pb-24 lg:pb-0">
      <PageHead title="Entry Ticket" sub="Buy entry for yourself or your group — pricing adapts to each person's category." badge={<Badge tone="mvp">MVP</Badge>} />
      <Card className="glass-card-solid p-5">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Icon.calendar size={13} /> Dates · pick one or more</span>
          <span className="text-slate-600 normal-case tracking-normal">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
        </div>
        <DatePickerRow value={selDates} onChange={setSelDates} />
      </Card>
      <Card className="glass-card-solid p-5 space-y-3">
        {cats.map((c) => (
          <div key={c.k} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-white/70 px-4 py-3">
            <div><div className="font-semibold text-navy-900">{c.t}</div><div className="text-[12px] text-slate-600">€{c.p} · {c.d}</div></div>
            <Stepper label={`${c.t} tickets`} value={qty[c.k]} onChange={(v) => setQty((q) => ({ ...q, [c.k]: v }))} />
          </div>
        ))}

        <div className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <div><div className="font-semibold text-navy-900 text-sm">Need an invoice (ΤΠΥ)?</div><div className="text-[12px] text-slate-600">B2B — issues a service invoice instead of a receipt (ΑΠΥ).</div></div>
            <Toggle on={biz} onChange={setBiz} />
          </div>
          {biz && (
            <div className="grid sm:grid-cols-2 gap-2 mt-3 animate-fade-in">
              <Field label="VAT number (ΑΦΜ)" hint={vat && !vatOk ? undefined : "9 digits"}>
                <Input value={vat} onChange={(e) => setVat(e.target.value.replace(/[^\d]/g, "").slice(0, 9))} inputMode="numeric" placeholder="123456789" aria-invalid={!!(vat && !vatOk)} className={vat && !vatOk ? "ring-2 ring-rose-400" : ""} />
                {vat && !vatOk && <div className="text-[11px] text-rose-600 flex items-center gap-1 mt-1"><Icon.alert size={11} /> ΑΦΜ must be 9 digits.</div>}
              </Field>
              <Field label="Company name"><Input placeholder="Acme Ltd." /></Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-slate-600 text-sm">{n} ticket(s) × {dayCount} day{dayCount > 1 ? "s" : ""}{biz ? " · ΤΠΥ" : " · ΑΠΥ"}</div>
          <div className="text-2xl font-bold font-display text-navy-900 tnum">€{total}</div>
        </div>
        <Btn variant="teal" full size="lg" icon={Icon.card} disabled={!n || !vatOk} onClick={pay}>Add €{total} to basket</Btn>
      </Card>

      {/* "About entry tickets" — now stacked below the main box rather than
          floating in a right-hand panel. Same three items, same footer. */}
      <Card className="glass-card-solid p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Icon.info size={13} /> About entry tickets
        </div>
        <div className="space-y-3">
          {aboutItems.map((it, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0"><it.icon size={15} /></span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-navy-900">{it.title}</div>
                <div className="text-[12.5px] text-slate-600 leading-snug mt-0.5">{it.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500">QR is scanned at the gate by the Controller.</div>
      </Card>
      {/* Mobile: keep the CTA in reach below the category list. */}
      <StickyActionBar>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-navy-900 truncate">{n ? `${n} ticket${n > 1 ? "s" : ""} · €${total}` : "No tickets yet"}</div>
            <div className="text-[11px] text-slate-500">{biz ? "ΤΠΥ invoice" : "ΑΠΥ receipt"} · {dayCount} day{dayCount > 1 ? "s" : ""}</div>
          </div>
          <Btn variant="teal" size="md" icon={Icon.card} disabled={!n || !vatOk} onClick={pay}>Add €{total}</Btn>
        </div>
      </StickyActionBar>
    </div>
  );
}
