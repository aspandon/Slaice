import { useApp } from "../app/store";
import { TENANT } from "../data/beach";
import { DEFAULT_FINANCE, type FinanceConfig } from "../domain/finance";

/** The fee model + provider for a tenant (defaults to the demo tenant). */
export function useFinance(
  subdomain: string = TENANT.subdomain,
): [FinanceConfig, (c: FinanceConfig) => void] {
  const { finance, setFinance } = useApp();
  return [finance[subdomain] ?? DEFAULT_FINANCE, (c) => setFinance(subdomain, c)];
}
