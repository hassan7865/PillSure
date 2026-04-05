import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import { CheckCircle, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRetailPriceLine } from "@/lib/format-money";

type StockSize = "default" | "large";

/** Matches marketplace search listing + pharmacy catalog tone: green/red stock with clear labels. */
export function MedicineStockStatus({
  inStock,
  size = "default",
  detail,
}: {
  inStock: boolean;
  /** `large`: hero product row (medicine PDP). */
  size?: StockSize;
  /** Shown after the status (e.g. quantity) — omit when out of stock. */
  detail?: ReactNode;
}) {
  const icon = size === "large" ? "h-5 w-5" : "h-4 w-4";
  return inStock ? (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <div
        className={`flex items-center gap-1 text-sm font-medium ${size === "large" ? "text-green-700" : "text-green-600"}`}
      >
        <CheckCircle className={`${icon} shrink-0`} aria-hidden />
        In Stock
      </div>
      {detail ? <span className="text-xs font-normal text-muted-foreground">{detail}</span> : null}
    </div>
  ) : (
    <div
      className={`flex items-center gap-1 text-sm font-medium ${size === "large" ? "text-destructive" : "text-red-600"}`}
    >
      <XCircle className={`${icon} shrink-0`} aria-hidden />
      Out of Stock
    </div>
  );
}

/** Compact “Rx” label — same treatment as medical store dashboard product tiles. */
export function MedicineRxStamp({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow",
        className,
      )}
    >
      Rx
    </span>
  );
}

export function MedicinePrescriptionBadge() {
  return (
    <Badge variant="outline" className="text-xs">
      Prescription Required
    </Badge>
  );
}

type MedicineCatalogPriceProps = {
  finalPrice: number;
  originalPrice: number | undefined;
  discountPct: number;
  variant: "featured" | "compact";
};

/** PKR catalog line: tabular nums + strike + discount badge (aligned with search listing price weight). */
export function MedicineCatalogPrice({
  finalPrice,
  originalPrice,
  discountPct,
  variant,
}: MedicineCatalogPriceProps) {
  const mainClass =
    variant === "featured"
      ? "text-xl font-bold tabular-nums text-foreground sm:text-2xl md:text-3xl"
      : "text-lg font-bold tabular-nums text-foreground";

  const strikeClass =
    variant === "featured"
      ? "text-sm text-muted-foreground line-through sm:text-base md:text-lg"
      : "text-sm text-muted-foreground line-through";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={mainClass}>
        {formatRetailPriceLine("PKR", finalPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      {discountPct > 0 && originalPrice !== undefined && (
        <>
          <span className={strikeClass}>
            {formatRetailPriceLine("PKR", originalPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <Badge className="bg-green-500 text-xs text-white hover:bg-green-500">
            {discountPct.toFixed(0)}% OFF
          </Badge>
        </>
      )}
    </div>
  );
}

export function RagMatchBadge({
  score,
  compact,
}: {
  score: number;
  compact?: boolean;
}) {
  return (
    <div className="absolute top-2 right-2">
      <Badge
        className={cn(
          "flex items-center gap-1 bg-primary text-primary-foreground",
          compact ? "text-xs" : "text-xs sm:text-sm",
        )}
      >
        <Sparkles className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} aria-hidden />
        {Math.round(score * 100)}% Match
      </Badge>
    </div>
  );
}

/** Base chrome for marketplace medicine tiles (search row, pharmacy grid, RAG cards). */
export const marketplaceMedicineTileClassName =
  "rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md";

/** Interactive catalog card (recommendation dialog). */
export const medicineCatalogCardClassName = `cursor-pointer ${marketplaceMedicineTileClassName}`;
