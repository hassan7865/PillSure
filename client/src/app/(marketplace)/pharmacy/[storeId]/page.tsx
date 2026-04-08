"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { MapPin, Star, Clock, Pill, Building2, Map as MapIcon, Search } from "lucide-react";
import { marketplaceApi, type MedicalStoreCatalogRow, type PublicStoreDetail } from "@/lib/marketplace-api";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import { formatRetailPriceLine } from "@/lib/format-money";
import Navbar from "@/app/components/Navbar";
import { MarketplaceFooter } from "@/components/marketplace/chrome";
import {
  fixedNavbarOffsetPt,
  marketplaceContentWidthClass,
  marketplaceMaxWidthClass,
} from "@/lib/dashboard-ui";
import {
  MedicineRxStamp,
  MedicineStockStatus,
  marketplaceMedicineTileClassName,
} from "@/components/medicine/medicine-catalog-parts";

export default function PharmacyStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = typeof params.storeId === "string" ? params.storeId : "";

  const [store, setStore] = useState<PublicStoreDetail | null>(null);
  const [catalog, setCatalog] = useState<MedicalStoreCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["All"]);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        marketplaceApi.getStore(storeId),
        marketplaceApi.getStoreCatalog(storeId, 1, 200),
      ]);
      setStore(s);
      setCatalog(c.items);
    } catch (e) {
      setError(getErrorMessage(e));
      setStore(null);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const row of catalog) {
      if (row.categories?.length) {
        for (const c of row.categories) {
          names.add(c.name.trim() || "Other");
        }
      } else {
        names.add("Uncategorized");
      }
    }
    return ["All", ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [catalog]);

  const allSelected = selectedCategories.includes("All");

  const toggleCategory = useCallback((nextCategory: string) => {
    setSelectedCategories((prev) => {
      if (nextCategory === "All") return ["All"];

      const base = prev.filter((c) => c !== "All");
      if (base.includes(nextCategory)) {
        const removed = base.filter((c) => c !== nextCategory);
        return removed.length > 0 ? removed : ["All"];
      }

      return [...base, nextCategory];
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((row) => {
      const rowCats = row.categories?.length
        ? row.categories.map((c) => c.name.trim() || "Other")
        : ["Uncategorized"];
      if (!allSelected && !rowCats.some((rowCat) => selectedCategories.includes(rowCat))) return false;
      if (!q) return true;
      return (
        row.medicineName.toLowerCase().includes(q) ||
        (row.manufacturerName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allSelected, catalog, search, selectedCategories]);

  const grouped = useMemo(() => {
    const m = new Map<string, MedicalStoreCatalogRow[]>();
    for (const row of filtered) {
      const keys =
        row.categories?.length && row.categories.length > 0
          ? row.categories.map((c) => c.name.trim() || "Other")
          : ["Uncategorized"];
      for (const key of keys) {
        if (!allSelected && !selectedCategories.includes(key)) continue;
        const list = m.get(key) ?? [];
        list.push(row);
        m.set(key, list);
      }
    }
    return m;
  }, [allSelected, filtered, selectedCategories]);

  if (!storeId) {
    return (
      <>
        <Navbar />
        <div className={cn("px-4 text-center text-sm text-muted-foreground", fixedNavbarOffsetPt)}>
          Invalid store.
        </div>
      </>
    );
  }

  if (loading && !store) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <Navbar />
        <div className={cn("animate-pulse py-8", fixedNavbarOffsetPt, marketplaceContentWidthClass())}>
          <div className="space-y-6">
            <div className="h-[280px] rounded-[2rem] bg-muted lg:h-[400px]" />
            <div className="h-12 max-w-md rounded-full bg-muted" />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 rounded-[24px] bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <Navbar />
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center",
            fixedNavbarOffsetPt,
          )}
        >
          <p className="text-destructive">{error ?? "Store not found."}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to discover
          </button>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  const addressLine = [store.addressLine, store.city, store.province, store.postalCode, store.country]
    .filter(Boolean)
    .join(" · ");
  const operatingHours =
    store.openingTime && store.closingTime ? `${store.openingTime} - ${store.closingTime}` : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Navbar />

      <div className={cn("flex min-h-0 flex-1 flex-col", fixedNavbarOffsetPt)}>
      <header className="relative min-h-[240px] w-full shrink-0 overflow-hidden sm:min-h-0 sm:h-[280px] lg:h-[400px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-muted" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-12">
          <div
            className={cn(
              "mx-auto flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
              marketplaceMaxWidthClass(),
            )}
          >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary-foreground/25 bg-card shadow-2xl sm:h-32 sm:w-32">
                {store.logoUrl ? (
                  <Image
                    src={store.logoUrl}
                    alt={`${store.storeName} logo`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80px, 128px"
                    unoptimized
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-primary/60 sm:h-16 sm:w-16" />
                )}
              </div>
              <div className="min-w-0 text-primary-foreground">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h1 className="min-w-0 max-w-full break-words text-2xl font-black tracking-tighter sm:text-4xl lg:text-5xl">
                    {store.storeName}
                  </h1>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />
                    Open now
                  </span>
                </div>
                <div className="flex flex-col gap-2 text-sm font-medium text-primary-foreground/90 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                  <span className="inline-flex min-w-0 items-start gap-1.5 break-words sm:items-center">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                    {addressLine}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 shrink-0 fill-primary-foreground text-primary-foreground" />
                    New on PillSure
                  </span>
                  {operatingHours && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 shrink-0" />
                      {operatingHours}
                    </span>
                  )}
                  {store.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Pill className="h-4 w-4 shrink-0" />
                      <a href={`tel:${store.phone}`} className="hover:underline">
                        {store.phone}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={cn(marketplaceContentWidthClass(), "flex min-h-0 flex-1 flex-col py-4 lg:py-6")}>
        <div className="mb-4">
          <label htmlFor="store-medicine-search" className="sr-only">
            Search medicine in this store
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="store-medicine-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine in this store"
              className="h-11 w-full rounded-full border border-border bg-background pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="mb-10 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={cn(
                "snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5",
                selectedCategories.includes(c)
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              aria-pressed={selectedCategories.includes(c)}
            >
              {c === "All" ? "All items" : c}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-8">
          {!loading && filtered.length === 0 && (
            <p className="mb-8 text-sm text-muted-foreground">No medicines match your filters.</p>
          )}

          <div className="space-y-16">
            {Array.from(grouped.entries()).map(([catName, items]) => (
              <section key={catName}>
                <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-2xl font-black tracking-tight text-foreground lg:text-3xl">{catName}</h2>
                  <span className="text-sm font-bold uppercase tracking-widest text-primary">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {items.map((row) => (
                    <article
                      key={`${catName}-${row.listingId}`}
                      className={cn(
                        "group flex min-w-0 flex-col rounded-[24px] p-4 transition-all hover:-translate-y-1 hover:shadow-elevated sm:p-5",
                        marketplaceMedicineTileClassName,
                      )}
                    >
                      <div className="relative mb-5 aspect-square w-full overflow-hidden rounded-2xl bg-muted">
                        {row.displayImageUrl ? (
                          <Image
                            src={row.displayImageUrl}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Pill className="h-16 w-16 text-muted-foreground/35" />
                          </div>
                        )}
                        {row.prescriptionRequired && (
                          <span className="absolute left-3 top-3">
                            <MedicineRxStamp className="rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur" />
                          </span>
                        )}
                      </div>
                      <div className="mb-4 flex-1 space-y-1">
                        <h3 className="text-xl font-bold leading-tight text-foreground">{row.medicineName}</h3>
                        {row.manufacturerName && (
                          <p className="text-sm font-medium text-muted-foreground">{row.manufacturerName}</p>
                        )}
                        <div className="pt-1">
                          <MedicineStockStatus
                            inStock={row.isActive && row.listedQuantity > 0}
                            detail={
                              row.listedQuantity > 0
                                ? `· ${row.listedQuantity} listed`
                                : undefined
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xl font-black tabular-nums text-foreground sm:text-2xl">
                          {formatRetailPriceLine(row.currency, row.retailPrice)}
                        </span>
                        <Link
                          href={`/medicine/${row.medicineId}?${new URLSearchParams({ storeId, listingId: row.listingId }).toString()}`}
                          className="inline-flex w-full items-center justify-center rounded-full bg-secondary px-5 py-2.5 text-center text-xs font-bold text-secondary-foreground transition-shadow hover:shadow-md sm:w-auto"
                        >
                          View Details
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
      </div>

      <MarketplaceFooter />

      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 max-sm:left-4 sm:bottom-10 sm:right-10 sm:left-auto">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-elevated-lg transition-transform hover:scale-[1.02] active:scale-95 sm:w-auto sm:gap-3 sm:px-6 sm:py-4"
          onClick={() => {
            if (store.latitude != null && store.longitude != null) {
              window.open(
                `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`,
                "_blank",
                "noopener,noreferrer",
              );
            }
          }}
          disabled={store.latitude == null || store.longitude == null}
          title={
            store.latitude != null && store.longitude != null
              ? "Open in Maps"
              : "Location not available"
          }
        >
          <MapIcon className="h-5 w-5" />
          <span className="hidden sm:inline">View on map</span>
        </button>
      </div>
    </div>
  );
}
