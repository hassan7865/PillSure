export const DEFAULT_MARKETPLACE_CURRENCY = "PKR";
export function formatRetailPriceLine(
  currency: string | null | undefined,
  retailPrice: string | number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  const c = currency?.trim() || DEFAULT_MARKETPLACE_CURRENCY;
  const n = typeof retailPrice === "string" ? Number(retailPrice) : retailPrice;
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
  return `${c} ${n.toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })}`;
}
