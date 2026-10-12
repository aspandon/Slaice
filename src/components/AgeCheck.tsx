import { Icon } from "../lib/icons";
import { useT } from "../app/store";

/* 18+ confirmation for creating or using an account (AENR-489). Bookings are
   paid contracts, so account holders must be adults; children come along on
   an adult's booking as a ticket count only. */
export function AgeCheck({
  checked,
  onChange,
  invalid,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  invalid?: boolean;
}) {
  const t = useT();
  return (
    <div>
      <label
        className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] leading-snug cursor-pointer ring-1 ${invalid ? "ring-rose-400 bg-rose-50" : "ring-slate-200 bg-white/70"}`}
      >
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-teal-600"
          checked={checked}
          aria-invalid={invalid}
          aria-describedby={invalid ? "age-err" : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-slate-700">
          {t("I'm 18 or older and I've read the privacy policy.")}{" "}
          <span className="text-slate-500">
            {t(
              "Accounts are for adults — children come along on your booking as a ticket count only.",
            )}
          </span>
        </span>
      </label>
      {invalid && (
        <div
          id="age-err"
          role="alert"
          className="mt-1 text-[12px] text-rose-600 flex items-center gap-1.5"
        >
          <Icon.alert size={13} /> {t("Please confirm you're 18 or older to continue.")}
        </div>
      )}
    </div>
  );
}
