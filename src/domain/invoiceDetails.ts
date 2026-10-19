// A guest's invoice details (AENR-714): what a Greek B2B invoice (ΤΠΥ) needs
// instead of a retail receipt — company name, ΑΦΜ, ΔΟΥ, business activity and
// the billing address — plus the e-mail it is sent to. Outside Greece the VAT
// number carries its country prefix and there is no tax office.

export interface InvoiceDetails {
  company: string;
  /** ΑΦΜ in Greece (9 digits, optional EL prefix); the EU VAT number elsewhere. */
  vatNo: string;
  /** ΔΟΥ — Greek tax office; not asked outside Greece. */
  taxOffice: string;
  /** Επάγγελμα — the business activity printed on the invoice. */
  activity: string;
  street: string;
  postcode: string;
  city: string;
  /** ISO country code. */
  country: string;
  email: string;
}

export const INVOICE_COUNTRIES: readonly [string, string][] = [
  ["GR", "Greece"],
  ["CY", "Cyprus"],
  ["AT", "Austria"],
  ["BE", "Belgium"],
  ["BG", "Bulgaria"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["IT", "Italy"],
  ["NL", "Netherlands"],
  ["RO", "Romania"],
  ["ES", "Spain"],
  ["XX", "Other country"],
];

export const emptyInvoice = (email = ""): InvoiceDetails => ({
  company: "",
  vatNo: "",
  taxOffice: "",
  activity: "",
  street: "",
  postcode: "",
  city: "",
  country: "GR",
  email,
});

export type InvoiceField = keyof InvoiceDetails;

const clean = (s: string) => s.replace(/\s/g, "").toUpperCase();

/** The VAT number as stored: ΑΦΜ as 9 digits with the EL prefix, others upper-cased without spaces. */
export function normalVatNo(d: Pick<InvoiceDetails, "vatNo" | "country">): string {
  const v = clean(d.vatNo);
  if (d.country === "GR") return `EL${v.replace(/^(EL|GR)/, "")}`;
  return v;
}

/** Field → message for what is missing or wrong; empty when the details can go on an invoice. */
export function invoiceErrors(d: InvoiceDetails): Partial<Record<InvoiceField, string>> {
  const e: Partial<Record<InvoiceField, string>> = {};
  const gr = d.country === "GR";
  if (d.company.trim().length < 2) e.company = "Enter the company name";
  const v = clean(d.vatNo);
  if (!v) e.vatNo = gr ? "Enter the ΑΦΜ" : "Enter the VAT number";
  else if (gr ? !/^(EL|GR)?\d{9}$/.test(v) : !/^[A-Z0-9]{8,14}$/.test(v))
    e.vatNo = gr ? "ΑΦΜ is 9 digits" : "Check the VAT number";
  if (gr && d.taxOffice.trim().length < 2) e.taxOffice = "Enter the tax office (ΔΟΥ)";
  if (gr && d.activity.trim().length < 2) e.activity = "Enter the business activity";
  if (d.street.trim().length < 3) e.street = "Enter the street and number";
  if (gr ? !/^\d{3}\s?\d{2}$/.test(d.postcode.trim()) : d.postcode.trim().length < 3)
    e.postcode = gr ? "5 digits" : "Enter the postcode";
  if (d.city.trim().length < 2) e.city = "Enter the city";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "Enter an e-mail address";
  return e;
}

/** One line for the invoice's "Bill to" address. */
export function invoiceAddress(d: InvoiceDetails): string {
  const country = INVOICE_COUNTRIES.find(([c]) => c === d.country)?.[1];
  return [
    d.street.trim(),
    `${d.postcode.trim()} ${d.city.trim()}`.trim(),
    d.country === "GR" ? "" : country,
  ]
    .filter(Boolean)
    .join(", ");
}
