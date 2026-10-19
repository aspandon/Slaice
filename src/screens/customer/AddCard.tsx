import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Btn, Modal } from "../../components/ui";
import { Icon } from "../../lib/icons";
import { useT } from "../../app/store";
import { todayISO } from "../../data/beach";
import { cardBrand, cardErrors, formatCardNumber, type SavedCard } from "../../domain/account";

/* Add a card (AENR-736) — a simulated Stripe SetupIntent: the guest types the
   card, it is checked here (brand, Luhn, expiry, CVC), a short "checking with
   your bank" step runs, and only the brand, last 4, expiry and name are kept.
   Errors show after the first Save, each as its field's description. */
export function AddCardModal({
  first,
  onClose,
  onSaved,
}: {
  /** No card yet — this one becomes the default without asking. */
  first: boolean;
  onClose: () => void;
  onSaved: (card: SavedCard, makeDefault: boolean) => void;
}) {
  const t = useT();
  const [f, setF] = useState({ holder: "", number: "", exp: "", cvc: "" });
  const [makeDefault, setMakeDefault] = useState(true);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const errors = cardErrors(f, todayISO());
  const ok = Object.keys(errors).length === 0;
  const brand = cardBrand(f.number);
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const save = () => {
    if (!ok) return setTried(true);
    setBusy(true);
    // Demo: the bank's check (3-D Secure on a real SetupIntent) takes a moment.
    window.setTimeout(() => {
      const digits = f.number.replace(/\D/g, "");
      onSaved(
        {
          brand: brand ?? "Card",
          last4: digits.slice(-4),
          exp: f.exp.replace(/\s/g, ""),
          holder: f.holder.trim(),
        },
        first || makeDefault,
      );
    }, 900);
  };
  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={t("Add a card")}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>
            {t("Cancel")}
          </Btn>
          <Btn variant="primary" icon={Icon.lock} loading={busy} onClick={save}>
            {busy ? t("Checking with your bank…") : t("Save card")}
          </Btn>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <CardField onEnter={save} label={t("Name on card")} error={show("holder")}>
          {(p) => (
            <input
              {...p}
              autoComplete="cc-name"
              value={f.holder}
              onChange={(e) => setF({ ...f, holder: e.target.value })}
            />
          )}
        </CardField>
        <CardField
          onEnter={save}
          label={t("Card number")}
          error={show("number")}
          trailing={brand ?? undefined}
        >
          {(p) => (
            <input
              {...p}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={f.number}
              onChange={(e) => setF({ ...f, number: formatCardNumber(e.target.value) })}
              className={`${p.className} font-mono`}
            />
          )}
        </CardField>
        <div className="grid grid-cols-2 gap-3">
          <CardField onEnter={save} label={t("Expiry")} error={show("exp")}>
            {(p) => (
              <input
                {...p}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={f.exp}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setF({ ...f, exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                }}
                className={`${p.className} font-mono`}
              />
            )}
          </CardField>
          <CardField onEnter={save} label="CVC" error={show("cvc")}>
            {(p) => (
              <input
                {...p}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={brand === "Amex" ? "1234" : "123"}
                value={f.cvc}
                onChange={(e) => setF({ ...f, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                className={`${p.className} font-mono`}
              />
            )}
          </CardField>
        </div>
        {!first && (
          <label className="flex items-center gap-2 min-h-[40px] text-guest-meta text-slate-700">
            <input
              type="checkbox"
              className="w-4 h-4 accent-teal-600"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
            />
            {t("Use as my default card")}
          </label>
        )}
        <p className="flex items-start gap-1.5 text-guest-caption text-slate-500">
          <Icon.lock size={12} className="mt-0.5 shrink-0" />
          {t(
            "Demo — no real card is stored. Stripe keeps the card; this app only keeps the brand, the last 4 digits and the expiry.",
          )}
        </p>
      </form>
    </Modal>
  );
}

type Wiring = {
  id: string;
  className: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
};

/* One labelled field; Enter saves (the footer button sits outside the form). */
function CardField({
  label,
  error,
  trailing,
  onEnter,
  children,
}: {
  label: string;
  error?: string;
  trailing?: string;
  onEnter: () => void;
  children: (p: Wiring) => ReactNode;
}) {
  const t = useT();
  const id = useId();
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="flex items-center justify-between text-guest-caption font-semibold text-slate-700 mb-1"
      >
        {label}
        {trailing && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-guest-caption font-bold text-navy-900">
            {trailing}
          </span>
        )}
      </label>
      {children({
        id,
        className:
          "glass-input w-full rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-teal-500/70",
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? `${id}-err` : undefined,
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        },
      })}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-guest-caption font-medium text-rose-700">
          {t(error)}
        </p>
      )}
    </div>
  );
}
