import { useId, type ReactNode } from "react";
import { Input, Select } from "../../components/ui";
import { useT } from "../../app/store";
import {
  INVOICE_COUNTRIES,
  type InvoiceDetails,
  type InvoiceField,
} from "../../domain/invoiceDetails";

/* The invoice details a guest gives instead of taking a receipt (AENR-714):
   the fields a Greek B2B invoice (ΤΠΥ) needs — company, ΑΦΜ, ΔΟΥ, business
   activity, billing address — and the e-mail it goes to. Outside Greece the
   tax office and activity are not asked. Used at Pay / Checkout and in
   My bookings › Request an invoice. Errors show once `showErrors` is set. */
export function InvoiceFields({
  value,
  onChange,
  errors,
  showErrors,
}: {
  value: InvoiceDetails;
  onChange: (v: InvoiceDetails) => void;
  errors: Partial<Record<InvoiceField, string>>;
  showErrors: boolean;
}) {
  const t = useT();
  const gr = value.country === "GR";
  const set = (k: InvoiceField) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-6 gap-x-3 gap-y-3">
      <Box span="col-span-6" label={t("Country")} err={undefined}>
        {(p) => (
          <Select
            {...p}
            value={value.country}
            onChange={(e) => set("country")(e.target.value)}
            options={INVOICE_COUNTRIES.map(([v, l]) => ({ v, l: t(l) }))}
          />
        )}
      </Box>
      <Box
        span="col-span-6"
        label={t("Company name")}
        err={showErrors ? errors.company : undefined}
      >
        {(p) => (
          <Input
            {...p}
            value={value.company}
            onChange={(e) => set("company")(e.target.value)}
            autoComplete="organization"
          />
        )}
      </Box>
      <Box
        span={gr ? "col-span-6 sm:col-span-3" : "col-span-6"}
        label={gr ? t("Tax ID (ΑΦΜ)") : t("VAT number")}
        hint={gr ? t("9 digits") : t("With the country code, e.g. DE123456789")}
        err={showErrors ? errors.vatNo : undefined}
      >
        {(p) => (
          <Input
            {...p}
            value={value.vatNo}
            onChange={(e) => set("vatNo")(e.target.value)}
            inputMode={gr ? "numeric" : "text"}
            autoComplete="off"
          />
        )}
      </Box>
      {gr && (
        <Box
          span="col-span-6 sm:col-span-3"
          label={t("Tax office (ΔΟΥ)")}
          hint={t("e.g. ΔΟΥ Γλυφάδας")}
          err={showErrors ? errors.taxOffice : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={value.taxOffice}
              onChange={(e) => set("taxOffice")(e.target.value)}
              autoComplete="off"
            />
          )}
        </Box>
      )}
      {gr && (
        <Box
          span="col-span-6"
          label={t("Business activity")}
          hint={t("As registered, e.g. Software services")}
          err={showErrors ? errors.activity : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={value.activity}
              onChange={(e) => set("activity")(e.target.value)}
              autoComplete="off"
            />
          )}
        </Box>
      )}
      <Box
        span="col-span-6"
        label={t("Street and number")}
        err={showErrors ? errors.street : undefined}
      >
        {(p) => (
          <Input
            {...p}
            value={value.street}
            onChange={(e) => set("street")(e.target.value)}
            autoComplete="address-line1"
          />
        )}
      </Box>
      <Box span="col-span-2" label={t("Postcode")} err={showErrors ? errors.postcode : undefined}>
        {(p) => (
          <Input
            {...p}
            value={value.postcode}
            onChange={(e) => set("postcode")(e.target.value)}
            inputMode={gr ? "numeric" : "text"}
            autoComplete="postal-code"
          />
        )}
      </Box>
      <Box span="col-span-4" label={t("City")} err={showErrors ? errors.city : undefined}>
        {(p) => (
          <Input
            {...p}
            value={value.city}
            onChange={(e) => set("city")(e.target.value)}
            autoComplete="address-level2"
          />
        )}
      </Box>
      <Box
        span="col-span-6"
        label={t("Send the invoice to")}
        err={showErrors ? errors.email : undefined}
      >
        {(p) => (
          <Input
            {...p}
            type="email"
            value={value.email}
            onChange={(e) => set("email")(e.target.value)}
            autoComplete="email"
          />
        )}
      </Box>
    </div>
  );
}

type Wiring = { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/* One labelled field: the error (or hint) is the control's description, not part of its name. */
function Box({
  span,
  label,
  hint,
  err,
  children,
}: {
  span: string;
  label: string;
  hint?: string;
  err: string | undefined;
  children: (p: Wiring) => ReactNode;
}) {
  const t = useT();
  const id = useId();
  const note = err ? t(err) : hint;
  return (
    <div className={`${span} min-w-0`}>
      <label htmlFor={id} className="block text-guest-caption font-semibold text-slate-700 mb-1">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": err ? true : undefined,
        "aria-describedby": note ? `${id}-note` : undefined,
      })}
      {note && (
        <p
          id={`${id}-note`}
          className={`mt-1 text-guest-caption ${err ? "text-rose-700 font-medium" : "text-slate-500"}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
