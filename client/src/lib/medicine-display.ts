import type { Medicine } from "@/app/medicine/_api";

/** Master `medicines` rows do not store images; use pharmacy listing `packImages` / `displayImageUrl`. */
export function normalizeMedicineImages(_medicine?: Medicine | null): string[] {
  return [];
}

export interface CatalogPriceDisplay {
  priceNum: number;
  discountPct: number;
  originalPrice: number | undefined;
  finalPrice: number;
}

/** Catalog price display when listing-level price fields exist (e.g. legacy callers). */
export function getCatalogPriceDisplay(
  price?: string | null,
  discount?: string | null,
): CatalogPriceDisplay {
  const priceNum = price ? parseFloat(price) : 0;
  const discountPct = discount ? parseFloat(discount) : 0;
  const originalPrice =
    discountPct > 0 ? priceNum / (1 - discountPct / 100) : undefined;
  const finalPrice = discountPct > 0 ? priceNum : originalPrice ?? priceNum;
  return { priceNum, discountPct, originalPrice, finalPrice };
}
