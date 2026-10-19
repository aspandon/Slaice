import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Field, Modal, Select, Table } from "../../components/ui";
import { parseCSV } from "../../lib/csv";
import type { Customer } from "../../domain/types";

/* ============ Guest list power tools (AENR-476) ============
   CSV import with column mapping, preview and duplicate detection, and the
   duplicate-merge helper. Everything runs in the browser. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = [
  { k: "first", l: "First name", guess: /^(first|first.?name|name|όνομα)$/i },
  { k: "last", l: "Surname", guess: /^(last|last.?name|surname|επώνυμο)$/i },
  { k: "email", l: "E-mail", guess: /^(e-?mail|email.?address)$/i },
  { k: "phone", l: "Phone", guess: /^(phone|mobile|tel|τηλέφωνο)/i },
] as const;
type MapKey = (typeof FIELDS)[number]["k"];
const normPhone = (p: string) => p.replace(/[^\d+]/g, "");

export interface ImportRow {
  first: string;
  last: string;
  email: string;
  phone: string;
  dupOf: number | null;
  error: string | null;
}

/** Two guests are likely the same person when e-mail or phone match. */
export function duplicateOf(
  c: Pick<Customer, "email" | "phone">,
  list: Customer[],
  selfId?: number,
): Customer | null {
  const e = c.email.trim().toLowerCase();
  const p = normPhone(c.phone);
  return (
    list.find(
      (x) =>
        x.id !== selfId &&
        ((e && x.email.toLowerCase() === e) || (p.length > 6 && normPhone(x.phone) === p)),
    ) ?? null
  );
}

export function ImportModal({
  existing,
  onClose,
  onImport,
}: {
  existing: Customer[];
  onClose: () => void;
  onImport: (rows: ImportRow[], mergeDuplicates: boolean) => void;
}) {
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [map, setMap] = useState<Record<MapKey, number>>({
    first: -1,
    last: -1,
    email: -1,
    phone: -1,
  });
  const [merge, setMerge] = useState(true);
  const [err, setErr] = useState("");

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setErr("");
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      setErr("Choose a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result ?? ""));
      if (rows.length < 2) {
        setErr("The file has no data rows.");
        return;
      }
      setFileName(f.name);
      setTable(rows);
      const head = rows[0];
      setMap(
        Object.fromEntries(
          FIELDS.map((fd) => [fd.k, head.findIndex((h) => fd.guess.test(h.trim()))]),
        ) as Record<MapKey, number>,
      );
    };
    reader.readAsText(f);
  };
  const sample = () => {
    const csv =
      "First name,Surname,Email,Phone\nAnna,Mavridi,anna.mavridi@example.com,+30 694 100 0012\nLeonidas,Karras,l.karras@example.com,+30 697 555 0101\nIrene,Doukas,irene.d@example,+30 697 555 0102\nPetros,Nikolaou,petros.nikolaou@example.com,+30 694 100 0011";
    onFile(new File([csv], "guests-sample.csv", { type: "text/csv" }));
  };
  const rows: ImportRow[] = table
    ? table.slice(1).map((r) => {
        const v = (k: MapKey) => (map[k] >= 0 ? (r[map[k]] ?? "").trim() : "");
        const row = { first: v("first"), last: v("last"), email: v("email"), phone: v("phone") };
        const error = !row.first
          ? "Missing first name"
          : row.email && !EMAIL_RE.test(row.email)
            ? "Invalid e-mail"
            : !row.email && !row.phone
              ? "Needs e-mail or phone"
              : null;
        return { ...row, error, dupOf: duplicateOf(row, existing)?.id ?? null };
      })
    : [];
  const ok = rows.filter((r) => !r.error);
  const dups = ok.filter((r) => r.dupOf !== null);
  const mappingOk = map.first >= 0 && (map.email >= 0 || map.phone >= 0);

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Import guests from CSV"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.check}
            disabled={!table || !mappingOk || ok.length === 0}
            onClick={() => onImport(ok, merge)}
          >
            Import {ok.length || ""} guest{ok.length === 1 ? "" : "s"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {!table ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center">
            <Icon.upload size={22} className="mx-auto text-slate-400" />
            <div className="mt-2 text-sm text-slate-600">
              Choose a CSV with a header row (first name, surname, e-mail, phone).
            </div>
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold bg-navy-900 text-white cursor-pointer">
                Choose file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
              <Btn variant="outline" onClick={sample}>
                Use a sample file
              </Btn>
            </div>
            {err && (
              <div role="alert" className="mt-2 text-[12px] text-rose-700">
                {err}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-[13px] text-slate-600">
              <b className="text-navy-900">{fileName}</b> · {table.length - 1} rows
            </div>
            <div>
              <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Map columns</div>
              <div className="grid sm:grid-cols-4 gap-2">
                {FIELDS.map((f) => (
                  <Field key={f.k} label={f.l}>
                    <Select
                      value={String(map[f.k])}
                      onChange={(e) => setMap((m) => ({ ...m, [f.k]: Number(e.target.value) }))}
                      options={[
                        { v: "-1", l: "— not in file —" },
                        ...table[0].map((h, i) => ({ v: String(i), l: h || `Column ${i + 1}` })),
                      ]}
                    />
                  </Field>
                ))}
              </div>
              {!mappingOk && (
                <div role="alert" className="text-[12px] text-rose-700 mt-1">
                  Map at least First name and E-mail or Phone.
                </div>
              )}
            </div>
            <div>
              <div className="text-[12px] font-semibold text-slate-700 mb-1.5">Preview</div>
              <Table
                dense
                cols={["First name", "Surname", "E-mail", "Phone", "Check"]}
                rows={rows
                  .slice(0, 8)
                  .map((r) => [
                    r.first || "—",
                    r.last || "—",
                    r.email || "—",
                    r.phone || "—",
                    r.error ? (
                      <Badge tone="red">{r.error}</Badge>
                    ) : r.dupOf !== null ? (
                      <Badge tone="amber">Possible duplicate</Badge>
                    ) : (
                      <Badge tone="green">Ready</Badge>
                    ),
                  ])}
              />
              {rows.length > 8 && (
                <div className="text-[11.5px] text-slate-500 mt-1">…and {rows.length - 8} more</div>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-[13px] text-slate-700 space-y-1">
              <div>
                <b className="text-navy-900">{ok.length}</b> ready to import
                {rows.length - ok.length ? (
                  <>
                    {" "}
                    · <b className="text-rose-700">{rows.length - ok.length}</b> skipped (errors)
                  </>
                ) : null}
              </div>
              {dups.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={merge}
                    onChange={(e) => setMerge(e.target.checked)}
                    className="w-4 h-4 accent-teal-600"
                  />
                  Merge {dups.length} possible duplicate{dups.length === 1 ? "" : "s"} into the
                  existing guest (otherwise they're added as new guests)
                </label>
              )}
            </div>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => {
                setTable(null);
                setFileName("");
              }}
            >
              Choose another file
            </Btn>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Merge two guest records: keep the primary, add the other's visits, spend and tags. */
export function mergeGuests(primary: Customer, other: Customer): Customer {
  return {
    ...primary,
    phone: primary.phone || other.phone,
    email: primary.email || other.email,
    bookings: primary.bookings + other.bookings,
    spend: primary.spend + other.spend,
    tags: [...new Set([...primary.tags, ...other.tags])],
  };
}

export function MergeModal({
  pairs,
  onClose,
  onMerge,
}: {
  pairs: [Customer, Customer][];
  onClose: () => void;
  onMerge: (keep: Customer, drop: Customer) => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Possible duplicates"
      footer={
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
      }
    >
      {pairs.length === 0 ? (
        <div className="text-sm text-slate-600">
          No likely duplicates — every guest has a unique e-mail and phone.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            These guests share an e-mail or phone number. Merging keeps the first record and adds
            the other's visits, spend and tags.
          </p>
          {pairs.map(([a, b]) => (
            <div
              key={`${a.id}-${b.id}`}
              className="rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2.5 flex flex-wrap items-center gap-3"
            >
              <div className="text-[13px] min-w-0 flex-1">
                <b className="text-navy-900">
                  {a.first} {a.last}
                </b>{" "}
                <span className="text-slate-500">
                  · {a.email} · {a.bookings} visits
                </span>
              </div>
              <Icon.arrowL size={14} className="text-slate-400" />
              <div className="text-[13px] min-w-0 flex-1">
                <b className="text-navy-900">
                  {b.first} {b.last}
                </b>{" "}
                <span className="text-slate-500">
                  · {b.email} · {b.bookings} visits
                </span>
              </div>
              <Btn size="sm" variant="outline" onClick={() => onMerge(a, b)}>
                Merge
              </Btn>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
