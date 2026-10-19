import { useApp } from "../app/store";
import { TENANT } from "../data/beach";
import { DEFAULT_FINANCE, type FinanceConfig } from "../domain/finance";

/** The fee model + provider for a tenant (defaults to the demo tenant). */
export function useFinance(
  subdomain: string = TENANT.subdomain,
): [FinanceConfig, (c: FinanceConfig) => void] {
  const { finance, setFinance } = useApp();
  const cfg = finance[subdomain] ?? DEFAULT_FINANCE;
  // Configs saved before POS terminals existed get the default set.
  return [cfg.terminals ? cfg : { ...cfg, terminals: DEFAULT_FINANCE.terminals }, (c) => setFinance(subdomain, c)];
}
