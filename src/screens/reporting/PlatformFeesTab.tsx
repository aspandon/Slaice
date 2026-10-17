import { useMemo } from "react";
import { Icon } from "../../lib/icons";
import { Btn, Card, EmptyState, StatCard, Table } from "../../components/ui";
import { useApp } from "../../app/store";
import { rangeInput } from "../../data/economics";
import {
  SERVICE_LABEL,
  aggregate,
  eur,
  monthLabel,
  pct,
  rateLabel,
  type CommercialTerms,
  type EconTotals,
} from "../../domain/economics";
import type { DateRange } from "../../domain/period";
import type { CsvSection } from "../../lib/download";
import { useSiteTerms } from "../../lib/useEconomics";
import { FeeModelNote } from "./FinanceTabs";

/* ============ Reports › Sales › Platform fees (AENR-725) ============
   What Slaice takes from the beach's online bookings in the period: the
   commission per service (minimums applied), the guest service fees, the
   corporate tax re-billed at month end — by service and by month. Same
   figures as the accountant's Slaice statement; staff only. */

const int = (n: number) => Math.round(n).toLocaleString("en-GB");
const monthsIn = (r: DateRange) => {
  const out: DateRange[] = [];
  let m = r.from.slice(0, 7);
  while (m <= r.to.slice(0, 7)) {
    const [y, mm] = m.split("-").map(Number);
    const end = new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
    out.push({ from: `${m}-01` > r.from ? `${m}-01` : r.from, to: end < r.to ? end : r.to });
    m = new Date(Date.UTC(y, mm, 1)).toISOString().slice(0, 7);
  }
  return out;
};

export interface PlatformFeesData {
  terms: CommercialTerms;
  total: EconTotals;
  corporateTax: number;
  months: {
    month: string;
    label: string;
    range: DateRange;
    econ: EconTotals;
    corporateTax: number;
  }[];
}
export function usePlatformFees(range: DateRange): PlatformFeesData {
  const { account } = useApp();
  const terms = useSiteTerms();
  return useMemo(() => {
    const ct = (e: EconTotals) => Math.round(e.commission * terms.corporateTax) / 100;
    const months = monthsIn(range).map((r) => {
      const econ = aggregate(rangeInput(r, null, { placed: account.bookings }), terms);
      return {
        month: r.from.slice(0, 7),
        label: monthLabel(r.from.slice(0, 7)),
        range: r,
        econ,
        corporateTax: ct(econ),
      };
    });
    const total = aggregate(rangeInput(range, null, { placed: account.bookings }), terms);
    return { terms, total, corporateTax: ct(total), months };
  }, [range, terms, account.bookings]);
}

export function platformFeesCsv(d: PlatformFeesData, label: string): CsvSection[] {
  const t = d.total;
  return [
    {
      title: `Platform fees · ${label}`,
      header: ["Metric", "Value"],
      rows: [
        ["Online bookings", Math.round(t.bookings)],
        ["Online sales incl. VAT (€)", t.gross],
        ["Slaice commission (€)", t.commission],
        [
          `Guest service fees (€) — ${d.terms.feeTo === "slaice" ? "kept by Slaice" : "kept by the beach"}`,
          t.fees,
        ],
        [`Corporate tax re-billed ${d.terms.corporateTax}% (€)`, d.corporateTax],
      ],
    },
    {
      title: "By service",
      header: [
        "Service",
        "Online bookings",
        "Online sales (€)",
        "Guest fees (€)",
        "Commission (€)",
        "Rate",
        "Bookings at minimum",
      ],
      rows: [
        ...t.services.map((s) => [
          SERVICE_LABEL[s.service],
          Math.round(s.bookings),
          s.gross,
          s.fees,
          s.commission,
          rateLabel(d.terms.services[s.service]),
          Math.round(s.atMin),
        ]),
        ["Total", Math.round(t.bookings), t.gross, t.fees, t.commission, "", ""],
      ],
    },
    {
      title: "By month",
      header: [
        "Month",
        "Online bookings",
        "Commission (€)",
        "Corporate tax (€)",
        "Charged to the beach (€)",
        "Guest fees (€)",
      ],
      rows: [
        ...d.months.map((m) => [
          m.label,
          Math.round(m.econ.bookings),
          m.econ.commission,
          m.corporateTax,
          Math.round((m.econ.commission + m.corporateTax) * 100) / 100,
          m.econ.fees,
        ]),
        [
          "Total",
          Math.round(t.bookings),
          t.commission,
          d.corporateTax,
          Math.round((t.commission + d.corporateTax) * 100) / 100,
          t.fees,
        ],
      ],
    },
  ];
}

export function PlatformFeesTab({ d, label }: { d: PlatformFeesData; label: string }) {
  const { go } = useApp();
  const t = d.total;
  const s = d.terms.services;
  const atMin = t.services.reduce((a, x) => a + x.atMin, 0);
  if (t.bookings < 0.5)
    return (
      <Card className="p-6">
        <EmptyState
          icon={Icon.umbrella}
          title="No online bookings in this period"
          body={`Nothing was booked online in ${label}, so Slaice took no commission or guest fees.`}
        />
      </Card>
    );
  const used = t.services.filter((x) => x.bookings > 0.0001);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          instant
          tone="indigo"
          label="Slaice commission"
          value={eur(t.commission)}
          sub={`${int(t.bookings)} online bookings · minimum on ${int(atMin)}`}
        />
        <StatCard
          instant
          label="Guest service fees"
          value={eur(t.fees)}
          sub={
            d.terms.feeTo === "slaice"
              ? "paid by guests · kept by Slaice"
              : "paid by guests · kept by you"
          }
        />
        <StatCard
          instant
          tone="amber"
          label="Corporate tax re-billed"
          value={eur(d.corporateTax)}
          sub={`${pct(d.terms.corporateTax)} of the commission · month-end invoice`}
        />
        <StatCard
          instant
          tone="teal"
          label="Effective commission"
          value={pct(t.gross ? Math.round((t.commission / t.gross) * 1000) / 10 : 0)}
          sub={`of ${eur(t.gross)} online sales, VAT incl.`}
        />
      </div>
      <Card className="p-2">
        <h3 className="px-3 pt-3 font-semibold text-navy-900">By service · {label}</h3>
        <p className="px-3 pb-2 text-[12.5px] text-slate-500">
          Each online booking pays the rate on its total for the service
          {d.terms.feesInBase ? ", guest fee included" : ""} — or the minimum when that is more:
          sunbeds {rateLabel(s.sunbeds)}, entry tickets {rateLabel(s.tickets)}.
        </p>
        <Table
          dense
          cols={[
            "Service",
            "Bookings",
            "Online sales",
            "Guest fees",
            "Commission",
            "At minimum",
            "Effective",
          ]}
          right={[1, 2, 3, 4, 5, 6]}
          rows={[
            ...used.map((x) => [
              <b className="text-navy-900">{SERVICE_LABEL[x.service]}</b>,
              int(x.bookings),
              eur(x.gross),
              eur(x.fees),
              <b className="tnum">{eur(x.commission)}</b>,
              int(x.atMin),
              x.gross ? pct(Math.round((x.commission / x.gross) * 1000) / 10) : "—",
            ]),
            [
              <b>Total</b>,
              <b>{int(t.bookings)}</b>,
              <b>{eur(t.gross)}</b>,
              <b>{eur(t.fees)}</b>,
              <b className="tnum">{eur(t.commission)}</b>,
              <b>{int(atMin)}</b>,
              "",
            ],
          ]}
        />
      </Card>
      <Card className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
          <h3 className="font-semibold text-navy-900">By month</h3>
          <Btn size="sm" variant="ghost" icon={Icon.receipt} onClick={() => go("admin", "billing")}>
            Slaice invoices
          </Btn>
        </div>
        <p className="px-3 pb-2 text-[12.5px] text-slate-500">
          Commission is taken from each online payment; the corporate tax on it comes on Slaice's
          month-end invoice.
        </p>
        <Table
          dense
          cols={[
            "Month",
            "Bookings",
            "Commission",
            "Corporate tax",
            "Charged to you",
            "Guest fees",
          ]}
          right={[1, 2, 3, 4, 5]}
          rows={[
            ...d.months.map((m) => [
              m.label,
              int(m.econ.bookings),
              eur(m.econ.commission),
              eur(m.corporateTax),
              <b className="tnum">{eur(m.econ.commission + m.corporateTax)}</b>,
              eur(m.econ.fees),
            ]),
            ...(d.months.length > 1
              ? [
                  [
                    <b>Total</b>,
                    <b>{int(t.bookings)}</b>,
                    <b>{eur(t.commission)}</b>,
                    <b>{eur(d.corporateTax)}</b>,
                    <b className="tnum">{eur(t.commission + d.corporateTax)}</b>,
                    <b>{eur(t.fees)}</b>,
                  ],
                ]
              : []),
          ]}
        />
      </Card>
      <FeeModelNote terms={d.terms} />
    </div>
  );
}
