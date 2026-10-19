// Field checks shared by guest and staff forms (AENR-772, UX_REVIEW 6.1).
// Pure functions: each returns true when the value is acceptable, so callers
// decide the copy and when to show it (after blur, on submit…).

/** A plausible e-mail: something@domain.tld, no spaces. */
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** A mobile number: optional +, then 8–15 digits (spaces, dots and dashes ignored). */
export const phoneOk = (v: string) => /^\+?\d{8,15}$/.test(v.replace(/[\s.-]/g, ""));

/** The 9 ΑΦΜ digits, without spaces or the EL / GR prefix. */
export const afmDigits = (v: string) =>
  v
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/^(EL|GR)/, "");

/**
 * Greek tax ID (ΑΦΜ) check digit: the first eight digits weighted by
 * 2⁸ … 2¹, summed, mod 11, mod 10 must equal the ninth. All-zero is rejected.
 */
export function afmOk(v: string): boolean {
  const d = afmDigits(v);
  if (!/^\d{9}$/.test(d) || /^0+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * 2 ** (8 - i);
  return (sum % 11) % 10 === Number(d[8]);
}

/** The check digit that completes eight ΑΦΜ digits (used to seed valid sample data). */
export function afmWithCheck(first8: string): string {
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(first8[i]) * 2 ** (8 - i);
  return `${first8}${(sum % 11) % 10}`;
}

/** Why a Greek ΑΦΜ is rejected, or "" when it is fine. */
export function afmProblem(v: string): string {
  const d = afmDigits(v);
  if (!d) return "Enter the ΑΦΜ";
  if (!/^\d{9}$/.test(d)) return "ΑΦΜ is 9 digits";
  if (!afmOk(d)) return "This ΑΦΜ isn’t valid — check the digits";
  return "";
}

/** A number plate as stored: upper-case, no spaces or dashes ("ΙΚΥ-1234" → "ΙΚΥ1234"). */
export const plateKey = (v: string) => v.toUpperCase().replace(/[\s-]/g, "");

/**
 * A plausible EU number plate: 4–10 letters and digits (Latin or Greek), with at
 * least one letter and one digit — enough to catch typos and placeholder text
 * without rejecting foreign plates the gate camera reads too.
 */
export function plateOk(v: string): boolean {
  const k = plateKey(v);
  return /^[A-Z0-9Α-Ω]{4,10}$/.test(k) && /[A-ZΑ-Ω]/.test(k) && /\d/.test(k);
}

/** A tenant's VAT number: the ΑΦΜ check for Greek companies, a basic shape elsewhere. */
export function tenantVatProblem(vatNo: string, country: string): string {
  if (/^(greece|gr|el)$/i.test(country.trim())) return afmProblem(vatNo);
  const v = vatNo.replace(/\s/g, "").toUpperCase();
  if (!v) return "Enter the VAT number";
  return /^[A-Z]{2}[A-Z0-9]{6,12}$/.test(v) ? "" : "Check the VAT number (with its country code)";
}

/** How many of the plates a parking order needs are still empty or malformed (AENR-769). */
export function plateGaps(needed: readonly string[]): { missing: number; invalid: number } {
  const missing = needed.filter((p) => !p.trim()).length;
  const invalid = needed.filter((p) => p.trim() && !plateOk(p)).length;
  return { missing, invalid };
}
